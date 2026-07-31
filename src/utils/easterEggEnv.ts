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
 * 雨夜彩蛋快捷键总开关。
 * 默认开启（所有环境可用）；设 VITE_ENABLE_RAINY_NIGHT_EASTER_EGG=false 可关闭。
 */
export function isRainShortcutEnabled(): boolean {
  const env = import.meta.env.VITE_ENABLE_RAINY_NIGHT_EASTER_EGG
  return env == null ? true : parseEnvBool(env, true)
}
