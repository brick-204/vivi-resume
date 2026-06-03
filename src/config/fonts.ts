/**
 * 字体配置 — 集中管理字体选项和字号派生规则
 */

// 字号范围
export const FONT_SIZE_MIN = 12
export const FONT_SIZE_MAX = 24
export const FONT_SIZE_OPTIONS = Array.from(
  { length: FONT_SIZE_MAX - FONT_SIZE_MIN + 1 },
  (_, i) => i + FONT_SIZE_MIN
)

// 字号派生规则
export const FONT_SIZE_CONFIG = {
  /** 副标题比标题小 2px，最小 10px */
  subtitleOffset: 2,
  minSubtitle: 10,
  /** 标签字号比正文小 2px，最小 9px */
  tagOffset: 2,
  minTag: 9,
  /** sidebar 日期比副标题再小 1px，最小 9px */
  sidebarDateExtraOffset: 1,
  /** sidebar name = sectionTitle + 4，最小 14px */
  sidebarNameOffset: 4,
  minSidebarName: 14,
  /** sidebar title = body - 1，最小 10px */
  sidebarTitleOffset: 1,
  minSidebarTitle: 10,
  /** sidebar field/section-title/skill = body - 2，最小 9px */
  sidebarSmallOffset: 2,
  minSidebarSmall: 9,
} as const

// 字号派生工具函数
export function deriveSubtitleSize(entryTitleFS: number): number {
  return Math.max(FONT_SIZE_CONFIG.minSubtitle, entryTitleFS - FONT_SIZE_CONFIG.subtitleOffset)
}

export function deriveTagSize(bodyFS: number): number {
  return Math.max(FONT_SIZE_CONFIG.minTag, bodyFS - FONT_SIZE_CONFIG.tagOffset)
}

export function deriveSidebarDateSize(entrySubtitleFS: number): number {
  return Math.max(FONT_SIZE_CONFIG.minTag, entrySubtitleFS - FONT_SIZE_CONFIG.sidebarDateExtraOffset)
}

export function deriveSidebarNameSize(sectionTitleFS: number): number {
  return Math.max(FONT_SIZE_CONFIG.minSidebarName, sectionTitleFS + FONT_SIZE_CONFIG.sidebarNameOffset)
}

export function deriveSidebarTitleSize(bodyFS: number): number {
  return Math.max(FONT_SIZE_CONFIG.minSidebarTitle, bodyFS - FONT_SIZE_CONFIG.sidebarTitleOffset)
}

export function deriveSidebarSmallSize(bodyFS: number): number {
  return Math.max(FONT_SIZE_CONFIG.minSidebarSmall, bodyFS - FONT_SIZE_CONFIG.sidebarSmallOffset)
}

// 字体选项
export const FONT_FAMILY_OPTIONS = [
  { value: "'Outfit', -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif", label: 'Outfit (默认)' },
  { value: "'PingFang SC', 'Microsoft YaHei', sans-serif", label: '苹方' },
  { value: "'Microsoft YaHei', sans-serif", label: '微软雅黑' },
  { value: "'SimSun', 'Songti SC', serif", label: '宋体' },
  { value: "'SimHei', 'Heiti SC', sans-serif", label: '黑体' },
  { value: "'KaiTi', 'STKaiti', serif", label: '楷体' },
  { value: "'FangSong', 'STFangsong', serif", label: '仿宋' },
  { value: "'Noto Sans SC', sans-serif", label: '思源黑体' },
  { value: "'Noto Serif SC', serif", label: '思源宋体' },
  { value: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", label: '系统默认' },
] as const

export const DEFAULT_FONT_FAMILY = FONT_FAMILY_OPTIONS[0].value
