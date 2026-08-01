import EnvelopeEasterEgg from '@/components/easter-egg/EnvelopeEasterEgg.vue'
import { isEnvelopeShortcutEnabled } from '@/utils/easterEggEnv'
import {
  clamp,
  smoothstep,
  clampFadeDurations,
  createEffectService,
} from '@/services/effectServiceFactory'
import { generateOfferContent, OFFER_COMPANIES, filterEligibleInterviews } from '@/services/offerEffect'
import { useResumeStore } from '@/stores/resumeStore'
import { useInterviewStore } from '@/stores/interviewStore'
import { usePetStore } from '@/stores/petStore'
import type { Interview } from '@/types/interview'
import type { QuoteVars } from '@/data/petQuotes'

// ========== 类型 ==========
/**
 * 信封翻开 offer 彩蛋参数（单次舞台剧，非粒子流）。
 * - duration: 总时长 ms（3000~15000，默认 9000）
 * - opacity: 背景压暗遮罩 0~0.8（默认 0.45，聚光灯感突出居中信封）
 * - fadeInDuration: 淡入 ms（默认 0，信封直接出现）
 * - fadeOutDuration: 淡出 ms（500~3000，默认 1500）
 * - recipientName / company: 外部可覆盖；缺省时 show 内部按链路生成
 * - reducedMotion: 内部按 prefers-reduced-motion 自动判定，外部一般不传
 */
export interface EnvelopeEffectOptions {
  duration?: number
  opacity?: number
  fadeInDuration?: number
  fadeOutDuration?: number
  recipientName?: string
  company?: string
  zIndex?: number
  /** 本次是否播音（工厂 show 时由 promptSoundOnce 决定，组件据此而非全局开关判断） */
  sound?: boolean
}
export type EnvelopeEffectPhase = 'entering' | 'visible' | 'leaving' | 'finished'

// ========== 收件人 / 公司名 生成（纯逻辑，供测试） ==========

/** 占位收件人：简历无名字时的兜底 */
export const ENVELOPE_FALLBACK_RECIPIENT = '亲爱的求职者'

/**
 * 按优先级链算收件人：
 * 1. 当前正在编辑的简历名字（非空）
 * 2. resumeList 中随机一份有名字的简历
 * 3. 占位「亲爱的求职者」
 * @returns recipient 真名或占位；isRealName 是否为真名（决定 firstname 取首字）
 */
export function resolveRecipient(
  currentName?: string,
  resumeNames: string[] = [],
  seed = Math.random(),
): { recipient: string; isRealName: boolean } {
  if (currentName && currentName.trim()) {
    return { recipient: currentName.trim(), isRealName: true }
  }
  const named = resumeNames.filter(n => n && n.trim())
  if (named.length > 0) {
    const idx = Math.floor(seed * named.length) % named.length
    return { recipient: named[idx].trim(), isRealName: true }
  }
  return { recipient: ENVELOPE_FALLBACK_RECIPIENT, isRealName: false }
}

/**
 * 从合格面试里选一条，定 company + recipient（口径 X）。
 * - company 恒来自选中的面试公司（有面试则公司必从面试取）
 * - recipient 优先该面试 resumeId 关联的简历名；关联不上回落 resolveRecipient 原规则
 * - 无合格面试返回 null，调用方走默认 8 家公司 + 原规则用户名
 * @param pickResumeName 按 resumeId 取简历名（找不到返回 undefined）
 * @param fallback 关联不上时的兜底（currentName + resumeNames）
 */
export function resolveEnvelopeFromInterviews(
  interviews: Interview[],
  pickResumeName: (resumeId: string | null) => string | undefined,
  fallback: { currentName?: string; resumeNames?: string[] },
  seed = Math.random(),
): { recipientName: string; firstname: string; company: string } | null {
  const eligible = filterEligibleInterviews(interviews)
  if (eligible.length === 0) return null
  const idx = Math.floor(seed * eligible.length) % eligible.length
  const it = eligible[idx]
  const company = it.company.trim()
  // 关联简历优先；取不到回落原规则（currentName → resumeNames 随机 → 占位）
  const linked = pickResumeName(it.resumeId)
  const { recipient, isRealName } = linked && linked.trim()
    ? { recipient: linked.trim(), isRealName: true }
    : resolveRecipient(fallback.currentName, fallback.resumeNames ?? [], seed)
  const firstname = isRealName ? recipient.charAt(0) : ''
  return { recipientName: recipient, firstname, company }
}

