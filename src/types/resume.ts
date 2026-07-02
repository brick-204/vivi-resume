// 字段显示模式
export type FieldDisplayMode = 'iconLabelValue' | 'labelValue' | 'iconValue'

// 头部布局模式
export type HeaderLayout = 'centered' | 'photo-left' | 'photo-right'

// 头部文字颜色模式
export type HeaderTextColor = 'black' | 'white' | 'accent'

// 头部图标颜色模式
export type HeaderIconColor = 'black' | 'white' | 'accent'

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
  expectedCity: string
  workExperience: string
  wechat: string
  qq: string
  salaryRange: string
  hiddenFields: Record<string, boolean>
  customFields: CustomField[]
  fieldOrder: string[]
  fieldDisplayMode: Record<string, FieldDisplayMode>
  photoShape?: 'circle' | 'rectangle'
  photoOriginal?: string
  headerLayout?: HeaderLayout
}

// 工作经历
export interface WorkItem {
  id: string
  company: string
  position: string
  startDate: string
  endDate: string
  description: string
  /** @deprecated 已合并到 description，仅做向后兼容读取 */
  highlights?: string[]
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

// 项目经历
export interface ProjectItem {
  id: string
  name: string
  role: string
  startDate: string
  endDate: string
  description: string
  technologies: string[]
  /** @deprecated 已合并到 description，仅做向后兼容读取 */
  highlights?: string[]
  hidden?: boolean
}

// 技能（改为纯文本，用户自由列举）
export interface SkillItem {
  id: string
  content: string  // 技能内容，支持多行
}

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

// AI 评估结果
export interface EvaluationResult {
  score: number | null
  text: string        // Markdown 原文
  evaluatedAt: string // ISO 时间戳
}

// JD 扫描结果
export interface JdScanResult {
  score: number | null
  text: string        // AI 返回的 Markdown 原文
  jdText: string      // 用户输入的 JD 原文
  scannedAt: string   // ISO 时间戳
}

// AI 面试准备结果
export interface InterviewResult {
  text: string        // AI 返回的 Markdown 原文
  jdText: string      // 用户输入的 JD 原文（可为空）
  preparedAt: string  // ISO 时间戳
}

// 简历完整数据
export interface Resume {
  id: string
  title: string
  templateId: string
  themeAccentColor?: string
  whiteHeaderText?: boolean
  iconFollowAccent?: boolean
  headerTextColor?: HeaderTextColor
  headerIconColor?: HeaderIconColor
  fontFamily?: string
  lineHeight?: number
  bodyFontSize?: number
  sectionTitleFontSize?: number
  entryTitleFontSize?: number
  pagePadding?: number
  moduleSpacing?: number
  paragraphSpacing?: number
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
  lastEvaluation?: EvaluationResult
  lastJdScan?: JdScanResult
  lastInterview?: InterviewResult
  createdAt: string
  updatedAt: string
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
  return Date.now().toString(36) + Math.random().toString(36).substring(2)
}