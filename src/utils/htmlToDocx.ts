/**
 * HTML → DOCX 段落转换器
 * 将 Tiptap HTML 转为 docx 库的 Paragraph[] / TextRun[]
 */

import {
  Paragraph,
  TextRun,
  ExternalHyperlink,
  LevelFormat,
} from 'docx'
import { normalizeContent } from '@/utils/normalizeContent'
import { sanitizeHtml } from '@/utils/sanitizeHtml'

// 编号列表定义（Document 级别注册）
const NUMBERING_REFERENCE = 'docx-numbering'

const numbering = {
  config: [{
    reference: NUMBERING_REFERENCE,
    levels: [
      { level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: 'start' as const, style: { paragraph: { indent: { left: 720, hanging: 360 } } } },
      { level: 1, format: LevelFormat.LOWER_LETTER, text: '%2.', alignment: 'start' as const, style: { paragraph: { indent: { left: 1440, hanging: 360 } } } },
      { level: 2, format: LevelFormat.LOWER_ROMAN, text: '%3.', alignment: 'start' as const, style: { paragraph: { indent: { left: 2160, hanging: 360 } } } },
    ],
  }],
}

export { NUMBERING_REFERENCE, numbering }

export interface HtmlToDocxOptions {
  /** 主题色 hex（不含 #） */
  accentColor?: string
  /** 正文字号（half-points，默认 21 = 10.5pt） */
  fontSize?: number
  /** 字体族 */
  fontFamily?: string
}

const DEFAULT_FONT_SIZE = 21 // 10.5pt
const DEFAULT_FONT_FAMILY = 'Microsoft YaHei'

/**
 * 将 Tiptap HTML 转为 docx Paragraph[]
 */
export function htmlToDocxParagraphs(html: string, options?: HtmlToDocxOptions): Paragraph[] {
  if (!html || !html.trim()) return []

  const safeHtml = sanitizeHtml(normalizeContent(html))
  if (!safeHtml) return []

  const parser = new DOMParser()
  const doc = parser.parseFromString(safeHtml, 'text/html')
  const body = doc.body
  if (!body || !body.childNodes.length) return []

  const paragraphs: Paragraph[] = []
  const fontSize = options?.fontSize ?? DEFAULT_FONT_SIZE
  const fontFamily = options?.fontFamily ?? DEFAULT_FONT_FAMILY

  for (const node of Array.from(body.childNodes)) {
    const result = convertNode(node, { ...options, fontSize, fontFamily })
    if (result) paragraphs.push(...result)
  }

  return paragraphs
}

interface ConvertContext extends HtmlToDocxOptions {
  fontSize: number
  fontFamily: string
  bold?: boolean
  italic?: boolean
  strike?: boolean
  underline?: boolean
  highlight?: string
  color?: string
  listLevel?: number
  listType?: 'bullet' | 'number'
}

