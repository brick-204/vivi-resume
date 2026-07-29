import type { z } from 'zod'
import {
  HeaderLayoutSchema,
  HeaderTextColorSchema,
  HeaderIconColorSchema,
  FieldDisplayModeSchema,
  CustomFieldSchema,
  BasicInfoSchema,
  WorkItemSchema,
  EducationItemSchema,
  ProjectItemSchema,
  SkillItemSchema,
  CustomTextSectionSchema,
  CustomCardItemSchema,
  CustomCardSectionSchema,
  EvaluationResultSchema,
  JdScanResultSchema,
  InterviewResultSchema,
  ResumeSchema,
} from '@/schemas/resumeSchema'

// ========== 字面量类型（从 schema 派生，单一来源） ==========

// 字段显示模式
export type FieldDisplayMode = z.infer<typeof FieldDisplayModeSchema>

// 头部布局模式
export type HeaderLayout = z.infer<typeof HeaderLayoutSchema>

// 头部文字颜色模式
export type HeaderTextColor = z.infer<typeof HeaderTextColorSchema>

// 头部图标颜色模式
export type HeaderIconColor = z.infer<typeof HeaderIconColorSchema>

// 简历基本信息
export type CustomField = z.infer<typeof CustomFieldSchema>

export type BasicInfo = z.infer<typeof BasicInfoSchema>

// 工作经历
export type WorkItem = z.infer<typeof WorkItemSchema>

// 教育经历
export type EducationItem = z.infer<typeof EducationItemSchema>

// 项目经历
export type ProjectItem = z.infer<typeof ProjectItemSchema>

// 技能（改为纯文本，用户自由列举）
export type SkillItem = z.infer<typeof SkillItemSchema>

// 删除项包装器
export interface DeletedItem<T> {
  data: T
  deletedAt: string  // ISO timestamp
}

// Card 暂存（固定 7 天）
export interface DeletedItems {
  work?: DeletedItem<WorkItem>[]
  education?: DeletedItem<EducationItem>[]
  projects?: DeletedItem<ProjectItem>[]
  skills?: DeletedItem<SkillItem>[]
  customCards?: DeletedItem<CustomCardItem & { sectionId: string }>[]
}

// Section 暂存（固定 7 天）
export interface DeletedSections {
  work?: { data: WorkItem[], deletedAt: string, sectionTitle?: string }
  education?: { data: EducationItem[], deletedAt: string, sectionTitle?: string }
  projects?: { data: ProjectItem[], deletedAt: string, sectionTitle?: string }
  skills?: { data: SkillItem[], deletedAt: string, sectionTitle?: string }
  evaluation?: { data: string, deletedAt: string, sectionTitle?: string }
  customTexts?: Record<string, { data: CustomTextSection, deletedAt: string, sectionTitle?: string }>
  customCards?: Record<string, { data: CustomCardSection, deletedAt: string, sectionTitle?: string }>
}

// 自定义文本模块
export type CustomTextSection = z.infer<typeof CustomTextSectionSchema>

// 自定义列表模块
export type CustomCardItem = z.infer<typeof CustomCardItemSchema>

export type CustomCardSection = z.infer<typeof CustomCardSectionSchema>

// AI 评估结果
export type EvaluationResult = z.infer<typeof EvaluationResultSchema>

// JD 扫描结果
export type JdScanResult = z.infer<typeof JdScanResultSchema>

// AI 面试准备结果
export type InterviewResult = z.infer<typeof InterviewResultSchema>

// 简历完整数据
// 核心字段从 ResumeSchema 派生；回收站运行时状态（deletedItems/deletedSections/deletedAt）
// schema 仅 z.unknown() 占位放行，类型在此手写覆盖
export type Resume = Omit<
  z.infer<typeof ResumeSchema>,
  'deletedItems' | 'deletedSections' | 'deletedAt'
> & {
  // 回收站与暂存
  deletedItems?: DeletedItems
  deletedSections?: DeletedSections
  deletedAt?: string  // 仅回收站中的简历使用
}

// 字段级冲突项（用于恢复时的合并冲突处理）
export interface FieldConflict {
  key: string           // 字段名：'sectionTitle' | 'content' | ...
  label: string         // 中文标签：'模块标题' | '内容' | ...
  existingValue: string // 当前值（序列化为字符串）
  trashValue: string    // 回收箱值
  mergedValue: string   // 合并预览值（可编辑）
  choice: 'current' | 'trash' | 'merged'  // 用户选择
}

// 冲突检测结果
export interface ConflictDetectionResult {
  hasConflict: boolean
  conflicts: FieldConflict[]
}

// 默认模块顺序
export const DEFAULT_SECTION_ORDER = [
  'basic', 'summary', 'work', 'education', 'projects', 'skills', 'evaluation'
]

// 可配置的模块（basic 不可删除/隐藏）
export const CONFIGURABLE_SECTIONS = [
  'summary', 'work', 'education', 'projects', 'skills', 'evaluation'
]

