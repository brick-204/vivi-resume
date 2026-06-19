/**
 * 简历全局优化服务
 * 将 AI 输出按【标题】分割，映射回各 section 并应用
 */

import type { Resume } from '@/types/resume'
import {
  isCustomSection,
  getCustomSectionType,
  getCustomSectionIndex,
  SECTION_CONFIG,
} from '@/types/resume'
import { htmlToPlainText } from '@/services/aiService'
import { markdownToHtml } from '@/utils/markdownConverter'
import { sanitizeHtml } from '@/utils/sanitizeHtml'
import { normalizeContent } from '@/utils/normalizeContent'
import { Editor } from '@tiptap/vue-3'
import { CORE_TIPTAP_EXTENSIONS } from '@/config/tiptapExtensions'

// ========== 类型定义 ==========

export interface SectionResult {
  sectionId: string
  sectionTitle: string
  originalText: string
  optimizedText: string
}

// ========== 标题映射 ==========

/** 获取模块显示标题（与 resumeSerializer 保持一致） */
function getSectionDisplayTitle(resume: Resume, sectionId: string): string {
  const customTitle = resume.sectionTitles?.[sectionId]
  if (customTitle) return customTitle
  if (isCustomSection(sectionId)) {
    const type = getCustomSectionType(sectionId)
    return SECTION_CONFIG[type!]?.label || sectionId
  }
  return SECTION_CONFIG[sectionId]?.label || sectionId
}

// ========== 解析 AI 输出 ==========

/**
 * 将 AI 优化后的文本按【标题】分割，映射回各 sectionId
 */
export function parseOptimizedSections(rawText: string, resume: Resume): SectionResult[] {
  const hidden = new Set(resume.hiddenSections || [])
  const results: SectionResult[] = []

  // 构建标题→sectionId 映射（支持多种别名匹配）
  const titleToId = new Map<string, string>()
  for (const sectionId of resume.sectionOrder) {
    if (hidden.has(sectionId)) continue
    if (sectionId === 'basic') continue // basic 不参与优化
    const title = getSectionDisplayTitle(resume, sectionId)
    titleToId.set(title, sectionId)
    // 同时注册 SECTION_CONFIG 中的默认标签作为别名
    const defaultLabel = SECTION_CONFIG[sectionId]?.label
    if (defaultLabel && defaultLabel !== title) {
      titleToId.set(defaultLabel, sectionId)
    }
  }

  // 按【标题】分割文本
  const sectionRegex = /【(.+?)】\n?/g
  const sections: { title: string; content: string }[] = []
  let lastIndex = 0
  let lastTitle = ''

  let match: RegExpExecArray | null
  while ((match = sectionRegex.exec(rawText)) !== null) {
    // 保存上一个 section 的内容
    if (lastTitle) {
      sections.push({
        title: lastTitle,
        content: rawText.slice(lastIndex, match.index).trim(),
      })
    }
    lastTitle = match[1]
    lastIndex = sectionRegex.lastIndex
  }
  // 最后一个 section
  if (lastTitle) {
    sections.push({
      title: lastTitle,
      content: rawText.slice(lastIndex).trim(),
    })
  }

  // 映射回 sectionId（支持模糊匹配）
  for (const section of sections) {
    let sectionId = titleToId.get(section.title)

    // 精确匹配失败时，尝试模糊匹配
    if (!sectionId) {
      for (const [mapTitle, mapId] of titleToId) {
        if (section.title.includes(mapTitle) || mapTitle.includes(section.title)) {
          sectionId = mapId
          break
        }
      }
    }

    if (!sectionId) continue // 未匹配的标题，跳过

    // 获取原始文本
    const originalText = getOriginalSectionText(resume, sectionId)

    results.push({
      sectionId,
      sectionTitle: section.title,
      originalText,
      optimizedText: section.content,
    })
  }

  return results
}

