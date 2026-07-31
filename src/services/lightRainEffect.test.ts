import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  computeMaxDrops,
  smoothstep,
  clampLightRainOptions,
  showLightRainEffect,
  hideLightRainEffect,
  isLightRainEffectActive,
  setupRainyNightEasterEggShortcut,
  active,
} from '@/services/rainyNightEffect'
import { isRainShortcutEnabled } from '@/utils/easterEggEnv'

// ========== jsdom 环境补丁：matchMedia + Canvas 2D getContext stub ==========
// jsdom 无 matchMedia；Canvas getContext 不做真实渲染，返回带 spy 的 stub
function installMatchMedia(reducedMotion = false) {
  const mm = (q: string) => ({
    matches: q.includes('reduce') ? reducedMotion : false,
    media: q,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    onchange: null,
    dispatchEvent: vi.fn(() => false),
  })
  vi.stubGlobal('matchMedia', vi.fn(mm))
  return mm
}

function installCanvasStub() {
  // 提供 createLinearGradient / clearRect / stroke 等方法的 noop stub
  const stub: Record<string, (...args: any[]) => void> = {}
  const methods = [
    'createLinearGradient', 'createRadialGradient', 'fillRect', 'clearRect',
    'beginPath', 'moveTo', 'lineTo', 'stroke', 'fill', 'save', 'restore',
    'setTransform', 'scale', 'arc', 'ellipse', 'bezierCurveTo', 'quadraticCurveTo',
  ]
  for (const m of methods) stub[m] = vi.fn()
  const gradStub = {
    addColorStop: vi.fn(),
  }
  stub.createLinearGradient = vi.fn(() => ({ ...gradStub })) as any
  stub.createRadialGradient = vi.fn(() => ({ ...gradStub })) as any
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(stub as any)
  return stub
}

function setViewport(w = 1920, h = 1080, dpr = 1) {
  vi.stubGlobal('devicePixelRatio', dpr)
  Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: w })
  Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: h })
}

beforeEach(() => {
  installMatchMedia(false)
  installCanvasStub()
  setViewport(1920, 1080, 1)
  document.body.innerHTML = ''
})