// 模块配置信息
export const SECTION_CONFIG: Record<string, { label: string; icon: string }> = {
  basic: { label: '基本信息', icon: 'user' },
  summary: { label: '个人简介', icon: 'message' },
  work: { label: '工作经历', icon: 'briefcase' },
  education: { label: '教育经历', icon: 'education' },
  projects: { label: '项目经历', icon: 'rocket' },
  skills: { label: '技能', icon: 'zap' },
  evaluation: { label: '自我评价', icon: 'star' },
  customText: { label: '自定义文本', icon: 'textEdit' },
  customCard: { label: '自定义列表', icon: 'listBox' }
}

// 自定义模块模板类型（可无限添加）
export const CUSTOM_SECTION_TYPES = ['customText', 'customCard'] as const
export type CustomSectionType = typeof CUSTOM_SECTION_TYPES[number]

// 判断 sectionId 是否为自定义模块
export const isCustomSection = (sectionId: string): boolean => {
  return sectionId.startsWith('customText_') || sectionId.startsWith('customCard_')
}

// 从自定义 sectionId 获取模板类型
export const getCustomSectionType = (sectionId: string): CustomSectionType | null => {
  if (sectionId.startsWith('customText_')) return 'customText'
  if (sectionId.startsWith('customCard_')) return 'customCard'
  return null
}

// 从自定义 sectionId 获取数据索引
export const getCustomSectionIndex = (sectionId: string): number | null => {
  const match = sectionId.match(/^custom(?:Text|Card)_(\d+)$/)
  return match ? parseInt(match[1]) : null
}

// 生成自定义 sectionId
export const generateCustomSectionId = (type: CustomSectionType, index: number): string => {
  return `${type}_${index}`
}

// 默认基本信息字段顺序
export const DEFAULT_FIELD_ORDER = [
  'photo', 'name', 'title', 'gender', 'birthday', 'age',
  'location',
  'expectedCity', 'workExperience', 'salaryRange', 'email',
  'phone', 'wechat', 'qq', 'website'
]

// 行高默认值
export const DEFAULT_LINE_HEIGHT = 1.7
export const DEFAULT_PAGE_PADDING = 48
export const DEFAULT_MODULE_SPACING = 16
export const DEFAULT_PARAGRAPH_SPACING = 12

// 创建新简历的默认模板
export const createEmptyResume = (): Resume => {
  const now = new Date().toISOString()
  return {
    id: generateId(),
    title: '我的简历',
    templateId: 'sidebar',
    basicInfo: {
      name: '',
      title: '',
      photo: '',
      email: '',
      phone: '',
      location: '',
      website: '',
      summary: '',
      gender: '',
      birthday: '',
      age: '',
      expectedCity: '',
      workExperience: '',
      wechat: '',
      qq: '',
      salaryRange: '',
      hiddenFields: {},
      customFields: [],
      fieldOrder: [...DEFAULT_FIELD_ORDER],
      fieldDisplayMode: {},
      headerLayout: 'centered',
    },
    workExperience: [],
    education: [],
    projects: [],
    skills: [],
    selfEvaluation: '',
    customTexts: [],
    customCards: [],
    sectionTitles: {},
    sectionOrder: [...DEFAULT_SECTION_ORDER],
    hiddenSections: [],
    lineHeight: DEFAULT_LINE_HEIGHT,
    pagePadding: DEFAULT_PAGE_PADDING,
    moduleSpacing: DEFAULT_MODULE_SPACING,
    paragraphSpacing: DEFAULT_PARAGRAPH_SPACING,
    createdAt: now,
    updatedAt: now
  }
}

// 生成唯一 ID
export const DEFAULT_SECTION_TITLES: Record<string, string> = {
  basic: '基本信息',
  summary: '个人简介',
  work: '工作经历',
  education: '教育经历',
  projects: '项目经历',
  skills: '专业技能',
  evaluation: '自我评价',
  customText: '纯文本模块',
  customCard: '卡片类模块',
}

export const getSectionTitle = (resume: Resume | undefined | null, sectionId: string): string => {
  if (!resume) {
    const type = getCustomSectionType(sectionId)
    return DEFAULT_SECTION_TITLES[sectionId] || (type ? DEFAULT_SECTION_TITLES[type] : '') || sectionId
  }
  const type = getCustomSectionType(sectionId)
  return resume.sectionTitles?.[sectionId] || DEFAULT_SECTION_TITLES[sectionId] || (type ? DEFAULT_SECTION_TITLES[type] : '') || sectionId
}

export const generateId = (): string => {
  // ponytail: 浏览器原生 UUID，零碰撞（纯客户端 SPA，无 SSR）
  // 非安全上下文（http/file 协议）下 crypto.randomUUID 可能缺失，降级到时间戳+随机
  return crypto?.randomUUID?.() ?? (Date.now().toString(36) + Math.random().toString(36).substring(2))
}