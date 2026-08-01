import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  clampEnvelopeOptions,
  resolveRecipient,
  resolveEnvelopeFromInterviews,
  ENVELOPE_FALLBACK_RECIPIENT,
  showEnvelopeEffect,
  hideEnvelopeEffect,
  isEnvelopeEffectActive,
  setupEnvelopeEasterEggShortcut,
  active,
} from '@/services/envelopeEffect'
import { isEnvelopeShortcutEnabled } from '@/utils/easterEggEnv'
import { fillVarsTester } from '@/data/petQuotes'
import { createEmptyInterview } from '@/types/interview'
import type { Interview, InterviewStatus } from '@/types/interview'

// ========== 纯函数 ==========

describe('clampEnvelopeOptions', () => {
  it('默认值符合信封语义', () => {
    const o = clampEnvelopeOptions({})
    expect(o.duration).toBe(9000)
    expect(o.opacity).toBe(0.45)
    expect(o.fadeInDuration).toBe(0)
    expect(o.fadeOutDuration).toBe(1500)
    expect(o.recipientName).toBe('')
    expect(o.company).toBe('')
  })

  it('参数超界被 clamp', () => {
    const o = clampEnvelopeOptions({ duration: 100, opacity: 1.5, fadeOutDuration: 99999 })
    expect(o.duration).toBe(3000)
    expect(o.opacity).toBe(0.8)
    expect(o.fadeOutDuration).toBeLessThanOrEqual(3000)
  })

  it('fadeIn + fadeOut 不超过 duration', () => {
    const o = clampEnvelopeOptions({ duration: 2000, fadeInDuration: 1500, fadeOutDuration: 1500 })
    expect(o.fadeInDuration + o.fadeOutDuration).toBeLessThanOrEqual(o.duration)
  })
})

describe('resolveRecipient', () => {
  it('当前简历名非空 → 用当前名', () => {
    const r = resolveRecipient('张三', ['李四', '王五'])
    expect(r.recipient).toBe('张三')
    expect(r.isRealName).toBe(true)
  })

  it('当前名为空 → 从 resumeNames 随机挑', () => {
    const r = resolveRecipient('', ['李四', '王五'], 0.5)
    expect(['李四', '王五']).toContain(r.recipient)
    expect(r.isRealName).toBe(true)
  })

  it('全部为空 → 占位「亲爱的求职者」', () => {
    const r = resolveRecipient('', [])
    expect(r.recipient).toBe(ENVELOPE_FALLBACK_RECIPIENT)
    expect(r.isRealName).toBe(false)
  })

  it('resumeNames 含空字符串 → 过滤掉', () => {
    const r = resolveRecipient('', ['', '  ', '赵六'], 0.99)
    expect(r.recipient).toBe('赵六')
    expect(r.isRealName).toBe(true)
  })

  it('相同 seed 产出相同结果', () => {
    const a = resolveRecipient('', ['甲', '乙', '丙'], 0.3)
    const b = resolveRecipient('', ['甲', '乙', '丙'], 0.3)
    expect(a).toEqual(b)
  })
})

// ========== resolveEnvelopeFromInterviews（面试路径） ==========
function makeInterview(company: string, status: InterviewStatus, overrides: Partial<Interview> = {}): Interview {
  return { ...createEmptyInterview(), company, status, ...overrides }
}

