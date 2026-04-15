// 简历基本信息
export interface BasicInfo {
  name: string
  title: string
  photo: string  // 头像URL
  email: string
  phone: string
  location: string
  website: string
  summary: string
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
}

// 技能
export interface SkillItem {
  id: string
  name: string
  level: number // 1-5
  category: string
}

// 语言能力
export interface LanguageItem {
  id: string
  name: string
  level: string // 例如：母语、流利、熟练、基础
}

// 简历完整数据
export interface Resume {
  id: string
  title: string
  templateId: string
  basicInfo: BasicInfo
  workExperience: WorkItem[]
  education: EducationItem[]
  projects: ProjectItem[]
  skills: SkillItem[]
  languages: LanguageItem[]
  selfEvaluation: string
  sectionOrder: string[]  // 模块显示顺序
  hiddenSections: string[]  // 已隐藏/删除的模块
  createdAt: string
  updatedAt: string
}

// 默认模块顺序
export const DEFAULT_SECTION_ORDER = [
  'basic', 'summary', 'work', 'education', 'projects', 'skills', 'languages', 'evaluation'
]

// 可配置的模块（basic 不可删除/隐藏）
export const CONFIGURABLE_SECTIONS = [
  'summary', 'work', 'education', 'projects', 'skills', 'languages', 'evaluation'
]

// 模块配置信息
export const SECTION_CONFIG: Record<string, { label: string; icon: string }> = {
  basic: { label: '基本信息', icon: 'user' },
  summary: { label: '个人简介', icon: 'message' },
  work: { label: '工作经历', icon: 'briefcase' },
  education: { label: '教育经历', icon: 'education' },
  projects: { label: '项目经验', icon: 'rocket' },
  skills: { label: '技能', icon: 'zap' },
  languages: { label: '语言', icon: 'globe' },
  evaluation: { label: '自我评价', icon: 'star' }
}

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
      summary: ''
    },
    workExperience: [],
    education: [],
    projects: [],
    skills: [],
    languages: [],
    selfEvaluation: '',
    sectionOrder: [...DEFAULT_SECTION_ORDER],
    hiddenSections: [],
    createdAt: now,
    updatedAt: now
  }
}

// 生成唯一 ID
export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2)
}