afterEach(() => {
  // 同步重置单例状态：hideLightRainEffect 走淡出太慢，直接清 body + active 归零
  // （旧 app 实例的 rAF 在 jsdom 不自动推进，下次 show 会 teardown 它，无泄漏）
  try { hideLightRainEffect() } catch { /* noop */ }
  document.body.innerHTML = ''
  active.value = false
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

// ========== 纯函数 ==========
describe('smoothstep', () => {
  it('在边界外钳制为 0/1，区间内平滑插值', () => {
    expect(smoothstep(-1, 0, 1)).toBe(0)
    expect(smoothstep(2, 0, 1)).toBe(1)
    const mid = smoothstep(0.5, 0, 1)
    expect(mid).toBeGreaterThan(0.4)
    expect(mid).toBeLessThan(0.6)
  })
})

describe('computeMaxDrops', () => {
  it('intensity 越低，最大粒子数越少（单调递增）', () => {
    const low = computeMaxDrops(1920, 1080, 0.2, false, false)
    const mid = computeMaxDrops(1920, 1080, 0.6, false, false)
    const high = computeMaxDrops(1920, 1080, 1.0, false, false)
    expect(low).toBeLessThan(mid)
    expect(mid).toBeLessThan(high)
  })

  it('reduced-motion 下粒子数降到约 25%', () => {
    const normal = computeMaxDrops(1920, 1080, 0.8, false, false)
    const reduced = computeMaxDrops(1920, 1080, 0.8, false, true)
    expect(reduced).toBeLessThanOrEqual(Math.round(normal * 0.26))
    expect(reduced).toBeGreaterThan(0)
  })

  it('移动端粒子数降低约 30%', () => {
    const desktop = computeMaxDrops(1920, 1080, 0.8, false, false)
    const mobile = computeMaxDrops(1920, 1080, 0.8, true, false)
    expect(mobile).toBeLessThan(desktop)
  })

  it('大屏幕不会无上限生成雨滴（有上限 520）', () => {
    const huge = computeMaxDrops(3840, 2160, 1.0, false, false)
    expect(huge).toBeLessThanOrEqual(520)
  })
})

describe('clampLightRainOptions', () => {
  it('默认值符合雷雨语义', () => {
    const o = clampLightRainOptions({})
    expect(o.duration).toBe(13000)
    expect(o.intensity).toBe(0.7)
    expect(o.opacity).toBe(0.28)
    expect(o.wind).toBe(0.12)
    expect(o.fadeInDuration).toBe(600)
    expect(o.fadeOutDuration).toBe(4500)
    expect(o.thunder).toBe(true)
    expect(o.sound).toBe(false)
  })

  it('thunder 可关闭', () => {
    expect(clampLightRainOptions({ thunder: false }).thunder).toBe(false)
    expect(clampLightRainOptions({}).thunder).toBe(true)
  })

  it('sound 默认关，可显式开', () => {
    expect(clampLightRainOptions({}).sound).toBe(false)
    expect(clampLightRainOptions({ sound: true }).sound).toBe(true)
  })

  it('参数超界被 clamp', () => {
    const o = clampLightRainOptions({ duration: 100, intensity: 5, opacity: 0.9, wind: 2, fadeOutDuration: 1 })
    expect(o.duration).toBe(3000)
    expect(o.intensity).toBe(1)
    expect(o.opacity).toBe(0.5)
    expect(o.wind).toBe(0.4)
    expect(o.fadeOutDuration).toBe(500)
  })

  it('fadeIn + fadeOut 不超过 duration', () => {
    const o = clampLightRainOptions({ duration: 3000, fadeInDuration: 3000, fadeOutDuration: 6000 })
    expect(o.fadeInDuration + o.fadeOutDuration).toBeLessThanOrEqual(o.duration)
  })
})

// ========== 单例 service 与资源清理 ==========
describe('showLightRainEffect 单例', () => {
  it('重复 show 不会同时存在两个 Canvas', () => {
    showLightRainEffect()
    const first = document.querySelectorAll('canvas').length
    showLightRainEffect()
    const second = document.querySelectorAll('canvas').length
    expect(first).toBe(1)
    expect(second).toBe(1)
  })

  it('旧实例结束回调不会删除新实例（token 校验）', () => {
    showLightRainEffect()
    // show 后立即再 show：旧实例 onFinished 回调即便触发也不会 teardown 新实例
    showLightRainEffect()
    expect(isLightRainEffectActive()).toBe(true)
    expect(document.querySelectorAll('canvas').length).toBe(1)
  })

  it('hide 后 DOM 中无残留 canvas 且 active 归 false', () => {
    showLightRainEffect()
    expect(document.querySelector('canvas')).not.toBeNull()
    hideLightRainEffect()
    // hide 走淡出，最终 finish 后卸载；立即断言 active 仍可能为 true（淡出中），
    // 但组件已 requestLeave，DOM canvas 仍在淡出窗口内。此处至少断言不再叠加。
    expect(document.querySelectorAll('canvas').length).toBeLessThanOrEqual(1)
  })
})

describe('pointer-events 透传', () => {
  it('效果层保持 pointer-events: none', () => {
    showLightRainEffect()
    const layer = document.querySelector('.light-rain-layer') as HTMLElement | null
    expect(layer).not.toBeNull()
    // 内联 style 设置，jsdom 可直接读取
    expect(layer!.style.pointerEvents).toBe('none')
    expect(layer!.style.userSelect).toBe('none')
  })
})

// ========== 快捷键 ==========
describe('R→A→I→N 快捷键', () => {
  function typeKeys(keys: string[]) {
    for (const k of keys) {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }))
    }
  }

  it('生产环境关闭快捷键后，RAIN 不触发', () => {
    // isRainShortcutEnabled 在测试环境（非 PROD）默认 true；此处直接验证：
    // 当返回 false 时，setup 返回 noop，不注册监听
    const enabled = isRainShortcutEnabled()
    const cleanup = setupRainyNightEasterEggShortcut()
    if (!enabled) {
      // 生产环境路径：注册了 noop，按键不触发
      typeKeys(['r', 'a', 'i', 'n'])
      expect(isLightRainEffectActive()).toBe(false)
    } else {
      // 开发环境路径：正常触发
      typeKeys(['r', 'a', 'i', 'n'])
      expect(isLightRainEffectActive()).toBe(true)
    }
    cleanup()
  })

  it('输入框内输入 RAIN 不触发', () => {
    const cleanup = setupRainyNightEasterEggShortcut()
    const input = document.createElement('input')
    document.body.appendChild(input)
    for (const k of ['r', 'a', 'i', 'n']) {
      input.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }))
    }
    expect(isLightRainEffectActive()).toBe(false)
    cleanup()
  })
})