/**
 * 从 store 现场算收件人 + firstname + company。
 * 优先走面试路径：有合格面试 → 公司从面试取、用户名取关联简历（关联不上回落原规则）；
 * 无合格面试 → 公司用 generateOfferContent() 默认 8 家、用户名走原规则。
 */
export function resolveEnvelopeContent(): {
  recipientName: string
  firstname: string
  company: string
} {
  const resumeStore = useResumeStore()
  const current = resumeStore.currentResume
  const currentName = current?.basicInfo?.name
  const resumeNames = (resumeStore.resumeList ?? []).map(r => r?.basicInfo?.name ?? '')

  // 面试路径：按 resumeId 从 resumeList 取简历名
  const fromInterviews = resolveEnvelopeFromInterviews(
    useInterviewStore().interviews,
    (rid) => {
      if (!rid) return undefined
      const r = resumeStore.resumeList?.find(x => x.id === rid)
      return r?.basicInfo?.name
    },
    { currentName, resumeNames },
  )
  if (fromInterviews) return fromInterviews

  // 默认路径：公司从 8 家随机，用户名走原规则
  const { recipient, isRealName } = resolveRecipient(currentName, resumeNames)
  const firstname = isRealName ? recipient.charAt(0) : ''
  const company = generateOfferContent().company
  return { recipientName: recipient, firstname, company }
}

// ========== 参数安全化 ==========

/** 参数安全化：clamp + fadeIn+fadeOut<=duration 不变量。 */
export function clampEnvelopeOptions(o: EnvelopeEffectOptions = {}): Required<EnvelopeEffectOptions> {
  const duration = clamp(o.duration ?? 9000, 3000, 15000)
  const fadeIn = clamp(o.fadeInDuration ?? 0, 0, 2000)
  const fadeOut = clamp(o.fadeOutDuration ?? 1500, 500, 3000)
  const { fadeInDuration, fadeOutDuration } = clampFadeDurations(duration, fadeIn, fadeOut)
  return {
    duration,
    fadeInDuration,
    fadeOutDuration,
    opacity: clamp(o.opacity ?? 0.45, 0, 0.8),
    recipientName: o.recipientName ?? '',
    company: o.company ?? '',
    zIndex: Math.round(clamp(o.zIndex ?? 2147483000, 0, 2147483647)),
    sound: o.sound !== false,
  }
}

// ========== 单例 service ==========

const service = createEffectService({
  Component: EnvelopeEasterEgg,
  normalize: clampEnvelopeOptions,
  sequence: ['h', 'i', 'r', 'e'],
  seqTimeout: 1800,
  // quoteCategory 留空：信封话术需传 firstname/company 变量，由 showEnvelopeEffect 自己调 sayCategory
  // onMatch 走自定义：触发前要先算收件人/公司名，工厂默认的 show() 不带上下文
  hasSound: true,
  onMatch: () => showEnvelopeEffect(),
})

export const active = service.active
export const isEnvelopeEffectActive = service.isActive

/**
 * 触发信封彩蛋。内部算收件人/firstname/company → 传组件渲染 + 调桌宠话术。
 * 外部可传 options 覆盖 recipientName/company（测试用）。
 */
export const showEnvelopeEffect = (options?: EnvelopeEffectOptions) => {
  // 现场算内容（pinia 此时已初始化，快捷键触发时 store 必然 ready）
  let recipientName = options?.recipientName ?? ''
  let firstname = ''
  let company = options?.company ?? ''
  if (!recipientName || !company) {
    try {
      const c = resolveEnvelopeContent()
      if (!recipientName) recipientName = c.recipientName
      if (!company) company = c.company
      firstname = c.firstname
    } catch {
      // pinia 未就绪：回退占位
      if (!recipientName) recipientName = ENVELOPE_FALLBACK_RECIPIENT
      if (!company) company = OFFER_COMPANIES[0]
    }
  } else {
    // 外部都传了：firstname 仅当 recipientName 是真名时取首字（占位名不算，避免「老亲」污染话术）
    firstname = recipientName && recipientName !== ENVELOPE_FALLBACK_RECIPIENT
      ? recipientName.charAt(0)
      : ''
  }

  // 桌宠话术：传变量供 {firstname}/{company} 插值
  const vars: QuoteVars = { name: recipientName, firstname, company }
  try { usePetStore().sayCategory('envelope', vars) } catch { /* pinia 未就绪，静默 */ }

  service.show({ ...options, recipientName, company })
}

export const hideEnvelopeEffect = service.hide

export function setupEnvelopeEasterEggShortcut(): () => void {
  return service.setupShortcut(isEnvelopeShortcutEnabled)
}

export { clamp, smoothstep }
