/**
 * DOCX 导出 — 从 Resume 数据生成 .docx 文件并下载
 * 使用 docx 库从结构化数据直接生成，样式尽量对齐预览模板
 */

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  ImageRun,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  ShadingType,
  Tab,
  TabStopPosition,
  TabStopType,
} from 'docx'
import type { ISectionOptions } from 'docx'
import type { Resume, BasicInfo, WorkItem, EducationItem, ProjectItem, CustomCardItem, HeaderLayout } from '@/types/resume'
import { getSectionTitle, isCustomSection, getCustomSectionType, getCustomSectionIndex, DEFAULT_SECTION_ORDER, DEFAULT_FIELD_ORDER, DEFAULT_LINE_HEIGHT, DEFAULT_MODULE_SPACING, DEFAULT_PARAGRAPH_SPACING, DEFAULT_PAGE_PADDING } from '@/types/resume'
import { getTemplate } from '@/config/templates'
import {
  DEFAULT_FONT_FAMILY,
  deriveSubtitleSize, deriveTagSize,
} from '@/config/fonts'
import {
  parseAccentColor,
  deriveSectionTitleColor, deriveTagBg, deriveTagColor,
  deriveDecorativeLine, deriveEntryDateBg, deriveEntryDateBorder,
  deriveSidebarText,
  deriveSidebarFieldColor,
} from '@/utils/colorUtils'
import { htmlToDocxParagraphs, numbering } from '@/utils/htmlToDocx'
import { formatTimestamp } from '@/utils/timestamp'

// ========== 工具函数 ==========

/**
 * 从 CSS 字体栈中提取字体名，用于 DOCX 的 font 字段
 * 优先提取中文字体（确保中文正确显示），回退到西文字体
 */
function extractDocxFont(fontStack: string): string {
  const fonts: string[] = []
  const regex = /(?:'([^']+)'|"([^"]+)")|(\w[\w\s-]*)/g
  let match: RegExpExecArray | null
  while ((match = regex.exec(fontStack)) !== null) {
    const name = match[1] || match[2] || match[3]
    if (name && name.trim()) {
      const trimmed = name.trim()
      if (!['sans-serif', 'serif', 'monospace', 'cursive', 'fantasy', 'BlinkMacSystemFont', '-apple-system'].includes(trimmed)) {
        fonts.push(trimmed)
      }
    }
  }
  // 优先使用中文字体
  const chineseFonts = ['Microsoft YaHei', 'PingFang SC', 'SimSun', 'SimHei', 'KaiTi', 'FangSong', 'Noto Sans SC', 'Noto Serif SC', 'Songti SC', 'Heiti SC', 'STKaiti', 'STFangsong']
  for (const cf of chineseFonts) {
    if (fonts.includes(cf)) return cf
  }
  return 'Microsoft YaHei'
}

/** rgba/hex 颜色转 6 位 hex（不含 #），供 docx 库使用 */
function toHexColor(color: string): string | undefined {
  const parsed = parseAccentColor(color)
  if (!parsed) return undefined
  const r = parsed.r.toString(16).padStart(2, '0')
  const g = parsed.g.toString(16).padStart(2, '0')
  const b = parsed.b.toString(16).padStart(2, '0')
  return `${r}${g}${b}`
}

/** 从 rgba() 字符串提取不透明 hex（与 toHexColor 功能相同，统一使用 toHexColor） */

/** px 转 twips（1 inch = 1440 twips, 96 dpi 下 1px = 15 twips） */
function pxToTwips(px: number): number {
  return Math.round(px * 15)
}

/** px 转 half-points（1 pt = 2 half-points, 96 dpi 下 1px = 0.75pt = 1.5 half-points） */
function pxToHalfPoints(px: number): number {
  return Math.round(px * 1.5)
}

/**
 * rgba 颜色在白底上合成为不透明 hex（模拟预览中透明色叠加白底的真实显示效果）
 * 例如 rgba(6,182,212,0.1) → 白底上呈现的极淡青色
 * 这与预览实际渲染效果一致，避免 DOCX 中背景色变成纯主题色过深
 */
