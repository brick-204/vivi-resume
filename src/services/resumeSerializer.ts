/**
 * 简历序列化工具
 * 将 Resume 对象转换为结构化纯文本，供 AI 评估使用
 */

import type { Resume } from '@/types/resume'
import {
  SECTION_CONFIG,
  isCustomSection,
  getCustomSectionType,
  getCustomSectionIndex,
} from '@/types/resume'
import { htmlToPlainText } from '@/services/aiService'

/** 获取模块显示标题（优先使用自定义标题） */
function getSectionDisplayTitle(resume: Resume, sectionId: string): string {
  const customTitle = resume.sectionTitles?.[sectionId]
  if (customTitle) return customTitle
  if (isCustomSection(sectionId)) {
    const type = getCustomSectionType(sectionId)
    return SECTION_CONFIG[type!]?.label || sectionId
  }
  return SECTION_CONFIG[sectionId]?.label || sectionId
}

/** 将 Resume 序列化为结构化纯文本 */
export function serializeResumeForEvaluation(resume: Resume): string {
  const hidden = new Set(resume.hiddenSections || [])
  const sections: string[] = []

  // 按 sectionOrder 遍历，保证顺序与简历展示一致
  for (const sectionId of resume.sectionOrder) {
    if (hidden.has(sectionId)) continue
    const title = getSectionDisplayTitle(resume, sectionId)
    const content = serializeSection(resume, sectionId)
    // 即使内容为空也要列出模块，让 AI 知道该模块存在但缺失
    sections.push(`【${title}】\n${content || '（未填写）'}`)
  }

  return sections.join('\n\n')
}

/** 序列化单个模块 */
function serializeSection(resume: Resume, sectionId: string): string {
  // 基本信息（含个人简介）
  if (sectionId === 'basic' || sectionId === 'summary') {
    return serializeBasicInfo(resume, sectionId)
  }

  // 工作经历
  if (sectionId === 'work') {
    return serializeWorkExperience(resume)
  }

  // 教育经历
  if (sectionId === 'education') {
    return serializeEducation(resume)
  }

  // 项目经验
  if (sectionId === 'projects') {
    return serializeProjects(resume)
  }

  // 专业技能
  if (sectionId === 'skills') {
    return serializeSkills(resume)
  }

  // 自我评价
  if (sectionId === 'evaluation') {
    return serializeSelfEvaluation(resume)
  }

  // 自定义模块
  if (isCustomSection(sectionId)) {
    return serializeCustomSection(resume, sectionId)
  }

  return ''
}

/** 序列化基本信息和个人简介 */
function serializeBasicInfo(resume: Resume, sectionId: string): string {
  if (sectionId === 'basic') {
    const info = resume.basicInfo
    const lines: string[] = []
    if (info.name) lines.push(`姓名：${info.name}`)
    if (info.title) lines.push(`职位/头衔：${info.title}`)
    if (info.email) lines.push(`邮箱：${info.email}`)
    if (info.phone) lines.push(`电话：${info.phone}`)
    if (info.location) lines.push(`所在地：${info.location}`)
    if (info.website) lines.push(`网站：${info.website}`)
    if (info.gender) lines.push(`性别：${info.gender}`)
    if (info.birthday) lines.push(`出生日期：${info.birthday}`)
    if (info.age) lines.push(`年龄：${info.age}`)
    if (info.expectedCity) lines.push(`期望城市：${info.expectedCity}`)
    if (info.workExperience) lines.push(`工作年限：${info.workExperience}`)
    if (info.wechat) lines.push(`微信：${info.wechat}`)
    if (info.qq) lines.push(`QQ：${info.qq}`)
    if (info.salaryRange) lines.push(`期望薪资：${info.salaryRange}`)

    // 自定义字段
    for (const field of info.customFields || []) {
      if (field.value && !field.hidden) {
        lines.push(`${field.label}：${field.value}`)
      }
    }

    return lines.join('\n')
  }

  // 个人简介（summary）
  if (sectionId === 'summary') {
    const text = htmlToPlainText(resume.basicInfo.summary || '')
    return text
  }

  return ''
}

/** 序列化工作经历 */
function serializeWorkExperience(resume: Resume): string {
  const items = resume.workExperience.filter(item => !item.hidden)
  if (items.length === 0) return ''

  return items.map(item => {
    const lines = [`${item.company} · ${item.position}`]
    if (item.startDate || item.endDate) {
      lines.push(`${item.startDate || '?'} ~ ${item.endDate || '?'}`)
    }
    if (item.description) {
      const desc = htmlToPlainText(item.description)
      if (desc) lines.push(desc)
    }
    return lines.join('\n')
  }).join('\n\n')
}