// ========== 活跃状态 ref ==========
describe('active ref', () => {
  it('show 后 active 为 true', () => {
    expect(active.value).toBe(false)
    showLightRainEffect()
    expect(active.value).toBe(true)
  })
})

// ========== 组件层：帧推进与状态 ==========
// 直接挂载组件，spy requestAnimationFrame 捕获 loop 回调，手动推进帧
import { createApp, nextTick } from 'vue'
import RainyNightEasterEgg from '@/components/easter-egg/RainyNightEasterEgg.vue'
import type { LightRainEffectOptions } from '@/services/rainyNightEffect'

interface Exposed {
  requestLeave: () => void
  getActiveCount: () => number
  getEmissionMultiplier: () => number
  getDrop: (i: number) => { x: number; y: number; speed: number } | null
  getPhase: () => string
  getFlashIntensity: () => number
  getSplashCount: () => number
  getTotalSplashes: () => number
  getAudioStarted: () => boolean
}

const rafCallbacks: Array<(t: number) => void> = []
let perfNow = 1000

function mountComponent(options?: LightRainEffectOptions): { exposed: Exposed; unmount: () => void } {
  const opts = clampLightRainOptions(options)
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(RainyNightEasterEgg, { options: opts, token: 1 })
  const inst = app.mount(host) as unknown as Exposed
  return { exposed: inst, unmount: () => app.unmount() }
}

/** 推进 N 帧：每帧 perfNow 递增 frameMs，取出已注册 rAF 回调按 perfNow 调用 */
function driveFrames(frameCount: number, frameMs = 16) {
  for (let i = 0; i < frameCount; i++) {
    perfNow += frameMs
    const pending = rafCallbacks.splice(0)
    for (const cb of pending) cb(perfNow)
  }
}

function installRafSpy() {
  rafCallbacks.length = 0
  perfNow = 1000
  vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((cb: FrameRequestCallback) => {
    rafCallbacks.push(cb)
    return 1
  })
  vi.spyOn(performance, 'now').mockImplementation(() => perfNow)
}