function rgbaTintToHex(color: string): string | undefined {
  const parsed = parseAccentColor(color)
  if (!parsed) return undefined
  const alpha = parsed.a ?? 1
  if (alpha >= 1) {
    return `${parsed.r.toString(16).padStart(2, '0')}${parsed.g.toString(16).padStart(2, '0')}${parsed.b.toString(16).padStart(2, '0')}`
  }
  // 与白色合成：result = color * alpha + white * (1 - alpha)
  const r = Math.round(parsed.r * alpha + 255 * (1 - alpha))
  const g = Math.round(parsed.g * alpha + 255 * (1 - alpha))
  const b = Math.round(parsed.b * alpha + 255 * (1 - alpha))
  return `${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

// ========== 图片尺寸计算 ==========

interface ImageDimensions {
  width: number
  height: number
}

/** 从 base64 data URL 中解析图片原始尺寸 */
async function getImageDimensions(dataUrl: string): Promise<ImageDimensions> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight })
    }
    img.onerror = () => {
      resolve({ width: 200, height: 200 })
    }
    img.src = dataUrl
  })
}

/** 计算照片在 DOCX 中的目标显示尺寸（单位：pt） */
function calculatePhotoSize(
  naturalWidth: number,
  naturalHeight: number,
  photoShape?: 'circle' | 'rectangle'
): { width: number; height: number } {
  const TARGET_WIDTH_PT = 80

  if (photoShape === 'rectangle') {
    const targetHeightPt = Math.round(TARGET_WIDTH_PT * (107 / 80))
    const originalRatio = naturalHeight / naturalWidth
    const targetRatio = 107 / 80
    if (Math.abs(originalRatio - targetRatio) > 0.3) {
      return { width: TARGET_WIDTH_PT, height: Math.round(TARGET_WIDTH_PT * originalRatio) }
    }
    return { width: TARGET_WIDTH_PT, height: targetHeightPt }
  }

  return { width: TARGET_WIDTH_PT, height: TARGET_WIDTH_PT }
}

function extractImageData(dataUrl: string): { data: Uint8Array; type: 'jpg' | 'png' } | null {
  const match = dataUrl.match(/^data:(image\/(\w+));base64,(.+)$/)
  if (!match) return null

  const subtype = match[2]
  const base64 = match[3]

  const binary = atob(base64)
  const data = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    data[i] = binary.charCodeAt(i)
  }

  const type = subtype === 'png' ? 'png' as const : 'jpg' as const
  return { data, type }
}

// ========== 样式上下文 ==========

interface DocxStyleContext {
  templateId: string
  headerLayout: 'centered' | 'left' | 'two-column' | 'sidebar'
  primaryFont: string
  bodyFontSize: number
  sectionTitleFontSize: number
  entryTitleFontSize: number
  entrySubtitleFontSize: number
  tagFontSize: number
  lineHeight: number
  moduleSpacing: number
  paragraphSpacing: number
  pagePadding: number
  accentHex: string | undefined
  sectionTitleHex: string | undefined
  tagBgHex: string | undefined
  tagColorHex: string | undefined
  decorativeLineHex: string | undefined
  dateBgHex: string | undefined
  dateBorderHex: string | undefined
  textHex: string | undefined
  textSecondaryHex: string | undefined
  headerTextHex: string | undefined
  headerTitleHex: string | undefined
  headerFieldTextHex: string | undefined
  proBarBgHex: string | undefined
  sidebarBgHex: string | undefined
  sidebarTextHex: string | undefined
  sidebarFieldTextHex: string | undefined
}

function buildStyleContext(resume: Resume): DocxStyleContext {
  const t = getTemplate(resume.templateId)
  const accent = resume.themeAccentColor || t.style.accentColor
  const userAccent = resume.themeAccentColor

  const ff = resume.fontFamily || DEFAULT_FONT_FAMILY
  const primaryFont = extractDocxFont(ff)

  const fd = t.style.fontDefaults || {}
  const bodyFS = resume.bodyFontSize || fd.bodyFontSize || 14
  const sectionTitleFS = resume.sectionTitleFontSize || fd.sectionTitleFontSize || 16
  const entryTitleFS = resume.entryTitleFontSize || fd.entryTitleFontSize || 14
  const entrySubtitleFS = deriveSubtitleSize(entryTitleFS)
  const tagFS = deriveTagSize(bodyFS)

  const lh = resume.lineHeight || DEFAULT_LINE_HEIGHT
  const ms = resume.moduleSpacing ?? DEFAULT_MODULE_SPACING
  const ps = resume.paragraphSpacing ?? DEFAULT_PARAGRAPH_SPACING
  const pp = resume.pagePadding ?? DEFAULT_PAGE_PADDING

  const accentHex = toHexColor(accent)
  const sectionTitleColor = userAccent ? deriveSectionTitleColor(userAccent) : t.style.sectionTitleColor
  const tagBg = userAccent ? deriveTagBg(userAccent) : t.style.tagBg
  const tagColor = userAccent ? deriveTagColor(userAccent) : t.style.tagColor
  const decorativeLine = userAccent ? deriveDecorativeLine(userAccent) : '#e8e8f0'

  const headerTextColorMode = resume.headerTextColor || (resume.whiteHeaderText === true ? 'white' : resume.whiteHeaderText === false ? 'black' : 'black')
  // 对齐预览 useResumeDocument：black→#202429，white→#ffffff/#d9d9d9，accent→deriveSidebarText/deriveSidebarFieldColor
  const nameTitleColor = headerTextColorMode === 'white' ? 'ffffff'
    : headerTextColorMode === 'accent' ? toHexColor(deriveSidebarText(accent)) || '202429'
    : '202429'
  const fieldTextColor = headerTextColorMode === 'white' ? 'd9d9d9'
    : headerTextColorMode === 'accent' ? toHexColor(deriveSidebarFieldColor(accent)) || '202429'
    : '202429'

  const isPro = resume.templateId === 'professional'

  return {
    templateId: resume.templateId,
    headerLayout: t.style.headerLayout,
    primaryFont,
    bodyFontSize: pxToHalfPoints(bodyFS),
    sectionTitleFontSize: pxToHalfPoints(sectionTitleFS),
    entryTitleFontSize: pxToHalfPoints(entryTitleFS),
    entrySubtitleFontSize: pxToHalfPoints(entrySubtitleFS),
    tagFontSize: pxToHalfPoints(tagFS),
    lineHeight: lh,
    moduleSpacing: pxToTwips(ms),
    paragraphSpacing: pxToTwips(ps),
    pagePadding: pxToTwips(pp),
    accentHex,
    sectionTitleHex: toHexColor(sectionTitleColor),
    tagBgHex: rgbaTintToHex(tagBg),
    tagColorHex: toHexColor(tagColor),
    decorativeLineHex: rgbaTintToHex(decorativeLine),
    dateBgHex: rgbaTintToHex(userAccent ? deriveEntryDateBg(userAccent) : 'rgba(124, 92, 252, 0.08)'),
    dateBorderHex: rgbaTintToHex(userAccent ? deriveEntryDateBorder(userAccent) : 'rgba(124, 92, 252, 0.15)'),
    textHex: toHexColor(t.style.textColor),
    textSecondaryHex: toHexColor(t.style.textSecondaryColor),
    headerTextHex: nameTitleColor,
    headerTitleHex: nameTitleColor,
    headerFieldTextHex: fieldTextColor,
    proBarBgHex: isPro ? tintOverWhiteHex(accent, 0.18) : undefined,
    sidebarBgHex: tintOverWhiteHex(accent, 0.18),
    sidebarTextHex: toHexColor(deriveSidebarText(accent)),
    sidebarFieldTextHex: toHexColor(deriveSidebarFieldColor(accent)),
  }
}

// ========== 字段工具 ==========

/** 字段图标 Unicode 符号映射（用于 DOCX 中近似还原预览图标） */
const FIELD_ICON_SYMBOL: Record<string, string> = {
  gender: '⚧',           // 性别
  birthday: '🎂',         // 生日
  age: '📅',              // 年龄
  location: '◉',          // 所在地
  expectedCity: '🏙',     // 期望城市
  workExperience: '💼',   // 工作经验
  salaryRange: '💰',      // 薪资
  email: '✉',             // 邮箱
  phone: '☎',             // 电话
  wechat: '💬',           // 微信
  qq: '🐧',               // QQ
  website: '🌐',          // 个人网站
  // 常见自定义字段
  jobStatus: '◉',         // 求职状态
  availableDate: '◷',     // 到岗时间
  startDate: '◷',         // 入职时间
}
const FIELD_ICON_DEFAULT = '▸'

const FIELD_LABELS: Record<string, string> = {
  gender: '性别', birthday: '生日', age: '年龄',
  location: '所在地', expectedCity: '期望城市',
  workExperience: '工作经验', salaryRange: '薪资',
  email: '邮箱', phone: '电话', wechat: '微信', qq: 'QQ', website: '个人网站',
}

/** 主题色按指定 alpha 合成到白底，得到不透明 hex（用于需要可见的主题色边框/背景）
 *  默认回退 'dbeafe'（淡蓝色），适用于侧边栏背景等场景 */
function tintOverWhiteHex(accent: string, alpha: number): string {
  const parsed = parseAccentColor(accent)
  if (!parsed) return 'dbeafe'
  const r = Math.round(parsed.r * alpha + 255 * (1 - alpha))
  const g = Math.round(parsed.g * alpha + 255 * (1 - alpha))
  const b = Math.round(parsed.b * alpha + 255 * (1 - alpha))
  return `${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

const TAG_KEYS = ['gender', 'age', 'birthday', 'workExperience', 'salaryRange', 'expectedCity']
const CONTACT_KEYS = ['phone', 'email', 'wechat', 'qq', 'location', 'website']
const ALL_FIELD_KEYS = [...TAG_KEYS, ...CONTACT_KEYS]

function getFieldLabel(key: string): string {
  return FIELD_LABELS[key] || key
}

function getFieldValue(bi: BasicInfo, fieldKey: string): string {
  if (fieldKey === 'age') return bi.age ? `${bi.age}岁` : ''
  if (fieldKey === 'birthday') {
    if (!bi.birthday) return ''
    const d = new Date(bi.birthday)
    return `${d.getFullYear()}年${d.getMonth() + 1}月`
  }
  if (fieldKey === 'workExperience') return bi.workExperience ? `${bi.workExperience}年` : ''
  return (bi[fieldKey as keyof BasicInfo] as string) || ''
}

function formatDateRange(start?: string, end?: string): string {
  const s = start?.trim()
  const e = end?.trim()
  if (!s && !e) return ''
  if (s && e) return `${s} - ${e}`
  return s ?? e ?? ''
}

function getOrderedFields(bi: BasicInfo): { key: string; label: string; value: string; isTag: boolean; showLabel: boolean; showIcon: boolean }[] {
  const hidden = bi.hiddenFields || {}
  const fieldOrder = bi.fieldOrder || DEFAULT_FIELD_ORDER
  return fieldOrder.filter(k => {
    if (['photo', 'name', 'title'].includes(k)) return false
    if (k.startsWith('custom_')) {
      const field = bi.customFields?.find(f => `custom_${f.id}` === k)
      return field && field.value && !field.hidden
    }
    return ALL_FIELD_KEYS.includes(k) && !hidden[k] && getFieldValue(bi, k)
  }).map(k => {
    if (k.startsWith('custom_')) {
      const field = bi.customFields!.find(f => `custom_${f.id}` === k)
      const fieldDisplayMode = bi.fieldDisplayMode?.[k] || 'iconLabelValue'
      return {
        key: k,
        label: field!.label,
        value: field!.value,
        isTag: false,
        showLabel: !!field!.label.trim() && ['iconLabelValue', 'labelValue'].includes(fieldDisplayMode),
        // 自定义字段图标用默认符号（无对应 Iconify 名，预览用 mdi:tag-outline）
        showIcon: ['iconLabelValue', 'iconValue'].includes(fieldDisplayMode),
      }
    }
    const fieldDisplayMode = bi.fieldDisplayMode?.[k] || 'iconLabelValue'
    return {
      key: k,
      label: getFieldLabel(k),
      value: getFieldValue(bi, k),
      isTag: TAG_KEYS.includes(k),
      showLabel: ['iconLabelValue', 'labelValue'].includes(fieldDisplayMode),
      showIcon: ['iconLabelValue', 'iconValue'].includes(fieldDisplayMode),
    }
  })
}

// ========== Section 标题构建 ==========

function buildSectionTitle(title: string, ctx: DocxStyleContext): Paragraph {
  return new Paragraph({
    children: [new TextRun({
      text: title,
      bold: true,
      size: ctx.sectionTitleFontSize,
      font: ctx.primaryFont,
      color: ctx.sectionTitleHex,
    })],
    spacing: { before: ctx.moduleSpacing, after: ctx.paragraphSpacing },
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 2, color: ctx.decorativeLineHex || 'e8e8f0' },
    },
  })
}

