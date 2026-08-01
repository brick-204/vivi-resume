import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  computeMaxOffers,
  smoothstep,
  clampOfferOptions,
  generateOfferContent,
  collectOfferCompanies,
  OFFER_COMPANIES,
  showOfferEffect,
  hideOfferEffect,
  isOfferEffectActive,
  setupOfferEasterEggShortcut,
  active,
} from '@/services/offerEffect'
import { isOfferShortcutEnabled } from '@/utils/easterEggEnv'
import { createEmptyInterview, createEmptyRound } from '@/types/interview'
import type { Interview, InterviewStatus } from '@/types/interview'

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
    'beginPath', 'moveTo', 'lineTo', 'closePath', 'arc', 'stroke', 'fill', 'save', 'restore',
    'setTransform', 'scale', 'translate', 'rotate', 'strokeRect', 'fillText',
    'drawImage', 'quadraticCurveTo',
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
})

afterEach(() => {
  try { hideOfferEffect() } catch { /* noop */ }
  document.body.innerHTML = ''
  active.value = false
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

// ========== 纯函数 ==========
describe('smoothstep', () => {
  it('边界外钳制为 0/1', () => {
    expect(smoothstep(-1, 0, 1)).toBe(0)
    expect(smoothstep(2, 0, 1)).toBe(1)
  })
})

describe('computeMaxOffers', () => {
  it('intensity 越低，offer 数越少', () => {
    const low = computeMaxOffers(1920, 1080, 0.2, false, false)
    const high = computeMaxOffers(1920, 1080, 1.0, false, false)
    expect(low).toBeLessThan(high)
  })

  it('reduced-motion 下 offer 数降低', () => {
    const normal = computeMaxOffers(1920, 1080, 0.8, false, false)
    const reduced = computeMaxOffers(1920, 1080, 0.8, false, true)
    expect(reduced).toBeLessThan(normal)
    expect(reduced).toBeGreaterThan(0)
  })

  it('大屏幕有上限 280', () => {
    expect(computeMaxOffers(3840, 2160, 1.0, false, false)).toBeLessThanOrEqual(280)
  })
})

describe('generateOfferContent', () => {
  it('相同 seed 产出相同内容', () => {
    expect(generateOfferContent(0.3)).toEqual(generateOfferContent(0.3))
  })

  it('label 恒为 Offer，company 非空', () => {
    const c = generateOfferContent(0.5)
    expect(c.label).toBe('Offer')
    expect(c.company.length).toBeGreaterThan(0)
  })

  it('不同 seed 可能产出不同公司', () => {
    const companies = new Set<string>()
    for (let i = 0; i < 30; i++) companies.add(generateOfferContent(i / 30).company)
    expect(companies.size).toBeGreaterThan(1)
  })

  it('传入自定义公司列表时从中取', () => {
    const c = generateOfferContent(0.0, ['自定义公司A', '自定义公司B'])
    expect(['自定义公司A', '自定义公司B']).toContain(c.company)
  })

  it('空列表回落默认公司', () => {
    const c = generateOfferContent(0.5, [])
    expect(OFFER_COMPANIES).toContain(c.company)
  })
})

// ========== collectOfferCompanies（口径 X） ==========
/** 造一条面试记录：覆盖关键字段，rounds 为空（无轮次则 upcoming） */
function makeInterview(company: string, status: InterviewStatus, overrides: Partial<Interview> = {}): Interview {
  return { ...createEmptyInterview(), company, status, ...overrides }
}

describe('collectOfferCompanies', () => {
  it('无面试记录时回落默认 8 家', () => {
    expect(collectOfferCompanies([])).toEqual(OFFER_COMPANIES)
  })

  it('upcoming/ongoing 公司被收录（与默认合并去重）', () => {
    const list = [
      makeInterview('小红书', 'drafting'),       // upcoming
      makeInterview('网易', 'interviewing'),     // ongoing
    ]
    const result = collectOfferCompanies(list)
    expect(result).toContain('小红书')
    expect(result).toContain('网易')
    // 默认 8 家仍在
    for (const c of OFFER_COMPANIES) expect(result).toContain(c)
    // 去重：默认与面试无交集，总数 = 8 + 2
    expect(result).toHaveLength(OFFER_COMPANIES.length + 2)
  })

  it('offer 状态公司被保留（拿到 offer 应景）', () => {
    const list = [makeInterview('拿了Offer的公司', 'offer')]
    expect(collectOfferCompanies(list)).toContain('拿了Offer的公司')
  })

  it('rejected/closed 状态公司被排除', () => {
    const list = [
      makeInterview('被拒公司', 'rejected'),
      makeInterview('关闭公司', 'closed'),
    ]
    const result = collectOfferCompanies(list)
    expect(result).not.toContain('被拒公司')
    expect(result).not.toContain('关闭公司')
  })

  it('有 failed 轮但状态为面试中的公司仍被收录（纯按 status 分区）', () => {
    const list = [makeInterview('挂了的公司', 'interviewing', {
      rounds: [{ ...createEmptyRound(), status: 'failed' }],
    })]
    expect(collectOfferCompanies(list)).toContain('挂了的公司')
  })

  it('trim + 去空 + 去超长(>12字)', () => {
    const longName = '这是一个超过十二个字的公司名称呀'.slice(0, 13)
    const list = [
      makeInterview('  拼多多  ', 'drafting'),  // trim 后收录
      makeInterview('', 'drafting'),             // 空丢弃
      makeInterview('   ', 'drafting'),          // 空白丢弃
      makeInterview(longName, 'drafting'),       // 超长丢弃
    ]
    const result = collectOfferCompanies(list)
    expect(result).toContain('拼多多')
    expect(result).not.toContain(longName)
  })

  it('与默认重名的面试公司去重', () => {
    const list = [makeInterview('腾讯', 'drafting')]
    const result = collectOfferCompanies(list)
    expect(result.filter(c => c === '腾讯')).toHaveLength(1)
  })
})

describe('clampOfferOptions', () => {
  it('默认值符合 offer 语义', () => {
    const o = clampOfferOptions({})
    expect(o.duration).toBe(18000)
    expect(o.intensity).toBe(0.55)
    expect(o.opacity).toBe(0.12)
    expect(o.wind).toBe(0.06)
    expect(o.fadeInDuration).toBe(800)
    expect(o.fadeOutDuration).toBe(3000)
  })

  it('参数超界被 clamp', () => {
    const o = clampOfferOptions({ duration: 100, intensity: 5, opacity: 0.9, wind: 2 })
    expect(o.duration).toBe(3000)
    expect(o.intensity).toBe(1)
    expect(o.opacity).toBe(0.5)
    expect(o.wind).toBe(0.4)
  })

  it('fadeIn + fadeOut 不超过 duration', () => {
    const o = clampOfferOptions({ duration: 3000, fadeInDuration: 3000, fadeOutDuration: 6000 })
    expect(o.fadeInDuration + o.fadeOutDuration).toBeLessThanOrEqual(o.duration)
  })
})

// ========== 单例 service ==========
describe('showOfferEffect 单例', () => {
  it('重复 show 不会同时存在两个 Canvas', () => {
    showOfferEffect()
    const first = document.querySelectorAll('canvas').length
    showOfferEffect()
    const second = document.querySelectorAll('canvas').length
    expect(first).toBe(1)
    expect(second).toBe(1)
  })
})

describe('pointer-events 透传', () => {
  it('效果层保持 pointer-events: none', () => {
    showOfferEffect()
    const layer = document.querySelector('.offer-layer') as HTMLElement | null
    expect(layer).not.toBeNull()
    expect(layer!.style.pointerEvents).toBe('none')
  })
})

// ========== O→F→F→E→R 快捷键 ==========
describe('O→F→F→E→R 快捷键', () => {
  function typeKeys(keys: string[]) {
    for (const k of keys) {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }))
    }
  }

  it('正常路径触发', () => {
    const enabled = isOfferShortcutEnabled()
    const cleanup = setupOfferEasterEggShortcut()
    if (enabled) {
      typeKeys(['o', 'f', 'f', 'e', 'r'])
      expect(isOfferEffectActive()).toBe(true)
    } else {
      typeKeys(['o', 'f', 'f', 'e', 'r'])
      expect(isOfferEffectActive()).toBe(false)
    }
    cleanup()
  })

  it('输入框内输入 OFFER 不触发', () => {
    const cleanup = setupOfferEasterEggShortcut()
    const input = document.createElement('input')
    document.body.appendChild(input)
    for (const k of ['o', 'f', 'f', 'e', 'r']) {
      input.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }))
    }
    expect(isOfferEffectActive()).toBe(false)
    cleanup()
  })
})