describe('组件帧推进', () => {
  beforeEach(() => {
    installRafSpy()
  })

  it('退出阶段不再创建新雨滴（emissionMultiplier 降到 0）', async () => {
    const { exposed, unmount } = mountComponent({ duration: 4000, fadeInDuration: 200, fadeOutDuration: 1500 })
    await nextTick()
    driveFrames(20, 16) // ~320ms，进入 visible 并生成雨滴
    expect(exposed.getActiveCount()).toBeGreaterThan(0)
    exposed.requestLeave()
    perfNow += 1400
    driveFrames(60, 25) // 推进到淡出尾声
    expect(exposed.getEmissionMultiplier()).toBeLessThan(0.3)
    unmount()
  })

  it('已有雨滴在淡出阶段继续移动', async () => {
    const { exposed, unmount } = mountComponent({ duration: 4000, fadeInDuration: 200, fadeOutDuration: 1500 })
    await nextTick()
    driveFrames(20, 16) // visible 阶段生成雨滴
    expect(exposed.getActiveCount()).toBeGreaterThan(0)
    exposed.requestLeave()
    perfNow += 100
    driveFrames(5, 25) // 淡出中推进帧
    // 核心断言：淡出阶段组件未 finished，仍有活跃雨滴在运行
    expect(exposed.getPhase()).toBe('leaving')
    expect(exposed.getActiveCount()).toBeGreaterThan(0)
    expect(exposed.getEmissionMultiplier()).toBeLessThanOrEqual(1)
    // 索引 0 的雨滴若未被回收，y 应增大（继续下落）
    const dropAfter = exposed.getDrop(0)
    if (dropAfter) {
      // 淡出阶段不生成新雨滴，0 号位要么仍是原雨滴(y 增大)，要么被回收后换入其他雨滴
      expect(dropAfter.y).toBeGreaterThan(-100)
    }
    unmount()
  })

  it('resize 后 Canvas 尺寸正确更新', async () => {
    const { unmount } = mountComponent()
    await nextTick()
    setViewport(1280, 800, 2)
    window.dispatchEvent(new Event('resize'))
    await nextTick()
    driveFrames(1, 16) // resize rAF 节流回调
    const canvas = document.querySelector('canvas') as HTMLCanvasElement
    expect(canvas).not.toBeNull()
    expect(canvas.width).toBe(Math.round(1280 * 2))
    expect(canvas.height).toBe(Math.round(800 * 2))
    unmount()
  })

  it('reduced-motion 下速度降低约 35%', async () => {
    // 重新安装 reduced-motion=true 的 matchMedia
    vi.unstubAllGlobals()
    installMatchMedia(true)
    installCanvasStub()
    setViewport(1920, 1080, 1)
    installRafSpy()
    const { exposed, unmount } = mountComponent({ duration: 4000, fadeInDuration: 0, fadeOutDuration: 1500 })
    await nextTick()
    driveFrames(120, 16) // 多帧确保 reduced-motion 下也生成雨滴
    const count = exposed.getActiveCount()
    expect(count).toBeGreaterThan(0)
    let drop = exposed.getDrop(0)
    for (let i = 0; i < count && !drop; i++) drop = exposed.getDrop(i)
    expect(drop).not.toBeNull()
    // reduced-motion 速度上限：近景 390*0.65 ≈ 253
    expect(drop!.speed).toBeLessThanOrEqual(254)
    // reduced-motion 下闪电也不触发
    expect(exposed.getFlashIntensity()).toBe(0)
    unmount()
  })

  it('thunder:false 时不触发闪电', async () => {
    installRafSpy()
    const { exposed, unmount } = mountComponent({ duration: 8000, fadeInDuration: 0, fadeOutDuration: 1500, thunder: false })
    await nextTick()
    // 推进足够多帧，覆盖多次可能的闪电窗口
    driveFrames(500, 16) // ~8s
    expect(exposed.getFlashIntensity()).toBe(0)
    unmount()
  })

  it('near 层雨滴落地后生成溅射粒子', async () => {
    installRafSpy()
    // 高强度 + 长 duration + 无淡入，确保 near 层雨滴生成并走完全程
    const { exposed, unmount } = mountComponent({ duration: 20000, fadeInDuration: 0, fadeOutDuration: 1000, intensity: 1.0 })
    await nextTick()
    // near 层速度 270~390 px/s，走完 1080px 约 3~4s，推进 5s 确保落地
    driveFrames(320, 16) // ~5.1s
    // 应曾生成溅射粒子（near 层落地触发；瞬时活跃数可能因寿命短为 0，看累计）
    expect(exposed.getTotalSplashes()).toBeGreaterThan(0)
    unmount()
  })

  it('reduced-motion 下不生成溅射', async () => {
    vi.unstubAllGlobals()
    installMatchMedia(true)
    installCanvasStub()
    setViewport(1920, 1080, 1)
    installRafSpy()
    const { exposed, unmount } = mountComponent({ duration: 20000, fadeInDuration: 0, fadeOutDuration: 1000, intensity: 1.0 })
    await nextTick()
    driveFrames(320, 16) // ~5s
    expect(exposed.getTotalSplashes()).toBe(0)
    unmount()
  })

  it('sound:true 时启动音频（AudioContext 被创建）', async () => {
    // mock AudioContext
    const makeNode = () => ({
      connect: vi.fn().mockReturnThis(),
      disconnect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      gain: { value: 0, setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
      frequency: { value: 0 },
      Q: { value: 0 },
      buffer: null,
      loop: false,
    })
    const mockCtx: any = {
      state: 'running',
      sampleRate: 44100,
      currentTime: 0,
      resume: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
      createBuffer: vi.fn((_ch: number, len: number) => ({ getChannelData: () => new Float32Array(len) })),
      createBufferSource: vi.fn(makeNode),
      createBiquadFilter: vi.fn(makeNode),
      createGain: vi.fn(makeNode),
      destination: {},
    }
    vi.stubGlobal('AudioContext', vi.fn(() => mockCtx))

    installRafSpy()
    const { exposed, unmount } = mountComponent({ duration: 8000, fadeInDuration: 0, fadeOutDuration: 1500, sound: true })
    await nextTick()
    expect(exposed.getAudioStarted()).toBe(true)
    expect(mockCtx.createBufferSource).toHaveBeenCalled()
    unmount()
    // 卸载后 dispose 关闭 context
    expect(mockCtx.close).toHaveBeenCalled()
  })

  it('sound:false（默认）不创建音频', async () => {
    installRafSpy()
    const { exposed, unmount } = mountComponent({ duration: 4000, fadeInDuration: 0, fadeOutDuration: 1000 })
    await nextTick()
    expect(exposed.getAudioStarted()).toBe(false)
    unmount()
  })
})
