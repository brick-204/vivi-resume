/**
 * 月份选择器辅助函数：字符串 'YYYY-MM' ↔ 时间戳（毫秒）
 * 用于 n-date-picker type="month" 与 resume 数据的互转
 *
 * ponytail: stdlib - use native Date API instead of manual regex parsing
 */

/** 解析 'YYYY-MM' 字符串为时间戳 */
export const parseMonthValue = (val: string): number | null => {
  if (!val) return null
  // ponytail: native Date API handles internationalization + leap years automatically
  const date = new Date(val + '-01') // Append day to make valid Date
  return isNaN(date.getTime()) ? null : date.getTime()
}

/** 格式化时间戳为 'YYYY-MM' 字符串 */
export const formatMonthValue = (val: number | null): string => {
  if (val === null || val === undefined) return ''
  // ponytail: isoString slice(0, 7)格式化为 YYYY-MM
  return new Date(val).toISOString().slice(0, 7)
}
