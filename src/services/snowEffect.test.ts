import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  computeMaxFlakes,
  smoothstep,
  clampSnowOptions,
  showSnowEffect,
  hideSnowEffect,
  isSnowEffectActive,
  setupSnowEasterEggShortcut,
  active,
} from '@/services/snowEffect'
import { isSnowShortcutEnabled } from '@/utils/easterEggEnv'

// ========== jsdom 环境补丁 ==========
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
  const stub: Record<string, (...args: any[]) => void> = {}
  const methods = [
    'createLinearGradient', 'createRadialGradient', 'fillRect', 'clearRect',
    'beginPath', 'moveTo', 'lineTo', 'arc', 'stroke', 'fill', 'save', 'restore',
    'setTransform', 'scale', 'translate', 'rotate', 'quadraticCurveTo',
  ]
  for (const m of methods) stub[m] = vi.fn()
  const gradStub = { addColorStop: vi.fn() }
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
  // 清 localStorage 音效偏好，确保首次提示路径可测
  try { localStorage.clear() } catch { /* noop */ }
})

afterEach(() => {
  try { hideSnowEffect() } catch { /* noop */ }
  document.body.innerHTML = ''
  active.value = false
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

// ========== 纯函数 ==========
describe('smoothstep', () => {
  it('边界外钳制为 0/1，区间内平滑插值', () => {
    expect(smoothstep(-1, 0, 1)).toBe(0)
    expect(smoothstep(2, 0, 1)).toBe(1)
    const mid = smoothstep(0.5, 0, 1)
    expect(mid).toBeGreaterThan(0.4)
    expect(mid).toBeLessThan(0.6)
  })
})

describe('computeMaxFlakes', () => {
  it('intensity 越低，雪花数越少（单调递增）', () => {
    const low = computeMaxFlakes(1920, 1080, 0.2, false, false)
    const mid = computeMaxFlakes(1920, 1080, 0.6, false, false)
    const high = computeMaxFlakes(1920, 1080, 1.0, false, false)
    expect(low).toBeLessThan(mid)
    expect(mid).toBeLessThan(high)
  })

  it('reduced-motion 下雪花数降到约 25%', () => {
    const normal = computeMaxFlakes(1920, 1080, 0.8, false, false)
    const reduced = computeMaxFlakes(1920, 1080, 0.8, false, true)
    expect(reduced).toBeLessThanOrEqual(Math.round(normal * 0.26))
    expect(reduced).toBeGreaterThan(0)
  })

  it('大屏幕不会无上限生成雪花（有上限 800）', () => {
    const huge = computeMaxFlakes(3840, 2160, 1.0, false, false)
    expect(huge).toBeLessThanOrEqual(800)
  })
})

describe('clampSnowOptions', () => {
  it('默认值符合雪天语义', () => {
    const o = clampSnowOptions({})
    expect(o.duration).toBe(20000)
    expect(o.intensity).toBe(0.6)
    expect(o.opacity).toBe(0.15)
    expect(o.wind).toBe(0.2)
    expect(o.fadeInDuration).toBe(800)
    expect(o.fadeOutDuration).toBe(3500)
    expect(o.sound).toBe(false)
  })

  it('sound 默认关，可显式开', () => {
    expect(clampSnowOptions({}).sound).toBe(false)
    expect(clampSnowOptions({ sound: true }).sound).toBe(true)
  })

  it('参数超界被 clamp', () => {
    const o = clampSnowOptions({ duration: 100, intensity: 5, opacity: 0.9, wind: 2, fadeOutDuration: 1 })
    expect(o.duration).toBe(3000)
    expect(o.intensity).toBe(1)
    expect(o.opacity).toBe(0.5)
    expect(o.wind).toBe(0.4)
    expect(o.fadeOutDuration).toBe(500)
  })

  it('fadeIn + fadeOut 不超过 duration', () => {
    const o = clampSnowOptions({ duration: 3000, fadeInDuration: 3000, fadeOutDuration: 6000 })
    expect(o.fadeInDuration + o.fadeOutDuration).toBeLessThanOrEqual(o.duration)
  })
})

// ========== 单例 service ==========
describe('showSnowEffect 单例', () => {
  it('重复 show 不会同时存在两个 Canvas', () => {
    showSnowEffect()
    const first = document.querySelectorAll('canvas').length
    showSnowEffect()
    const second = document.querySelectorAll('canvas').length
    expect(first).toBe(1)
    expect(second).toBe(1)
  })

  it('hide 后 DOM 中 canvas 数不叠加', () => {
    showSnowEffect()
    expect(document.querySelector('canvas')).not.toBeNull()
    hideSnowEffect()
    expect(document.querySelectorAll('canvas').length).toBeLessThanOrEqual(1)
  })
})

describe('pointer-events 透传', () => {
  it('效果层保持 pointer-events: none', () => {
    showSnowEffect()
    const layer = document.querySelector('.snow-layer') as HTMLElement | null
    expect(layer).not.toBeNull()
    expect(layer!.style.pointerEvents).toBe('none')
    expect(layer!.style.userSelect).toBe('none')
  })
})

// ========== S→N→O→W 快捷键 ==========
describe('S→N→O→W 快捷键', () => {
  function typeKeys(keys: string[]) {
    for (const k of keys) {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }))
    }
  }

  it('开发环境路径正常触发', () => {
    const enabled = isSnowShortcutEnabled()
    const cleanup = setupSnowEasterEggShortcut()
    if (enabled) {
      typeKeys(['s', 'n', 'o', 'w'])
      expect(isSnowEffectActive()).toBe(true)
    } else {
      typeKeys(['s', 'n', 'o', 'w'])
      expect(isSnowEffectActive()).toBe(false)
    }
    cleanup()
  })

  it('输入框内输入 SNOW 不触发', () => {
    const cleanup = setupSnowEasterEggShortcut()
    const input = document.createElement('input')
    document.body.appendChild(input)
    for (const k of ['s', 'n', 'o', 'w']) {
      input.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }))
    }
    expect(isSnowEffectActive()).toBe(false)
    cleanup()
  })
})