function buildModernSectionTitle(title: string, ctx: DocxStyleContext): Paragraph {
  return new Paragraph({
    children: [new TextRun({
      text: title,
      bold: true,
      size: ctx.sectionTitleFontSize,
      font: ctx.primaryFont,
      color: ctx.accentHex,
    })],
    spacing: { before: ctx.moduleSpacing, after: ctx.paragraphSpacing },
  })
}

function buildMinimalSectionTitle(title: string, ctx: DocxStyleContext): Paragraph {
  return new Paragraph({
    children: [new TextRun({
      text: title.toUpperCase(),
      bold: true,
      size: ctx.sectionTitleFontSize - 2,
      font: ctx.primaryFont,
      color: ctx.sectionTitleHex,
      characterSpacing: 60,
    })],
    spacing: { before: ctx.moduleSpacing, after: ctx.paragraphSpacing },
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 2, color: ctx.textHex || '202429' },
    },
  })
}

function buildTimelineSectionTitle(title: string, ctx: DocxStyleContext): Paragraph {
  // timeline 模板：标题前加主题色圆点（对齐预览 .section__icon）
  return new Paragraph({
    children: [
      new TextRun({
        text: '● ', // 主题色圆点（U+25CF），对齐预览 .section__icon
        size: ctx.sectionTitleFontSize,
        font: 'Microsoft YaHei',
        color: ctx.accentHex,
      }),
      new TextRun({
        text: title,
        bold: true,
        size: ctx.sectionTitleFontSize,
        font: ctx.primaryFont,
        color: ctx.sectionTitleHex,
      }),
    ],
    spacing: { before: ctx.moduleSpacing, after: ctx.paragraphSpacing },
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 2, color: ctx.accentHex || 'f97316' },
    },
  })
}

function buildElegantSectionTitle(title: string, ctx: DocxStyleContext): Paragraph {
  return new Paragraph({
    children: [new TextRun({
      text: title,
      bold: true,
      size: ctx.sectionTitleFontSize,
      font: ctx.primaryFont,
      color: ctx.sectionTitleHex,
    })],
    spacing: { before: ctx.moduleSpacing, after: ctx.paragraphSpacing },
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 2, color: ctx.accentHex || '059669' },
    },
  })
}

function buildProfessionalSectionTitle(title: string, ctx: DocxStyleContext): Paragraph {
  // professional 标题栏：左侧主题色竖条（__accent）紧贴浅色背景横条（__bar）+ 主题色标题文字
  // 预览：__accent = 2.25pt 实心主题色竖条（紧贴背景条左边缘），__bar 背景为 deriveSidebarBg(accent)（浅色，占满整行），__title 文字为 --t-accent（主题色）
  // 用 Paragraph 实现：整段浅色背景 + 左侧 2.25pt 主题色边框（竖条，画在段落最左边缘）+ 主题色标题文字
  // 注意：不使用 indent.left（否则边框会偏移到缩进位置），改用 border.space 控制文字与竖条间距
  const barBgColor = ctx.proBarBgHex || 'f1f5f9' // 浅色背景（sidebarBgSolidHex）
  const accentColor = ctx.accentHex || '475569'   // 主题色

  return new Paragraph({
    children: [new TextRun({
      text: title,
      bold: true,
      size: ctx.sectionTitleFontSize,
      font: ctx.primaryFont,
      color: accentColor,
    })],
    shading: { type: ShadingType.SOLID, color: barBgColor, fill: barBgColor },
    border: {
      // 左侧 2.25pt 主题色竖条（画在段落最左边缘，紧贴整行左侧）
      // docx border size 单位为 1/8 pt，2.25×8=18；space 控制文字到竖条的距离（模拟 padding-left）
      left: { style: BorderStyle.SINGLE, size: 18, color: accentColor, space: 200 },
    },
    spacing: { before: ctx.moduleSpacing, after: ctx.paragraphSpacing },
  })
}

function buildTwoColumnSectionTitle(title: string, ctx: DocxStyleContext): Paragraph {
  return new Paragraph({
    children: [new TextRun({
      text: title.toUpperCase(),
      bold: true,
      size: ctx.sectionTitleFontSize - 2,
      font: ctx.primaryFont,
      color: ctx.accentHex,
      characterSpacing: 40,
    })],
    spacing: { before: ctx.moduleSpacing, after: ctx.paragraphSpacing },
  })
}

