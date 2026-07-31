/**
 * 环境变量布尔值解析 —— 不直接比较未经规范化的字符串。
 * 用于 VITE_ 彩蛋开关等场景。
 */
export function parseEnvBool(v: unknown, fallback = false): boolean {
  if (v == null) return fallback
  const s = String(v).trim().toLowerCase()
  if (['true', '1', 'yes', 'on'].includes(s)) return true
  if (['false', '0', 'no', 'off', ''].includes(s)) return false
  return fallback
}

/**
 * 小雨彩蛋快捷键总开关。
 * 显式设置优先（VITE_ENABLE_RAINY_NIGHT_EASTER_EGG=true/false）；
 * 未设置时：开发和生产环境均默认开启。
 */
export function isRainShortcutEnabled(): boolean {
  const env = import.meta.env.VITE_ENABLE_RAINY_NIGHT_EASTER_EGG
  if (env != null) return parseEnvBool(env, true)
  // 未显式设置：默认全开（桌宠入口不走此开关，始终可用）
  return true
}

/**
 * 下雪彩蛋快捷键总开关。
 * 显式设置优先（VITE_ENABLE_SNOW_EASTER_EGG=true/false）；
 * 未设置时：开发和生产环境均默认开启。
 */
export function isSnowShortcutEnabled(): boolean {
  const env = import.meta.env.VITE_ENABLE_SNOW_EASTER_EGG
  if (env != null) return parseEnvBool(env, true)
  return true
}

/**
 * offer 彩蛋快捷键总开关。
 * 显式设置优先（VITE_ENABLE_OFFER_EASTER_EGG=true/false）；
 * 未设置时：开发和生产环境均默认开启。
 */
export function isOfferShortcutEnabled(): boolean {
  const env = import.meta.env.VITE_ENABLE_OFFER_EASTER_EGG
  if (env != null) return parseEnvBool(env, true)
  return true
}
