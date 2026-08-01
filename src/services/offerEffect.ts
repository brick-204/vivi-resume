import OfferEasterEgg from '@/components/easter-egg/OfferEasterEgg.vue'
import { isOfferShortcutEnabled } from '@/utils/easterEggEnv'
import {
  clamp,
  smoothstep,
  clampFadeDurations,
  createEffectService,
} from '@/services/effectServiceFactory'
import { useInterviewStore } from '@/stores/interviewStore'
import { usePetStore } from '@/stores/petStore'
import type { Interview } from '@/types/interview'
import { inferInterviewSegment } from '@/types/interview'

// ========== 类型 ==========
/**
 * 天上掉 offer 彩蛋参数。
 * - duration: 总时长 ms（3000~30000，默认 18000）
 * - intensity: offer 数量 0~1（默认 0.55，offer 视觉大且带 sprite，不需太密）
 * - opacity: 整体压暗遮罩强度 0~0.5（默认 0.12，offer 场景偏亮）
 * - wind: 风向 -0.4~0.4（默认 0.06，轻微飘）
 * - fadeInDuration: 淡入 ms（0~3000，默认 800）
 * - fadeOutDuration: 淡出 ms（500~6000，默认 3000）
 */
export interface OfferEffectOptions {
  duration?: number
  intensity?: number
  opacity?: number
  wind?: number
  fadeInDuration?: number
  fadeOutDuration?: number
  zIndex?: number
  /** 参与雨的公司名列表（触发时快照注入，组件据此预渲染 sprite） */
  companies?: string[]
}
export type OfferEffectPhase = 'entering' | 'visible' | 'leaving' | 'finished'

// ========== 纯函数（供组件复用 + 测试） ==========

// E：offer 内容生成 —— 信纸上展示「公司名 + Offer 字样」
// ponytail: 默认 8 家，配合组件按 company 预渲染 sprite（8×6=48 张），运行时零文字绘制
export const OFFER_COMPANIES = [
  '字节跳动', '腾讯', '阿里巴巴', '美团', '百度', '小米', '微软', '谷歌',
]

/** 公司名上限：超过则丢弃，避免印章文字撑爆/重叠 */
const MAX_COMPANY_LEN = 12

/**
 * 合格面试过滤（offer 雨 / 信封共用口径 X）：
 * 排除 rejected/closed 状态的公司，保留其余（drafting/submitted/interviewing/offer）。
 * 分区纯按 status（与 inferInterviewSegment 一致）。公司名 trim 后非空且不超长。
 */
export function filterEligibleInterviews(interviews: Interview[]): Interview[] {
  return interviews.filter(it => {
    const name = it.company?.trim()
    if (!name || name.length > MAX_COMPANY_LEN) return false
    // ended 段仅 offer 保留，rejected/closed 排除
    return !(inferInterviewSegment(it) === 'ended' && it.status !== 'offer')
  })
}

/**
 * 从面试记录里收集可参与 offer 雨的公司名（口径 X）：
 * 默认 8 家 ∪ 合格面试公司，trim、去重、去超长。结果非空，最坏回落默认列表。
 */
export function collectOfferCompanies(interviews: Interview[]): string[] {
  const allowed = new Set<string>(OFFER_COMPANIES)
  for (const it of filterEligibleInterviews(interviews)) {
    allowed.add(it.company.trim())
  }
  return Array.from(allowed)
}

/**
 * 生成一片 offer 的展示内容（公司名 + Offer 字样）。
 * 纯函数：相同 seed 产出相同结果，便于测试与确定性绘制。
 * companies 可选，默认 OFFER_COMPANIES（保持向后兼容与可测）。
 */
export function generateOfferContent(
  seed = Math.random(),
  companies: readonly string[] = OFFER_COMPANIES,
): { company: string; label: string } {
  const list = companies.length > 0 ? companies : OFFER_COMPANIES
  // 钳制 seed 到 [0,1)，避免负数得负索引 → list[-4] = undefined
  const s = seed > 0 && seed < 1 ? seed : 0
  const idx = Math.floor(s * list.length) % list.length
  return { company: list[idx], label: 'Offer' }
}

/**
 * 根据 viewport 面积、强度、设备、reduced-motion 计算最大 offer 数。
 * offer 比雪花大、带 sprite 贴图，基础系数 200，钳制到 [30, 280]。
 * ponytail: 2K/4K 屏粒子数过高会掉帧，offer 视觉大不需要雪花那么密
 */
export function computeMaxOffers(
  vw: number,
  vh: number,
  intensity: number,
  isMobile: boolean,
  reducedMotion: boolean,
): number {
  const areaFactor = (vw * vh) / (1920 * 1080)
  let max = clamp(Math.round(200 * areaFactor * intensity), 30, 280)
  if (isMobile) max = Math.round(max * 0.7)
  if (reducedMotion) max = Math.max(4, Math.round(max * 0.25))
  return max
}

/** 参数安全化：clamp + fadeIn+fadeOut<=duration 不变量。companies 为数据透传，不 clamp。 */
export function clampOfferOptions(
  o: OfferEffectOptions = {},
): Required<Omit<OfferEffectOptions, 'companies'>> & { companies?: string[] } {
  const duration = clamp(o.duration ?? 18000, 3000, 30000)
  const fadeIn = clamp(o.fadeInDuration ?? 800, 0, 3000)
  const fadeOut = clamp(o.fadeOutDuration ?? 3000, 500, 6000)
  const { fadeInDuration, fadeOutDuration } = clampFadeDurations(duration, fadeIn, fadeOut)
  return {
    duration,
    fadeInDuration,
    fadeOutDuration,
    intensity: clamp(o.intensity ?? 0.55, 0, 1),
    opacity: clamp(o.opacity ?? 0.12, 0, 0.5),
    wind: clamp(o.wind ?? 0.06, -0.4, 0.4),
    zIndex: Math.round(clamp(o.zIndex ?? 2147483000, 0, 2147483647)),
    companies: o.companies && o.companies.length > 0 ? o.companies : undefined,
  }
}

// ========== 单例 service ==========
// onMatch 走自定义：触发前要先从 interviewStore 算公司列表快照，
// 工厂默认的 show() 不带上下文。话术也由 showOfferEffect 自己调。
const service = createEffectService({
  Component: OfferEasterEgg,
  normalize: clampOfferOptions,
  sequence: ['o', 'f', 'f', 'e', 'r'],
  seqTimeout: 1800, // 5 键稍长
  onMatch: () => showOfferEffect(),
})

export const active = service.active
export const hideOfferEffect = service.hide
export const isOfferEffectActive = service.isActive

/**
 * 触发时从 interviewStore 读一次快照，算出公司列表注入 options.companies。
 * 彩蛋生命周期内公司列表固定；pinia 未就绪或读取失败则回落默认 8 家。
 */
const resolveCompanies = (): string[] => {
  try {
    return collectOfferCompanies(useInterviewStore().interviews)
  } catch {
    return OFFER_COMPANIES
  }
}

export const showOfferEffect = (options?: OfferEffectOptions) => {
  const companies = options?.companies ?? resolveCompanies()
  service.show({ ...options, companies })
  // 桌宠话术（pinia 未就绪静默）
  try { usePetStore().sayCategory('offer') } catch { /* pinia 未就绪，静默 */ }
}

export function setupOfferEasterEggShortcut(): () => void {
  return service.setupShortcut(isOfferShortcutEnabled)
}

export { clamp, smoothstep }