function buildSidebarSectionTitle(title: string, ctx: DocxStyleContext): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({
        text: '━ ', // 装饰线短横线（accent 色）
        size: ctx.entrySubtitleFontSize,
        font: ctx.primaryFont,
        color: ctx.accentHex,
      }),
      new TextRun({
        text: title.toUpperCase(),
        bold: true,
        size: ctx.sectionTitleFontSize - 2,
        font: ctx.primaryFont,
        color: ctx.sidebarTextHex,
        characterSpacing: 60,
      }),
    ],
    spacing: { before: ctx.moduleSpacing, after: ctx.paragraphSpacing },
  })
}

/** sidebar 主内容区标题 — 文字为暗主题色，底部线为纯主题色（而非 decorativeLineHex）
 *  前缀圆点用 U+25CF BLACK CIRCLE（微软雅黑等常见字体支持）*/
function buildSidebarMainSectionTitle(title: string, ctx: DocxStyleContext): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({
        text: '● ', // 前缀圆点（主题色，U+25CF BLACK CIRCLE）
        size: ctx.sectionTitleFontSize,
        font: 'Microsoft YaHei', // 强制微软雅黑确保圆点显示
        color: ctx.accentHex,
      }),
      new TextRun({
        text: title,
        bold: true,
        size: ctx.sectionTitleFontSize,
        font: ctx.primaryFont,
        color: ctx.sidebarTextHex,
      }),
    ],
    spacing: { before: ctx.moduleSpacing, after: ctx.paragraphSpacing },
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 2, color: ctx.accentHex || '3b82f6' },
    },
  })
}

function buildTemplateSectionTitle(title: string, ctx: DocxStyleContext): Paragraph | Table {
  switch (ctx.templateId) {
    case 'modern': return buildModernSectionTitle(title, ctx)
    case 'minimal': return buildMinimalSectionTitle(title, ctx)
    case 'timeline': return buildTimelineSectionTitle(title, ctx)
    case 'elegant': return buildElegantSectionTitle(title, ctx)
    case 'professional': return buildProfessionalSectionTitle(title, ctx)
    case 'twocolumn': return buildTwoColumnSectionTitle(title, ctx)
    case 'sidebar': return buildSectionTitle(title, ctx)
    default: return buildSectionTitle(title, ctx)
  }
}

// ========== 条目构建 ==========

function buildEntryTitleParagraph(
  titleText: string,
  subtitleText: string | undefined,
  dateRange: string | undefined,
  ctx: DocxStyleContext,
  opts?: { showTimelineDot?: boolean; accentLeftBorder?: boolean }
): Paragraph {
  const titleRuns: TextRun[] = []

  if (opts?.showTimelineDot) {
    titleRuns.push(new TextRun({
      text: '● ',
      size: ctx.entryTitleFontSize,
      color: ctx.accentHex,
      font: 'Microsoft YaHei', // 强制微软雅黑确保圆点字形可见
    }))
  }

  titleRuns.push(new TextRun({
    text: titleText,
    bold: true,
    size: ctx.entryTitleFontSize,
    font: ctx.primaryFont,
    color: ctx.textHex,
  }))

  if (subtitleText) {
    titleRuns.push(new TextRun({
      text: ` · ${subtitleText}`,
      size: ctx.entrySubtitleFontSize,
      font: ctx.primaryFont,
      color: ctx.textSecondaryHex || '6b7280',
    }))
  }

  // 日期：根据模板差异化样式
  const dateRuns: TextRun[] = []
  if (dateRange) {
    let dateColor: string
    let dateBg: string | undefined

    switch (ctx.templateId) {
      case 'modern':
      case 'twocolumn':
        // 主题色背景 + 白色文字
        dateColor = 'ffffff'
        dateBg = ctx.accentHex || '06b6d4'
        break
      case 'sidebar':
        // 主题色背景 + 白色文字（胶囊）
        dateColor = 'ffffff'
        dateBg = ctx.accentHex || '3b82f6'
        break
      case 'professional':
      case 'minimal':
        // 纯文本，无背景
        dateColor = ctx.textSecondaryHex || '6b7280'
        dateBg = undefined
        break
      case 'timeline':
        // 主题色文字 + 淡色背景
        dateColor = ctx.accentHex || 'f97316'
        dateBg = ctx.dateBgHex
        break
      case 'elegant':
        // 深色文字 + 灰色边框（DOCX 无法单独设边框，用浅灰背景近似）
        dateColor = ctx.textHex || '202429'
        dateBg = 'f3f4f6'
        break
      default:
        // classic: 默认淡色胶囊
        dateColor = ctx.textSecondaryHex || '6b7280'
        dateBg = ctx.dateBgHex
        break
    }

    const dateTextRun = dateBg
      ? new TextRun({
          text: dateRange,
          size: ctx.entrySubtitleFontSize,
          font: ctx.primaryFont,
          color: dateColor,
          shading: { type: ShadingType.SOLID, color: dateBg },
        })
      : new TextRun({
          text: dateRange,
          size: ctx.entrySubtitleFontSize,
          font: ctx.primaryFont,
          color: dateColor,
        })

    // Tab 与日期 run 作为兄弟节点：dateTextRun 的 shading 直接挂在自身 run 上，
    // 不再嵌套进外层 TextRun，避免背景色被 docx 库丢弃
    dateRuns.push(new TextRun({ children: [new Tab()] }))
    dateRuns.push(dateTextRun)
  }

  const allChildren = [...titleRuns, ...dateRuns]

  return new Paragraph({
    children: allChildren,
    spacing: { before: ctx.paragraphSpacing, after: 60 },
    ...(dateRange ? {
      tabStops: [{
        type: TabStopType.RIGHT,
        position: TabStopPosition.MAX,
      }],
    } : {}),
    ...(opts?.accentLeftBorder ? {
      border: {
        left: { style: BorderStyle.SINGLE, size: 3, color: ctx.accentHex || '06b6d4' },
      },
      indent: { left: 120 },
    } : {}),
  })
}

/** 技术标签行 — 使用 inline TextRun + shading，模拟预览的 pill 形状标签
 *  DOCX 不支持单个 TextRun 的圆角，但用 shading 比 Table 更接近预览效果
 *  各模板标签样式差异通过 tagBg/tagColor/tagWeight 体现
 */
function buildTechTagsLine(tags: string[], ctx: DocxStyleContext, label?: string): Paragraph {
  // 根据模板决定标签样式
  let tagBg: string
  let tagColor: string
  let tagWeight: boolean

  switch (ctx.templateId) {
    case 'professional':
      tagBg = 'f7f7f7'
      tagColor = '202429'
      tagWeight = false
      break
    case 'minimal':
      tagBg = 'ffffff'
      tagColor = ctx.textHex || '202429'
      tagWeight = true
      break
    case 'elegant':
      tagBg = ctx.tagBgHex || 'f0fdf4'
      tagColor = ctx.tagColorHex || ctx.accentHex || '059669'
      tagWeight = true
      break
    default:
      tagBg = ctx.tagBgHex || tintOverWhiteHex(ctx.accentHex || '#6366f1', 0.08)
      tagColor = ctx.tagColorHex || ctx.accentHex || '6366f1'
      tagWeight = true
      break
  }

  const runs: TextRun[] = []

  // 「技术栈：」label
  if (label) {
    runs.push(new TextRun({
      text: `${label}：`,
      size: ctx.bodyFontSize,
      font: ctx.primaryFont,
      color: ctx.textSecondaryHex || '6b7280',
    }))
  }

  // 标签：每个标签是一个带 shading 的 TextRun，用空格分隔模拟 gap
  tags.forEach((tag, idx) => {
    if (idx > 0) {
      // 标签间距（模拟 flex gap）
      runs.push(new TextRun({ text: ' ', size: ctx.tagFontSize }))
    }
    runs.push(new TextRun({
      text: ` ${tag} `,
      size: ctx.tagFontSize,
      font: ctx.primaryFont,
      color: tagColor,
      bold: tagWeight,
      shading: { type: ShadingType.SOLID, color: tagBg, fill: tagBg },
    }))
  })

  return new Paragraph({
    children: runs,
    spacing: { before: 60, after: 60 },
  })
}

