import SnowEasterEgg from '@/components/easter-egg/SnowEasterEgg.vue'
import { isSnowShortcutEnabled } from '@/utils/easterEggEnv'
import {
  clamp,
  smoothstep,
  clampFadeDurations,
  createEffectService,
} from '@/services/effectServiceFactory'

// ========== 类型 ==========
/**
 * 下雪彩蛋参数。
 * - duration: 总时长 ms（3000~30000，默认 20000，给积雪足够时间堆高）
 * - intensity: 雪量 0~1（默认 0.6）
 * - opacity: 整体压暗遮罩强度 0~0.5（默认 0.15，雪天压暗比雷雨轻）
 * - wind: 风向 -0.4~0.4（默认 0.2，风较大）
 * - fadeInDuration: 淡入 ms（0~3000，默认 800）
 * - fadeOutDuration: 淡出 ms（500~6000，默认 3500）
 * - sound: 是否启用风声音效（默认 false；用户未设置偏好时弹提示让用户选择，记 localStorage）
 */
export interface SnowEffectOptions {
  duration?: number
  intensity?: number
  opacity?: number
  wind?: number
  fadeInDuration?: number
  fadeOutDuration?: number
  zIndex?: number
  sound?: boolean
}
export type SnowEffectPhase = 'entering' | 'visible' | 'leaving' | 'finished'

// ========== 纯函数（供组件复用 + 测试） ==========

/**
 * 根据 viewport 面积、雪量、设备、reduced-motion 计算最大雪花数。
 * 雪花比雨滴稀疏，基础系数 480，钳制到 [50, 800]。
 * 移动端降 30%，reduced-motion 降到 25%。
 */
export function computeMaxFlakes(
  vw: number,
  vh: number,
  intensity: number,
  isMobile: boolean,
  reducedMotion: boolean,
): number {
  const areaFactor = (vw * vh) / (1920 * 1080)
  let max = clamp(Math.round(480 * areaFactor * intensity), 50, 800)
  if (isMobile) max = Math.round(max * 0.7)
  if (reducedMotion) max = Math.max(4, Math.round(max * 0.25))
  return max
}

/** 参数安全化：clamp 到合法范围 + fadeIn+fadeOut<=duration 不变量。 */
export function clampSnowOptions(o: SnowEffectOptions = {}): Required<SnowEffectOptions> {
  const duration = clamp(o.duration ?? 20000, 3000, 30000)
  const fadeIn = clamp(o.fadeInDuration ?? 800, 0, 3000)
  const fadeOut = clamp(o.fadeOutDuration ?? 3500, 500, 6000)
  const { fadeInDuration, fadeOutDuration } = clampFadeDurations(duration, fadeIn, fadeOut)
  return {
    duration,
    fadeInDuration,
    fadeOutDuration,
    intensity: clamp(o.intensity ?? 0.6, 0, 1),
    opacity: clamp(o.opacity ?? 0.15, 0, 0.5),
    wind: clamp(o.wind ?? 0.2, -0.4, 0.4),
    zIndex: Math.round(clamp(o.zIndex ?? 2147483000, 0, 2147483647)),
    sound: o.sound ?? false,
  }
}

// ========== 单例 service ==========
const service = createEffectService({
  Component: SnowEasterEgg,
  normalize: clampSnowOptions,
  sequence: ['s', 'n', 'o', 'w'],
  quoteCategory: 'snowy',
  hasSound: true,
})

export const active = service.active
export const showSnowEffect = service.show
export const hideSnowEffect = service.hide
export const isSnowEffectActive = service.isActive
export function setupSnowEasterEggShortcut(): () => void {
  return service.setupShortcut(isSnowShortcutEnabled)
}

export { clamp, smoothstep }
