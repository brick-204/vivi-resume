/**
 * 从一段文本里提取第一个会议链接，返回可直接用于 <a href> 的绝对 URL。
 *
 * 用户可能在 meetingLink 里写「别字 + 链接 + 别字」（如「会议链接：xxx.com 请准时参加」），
 * 浏览器不会自动从文本提取 URL，需在此提取并补全协议，否则 <a href> 跳转失败。
 *
 * 提取顺序：
 *   1. 带 http/https 协议的完整 URL（最可靠）
 *   2. 裸域名 + 路径（如 meeting.tencent.com/xxx），补 https://
 * 都提取不到返回 ''（调用方据此隐藏跳转入口）。
 *
 * ponytail: 不引入 URL 解析库，正则覆盖常见会议链接场景；纯会议号（非 URL）不处理。
 */
// ponytail: 排除集补英文逗号/分号；不含「.?!」（query/fragment 合法字符），尾部标点由 TRAILING_PUNCT 兜底
const URL_WITH_SCHEME = /https?:\/\/[^\s，。、；：""'')\],;]+/i
const BARE_DOMAIN = /\b[a-z0-9.-]+\.[a-z]{2,}(?:\/[^\s，。、；：""'')\],;]*)?/i
const TRAILING_PUNCT = /[.,;!?]+$/

export function extractMeetingUrl(text: string | null | undefined): string {
  if (!text) return ''
  const withScheme = text.match(URL_WITH_SCHEME)
  if (withScheme) return withScheme[0].replace(TRAILING_PUNCT, '')
  const bare = text.match(BARE_DOMAIN)
  return bare ? `https://${bare[0].replace(TRAILING_PUNCT, '')}` : ''
}
