/**
 * 导出文件名时间戳工具
 * 格式：YYYYMMDD_HHmmss（本地时间），供各导出路径（JSON / DOCX / 图片 / PDF 打印）统一使用
 */

/** 生成 YYYYMMDD_HHmmss 格式的时间戳字符串（本地时间） */
export function formatTimestamp(date: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}_${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
}
