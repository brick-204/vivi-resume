/** 生成 YYYYMMDD_HHmmss 格式的时间戳字符串（本地时间），供各导出路径统一使用 */
export function formatTimestamp(date: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0')
  const d = date
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`
}

const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

/**
 * 面试时间展示格式化：`MM-DD 周X`，withTime 时追加 ` HH:MM`。
 * 供 InterviewCard / UpcomingInterviewBanner 共用，非法 ISO 返回空串。
 */
export function formatInterviewDate(iso: string | null | undefined, withTime = false): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const p = (n: number) => String(n).padStart(2, '0')
  const base = `${p(d.getMonth() + 1)}-${p(d.getDate())} ${WEEKDAYS[d.getDay()]}`
  return withTime ? `${base} ${p(d.getHours())}:${p(d.getMinutes())}` : base
}
