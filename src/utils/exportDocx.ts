/**
 * DOCX 导出 — 从 Resume 数据生成 .docx 文件并下载
 * 使用 docx 库从结构化数据直接生成，不走 HTML 转换
 */

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  ImageRun,
  AlignmentType,
} from 'docx'
import type { Resume, BasicInfo, WorkItem, EducationItem, ProjectItem, CustomCardItem } from '@/types/resume'
import { getSectionTitle, isCustomSection, getCustomSectionType, getCustomSectionIndex, DEFAULT_SECTION_ORDER, DEFAULT_FIELD_ORDER } from '@/types/resume'
import { parseAccentColor } from '@/utils/colorUtils'
import { htmlToDocxParagraphs, createSectionHeading, numbering } from '@/utils/htmlToDocx'

/**
 * 从 CSS 字体栈中提取第一个字体名
 * CSS 字体栈如 "'Outfit', -apple-system, 'PingFang SC', sans-serif"
 * DOCX 只支持单个字体名
 */
function extractFirstFontFamily(fontStack: string): string {
  // 匹配引号内的字体名或无引号标识符
  const match = fontStack.match(/(?:'([^']+)'|"([^"]+)")|(\w[\w-]*)/)
  if (match) {
    return match[1] || match[2] || match[3]
  }
  return fontStack
}

const DEFAULT_FONT_FAMILY = 'Microsoft YaHei'
const BODY_FONT_SIZE = 21   // 10.5pt in half-points

/**
 * 导出简历为 DOCX 文件
 */
export async function exportDocx(resume: Resume, filename?: string): Promise<void> {
  const accentHex = extractAccentHex(resume.themeAccentColor)
  const fontFamily = extractFirstFontFamily(resume.fontFamily || DEFAULT_FONT_FAMILY)
  const bodyFontSize = resume.bodyFontSize ? Math.round(resume.bodyFontSize * 1.5) : BODY_FONT_SIZE

  const children: Paragraph[] = []

  // ---- 基本信息（头部）----
  children.push(...buildBasicInfoHeader(resume, accentHex, fontFamily))

  // ---- 各 section 内容 ----
  const sectionOrder = resume.sectionOrder.length > 0
    ? resume.sectionOrder
    : DEFAULT_SECTION_ORDER
  const hiddenSections = new Set(resume.hiddenSections || [])

  for (const sectionId of sectionOrder) {
    if (sectionId === 'basic') continue // 已在头部处理
    if (hiddenSections.has(sectionId)) continue

    const title = getSectionTitle(resume, sectionId)
    const ctx = { accentColor: accentHex ?? '', fontFamily, fontSize: bodyFontSize }

    switch (sectionId) {
      case 'summary':
        if (resume.basicInfo.summary?.trim()) {
          children.push(createSectionHeading(title, ctx))
          children.push(...htmlToDocxParagraphs(resume.basicInfo.summary, ctx))
        }
        break

      case 'work':
        if (resume.workExperience.length > 0) {
          const visibleItems = resume.workExperience.filter(i => !i.hidden)
          if (visibleItems.length > 0) {
            children.push(createSectionHeading(title, ctx))
            for (const item of visibleItems) {
              children.push(...buildWorkItem(item, ctx))
            }
          }
        }
        break

      case 'education':
        if (resume.education.length > 0) {
          const visibleItems = resume.education.filter(i => !i.hidden)
          if (visibleItems.length > 0) {
            children.push(createSectionHeading(title, ctx))
            for (const item of visibleItems) {
              children.push(...buildEducationItem(item, ctx))
            }
          }
        }
        break

      case 'projects':
        if (resume.projects.length > 0) {
          const visibleItems = resume.projects.filter(i => !i.hidden)
          if (visibleItems.length > 0) {
            children.push(createSectionHeading(title, ctx))
            for (const item of visibleItems) {
              children.push(...buildProjectItem(item, ctx))
            }
          }
        }
        break

      case 'skills':
        if (resume.skills.length > 0 && resume.skills.some(s => s.content?.trim())) {
          children.push(createSectionHeading(title, ctx))
          for (const skill of resume.skills) {
            if (skill.content?.trim()) {
              children.push(...htmlToDocxParagraphs(skill.content, ctx))
            }
          }
        }
        break

      case 'evaluation':
        if (resume.selfEvaluation?.trim()) {
          children.push(createSectionHeading(title, ctx))
          children.push(...htmlToDocxParagraphs(resume.selfEvaluation, ctx))
        }
        break

      default: {
        // 自定义 section
        if (!isCustomSection(sectionId)) break
        const type = getCustomSectionType(sectionId)
        const idx = getCustomSectionIndex(sectionId)
        if (idx === null) break

        if (type === 'customText') {
          const section = resume.customTexts[idx]
          if (section?.content?.trim()) {
            children.push(createSectionHeading(title, ctx))
            children.push(...htmlToDocxParagraphs(section.content, ctx))
          }
        } else if (type === 'customCard') {
          const section = resume.customCards[idx]
          if (section?.items?.length) {
            const visibleItems = section.items.filter(i => !i.hidden)
            if (visibleItems.length > 0) {
              children.push(createSectionHeading(title, ctx))
              for (const item of visibleItems) {
                children.push(...buildCustomCardItem(item, ctx))
              }
            }
          }
        }
        break
      }
    }
  }

  // ---- 组装 Document ----
  const doc = new Document({
    numbering,
    sections: [{
      properties: {
        page: {
          margin: {
            top: 720,   // 0.5 inch
            right: 720,
            bottom: 720,
            left: 720,
          },
        },
      },
      children,
    }],
  })

  const blob = await Packer.toBlob(doc)
  downloadBlob(blob, `${filename || 'resume'}.docx`)
}