describe('resolveEnvelopeFromInterviews', () => {
  const pickById = (map: Record<string, string>) => (rid: string | null) =>
    rid ? map[rid] : undefined

  it('无合格面试返回 null（走默认路径）', () => {
    expect(resolveEnvelopeFromInterviews([], pickById({}), {})).toBeNull()
    // 全是 rejected/closed 也不算合格
    expect(resolveEnvelopeFromInterviews(
      [makeInterview('被拒公司', 'rejected')], pickById({}), {},
    )).toBeNull()
  })

  it('有合格面试 → company 来自面试，recipient 取关联简历名', () => {
    const list = [makeInterview('小红书', 'interviewing', { resumeId: 'r1' })]
    const r = resolveEnvelopeFromInterviews(
      list, pickById({ r1: '张三' }), { currentName: '李四', resumeNames: [] }, 0.0,
    )
    expect(r!.company).toBe('小红书')
    expect(r!.recipientName).toBe('张三')
    expect(r!.firstname).toBe('张')
  })

  it('面试没关联简历 → company 仍来自该面试，recipient 回落原规则', () => {
    const list = [makeInterview('网易', 'interviewing', { resumeId: 'rX' })]
    const r = resolveEnvelopeFromInterviews(
      list, pickById({}), // rX 找不到
      { currentName: '王五', resumeNames: [] }, 0.0,
    )
    expect(r!.company).toBe('网易')
    expect(r!.recipientName).toBe('王五')
    expect(r!.firstname).toBe('王')
  })

  it('面试没关联简历且无当前名 → 回落 resumeNames 随机', () => {
    const list = [makeInterview('美团', 'drafting', { resumeId: null })]
    const r = resolveEnvelopeFromInterviews(
      list, pickById({}),
      { currentName: '', resumeNames: ['赵六', '钱七'] }, 0.99,
    )
    expect(r!.company).toBe('美团')
    expect(['赵六', '钱七']).toContain(r!.recipientName)
  })

  it('多条合格面试 → 按 seed 选其一', () => {
    const list = [
      makeInterview('公司A', 'interviewing', { resumeId: 'rA' }),
      makeInterview('公司B', 'interviewing', { resumeId: 'rB' }),
    ]
    const r0 = resolveEnvelopeFromInterviews(list, pickById({ rA: '甲', rB: '乙' }), {}, 0.0)
    const r1 = resolveEnvelopeFromInterviews(list, pickById({ rA: '甲', rB: '乙' }), {}, 0.99)
    expect(['公司A', '公司B']).toContain(r0!.company)
    expect(['公司A', '公司B']).toContain(r1!.company)
    // seed=0 取第 0 条
    expect(r0!.company).toBe('公司A')
    expect(r0!.recipientName).toBe('甲')
  })

  it('关联简历名为空 → 回落原规则（不取空名）', () => {
    const list = [makeInterview('字节', 'interviewing', { resumeId: 'r1' })]
    const r = resolveEnvelopeFromInterviews(
      list, pickById({ r1: '   ' }), // 关联到的名字是空白
      { currentName: '陈八', resumeNames: [] }, 0.0,
    )
    expect(r!.company).toBe('字节')
    expect(r!.recipientName).toBe('陈八')
  })

  it('关联简历名取不到且原规则全空 → 占位收件人', () => {
    const list = [makeInterview('腾讯', 'interviewing', { resumeId: 'rX' })]
    const r = resolveEnvelopeFromInterviews(
      list, pickById({}),
      { currentName: '', resumeNames: [] }, 0.0,
    )
    expect(r!.company).toBe('腾讯')
    expect(r!.recipientName).toBe(ENVELOPE_FALLBACK_RECIPIENT)
    expect(r!.firstname).toBe('') // 占位名 firstname 为空
  })
})

// ========== fillVars 变量插值 ==========

describe('fillVars', () => {
  it('{name} 缺省回退 v仔', () => {
    expect(fillVarsTester('你好{name}')).toBe('你好v仔')
  })

  it('{firstname} 有值替换首字', () => {
    expect(fillVarsTester('老{firstname}，你要 offer 不要', { firstname: '张' }))
      .toBe('老张，你要 offer 不要')
  })

  it('{firstname} 无值时整段移除"老{firstname}，"', () => {
    expect(fillVarsTester('老{firstname}，你要 offer 不要')).toBe('你要 offer 不要')
  })

  it('{company} 有值替换', () => {
    expect(fillVarsTester('你的{company} offer 来啦', { company: '字节跳动' }))
      .toBe('你的字节跳动 offer 来啦')
  })

  it('{company} 无值替换为空', () => {
    expect(fillVarsTester('你的{company} offer 来啦')).toBe('你的 offer 来啦')
  })

  it('兼容 string 旧用法（当 name）', () => {
    expect(fillVarsTester('嗨{name}', '小V')).toBe('嗨小V')
  })

  it('三变量同时替换', () => {
    expect(fillVarsTester('{firstname}，{company}给{name}发offer了', {
      name: '桌宠', firstname: '张', company: '腾讯',
    })).toBe('张，腾讯给桌宠发offer了')
  })
})

// ========== 单例 service ==========

beforeEach(() => {
  document.body.innerHTML = ''
  active.value = false
})

