import OfferEasterEgg from '@/components/easter-egg/OfferEasterEgg.vue'
import { isOfferShortcutEnabled } from '@/utils/easterEggEnv'
import {
  clamp,
  smoothstep,
  clampFadeDurations,
  createEffectService,
} from '@/services/effectServiceFactory'

// ========== 类型 ==========
/**
 * 天上掉 offer 彩蛋参数。
 * - duration: 总时长 ms（3000~30000，默认 18000）
 * - intensity: offer 数量 0~1（默认 0.7）
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
}
export type OfferEffectPhase = 'entering' | 'visible' | 'leaving' | 'finished'

// ========== 纯函数（供组件复用 + 测试） ==========

/**
 * 根据 viewport 面积、强度、设备、reduced-motion 计算最大 offer 数。
 * offer 比雪花大，基础系数 300，钳制到 [30, 500]。
 */
export function computeMaxOffers(
  vw: number,
  vh: number,
  intensity: number,
  isMobile: boolean,
  reducedMotion: boolean,
): number {
  const areaFactor = (vw * vh) / (1920 * 1080)
  let max = clamp(Math.round(300 * areaFactor * intensity), 30, 500)
  if (isMobile) max = Math.round(max * 0.7)
  if (reducedMotion) max = Math.max(4, Math.round(max * 0.25))
  return max
}

/** 参数安全化：clamp + fadeIn+fadeOut<=duration 不变量。 */
export function clampOfferOptions(o: OfferEffectOptions = {}): Required<OfferEffectOptions> {
  const duration = clamp(o.duration ?? 18000, 3000, 30000)
  const fadeIn = clamp(o.fadeInDuration ?? 800, 0, 3000)
  const fadeOut = clamp(o.fadeOutDuration ?? 3000, 500, 6000)
  const { fadeInDuration, fadeOutDuration } = clampFadeDurations(duration, fadeIn, fadeOut)
  return {
    duration,
    fadeInDuration,
    fadeOutDuration,
    intensity: clamp(o.intensity ?? 0.7, 0, 1),
    opacity: clamp(o.opacity ?? 0.12, 0, 0.5),
    wind: clamp(o.wind ?? 0.06, -0.4, 0.4),
    zIndex: Math.round(clamp(o.zIndex ?? 2147483000, 0, 2147483647)),
  }
}

// ========== 单例 service ==========
const service = createEffectService({
  Component: OfferEasterEgg,
  normalize: clampOfferOptions,
  sequence: ['o', 'f', 'f', 'e', 'r'],
  seqTimeout: 1800, // 5 键稍长
  quoteCategory: 'offer',
})

export const active = service.active
export const showOfferEffect = service.show
export const hideOfferEffect = service.hide
export const isOfferEffectActive = service.isActive
export function setupOfferEasterEggShortcut(): () => void {
  return service.setupShortcut(isOfferShortcutEnabled)
}

export { clamp, smoothstep }