// ========== 头部构建 ==========

function buildBasicInfoHeader(resume: Resume, accentHex: string | undefined, fontFamily: string): Paragraph[] {
  const paragraphs: Paragraph[] = []
  const bi = resume.basicInfo
  const hidden = bi.hiddenFields || {}

  // 姓名
  if (!hidden.name && bi.name) {
    paragraphs.push(new Paragraph({
      children: [new TextRun({
        text: bi.name,
        bold: true,
        size: 36, // 18pt
        font: fontFamily,
        color: accentHex,
      })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
    }))
  }

  // 职位
  if (!hidden.title && bi.title) {
    paragraphs.push(new Paragraph({
      children: [new TextRun({
        text: bi.title,
        size: 24, // 12pt
        font: fontFamily,
        color: accentHex,
      })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
    }))
  }

  // 联系信息行 — 按 fieldOrder 排列所有可见且有值的字段
  const TAG_KEYS = ['gender', 'age', 'birthday', 'workExperience', 'salaryRange', 'expectedCity']
  const CONTACT_KEYS = ['phone', 'email', 'wechat', 'qq', 'location', 'website']
  const ALL_FIELD_KEYS = [...TAG_KEYS, ...CONTACT_KEYS]
  const fieldOrder = bi.fieldOrder || DEFAULT_FIELD_ORDER
  const orderedFields = fieldOrder.filter(k => {
    if (['photo', 'name', 'title'].includes(k)) return false
    if (k.startsWith('custom_')) {
      const field = bi.customFields?.find(f => `custom_${f.id}` === k)
      return field && field.value && !field.hidden
    }
    return ALL_FIELD_KEYS.includes(k) && !hidden[k] && getFieldValue(bi, k)
  })

  const contactParts: string[] = []
  for (const key of orderedFields) {
    if (key.startsWith('custom_')) {
      const field = bi.customFields?.find(f => `custom_${f.id}` === key)
      if (field) contactParts.push(`${field.label}: ${field.value}`)
    } else {
      const label = getFieldLabel(key)
      const value = getFieldValue(bi, key)
      // 标签字段加标签前缀，联系字段不加
      if (TAG_KEYS.includes(key)) {
        contactParts.push(`${label}: ${value}`)
      } else {
        contactParts.push(value)
      }
    }
  }

  if (contactParts.length > 0) {
    paragraphs.push(new Paragraph({
      children: [new TextRun({
        text: contactParts.join('  |  '),
        size: 18, // 9pt
        font: fontFamily,
      })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    }))
  }

  // 头像
  if (!hidden.photo && bi.photo && bi.photo.startsWith('data:')) {
    try {
      const imageData = extractImageData(bi.photo)
      if (imageData) {
        paragraphs.push(new Paragraph({
          children: [new ImageRun({
            data: imageData.data,
            transformation: { width: 80, height: 80 },
            type: imageData.type,
          })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
        }))
      }
    } catch {
      // 头像嵌入失败，静默跳过
    }
  }

  return paragraphs
}

// ========== 条目构建 ==========

function buildWorkItem(item: WorkItem, ctx: { accentColor?: string; fontFamily: string; fontSize: number }): Paragraph[] {
  const paragraphs: Paragraph[] = []
  const titleParts: string[] = []
  if (item.company) titleParts.push(item.company)
  if (item.position) titleParts.push(item.position)

  // 标题行：公司 + 职位
  if (titleParts.length > 0) {
    const runs: TextRun[] = [new TextRun({
      text: titleParts.join(' · '),
      bold: true,
      size: ctx.fontSize + 2,
      font: ctx.fontFamily,
    })]
    // 日期
    const dateRange = formatDateRange(item.startDate, item.endDate)
    if (dateRange) {
      runs.push(new TextRun({ text: `    ${dateRange}`, size: ctx.fontSize, font: ctx.fontFamily, color: '666666' }))
    }
    paragraphs.push(new Paragraph({ children: runs, spacing: { before: 160, after: 60 } }))
  }

  // 描述
  if (item.description?.trim()) {
    paragraphs.push(...htmlToDocxParagraphs(item.description, ctx))
  }

  return paragraphs
}

function buildEducationItem(item: EducationItem, ctx: { accentColor?: string; fontFamily: string; fontSize: number }): Paragraph[] {
  const paragraphs: Paragraph[] = []
  const titleParts: string[] = []
  if (item.school) titleParts.push(item.school)
  if (item.degree) titleParts.push(item.degree)
  if (item.major) titleParts.push(item.major)

  if (titleParts.length > 0) {
    const runs: TextRun[] = [new TextRun({
      text: titleParts.join(' · '),
      bold: true,
      size: ctx.fontSize + 2,
      font: ctx.fontFamily,
    })]
    const dateRange = formatDateRange(item.startDate, item.endDate)
    if (dateRange) {
      runs.push(new TextRun({ text: `    ${dateRange}`, size: ctx.fontSize, font: ctx.fontFamily, color: '666666' }))
    }
    paragraphs.push(new Paragraph({ children: runs, spacing: { before: 160, after: 60 } }))
  }

  if (item.description?.trim()) {
    paragraphs.push(...htmlToDocxParagraphs(item.description, ctx))
  }

  return paragraphs
}

function buildProjectItem(item: ProjectItem, ctx: { accentColor?: string; fontFamily: string; fontSize: number }): Paragraph[] {
  const paragraphs: Paragraph[] = []
  const titleParts: string[] = []
  if (item.name) titleParts.push(item.name)
  if (item.role) titleParts.push(item.role)

  if (titleParts.length > 0) {
    const runs: TextRun[] = [new TextRun({
      text: titleParts.join(' · '),
      bold: true,
      size: ctx.fontSize + 2,
      font: ctx.fontFamily,
    })]
    const dateRange = formatDateRange(item.startDate, item.endDate)
    if (dateRange) {
      runs.push(new TextRun({ text: `    ${dateRange}`, size: ctx.fontSize, font: ctx.fontFamily, color: '666666' }))
    }
    paragraphs.push(new Paragraph({ children: runs, spacing: { before: 160, after: 60 } }))
  }

  // 技术栈标签
  if (item.technologies?.length > 0) {
    paragraphs.push(new Paragraph({
      children: [new TextRun({
        text: `技术栈：${item.technologies.join('、')}`,
        size: ctx.fontSize,
        font: ctx.fontFamily,
        color: ctx.accentColor,
      })],
      spacing: { after: 60 },
    }))
  }

  if (item.description?.trim()) {
    paragraphs.push(...htmlToDocxParagraphs(item.description, ctx))
  }

  return paragraphs
}

function buildCustomCardItem(item: CustomCardItem, ctx: { accentColor?: string; fontFamily: string; fontSize: number }): Paragraph[] {
  const paragraphs: Paragraph[] = []
  const titleParts: string[] = []
  if (item.name) titleParts.push(item.name)
  if (item.role) titleParts.push(item.role)

  if (titleParts.length > 0) {
    const runs: TextRun[] = [new TextRun({
      text: titleParts.join(' · '),
      bold: true,
      size: ctx.fontSize + 2,
      font: ctx.fontFamily,
    })]
    const dateRange = formatDateRange(item.startDate, item.endDate)
    if (dateRange) {
      runs.push(new TextRun({ text: `    ${dateRange}`, size: ctx.fontSize, font: ctx.fontFamily, color: '666666' }))
    }
    paragraphs.push(new Paragraph({ children: runs, spacing: { before: 160, after: 60 } }))
  }

  if (item.keywords?.length > 0) {
    paragraphs.push(new Paragraph({
      children: [new TextRun({
        text: item.keywords.join('、'),
        size: ctx.fontSize,
        font: ctx.fontFamily,
        color: ctx.accentColor,
      })],
      spacing: { after: 60 },
    }))
  }

  if (item.description?.trim()) {
    paragraphs.push(...htmlToDocxParagraphs(item.description, ctx))
  }

  return paragraphs
}

// ========== 工具函数 ==========

// 字段标签映射
const FIELD_LABELS: Record<string, string> = {
  gender: '性别', birthday: '生日', age: '年龄',
  location: '所在地', expectedCity: '期望城市',
  workExperience: '工作经验', salaryRange: '薪资',
  email: '邮箱', phone: '电话', wechat: '微信', qq: 'QQ', website: '网站',
}

function getFieldLabel(key: string): string {
  return FIELD_LABELS[key] || key
}

// 字段值获取（含格式化）
function getFieldValue(bi: BasicInfo, fieldKey: string): string {
  if (fieldKey === 'age') {
    return bi.age ? `${bi.age}岁` : ''
  }
  if (fieldKey === 'birthday') {
    if (!bi.birthday) return ''
    const d = new Date(bi.birthday)
    return `${d.getFullYear()}年${d.getMonth() + 1}月`
  }
  if (fieldKey === 'workExperience') {
    return bi.workExperience ? `${bi.workExperience}年` : ''
  }
  return (bi[fieldKey as keyof BasicInfo] as string) || ''
}

function formatDateRange(start?: string, end?: string): string {
  const s = start?.trim()
  const e = end?.trim()
  if (!s && !e) return ''
  if (s && e) return `${s} - ${e}`
  return s ?? e ?? ''
}

function extractAccentHex(color?: string): string | undefined {
  if (!color) return undefined
  const parsed = parseAccentColor(color)
  if (!parsed) return undefined
  const r = parsed.r.toString(16).padStart(2, '0')
  const g = parsed.g.toString(16).padStart(2, '0')
  const b = parsed.b.toString(16).padStart(2, '0')
  return `${r}${g}${b}`
}

function extractImageData(dataUrl: string): { data: Uint8Array; type: 'jpg' | 'png' } | null {
  const match = dataUrl.match(/^data:(image\/(\w+));base64,(.+)$/)
  if (!match) return null

  const subtype = match[2]
  const base64 = match[3]

  // 将 base64 解码为 Uint8Array
  const binary = atob(base64)
  const data = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    data[i] = binary.charCodeAt(i)
  }

  const type = subtype === 'png' ? 'png' as const : 'jpg' as const
  return { data, type }
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  // 延迟释放 Blob URL，避免浏览器尚未完成读取时被撤销
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}
