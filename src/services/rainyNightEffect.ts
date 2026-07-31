import RainyNightEasterEgg from '@/components/easter-egg/RainyNightEasterEgg.vue'
import { isRainShortcutEnabled } from '@/utils/easterEggEnv'
import {
  clamp,
  smoothstep,
  clampFadeDurations,
  createEffectService,
} from '@/services/effectServiceFactory'

// ========== 类型 ==========
/**
 * 雷雨彩蛋参数。
 * - duration: 总时长 ms（3000~30000，默认 13000）
 * - intensity: 雨量 0~1（默认 0.7，雷雨偏密）
 * - opacity: 整体压暗遮罩强度 0~0.5（默认 0.28，雷雨氛围）
 * - wind: 风向 -0.4~0.4，正数向右倾斜，负数向左（默认 0.12）
 * - fadeInDuration: 淡入 ms（0~3000，默认 600）
 * - fadeOutDuration: 淡出 ms（500~6000，默认 4500）
 * - thunder: 是否启用闪电（默认 true）
 * - sound: 是否启用音效（默认 false；用户未设置偏好时弹提示让用户选择，记 localStorage）
 */
export interface LightRainEffectOptions {
  duration?: number
  intensity?: number
  opacity?: number
  wind?: number
  fadeInDuration?: number
  fadeOutDuration?: number
  zIndex?: number
  thunder?: boolean
  sound?: boolean
}
/** 旧类型别名（兼容现有调用，无 wind 也能传） */
export type RainyNightEffectOptions = LightRainEffectOptions
export type EffectPhase = 'entering' | 'visible' | 'leaving' | 'finished'

// ========== 纯函数（供组件复用 + 测试） ==========

/**
 * 根据 viewport 面积、雨量、设备、reduced-motion 计算最大雨滴数。
 * 基础公式：360 * areaFactor * intensity，钳制到 [40,520]。
 * 移动端降 30%，reduced-motion 降到 25%。
 */
export function computeMaxDrops(
  vw: number,
  vh: number,
  intensity: number,
  isMobile: boolean,
  reducedMotion: boolean,
): number {
  const areaFactor = (vw * vh) / (1920 * 1080)
  let max = clamp(Math.round(360 * areaFactor * intensity), 40, 520)
  if (isMobile) max = Math.round(max * 0.7)
  if (reducedMotion) max = Math.max(4, Math.round(max * 0.25))
  return max
}

/** 参数安全化：clamp 到合法范围 + fadeIn+fadeOut<=duration 不变量。 */
export function clampLightRainOptions(o: LightRainEffectOptions = {}): Required<LightRainEffectOptions> {
  const duration = clamp(o.duration ?? 13000, 3000, 30000)
  const fadeIn = clamp(o.fadeInDuration ?? 600, 0, 3000)
  const fadeOut = clamp(o.fadeOutDuration ?? 4500, 500, 6000)
  const { fadeInDuration, fadeOutDuration } = clampFadeDurations(duration, fadeIn, fadeOut)
  return {
    duration,
    fadeInDuration,
    fadeOutDuration,
    intensity: clamp(o.intensity ?? 0.7, 0, 1),
    opacity: clamp(o.opacity ?? 0.28, 0, 0.5),
    wind: clamp(o.wind ?? 0.12, -0.4, 0.4),
    zIndex: Math.round(clamp(o.zIndex ?? 2147483000, 0, 2147483647)),
    thunder: o.thunder ?? true,
    sound: o.sound ?? false,
  }
}

// ========== 单例 service（骨架由工厂提供，此处只声明差异） ==========
const service = createEffectService({
  Component: RainyNightEasterEgg,
  normalize: clampLightRainOptions,
  sequence: ['r', 'a', 'i', 'n'],
  quoteCategory: 'rainy',
  hasSound: true,
})

export const active = service.active
export const showLightRainEffect = service.show
export const hideLightRainEffect = service.hide
export const isLightRainEffectActive = service.isActive
export function setupRainyNightEasterEggShortcut(): () => void {
  return service.setupShortcut(isRainShortcutEnabled)
}

// ========== 旧 API 兼容别名（转发到新 API，不破坏现有调用） ==========
export const showRainyNightEffect = showLightRainEffect
export const hideRainyNightEffect = hideLightRainEffect
export const isRainyNightEffectActive = isLightRainEffectActive

export { clamp, smoothstep }
