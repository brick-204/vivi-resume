/**
 * 简历样式相关工具函数
 * 用于模板预览时剥离样式覆盖字段，让每个模板展示自身的主题色/字体等
 */

import type { Resume } from '@/types/resume'

/** 需要剥离的样式覆盖字段（模板预览时忽略用户设置，展示模板自身样式） */
export const STYLE_OVERRIDE_KEYS: ReadonlySet<string> = new Set([
  'themeAccentColor', 'whiteHeaderText', 'iconFollowAccent',
  'headerTextColor', 'headerIconColor', 'fontFamily', 'lineHeight',
  'bodyFontSize', 'sectionTitleFontSize', 'entryTitleFontSize',
  'pagePadding', 'moduleSpacing', 'paragraphSpacing',
])

/** 剥离样式覆盖字段，保留内容数据 */
export function stripStyleOverrides(resume: Resume): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(resume as unknown as Record<string, unknown>)
      .filter(([k]) => !STYLE_OVERRIDE_KEYS.has(k)),
  )
}