/** 序列化教育经历 */
function serializeEducation(resume: Resume): string {
  const items = resume.education.filter(item => !item.hidden)
  if (items.length === 0) return ''

  return items.map(item => {
    const lines = [`${item.school} · ${item.degree} · ${item.major}`]
    if (item.startDate || item.endDate) {
      lines.push(`${item.startDate || '?'} ~ ${item.endDate || '?'}`)
    }
    if (item.description) {
      const desc = htmlToPlainText(item.description)
      if (desc) lines.push(desc)
    }
    return lines.join('\n')
  }).join('\n\n')
}

/** 序列化项目经验 */
function serializeProjects(resume: Resume): string {
  const items = resume.projects.filter(item => !item.hidden)
  if (items.length === 0) return ''

  return items.map(item => {
    const lines = [`${item.name} · ${item.role}`]
    if (item.startDate || item.endDate) {
      lines.push(`${item.startDate || '?'} ~ ${item.endDate || '?'}`)
    }
    if (item.technologies?.length) {
      lines.push(`技术栈：${item.technologies.join('、')}`)
    }
    if (item.description) {
      const desc = htmlToPlainText(item.description)
      if (desc) lines.push(desc)
    }
    return lines.join('\n')
  }).join('\n\n')
}

/** 序列化专业技能 */
function serializeSkills(resume: Resume): string {
  if (resume.skills.length === 0) return ''
  return resume.skills.map(s => htmlToPlainText(s.content)).filter(Boolean).join('\n')
}

/** 序列化自我评价 */
function serializeSelfEvaluation(resume: Resume): string {
  return htmlToPlainText(resume.selfEvaluation || '')
}

/** 序列化自定义模块 */
function serializeCustomSection(resume: Resume, sectionId: string): string {
  const type = getCustomSectionType(sectionId)
  const index = getCustomSectionIndex(sectionId)
  if (type === null || index === null) return ''

  if (type === 'customText') {
    const section = resume.customTexts[index]
    if (!section) return ''
    return htmlToPlainText(section.content || '')
  }

  if (type === 'customCard') {
    const section = resume.customCards[index]
    if (!section) return ''
    const items = section.items.filter(item => !item.hidden)
    if (items.length === 0) return ''
    return items.map(item => {
      const lines = [`${item.name} · ${item.role}`]
      if (item.startDate || item.endDate) {
        lines.push(`${item.startDate || '?'} ~ ${item.endDate || '?'}`)
      }
      if (item.keywords?.length) {
        lines.push(`关键词：${item.keywords.join('、')}`)
      }
      if (item.description) {
        const desc = htmlToPlainText(item.description)
        if (desc) lines.push(desc)
      }
      return lines.join('\n')
    }).join('\n\n')
  }

  return ''
}

/** 轻量序列化：将简历内容拼接为纯文本，供全文搜索使用 */
export function serializeResumeForSearch(resume: Resume): string {
  const parts: string[] = []

  // 基本信息
  const info = resume.basicInfo
  if (info.name) parts.push(info.name)
  if (info.title) parts.push(info.title)
  if (info.email) parts.push(info.email)
  if (info.phone) parts.push(info.phone)
  if (info.location) parts.push(info.location)
  if (info.website) parts.push(info.website)
  if (info.expectedCity) parts.push(info.expectedCity)
  if (info.workExperience) parts.push(info.workExperience)
  if (info.summary) parts.push(htmlToPlainText(info.summary))

  // 自定义字段
  for (const field of info.customFields || []) {
    if (field.value && !field.hidden) parts.push(field.value)
  }

  // 工作经历
  for (const item of resume.workExperience) {
    if (item.hidden) continue
    if (item.company) parts.push(item.company)
    if (item.position) parts.push(item.position)
    if (item.description) parts.push(htmlToPlainText(item.description))
  }

  // 教育经历
  for (const item of resume.education) {
    if (item.hidden) continue
    if (item.school) parts.push(item.school)
    if (item.degree) parts.push(item.degree)
    if (item.major) parts.push(item.major)
    if (item.description) parts.push(htmlToPlainText(item.description))
  }

  // 项目经验
  for (const item of resume.projects) {
    if (item.hidden) continue
    if (item.name) parts.push(item.name)
    if (item.role) parts.push(item.role)
    if (item.technologies?.length) parts.push(item.technologies.join(' '))
    if (item.description) parts.push(htmlToPlainText(item.description))
  }

  // 技能
  for (const s of resume.skills) {
    const text = htmlToPlainText(s.content)
    if (text) parts.push(text)
  }

  // 自我评价
  if (resume.selfEvaluation) {
    parts.push(htmlToPlainText(resume.selfEvaluation))
  }

  // 自定义模块
  for (const section of resume.customTexts) {
    if (section.content) parts.push(htmlToPlainText(section.content))
  }
  for (const section of resume.customCards) {
    for (const item of section.items) {
      if (item.hidden) continue
      if (item.name) parts.push(item.name)
      if (item.role) parts.push(item.role)
      if (item.keywords?.length) parts.push(item.keywords.join(' '))
      if (item.description) parts.push(htmlToPlainText(item.description))
    }
  }

  return parts.join(' ')
}