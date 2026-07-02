/** 生成 YYYYMMDD_HHmmss 格式的时间戳字符串（本地时间），供各导出路径统一使用 */
export function formatTimestamp(date: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0')
  const d = date
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`
}
