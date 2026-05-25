// 字段显示模式
export type FieldDisplayMode = 'iconLabelValue' | 'labelValue' | 'iconValue'

// 简历基本信息
export interface CustomField {
  id: string
  label: string
  value: string
  hidden: boolean
}

export interface BasicInfo {
  name: string
  title: string
  photo: string
  email: string
  phone: string
  location: string
  website: string
  summary: string
  gender: string
  birthday: string
  age: string
  maritalStatus: string
  politicalStatus: string
  hometown: string
  expectedCity: string
  workStartDate: string
  wechat: string
  qq: string
  salaryRange: string
  hiddenFields: Record<string, boolean>
  customFields: CustomField[]
  fieldOrder: string[]
  fieldDisplayMode: Record<string, FieldDisplayMode>
}

// 工作经历
export interface WorkItem {
  id: string
  company: string
  position: string
  startDate: string
  endDate: string
  description: string
  highlights: string[]
  hidden?: boolean
}

// 教育经历
export interface EducationItem {
  id: string
  school: string
  degree: string
  major: string
  startDate: string
  endDate: string
  description: string
  hidden?: boolean
}

// 项目经验
export interface ProjectItem {
  id: string
  name: string
  role: string
  startDate: string
  endDate: string
  description: string
  highlights: string[]
  technologies: string[]
  hidden?: boolean
}

// 技能（改为纯文本，用户自由列举）
export interface SkillItem {
  id: string
  content: string  // 技能内容，支持多行
}

// 自定义文本模块
export interface CustomTextSection {
  id: string
  content: string
}

// 自定义列表模块
export interface CustomCardItem {
  id: string
  name: string
  role: string
  startDate: string
  endDate: string
  description: string
  keywords: string[]
  hidden?: boolean
}

export interface CustomCardSection {
  id: string
  items: CustomCardItem[]
}

// 简历完整数据
export interface Resume {
  id: string
  title: string
  templateId: string
  themeAccentColor?: string
  basicInfo: BasicInfo
  workExperience: WorkItem[]
  education: EducationItem[]
  projects: ProjectItem[]
  skills: SkillItem[]
  selfEvaluation: string
  customTexts: CustomTextSection[]
  customCards: CustomCardSection[]
  sectionOrder: string[]
  sectionTitles: Record<string, string>  // 自定义模块标题
  hiddenSections: string[]  // 已隐藏/删除的模块
  createdAt: string
  updatedAt: string
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
  projects: { label: '项目经验', icon: 'rocket' },
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
  'maritalStatus', 'politicalStatus', 'hometown', 'location',
  'expectedCity', 'workStartDate', 'salaryRange', 'email',
  'phone', 'wechat', 'qq', 'website'
]

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
      maritalStatus: '',
      politicalStatus: '',
      hometown: '',
      expectedCity: '',
      workStartDate: '',
      wechat: '',
      qq: '',
      salaryRange: '',
      hiddenFields: {},
      customFields: [],
      fieldOrder: [...DEFAULT_FIELD_ORDER],
      fieldDisplayMode: {}
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
  projects: '项目经验',
  skills: '专业技能',
  evaluation: '自我评价',
  customText: '自定义模块一',
  customCard: '自定义模块二',
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
  return Date.now().toString(36) + Math.random().toString(36).substring(2)
}