/** 构建工作经历条目 */
function buildWorkItem(item: WorkItem, ctx: DocxStyleContext): Paragraph[] {
  const paragraphs: Paragraph[] = []
  const titleParts: string[] = []
  if (item.company) titleParts.push(item.company)
  if (item.position) titleParts.push(item.position)

  const showTimeline = getTemplate(ctx.templateId).style.showTimeline
  const hasAccentBorder = ctx.templateId === 'modern' || ctx.templateId === 'elegant'

  if (titleParts.length > 0) {
    const dateRange = formatDateRange(item.startDate, item.endDate)
    paragraphs.push(buildEntryTitleParagraph(
      titleParts.join(' · '),
      undefined,
      dateRange,
      ctx,
      { showTimelineDot: showTimeline, accentLeftBorder: hasAccentBorder }
    ))
  }

  // 描述在前，技术栈在后（对齐预览模板的 entry__desc → entry__tags 顺序）
  if (item.description?.trim()) {
    const descCtx = { accentColor: ctx.accentHex, fontFamily: ctx.primaryFont, fontSize: ctx.bodyFontSize }
    paragraphs.push(...htmlToDocxParagraphs(item.description, descCtx))
  }

  return paragraphs
}

/** 构建教育经历条目 */
function buildEducationItem(item: EducationItem, ctx: DocxStyleContext): Paragraph[] {
  const paragraphs: Paragraph[] = []
  const titleParts: string[] = []
  if (item.school) titleParts.push(item.school)
  const subParts: string[] = []
  if (item.degree) subParts.push(item.degree)
  if (item.major) subParts.push(item.major)

  const showTimeline = getTemplate(ctx.templateId).style.showTimeline
  const hasAccentBorder = ctx.templateId === 'modern' || ctx.templateId === 'elegant'

  if (titleParts.length > 0 || subParts.length > 0) {
    const dateRange = formatDateRange(item.startDate, item.endDate)
    paragraphs.push(buildEntryTitleParagraph(
      titleParts.join(' · '),
      subParts.join(' · ') || undefined,
      dateRange,
      ctx,
      { showTimelineDot: showTimeline, accentLeftBorder: hasAccentBorder }
    ))
  }

  if (item.description?.trim()) {
    const descCtx = { accentColor: ctx.accentHex, fontFamily: ctx.primaryFont, fontSize: ctx.bodyFontSize }
    paragraphs.push(...htmlToDocxParagraphs(item.description, descCtx))
  }

  return paragraphs
}

/** 构建项目经历条目 — 描述在前，技术栈在后 */
function buildProjectItem(item: ProjectItem, ctx: DocxStyleContext): (Paragraph | Table)[] {
  const paragraphs: (Paragraph | Table)[] = []
  const titleParts: string[] = []
  if (item.name) titleParts.push(item.name)
  const subParts: string[] = []
  if (item.role) subParts.push(item.role)

  const showTimeline = getTemplate(ctx.templateId).style.showTimeline
  const hasAccentBorder = ctx.templateId === 'modern' || ctx.templateId === 'elegant'

  if (titleParts.length > 0 || subParts.length > 0) {
    const dateRange = formatDateRange(item.startDate, item.endDate)
    paragraphs.push(buildEntryTitleParagraph(
      titleParts.join(' · '),
      subParts.join(' · ') || undefined,
      dateRange,
      ctx,
      { showTimelineDot: showTimeline, accentLeftBorder: hasAccentBorder }
    ))
  }

  // 先描述，后技术栈（与预览模板 entry__desc → entry__tags 顺序一致）
  if (item.description?.trim()) {
    const descCtx = { accentColor: ctx.accentHex, fontFamily: ctx.primaryFont, fontSize: ctx.bodyFontSize }
    paragraphs.push(...htmlToDocxParagraphs(item.description, descCtx))
  }

  if (item.technologies?.length > 0) {
    paragraphs.push(buildTechTagsLine(item.technologies, ctx, '技术栈'))
  }

  return paragraphs
}

/** 构建自定义卡片条目 */
function buildCustomCardItem(item: CustomCardItem, ctx: DocxStyleContext): (Paragraph | Table)[] {
  const paragraphs: (Paragraph | Table)[] = []
  const titleParts: string[] = []
  if (item.name) titleParts.push(item.name)
  const subParts: string[] = []
  if (item.role) subParts.push(item.role)

  const showTimeline = getTemplate(ctx.templateId).style.showTimeline
  const hasAccentBorder = ctx.templateId === 'modern' || ctx.templateId === 'elegant'

  if (titleParts.length > 0 || subParts.length > 0) {
    const dateRange = formatDateRange(item.startDate, item.endDate)
    paragraphs.push(buildEntryTitleParagraph(
      titleParts.join(' · '),
      subParts.join(' · ') || undefined,
      dateRange,
      ctx,
      { showTimelineDot: showTimeline, accentLeftBorder: hasAccentBorder }
    ))
  }

  // 先描述，后关键词
  if (item.description?.trim()) {
    const descCtx = { accentColor: ctx.accentHex, fontFamily: ctx.primaryFont, fontSize: ctx.bodyFontSize }
    paragraphs.push(...htmlToDocxParagraphs(item.description, descCtx))
  }

  if (item.keywords?.length > 0) {
    paragraphs.push(buildTechTagsLine(item.keywords, ctx))
  }

  return paragraphs
}

// ========== 头部构建 ==========

/** 无边框配置 */
const noBorders = {
  top: { style: BorderStyle.NONE },
  bottom: { style: BorderStyle.NONE },
  left: { style: BorderStyle.NONE },
  right: { style: BorderStyle.NONE },
}

/**
 * 构建头部（centered / photo-left / photo-right）
 * 返回 (Paragraph | Table)[] 混合类型，因为 Table 不能嵌套在 Paragraph.children 中
 */