// ========== active ref ==========
describe('active ref', () => {
  it('show 后 active 为 true', () => {
    expect(active.value).toBe(false)
    showOfferEffect()
    expect(active.value).toBe(true)
  })
})

// ========== 组件层：帧推进 ==========
import { createApp, nextTick } from 'vue'
import OfferEasterEgg from '@/components/easter-egg/OfferEasterEgg.vue'
import type { OfferEffectOptions } from '@/services/offerEffect'

interface Exposed {
  requestLeave: () => void
  getActiveCount: () => number
  getEmissionMultiplier: () => number
  getItem: (i: number) => { x: number; y: number; speed: number; flipPhase: number } | null
  getPhase: () => string
}

const rafCallbacks: Array<(t: number) => void> = []
let perfNow = 1000

function mountComponent(options?: OfferEffectOptions): { exposed: Exposed; unmount: () => void } {
  const opts = clampOfferOptions(options)
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(OfferEasterEgg, { options: opts, token: 1 })
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

  it('生成 offer 粒子（信纸）', async () => {
    const { exposed, unmount } = mountComponent({ duration: 8000, fadeInDuration: 200, fadeOutDuration: 1500 })
    await nextTick()
    driveFrames(30, 16)
    expect(exposed.getActiveCount()).toBeGreaterThan(0)
    // 取若干粒子，均为信纸（含翻面相位）
    let hasFlip = false
    for (let i = 0; i < exposed.getActiveCount(); i++) {
      const it = exposed.getItem(i)
      if (!it) continue
      if (typeof it.flipPhase === 'number') hasFlip = true
    }
    expect(hasFlip).toBe(true)
    unmount()
  })

  it('退出阶段不再生成新粒子', async () => {
    const { exposed, unmount } = mountComponent({ duration: 4000, fadeInDuration: 200, fadeOutDuration: 1500 })
    await nextTick()
    driveFrames(20, 16)
    exposed.requestLeave()
    perfNow += 1400
    driveFrames(60, 25)
    expect(exposed.getEmissionMultiplier()).toBeLessThan(0.3)
    unmount()
  })

  it('reduced-motion 下速度降低', async () => {
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
    let item = exposed.getItem(0)
    for (let i = 0; i < count && !item; i++) item = exposed.getItem(i)
    expect(item).not.toBeNull()
    // reduced-motion 速度上限：近景 200*0.7 ≈ 140
    expect(item!.speed).toBeLessThanOrEqual(141)
    unmount()
  })
})