/** 获取某个 section 的原始纯文本 */
function getOriginalSectionText(resume: Resume, sectionId: string): string {
  if (sectionId === 'summary') {
    return htmlToPlainText(resume.basicInfo.summary || '')
  }
  if (sectionId === 'work') {
    return resume.workExperience
      .filter(item => !item.hidden)
      .map(item => {
        const lines = [`${item.company} · ${item.position}`]
        if (item.startDate || item.endDate) lines.push(`${item.startDate || '?'} ~ ${item.endDate || '?'}`)
        if (item.description) lines.push(htmlToPlainText(item.description))
        return lines.join('\n')
      }).join('\n\n')
  }
  if (sectionId === 'education') {
    return resume.education
      .filter(item => !item.hidden)
      .map(item => {
        const lines = [`${item.school} · ${item.degree} · ${item.major}`]
        if (item.startDate || item.endDate) lines.push(`${item.startDate || '?'} ~ ${item.endDate || '?'}`)
        if (item.description) lines.push(htmlToPlainText(item.description))
        return lines.join('\n')
      }).join('\n\n')
  }
  if (sectionId === 'projects') {
    return resume.projects
      .filter(item => !item.hidden)
      .map(item => {
        const lines = [`${item.name} · ${item.role}`]
        if (item.startDate || item.endDate) lines.push(`${item.startDate || '?'} ~ ${item.endDate || '?'}`)
        if (item.technologies?.length) lines.push(`技术栈：${item.technologies.join('、')}`)
        if (item.description) lines.push(htmlToPlainText(item.description))
        return lines.join('\n')
      }).join('\n\n')
  }
  if (sectionId === 'skills') {
    return resume.skills.map(s => htmlToPlainText(s.content)).filter(Boolean).join('\n')
  }
  if (sectionId === 'evaluation') {
    return htmlToPlainText(resume.selfEvaluation || '')
  }
  if (isCustomSection(sectionId)) {
    const type = getCustomSectionType(sectionId)
    const index = getCustomSectionIndex(sectionId)
    if (type === null || index === null) return ''

    if (type === 'customText') {
      const section = resume.customTexts[index]
      return section ? htmlToPlainText(section.content || '') : ''
    }
    if (type === 'customCard') {
      const section = resume.customCards[index]
      if (!section) return ''
      return section.items.filter(item => !item.hidden).map(item => {
        const lines = [`${item.name} · ${item.role}`]
        if (item.startDate || item.endDate) lines.push(`${item.startDate || '?'} ~ ${item.endDate || '?'}`)
        if (item.keywords?.length) lines.push(`关键词：${item.keywords.join('、')}`)
        if (item.description) lines.push(htmlToPlainText(item.description))
        return lines.join('\n')
      }).join('\n\n')
    }
  }
  return ''
}

// ========== Tiptap 二次规范化 ==========

/**
 * 使用与 RichTextEditor 相同的 Tiptap 扩展集对 HTML 执行 setContent + getHTML，
 * 得到与编辑器完全一致的规范格式。
 *
 * 调用方应在外层创建 Editor 并在处理完毕后销毁，避免每次调用都创建/销毁实例。
 */
function tiptapNormalize(editor: Editor, html: string): string {
  if (!html) return ''
  const safeHtml = normalizeContent(html)
  editor.commands.setContent(safeHtml)
  return editor.getHTML()
}

/** 创建用于规范化的临时 Editor 实例，调用方需在处理完毕后调用 editor.destroy() */
function createNormalizeEditor(): Editor {
  return new Editor({ extensions: CORE_TIPTAP_EXTENSIONS as any })
}

// ========== 应用优化结果 ==========

/**
 * 将优化结果写回 Resume 对象
 * 返回需要更新的字段（Partial<Resume>），由调用方合并
 */