function convertNode(node: Node, ctx: ConvertContext): Paragraph[] | null {
  if (node.nodeType === Node.TEXT_NODE) {
    // 纯文本节点由 walkInline 处理，这里不应到达
    return null
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return null
  const el = node as HTMLElement
  const tag = el.tagName.toLowerCase()

  switch (tag) {
    case 'p': {
      const runs = walkInline(el, ctx)
      return [new Paragraph({
        children: runs,
        spacing: { after: 120 },
      })]
    }
    case 'ul': {
      return convertList(el, { ...ctx, listType: 'bullet', listLevel: (ctx.listLevel ?? -1) + 1 })
    }
    case 'ol': {
      return convertList(el, { ...ctx, listType: 'number', listLevel: (ctx.listLevel ?? -1) + 1 })
    }
    case 'br': {
      return [new Paragraph({ children: [] })]
    }
    default: {
      // 未知块级标签：尝试提取内联内容
      const runs = walkInline(el, ctx)
      if (runs.length) {
        return [new Paragraph({ children: runs, spacing: { after: 120 } })]
      }
      return null
    }
  }
}

function convertList(el: HTMLElement, ctx: ConvertContext): Paragraph[] {
  const paragraphs: Paragraph[] = []
  const isOrdered = ctx.listType === 'number'
  for (const child of Array.from(el.children)) {
    if (child.tagName.toLowerCase() === 'li') {
      // 处理 <li> 内可能嵌套的子列表
      const inlineChildren: InlineChild[] = []
      const nestedParagraphs: Paragraph[] = []
      for (const liChild of Array.from(child.childNodes)) {
        if (liChild.nodeType === Node.ELEMENT_NODE) {
          const liEl = liChild as HTMLElement
          const liTag = liEl.tagName.toLowerCase()
          if (liTag === 'ul' || liTag === 'ol') {
            nestedParagraphs.push(...convertList(liEl, {
              ...ctx,
              listType: liTag === 'ol' ? 'number' : 'bullet',
              listLevel: (ctx.listLevel ?? 0) + 1,
            }))
          } else {
            inlineChildren.push(...walkInline(liEl, ctx))
          }
        } else if (liChild.nodeType === Node.TEXT_NODE) {
          const text = liChild.textContent || ''
          if (text.trim()) inlineChildren.push(...walkInline(child as HTMLElement, ctx))
        }
      }
      // 如果没有通过子节点处理提取到 inline 内容，回退到整节点处理
      const runs = inlineChildren.length > 0 ? inlineChildren : walkInline(child as HTMLElement, ctx)
      const level = Math.min(ctx.listLevel ?? 0, 2)
      paragraphs.push(new Paragraph({
        children: runs,
        ...(isOrdered
          ? { numbering: { reference: NUMBERING_REFERENCE, level } }
          : { bullet: { level } }),
        spacing: { after: 60 },
      }))
      paragraphs.push(...nestedParagraphs)
    }
  }
  return paragraphs
}

type InlineChild = TextRun | ExternalHyperlink

function walkInline(el: HTMLElement, ctx: ConvertContext): InlineChild[] {
  const runs: InlineChild[] = []

  for (const child of Array.from(el.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE) {
      const text = child.textContent || ''
      if (!text) continue
      runs.push(new TextRun({
        text,
        bold: ctx.bold,
        italics: ctx.italic,
        strike: ctx.strike,
        underline: ctx.underline ? { type: 'single' as const } : undefined,
        highlight: ctx.highlight as any,
        color: ctx.color,
        size: ctx.fontSize,
        font: ctx.fontFamily,
      }))
      continue
    }

    if (child.nodeType !== Node.ELEMENT_NODE) continue
    const childEl = child as HTMLElement
    const tag = childEl.tagName.toLowerCase()

    switch (tag) {
      case 'b':
      case 'strong':
        runs.push(...walkInline(childEl, { ...ctx, bold: true }))
        break
      case 'i':
      case 'em':
        runs.push(...walkInline(childEl, { ...ctx, italic: true }))
        break
      case 's':
      case 'strike':
      case 'del':
        runs.push(...walkInline(childEl, { ...ctx, strike: true }))
        break
      case 'u':
        runs.push(...walkInline(childEl, { ...ctx, underline: true }))
        break
      case 'mark': {
        // 尝试读取 Tiptap Highlight 多色模式下的 data-color 属性
        const dataColor = childEl.getAttribute('data-color')
        // docx highlight 仅支持预设色名: yellow, green, cyan, magenta, blue, red, darkBlue, darkCyan, darkGreen, darkMagenta, darkRed, darkYellow, darkGray, lightGray, black
        // 对于自定义 hex 颜色，无法映射到 highlight，回退到 yellow
        let highlightColor = 'yellow'
        if (dataColor) {
          const PRESET_MAP: Record<string, string> = {
            '#ffc078': 'yellow', '#ffec99': 'yellow',
            '#b2f2bb': 'green', '#d3f9d8': 'green',
            '#a5d8ff': 'cyan', '#d0ebff': 'cyan',
            '#ff6b6b': 'red', '#ffa8a8': 'red',
            '#9775fa': 'magenta', '#d0bfff': 'magenta',
            '#74c0fc': 'blue', '#91a7ff': 'blue',
          }
          highlightColor = PRESET_MAP[dataColor.toLowerCase()] || 'yellow'
        }
        runs.push(...walkInline(childEl, { ...ctx, highlight: highlightColor }))
        break
      }
      case 'a': {
        const href = childEl.getAttribute('href') || ''
        if (href) {
          // ExternalHyperlink 内部需要 TextRun，提取文本重新构建
          const linkText = childEl.textContent || href
          runs.push(new ExternalHyperlink({
            children: [new TextRun({
              text: linkText,
              style: 'Hyperlink',
              bold: ctx.bold,
              italics: ctx.italic,
              size: ctx.fontSize,
              font: ctx.fontFamily,
            })],
            link: href,
          }))
        } else {
          runs.push(...walkInline(childEl, ctx))
        }
        break
      }
      case 'span': {
        const style = childEl.getAttribute('style') || ''
        const spanColor = parseStyleColor(style) || ctx.color
        runs.push(...walkInline(childEl, { ...ctx, color: spanColor }))
        break
      }
      case 'br': {
        runs.push(new TextRun({ text: '', break: 1 }))
        break
      }
      default:
        // 其他内联标签（如 code、sub、sup）：递归提取内容
        runs.push(...walkInline(childEl, ctx))
        break
    }
  }

  return runs
}

/**
 * 从 style 属性中提取 color 值，转为 6 位 hex（不含 #）
 * 支持 hex (#ff0000, #f00), rgb(), rgba() 和常见命名色
 */
function parseStyleColor(style: string): string | null {
  // 匹配 color 属性值
  const colorPropMatch = style.match(/color\s*:\s*([^;]+)/)
  if (!colorPropMatch) return null
  const raw = colorPropMatch[1].trim()

  // hex 格式: #ff0000 或 #f00
  const hexMatch = raw.match(/^#([a-fA-F0-9]{3}|[a-fA-F0-9]{6})$/)
  if (hexMatch) {
    let hex = hexMatch[1]
    if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2]
    return hex
  }

  // rgb()/rgba() 格式
  const rgbMatch = raw.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/)
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1]).toString(16).padStart(2, '0')
    const g = parseInt(rgbMatch[2]).toString(16).padStart(2, '0')
    const b = parseInt(rgbMatch[3]).toString(16).padStart(2, '0')
    return `${r}${g}${b}`
  }

  // 命名色 — 仅支持最常见的
  const NAMED: Record<string, string> = {
    red: 'ff0000', blue: '0000ff', green: '008000', black: '000000',
    white: 'ffffff', gray: '808080', grey: '808080',
    orange: 'ffa500', purple: '800080', pink: 'ffc0cb',
    yellow: 'ffff00', cyan: '00ffff', brown: 'a52a2a',
  }
  const lower = raw.toLowerCase()
  if (NAMED[lower]) return NAMED[lower]

  return null
}