afterEach(() => {
  try { hideEnvelopeEffect() } catch { /* noop */ }
  document.body.innerHTML = ''
  active.value = false
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('showEnvelopeEffect 单例', () => {
  it('重复 show 不会同时存在两个舞台', () => {
    showEnvelopeEffect()
    const first = document.querySelectorAll('.envelope-stage').length
    showEnvelopeEffect()
    const second = document.querySelectorAll('.envelope-stage').length
    expect(first).toBe(1)
    expect(second).toBe(1)
  })

  it('show 后 active 为 true', () => {
    expect(active.value).toBe(false)
    showEnvelopeEffect()
    expect(active.value).toBe(true)
  })
})

describe('pointer-events 透传', () => {
  it('效果层保持 pointer-events: none', () => {
    showEnvelopeEffect()
    const layer = document.querySelector('.envelope-layer') as HTMLElement | null
    expect(layer).not.toBeNull()
    expect(layer!.style.pointerEvents).toBe('none')
  })
})

// ========== H→I→R→E 快捷键 ==========

describe('H→I→R→E 快捷键', () => {
  function typeKeys(keys: string[]) {
    for (const k of keys) {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }))
    }
  }

  it('正常路径触发', () => {
    const enabled = isEnvelopeShortcutEnabled()
    const cleanup = setupEnvelopeEasterEggShortcut()
    if (enabled) {
      typeKeys(['h', 'i', 'r', 'e'])
      expect(isEnvelopeEffectActive()).toBe(true)
    } else {
      typeKeys(['h', 'i', 'r', 'e'])
      expect(isEnvelopeEffectActive()).toBe(false)
    }
    cleanup()
  })

  it('输入框内输入 HIRE 不触发', () => {
    const cleanup = setupEnvelopeEasterEggShortcut()
    const input = document.createElement('input')
    document.body.appendChild(input)
    for (const k of ['h', 'i', 'r', 'e']) {
      input.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }))
    }
    expect(isEnvelopeEffectActive()).toBe(false)
    cleanup()
  })

  it('错序不触发', () => {
    const cleanup = setupEnvelopeEasterEggShortcut()
    typeKeys(['h', 'r', 'i', 'e'])
    expect(isEnvelopeEffectActive()).toBe(false)
    cleanup()
  })
})

// ========== 组件层：DOM 推进 ==========

import { createApp, nextTick } from 'vue'
import EnvelopeEasterEgg from '@/components/easter-egg/EnvelopeEasterEgg.vue'
import type { EnvelopeEffectOptions } from '@/services/envelopeEffect'

interface Exposed {
  requestLeave: () => void
  getPhase: () => string
}

function mountComponent(options?: EnvelopeEffectOptions): { exposed: Exposed; unmount: () => void } {
  const opts = clampEnvelopeOptions(options)
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(EnvelopeEasterEgg, {
    options: { ...opts, recipientName: opts.recipientName || '张三', company: opts.company || '字节跳动' },
    token: 1,
  })
  const inst = app.mount(host) as unknown as Exposed
  return { exposed: inst, unmount: () => app.unmount() }
}

describe('组件 DOM 推进', () => {
  it('挂载后渲染信封 + 信纸 + 翻盖三层', async () => {
    const { unmount } = mountComponent()
    await nextTick()
    expect(document.querySelector('.envelope')).not.toBeNull()
    expect(document.querySelector('.letter')).not.toBeNull()
    expect(document.querySelector('.envelope-flap')).not.toBeNull()
    expect(document.querySelector('.envelope-front')).not.toBeNull()
    unmount()
  })

  it('信纸渲染收件人 + 公司名', async () => {
    const { unmount } = mountComponent()
    await nextTick()
    const company = document.querySelector('.letter-company')?.textContent
    const recipient = document.querySelector('.letter-recipient')?.textContent
    expect(company).toBe('字节跳动')
    expect(recipient).toContain('张三')
    unmount()
  })

  it('reduced-motion 下翻盖直接打开态（无动画类）', async () => {
    vi.stubGlobal('matchMedia', vi.fn((q: string) => ({
      matches: q.includes('reduce'),
      media: q,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      onchange: null,
      dispatchEvent: vi.fn(() => false),
    })))
    const { unmount } = mountComponent()
    await nextTick()
    const stage = document.querySelector('.envelope-stage')
    expect(stage?.classList.contains('is-reduced')).toBe(true)
    unmount()
  })

  it('requestLeave 后进入 leaving 阶段', async () => {
    const { exposed, unmount } = mountComponent()
    await nextTick()
    exposed.requestLeave()
    expect(exposed.getPhase()).toBe('leaving')
    unmount()
  })
})