export function applyOptimizedSections(
  resume: Resume,
  sections: SectionResult[],
  appliedIds: Set<string>, // 用户选择应用的 sectionId 集合
): Partial<Resume> {
  const updates: Partial<Resume> = {}
  const editor = createNormalizeEditor()

  try {
    for (const section of sections) {
      if (!appliedIds.has(section.sectionId)) continue

      // 先 markdown→html→sanitize，再 Tiptap 二次规范化确保格式与编辑器完全一致
      const rawHtml = sanitizeHtml(markdownToHtml(section.optimizedText))
      const html = tiptapNormalize(editor, rawHtml)

      if (section.sectionId === 'summary') {
        updates.basicInfo = { ...resume.basicInfo, summary: html }
      } else if (section.sectionId === 'evaluation') {
        updates.selfEvaluation = html
      } else if (section.sectionId === 'skills') {
        // skills 是数组，每个 SkillItem 有 content
        // 将优化文本按行分割，重新分配给各 skill item
        const lines = section.optimizedText.split('\n').filter(Boolean)
        const newSkills = resume.skills.map((s, i) => ({
          ...s,
          content: tiptapNormalize(editor, sanitizeHtml(markdownToHtml(lines[i] || s.content))),
        }))
        // 如果行数比原来多，追加新条目
        for (let i = resume.skills.length; i < lines.length; i++) {
          newSkills.push({
            id: Date.now().toString(36) + Math.random().toString(36).substring(2),
            content: tiptapNormalize(editor, sanitizeHtml(markdownToHtml(lines[i]))),
          })
        }
        updates.skills = newSkills
      } else if (section.sectionId === 'work') {
        updates.workExperience = applyListSectionOptimization(
          editor,
          resume.workExperience,
          section.optimizedText,
          item => `${item.company} · ${item.position}`,
        )
      } else if (section.sectionId === 'education') {
        // 教育经历按条目匹配
        updates.education = applyListSectionOptimization(
          editor,
          resume.education,
          section.optimizedText,
          item => `${item.school} · ${item.degree} · ${item.major}`,
        )
      } else if (section.sectionId === 'projects') {
        updates.projects = applyListSectionOptimization(
          editor,
          resume.projects,
          section.optimizedText,
          item => `${item.name} · ${item.role}`,
        )
      } else if (isCustomSection(section.sectionId)) {
        const type = getCustomSectionType(section.sectionId)
        const index = getCustomSectionIndex(section.sectionId)
        if (type === null || index === null) continue

        if (type === 'customText') {
          const newCustomTexts = [...resume.customTexts]
          if (newCustomTexts[index]) {
            newCustomTexts[index] = { ...newCustomTexts[index], content: html }
            updates.customTexts = newCustomTexts
          }
        } else if (type === 'customCard') {
          const newCustomCards = [...resume.customCards]
          if (newCustomCards[index]) {
            newCustomCards[index] = {
              ...newCustomCards[index],
              items: applyListSectionOptimization(
                editor,
                newCustomCards[index].items,
                section.optimizedText,
                item => `${item.name} · ${item.role}`,
              ) as typeof newCustomCards[number]['items'],
            }
            updates.customCards = newCustomCards
          }
        }
      }
    }
  } finally {
    editor.destroy()
  }

  return updates
}

/**
 * 对列表类 section（work/education/projects/customCard items）应用优化
 * 按条目首行匹配，仅替换 description 字段
 */
function applyListSectionOptimization<T extends { description: string; hidden?: boolean }>(
  editor: Editor,
  items: T[],
  optimizedText: string,
  getHeader: (item: T) => string,
): T[] {
  // 将优化文本按空行分割为条目块
  const blocks = optimizedText.split(/\n{2,}/).filter(Boolean)

  // 为每个非隐藏条目尝试匹配
  const visibleItems = items.filter(item => !item.hidden)
  const newItems = [...items]

  for (const block of blocks) {
    const blockLines = block.split('\n')
    const firstLine = blockLines[0].trim()

    // 在可见条目中查找首行匹配
    for (let i = 0; i < visibleItems.length; i++) {
      const item = visibleItems[i]
      const header = getHeader(item)

      // 模糊匹配：首行包含条目的关键信息
      if (firstLine.includes(header.split(' · ')[0]) || header.includes(firstLine.split(' · ')[0])) {
        // 找到在原始数组中的索引
        const originalIndex = items.indexOf(item)
        // 提取描述部分（跳过首行和可能的日期行）
        const descLines = blockLines.slice(firstLine.includes('·') ? 1 : 0)
        // 跳过日期行
        const descStart = descLines.findIndex(line => !/^\d{4}.*[~\-–].*\d{0,4}/.test(line.trim()))
        const descText = descStart >= 0
          ? descLines.slice(descStart).join('\n')
          : descLines.join('\n')

        if (descText.trim()) {
          const rawDescHtml = sanitizeHtml(markdownToHtml(descText))
          newItems[originalIndex] = {
            ...item,
            description: tiptapNormalize(editor, rawDescHtml),
          }
        }
        break
      }
    }
  }

  return newItems
}

/** 获取待优化的 section 列表（排除 basic 和 hidden） */
export function getOptimizableSections(resume: Resume): { sectionId: string; title: string }[] {
  const hidden = new Set(resume.hiddenSections || [])
  const result: { sectionId: string; title: string }[] = []

  for (const sectionId of resume.sectionOrder) {
    if (hidden.has(sectionId)) continue
    if (sectionId === 'basic') continue
    const title = getSectionDisplayTitle(resume, sectionId)
    result.push({ sectionId, title })
  }

  return result
}