async function buildBasicInfoHeader(resume: Resume, ctx: DocxStyleContext): Promise<(Paragraph | Table)[]> {
  const elements: (Paragraph | Table)[] = []
  const bi = resume.basicInfo
  const hidden = bi.hiddenFields || {}
  const headerLayout: HeaderLayout = bi.headerLayout || 'centered'

  // 照片尺寸计算
  const hasPhoto = !hidden.photo && bi.photo && bi.photo.startsWith('data:')
  let photoData: { data: Uint8Array; type: 'jpg' | 'png' } | null = null
  let photoSize = { width: 60, height: 60 }
  if (hasPhoto) {
    try {
      photoData = extractImageData(bi.photo)
      if (photoData) {
        const dims = await getImageDimensions(bi.photo)
        photoSize = calculatePhotoSize(dims.width, dims.height, bi.photoShape)
      }
    } catch {
      // 图片解析失败，跳过
    }
  }

  // ---- centered 布局（或无照片时回退）----
  if (headerLayout === 'centered' || !hasPhoto) {
    // 照片（居中布局下照片在最前面，与预览模板一致）
    if (hasPhoto && photoData) {
      elements.push(new Paragraph({
        children: [new ImageRun({
          data: photoData.data,
          transformation: { width: photoSize.width, height: photoSize.height },
          type: photoData.type,
        })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 80 },
      }))
    }

    // 姓名
    if (!hidden.name && bi.name) {
      elements.push(new Paragraph({
        children: [new TextRun({
          text: bi.name,
          bold: true,
          size: ctx.sectionTitleFontSize + 6,
          font: ctx.primaryFont,
          color: ctx.headerTextHex,
        })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 40 },
      }))
    }

    // 职位
    if (!hidden.title && bi.title) {
      elements.push(new Paragraph({
        children: [new TextRun({
          text: bi.title,
          size: ctx.entryTitleFontSize,
          font: ctx.primaryFont,
          color: ctx.headerTitleHex,
        })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 80 },
      }))
    }

    // 联系信息
    elements.push(...buildContactInfoLines(bi, ctx, AlignmentType.CENTER))
  }
  // ---- photo-left / photo-right 布局 ----
  // 注意：条件只判断 headerLayout，不依赖 photoData —— 照片解码失败（photoData=null）时，
  // 仍渲染姓名/职位/联系信息（仅省略照片单元格），避免整个头部被静默丢弃
  else if (headerLayout === 'photo-left' || headerLayout === 'photo-right') {
    const isRight = headerLayout === 'photo-right'

    // 照片单元格（仅在图片数据有效时构建）
    const photoCell = photoData
      ? new TableCell({
          children: [new Paragraph({
            children: [new ImageRun({
              data: photoData.data,
              transformation: { width: photoSize.width, height: photoSize.height },
              type: photoData.type,
            })],
            alignment: isRight ? AlignmentType.RIGHT : AlignmentType.LEFT,
          })],
          width: { size: Math.round(photoSize.width * 15 + 200), type: WidthType.DXA },
          borders: noBorders,
          verticalAlign: 'center',
        })
      : null

    // 信息单元格
    const infoChildren: Paragraph[] = []
    if (!hidden.name && bi.name) {
      infoChildren.push(new Paragraph({
        children: [new TextRun({
          text: bi.name,
          bold: true,
          size: ctx.sectionTitleFontSize + 6,
          font: ctx.primaryFont,
          color: ctx.headerTextHex,
        })],
        alignment: isRight ? AlignmentType.RIGHT : AlignmentType.LEFT,
        spacing: { after: 20 },
      }))
    }
    if (!hidden.title && bi.title) {
      infoChildren.push(new Paragraph({
        children: [new TextRun({
          text: bi.title,
          size: ctx.entryTitleFontSize,
          font: ctx.primaryFont,
          color: ctx.headerTitleHex,
        })],
        alignment: isRight ? AlignmentType.RIGHT : AlignmentType.LEFT,
        spacing: { after: 40 },
      }))
    }

    // 联系信息
    const fields = getOrderedFields(bi)
    if (fields.length > 0) {
      const fieldRuns: TextRun[] = []
      fields.forEach((f, i) => {
        if (i > 0) fieldRuns.push(new TextRun({ text: '  ', size: ctx.entrySubtitleFontSize, color: ctx.headerFieldTextHex }))
        // 图标优先（Unicode 符号）
        if (f.showIcon) {
          const symbol = FIELD_ICON_SYMBOL[f.key] || FIELD_ICON_DEFAULT
          fieldRuns.push(new TextRun({ text: symbol + ' ', size: ctx.entrySubtitleFontSize, font: ctx.primaryFont, color: ctx.headerFieldTextHex }))
        }
        if (f.showLabel) {
          fieldRuns.push(new TextRun({ text: `${f.label}: `, size: ctx.entrySubtitleFontSize, font: ctx.primaryFont, color: ctx.headerFieldTextHex }))
        }
        fieldRuns.push(new TextRun({ text: f.value, size: ctx.entrySubtitleFontSize, font: ctx.primaryFont, color: ctx.headerFieldTextHex }))
      })
      infoChildren.push(new Paragraph({
        children: fieldRuns,
        alignment: isRight ? AlignmentType.RIGHT : AlignmentType.LEFT,
        spacing: { after: 0 },
      }))
    }

    const infoCell = new TableCell({
      children: infoChildren,
      width: { size: 8000, type: WidthType.DXA },
      borders: noBorders,
      verticalAlign: 'center',
    })

    // 照片缺失时只保留信息单元格（单栏），避免 null 进入 cells
    const cells: TableCell[] = photoCell
      ? (isRight ? [infoCell, photoCell] : [photoCell, infoCell])
      : [infoCell]

    // Table 是 Document section 的顶级子元素，不能嵌套在 Paragraph 中
    elements.push(new Table({
      rows: [new TableRow({ children: cells })],
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: { ...noBorders, insideHorizontal: { style: BorderStyle.NONE }, insideVertical: { style: BorderStyle.NONE } },
    }))
  }

  // 头部底部装饰线
  if (ctx.templateId !== 'modern' && ctx.templateId !== 'minimal' && ctx.templateId !== 'elegant' && ctx.templateId !== 'twocolumn') {
    elements.push(new Paragraph({
      children: [],
      spacing: { after: 0 },
      border: {
        bottom: { style: BorderStyle.SINGLE, size: 3, color: ctx.accentHex || '6366f1' },
      },
    }))
  }

  return elements
}

/** 构建联系信息 — 模拟预览模板的 flex-wrap 行内布局
 *  预览中所有字段在同一行 flex-wrap，用 gap 分隔无显式分隔符
 *  根据 fieldDisplayMode 决定是否显示标签：预览显示标签就显示标签，不显示就不显示
 */
function buildContactInfoLines(bi: BasicInfo, ctx: DocxStyleContext, alignment: typeof AlignmentType.CENTER): Paragraph[] {
  const fields = getOrderedFields(bi)
  if (fields.length === 0) return []

  const runs: TextRun[] = []
  fields.forEach((f, i) => {
    if (i > 0) {
      // 模拟 flex gap：用两个空格分隔
      runs.push(new TextRun({ text: '  ', size: ctx.entrySubtitleFontSize }))
    }
    // 图标（Unicode 符号）
    if (f.showIcon) {
      const iconSymbol = FIELD_ICON_SYMBOL[f.key] || FIELD_ICON_DEFAULT
      runs.push(new TextRun({ text: `${iconSymbol} `, size: ctx.entrySubtitleFontSize, font: ctx.primaryFont, color: ctx.headerFieldTextHex }))
    }
    if (f.showLabel) {
      runs.push(new TextRun({ text: `${f.label}: `, size: ctx.entrySubtitleFontSize, font: ctx.primaryFont, color: ctx.headerFieldTextHex }))
    }
    runs.push(new TextRun({ text: f.value, size: ctx.entrySubtitleFontSize, font: ctx.primaryFont, color: ctx.headerFieldTextHex }))
  })

  return [new Paragraph({
    children: runs,
    alignment,
    spacing: { after: 80 },
  })]
}