// ========== active ref ==========
describe('active ref', () => {
  it('show 后 active 为 true', () => {
    expect(active.value).toBe(false)
    showSnowEffect()
    expect(active.value).toBe(true)
  })
})

// ========== 组件层：帧推进 ==========
import { createApp, nextTick } from 'vue'
import SnowEasterEgg from '@/components/easter-egg/SnowEasterEgg.vue'
import type { SnowEffectOptions } from '@/services/snowEffect'

interface Exposed {
  requestLeave: () => void
  getActiveCount: () => number
  getEmissionMultiplier: () => number
  getFlake: (i: number) => { x: number; y: number; speed: number } | null
  getPhase: () => string
  getAudioStarted: () => boolean
}

const rafCallbacks: Array<(t: number) => void> = []
let perfNow = 1000

function mountComponent(options?: SnowEffectOptions): { exposed: Exposed; unmount: () => void } {
  const opts = clampSnowOptions(options)
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(SnowEasterEgg, { options: opts, token: 1 })
  const inst = app.mount(host) as unknown as Exposed
  return { exposed: inst, unmount: () => app.unmount() }
}

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

  it('退出阶段不再创建新雪花（emissionMultiplier 降到 0）', async () => {
    const { exposed, unmount } = mountComponent({ duration: 4000, fadeInDuration: 200, fadeOutDuration: 1500 })
    await nextTick()
    driveFrames(20, 16)
    expect(exposed.getActiveCount()).toBeGreaterThan(0)
    exposed.requestLeave()
    perfNow += 1400
    driveFrames(60, 25)
    expect(exposed.getEmissionMultiplier()).toBeLessThan(0.3)
    unmount()
  })

  it('已有雪花在淡出阶段继续移动', async () => {
    const { exposed, unmount } = mountComponent({ duration: 4000, fadeInDuration: 200, fadeOutDuration: 1500 })
    await nextTick()
    driveFrames(20, 16)
    expect(exposed.getActiveCount()).toBeGreaterThan(0)
    exposed.requestLeave()
    perfNow += 100
    driveFrames(5, 25)
    expect(exposed.getPhase()).toBe('leaving')
    expect(exposed.getActiveCount()).toBeGreaterThan(0)
    unmount()
  })

  it('reduced-motion 下雪花速度降低', async () => {
    vi.unstubAllGlobals()
    installMatchMedia(true)
    installCanvasStub()
    setViewport(1920, 1080, 1)
    installRafSpy()
    const { exposed, unmount } = mountComponent({ duration: 4000, fadeInDuration: 0, fadeOutDuration: 1500 })
    await nextTick()
    driveFrames(120, 16)
    const count = exposed.getActiveCount()
    expect(count).toBeGreaterThan(0)
    let flake = exposed.getFlake(0)
    for (let i = 0; i < count && !flake; i++) flake = exposed.getFlake(i)
    expect(flake).not.toBeNull()
    // reduced-motion 速度上限：近景 220*0.7 ≈ 154
    expect(flake!.speed).toBeLessThanOrEqual(155)
    unmount()
  })

  it('sound:true 时启动音频', async () => {
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