// ========== Sidebar 模板专用头部 ==========

async function buildSidebarHeader(resume: Resume, ctx: DocxStyleContext): Promise<Paragraph[]> {
  const paragraphs: Paragraph[] = []
  const bi = resume.basicInfo
  const hidden = bi.hiddenFields || {}

  // 照片
  const hasPhoto = !hidden.photo && bi.photo && bi.photo.startsWith('data:')
  if (hasPhoto) {
    try {
      const photoData = extractImageData(bi.photo)
      if (photoData) {
        const dims = await getImageDimensions(bi.photo)
        const photoSize = calculatePhotoSize(dims.width, dims.height, bi.photoShape)
        paragraphs.push(new Paragraph({
          children: [new ImageRun({
            data: photoData.data,
            transformation: { width: photoSize.width, height: photoSize.height },
            type: photoData.type,
          })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 80 },
        }))
      }
    } catch { /* skip */ }
  }

  // 姓名（对齐预览：使用 headerTextHex 而非 sidebarTextHex）
  if (!hidden.name && bi.name) {
    paragraphs.push(new Paragraph({
      children: [new TextRun({
        text: bi.name,
        bold: true,
        size: ctx.sectionTitleFontSize + 4,
        font: ctx.primaryFont,
        color: ctx.headerTextHex,
      })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 20 },
    }))
  }

  // 职位
  if (!hidden.title && bi.title) {
    paragraphs.push(new Paragraph({
      children: [new TextRun({
        text: bi.title,
        size: ctx.entryTitleFontSize,
        font: ctx.primaryFont,
        color: ctx.headerTextHex,
      })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
    }))
  }

  // 侧边栏字段：纵向排列（对齐预览：使用 headerFieldTextHex，支持 showIcon）
  const fields = getOrderedFields(bi)
  for (const f of fields) {
    const runs: TextRun[] = []
    // 图标（Unicode 符号）
    if (f.showIcon) {
      const iconSymbol = FIELD_ICON_SYMBOL[f.key] || FIELD_ICON_DEFAULT
      runs.push(new TextRun({ text: `${iconSymbol} `, size: ctx.entrySubtitleFontSize, font: ctx.primaryFont, color: ctx.headerFieldTextHex }))
    }
    if (f.showLabel) {
      runs.push(new TextRun({ text: `${f.label}: `, size: ctx.entrySubtitleFontSize, font: ctx.primaryFont, color: ctx.headerFieldTextHex }))
    }
    runs.push(new TextRun({ text: f.value, size: ctx.entrySubtitleFontSize, font: ctx.primaryFont, color: ctx.headerFieldTextHex }))
    paragraphs.push(new Paragraph({
      children: runs,
      spacing: { after: 40 },
    }))
  }

  return paragraphs
}

// ========== 主导出函数 ==========

/**
 * 导出简历为 DOCX 文件
 * 文件名格式：简历名称_vivi-resume_时间戳.docx
 */
export async function exportDocx(resume: Resume, filename?: string): Promise<void> {
  const ctx = buildStyleContext(resume)
  const timestamp = formatTimestamp()
  const title = resume.title || filename || 'resume'
  const finalFilename = `${title}_vivi-resume_${timestamp}.docx`

  // 页边距配置
  const pageMargin = {
    top: ctx.pagePadding,
    right: ctx.pagePadding,
    bottom: ctx.pagePadding,
    left: ctx.pagePadding,
  }

  // ---- Sidebar 模板特殊处理 ----
  let sections: ISectionOptions[]
  if (ctx.templateId === 'sidebar') {
    sections = await buildSidebarSections(resume, ctx, pageMargin)
  } else {
    sections = await buildNormalSections(resume, ctx, pageMargin)
  }

  const doc = new Document({
    numbering,
    sections,
  })

  const blob = await Packer.toBlob(doc)
  downloadBlob(blob, finalFilename)
}

/** 构建普通模板的 Document sections */
async function buildNormalSections(resume: Resume, ctx: DocxStyleContext, pageMargin: { top: number; right: number; bottom: number; left: number }): Promise<ISectionOptions[]> {
  // 头部元素（Paragraph | Table 混合）
  const headerElements = await buildBasicInfoHeader(resume, ctx)

  // section 内容
  const sectionParagraphs: (Paragraph | Table)[] = []
  const sectionOrder = resume.sectionOrder.length > 0
    ? resume.sectionOrder
    : DEFAULT_SECTION_ORDER
  const hiddenSections = new Set(resume.hiddenSections || [])

  for (const sectionId of sectionOrder) {
    if (sectionId === 'basic') continue
    if (hiddenSections.has(sectionId)) continue

    const title = getSectionTitle(resume, sectionId)

    switch (sectionId) {
      case 'summary':
        if (resume.basicInfo.summary?.trim()) {
          sectionParagraphs.push(buildTemplateSectionTitle(title, ctx))
          sectionParagraphs.push(...htmlToDocxParagraphs(resume.basicInfo.summary, { accentColor: ctx.accentHex, fontFamily: ctx.primaryFont, fontSize: ctx.bodyFontSize }))
        }
        break

      case 'work':
        if (resume.workExperience.length > 0) {
          const visibleItems = resume.workExperience.filter(i => !i.hidden)
          if (visibleItems.length > 0) {
            sectionParagraphs.push(buildTemplateSectionTitle(title, ctx))
            for (const item of visibleItems) {
              sectionParagraphs.push(...buildWorkItem(item, ctx))
            }
          }
        }
        break

      case 'education':
        if (resume.education.length > 0) {
          const visibleItems = resume.education.filter(i => !i.hidden)
          if (visibleItems.length > 0) {
            sectionParagraphs.push(buildTemplateSectionTitle(title, ctx))
            for (const item of visibleItems) {
              sectionParagraphs.push(...buildEducationItem(item, ctx))
            }
          }
        }
        break

      case 'projects':
        if (resume.projects.length > 0) {
          const visibleItems = resume.projects.filter(i => !i.hidden)
          if (visibleItems.length > 0) {
            sectionParagraphs.push(buildTemplateSectionTitle(title, ctx))
            for (const item of visibleItems) {
              sectionParagraphs.push(...buildProjectItem(item, ctx))
            }
          }
        }
        break

      case 'skills':
        if (resume.skills.length > 0 && resume.skills.some(s => s.content?.trim())) {
          sectionParagraphs.push(buildTemplateSectionTitle(title, ctx))
          for (const skill of resume.skills) {
            if (skill.content?.trim()) {
              sectionParagraphs.push(...htmlToDocxParagraphs(skill.content, { accentColor: ctx.accentHex, fontFamily: ctx.primaryFont, fontSize: ctx.bodyFontSize }))
            }
          }
        }
        break

      case 'evaluation':
        if (resume.selfEvaluation?.trim()) {
          sectionParagraphs.push(buildTemplateSectionTitle(title, ctx))
          sectionParagraphs.push(...htmlToDocxParagraphs(resume.selfEvaluation, { accentColor: ctx.accentHex, fontFamily: ctx.primaryFont, fontSize: ctx.bodyFontSize }))
        }
        break

      default: {
        if (!isCustomSection(sectionId)) break
        const type = getCustomSectionType(sectionId)
        const idx = getCustomSectionIndex(sectionId)
        if (idx === null) break

        if (type === 'customText') {
          const section = resume.customTexts[idx]
          if (section?.content?.trim()) {
            sectionParagraphs.push(buildTemplateSectionTitle(title, ctx))
            sectionParagraphs.push(...htmlToDocxParagraphs(section.content, { accentColor: ctx.accentHex, fontFamily: ctx.primaryFont, fontSize: ctx.bodyFontSize }))
          }
        } else if (type === 'customCard') {
          const section = resume.customCards[idx]
          if (section?.items?.length) {
            const visibleItems = section.items.filter(i => !i.hidden)
            if (visibleItems.length > 0) {
              sectionParagraphs.push(buildTemplateSectionTitle(title, ctx))
              for (const item of visibleItems) {
                sectionParagraphs.push(...buildCustomCardItem(item, ctx))
              }
            }
          }
        }
        break
      }
    }
  }

  // 合并头部元素和 section 内容为一个 section 的 children
  // headerElements 中可能有 Paragraph 和 Table，sectionParagraphs 中只有 Paragraph
  // 它们都是 Document section children 的合法类型
  const allChildren = [...headerElements, ...sectionParagraphs]

  return [{
    children: allChildren as (Paragraph | Table)[],
    properties: {
      page: { margin: pageMargin },
    },
  }]
}

/** 构建 Sidebar 模板的 Document sections（双栏布局） */
async function buildSidebarSections(resume: Resume, ctx: DocxStyleContext, pageMargin: { top: number; right: number; bottom: number; left: number }): Promise<ISectionOptions[]> {
  // 侧边栏内容（头部 + 联系信息 + 技能）
  const sidebarParagraphs: Paragraph[] = []
  sidebarParagraphs.push(...await buildSidebarHeader(resume, ctx))

  const hiddenSections = new Set(resume.hiddenSections || [])
  if (!hiddenSections.has('skills') && resume.skills.length > 0 && resume.skills.some(s => s.content?.trim())) {
    sidebarParagraphs.push(buildSidebarSectionTitle('专业技能', ctx))
    for (const skill of resume.skills) {
      if (skill.content?.trim()) {
        sidebarParagraphs.push(...htmlToDocxParagraphs(skill.content, { accentColor: ctx.accentHex, fontFamily: ctx.primaryFont, fontSize: ctx.entrySubtitleFontSize }))
      }
    }
  }

  // 主内容区
  const mainParagraphs: (Paragraph | Table)[] = []
  const sectionOrder = resume.sectionOrder.length > 0
    ? resume.sectionOrder
    : DEFAULT_SECTION_ORDER

  for (const sectionId of sectionOrder) {
    if (['basic', 'skills'].includes(sectionId)) continue
    if (hiddenSections.has(sectionId)) continue

    const title = getSectionTitle(resume, sectionId)

    switch (sectionId) {
      case 'summary':
        if (resume.basicInfo.summary?.trim()) {
          mainParagraphs.push(buildSidebarMainSectionTitle(title, ctx))
          mainParagraphs.push(...htmlToDocxParagraphs(resume.basicInfo.summary, { accentColor: ctx.accentHex, fontFamily: ctx.primaryFont, fontSize: ctx.bodyFontSize }))
        }
        break
      case 'work':
        if (resume.workExperience.length > 0) {
          const visibleItems = resume.workExperience.filter(i => !i.hidden)
          if (visibleItems.length > 0) {
            mainParagraphs.push(buildSidebarMainSectionTitle(title, ctx))
            for (const item of visibleItems) {
              mainParagraphs.push(...buildWorkItem(item, ctx))
            }
          }
        }
        break
      case 'education':
        if (resume.education.length > 0) {
          const visibleItems = resume.education.filter(i => !i.hidden)
          if (visibleItems.length > 0) {
            mainParagraphs.push(buildSidebarMainSectionTitle(title, ctx))
            for (const item of visibleItems) {
              mainParagraphs.push(...buildEducationItem(item, ctx))
            }
          }
        }
        break
      case 'projects':
        if (resume.projects.length > 0) {
          const visibleItems = resume.projects.filter(i => !i.hidden)
          if (visibleItems.length > 0) {
            mainParagraphs.push(buildSidebarMainSectionTitle(title, ctx))
            for (const item of visibleItems) {
              mainParagraphs.push(...buildProjectItem(item, ctx))
            }
          }
        }
        break
      case 'evaluation':
        if (resume.selfEvaluation?.trim()) {
          mainParagraphs.push(buildSidebarMainSectionTitle(title, ctx))
          mainParagraphs.push(...htmlToDocxParagraphs(resume.selfEvaluation, { accentColor: ctx.accentHex, fontFamily: ctx.primaryFont, fontSize: ctx.bodyFontSize }))
        }
        break
      default: {
        if (!isCustomSection(sectionId)) break
        const type = getCustomSectionType(sectionId)
        const idx = getCustomSectionIndex(sectionId)
        if (idx === null) break

        if (type === 'customText') {
          const section = resume.customTexts[idx]
          if (section?.content?.trim()) {
            mainParagraphs.push(buildSidebarMainSectionTitle(title, ctx))
            mainParagraphs.push(...htmlToDocxParagraphs(section.content, { accentColor: ctx.accentHex, fontFamily: ctx.primaryFont, fontSize: ctx.bodyFontSize }))
          }
        } else if (type === 'customCard') {
          const section = resume.customCards[idx]
          if (section?.items?.length) {
            const visibleItems = section.items.filter(i => !i.hidden)
            if (visibleItems.length > 0) {
              mainParagraphs.push(buildSidebarMainSectionTitle(title, ctx))
              for (const item of visibleItems) {
                mainParagraphs.push(...buildCustomCardItem(item, ctx))
              }
            }
          }
        }
        break
      }
    }
  }

  // 用 Table 实现左右双栏（Table 是 section children 的合法类型）
  const sidebarTable = new Table({
    rows: [new TableRow({
      children: [
        new TableCell({
          children: sidebarParagraphs,
          width: { size: 3200, type: WidthType.DXA },
          borders: { ...noBorders, right: { style: BorderStyle.SINGLE, size: 1, color: ctx.decorativeLineHex || 'e8e8f0' } },
          shading: { type: ShadingType.SOLID, color: ctx.sidebarBgHex || 'dbeafe' },
        }),
        new TableCell({
          children: mainParagraphs,
          width: { size: 6800, type: WidthType.DXA },
          borders: noBorders,
        }),
      ],
    })],
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: { ...noBorders, insideHorizontal: { style: BorderStyle.NONE }, insideVertical: { style: BorderStyle.NONE } },
  })

  return [{
    children: [sidebarTable],
    properties: {
      page: { margin: pageMargin },
    },
  }]
}

// ========== 下载工具 ==========

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}
