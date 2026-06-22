/**
 * Resume Zod Schema — 用于 JSON 导入时的严格校验
 * 镜像 src/types/resume.ts 的类型定义
 */
import { z } from 'zod'

// ========== 字段中文映射 ==========
const FIELD_LABELS: Record<string, string> = {
  // 顶层
  id: '简历 ID',
  title: '简历标题',
  templateId: '模板 ID',
  basicInfo: '基本信息',
  workExperience: '工作经历',
  education: '教育经历',
  projects: '项目经验',
  skills: '技能',
  selfEvaluation: '自我评价',
  customTexts: '自定义文本',
  customCards: '自定义列表',
  sectionOrder: '模块顺序',
  sectionTitles: '模块标题',
  hiddenSections: '隐藏模块',
  createdAt: '创建时间',
  updatedAt: '更新时间',
  // BasicInfo
  name: '姓名',
  photo: '头像',
  email: '邮箱',
  phone: '电话',
  location: '所在地',
  website: '个人网站',
  summary: '个人简介',
  gender: '性别',
  birthday: '出生日期',
  age: '年龄',
  expectedCity: '期望城市',
  wechat: '微信号',
  qq: 'QQ',
  salaryRange: '薪资要求',
  hiddenFields: '隐藏字段',
  customFields: '自定义字段',
  fieldOrder: '字段顺序',
  fieldDisplayMode: '字段显示模式',
  photoShape: '头像形状',
  photoOriginal: '原始头像',
  headerLayout: '头部布局',
  // WorkItem
  company: '公司',
  position: '职位',
  startDate: '开始日期',
  endDate: '结束日期',
  description: '描述',
  highlights: '亮点',
  hidden: '隐藏',
  // EducationItem
  school: '学校',
  degree: '学位',
  major: '专业',
  // ProjectItem
  role: '角色',
  technologies: '技术栈',
  // SkillItem
  content: '内容',
  // CustomField
  label: '标签',
  value: '值',
  // CustomCardItem
  keywords: '关键词',
  items: '列表项',
}

/** 将 Zod path 转为中文标签 */
function formatPath(path: Array<string | number>): string {
  return path.map(p => {
    if (typeof p === 'number') return `[${p}]`
    return FIELD_LABELS[p] || p
  }).join(' - ')
}

// ========== 基础 Schema ==========

const CustomFieldSchema = z.object({
  id: z.string(),
  label: z.string(),
  value: z.string(),
  hidden: z.boolean(),
}).passthrough()

const BasicInfoSchema = z.object({
  name: z.string(),
  title: z.string(),
  photo: z.string(),
  email: z.string(),
  phone: z.string(),
  location: z.string(),
  website: z.string(),
  summary: z.string(),
  gender: z.string(),
  birthday: z.string(),
  age: z.string(),
  expectedCity: z.string(),
  workExperience: z.string(),
  wechat: z.string(),
  qq: z.string(),
  salaryRange: z.string(),
  hiddenFields: z.record(z.string(), z.boolean()),
  customFields: z.array(CustomFieldSchema),
  fieldOrder: z.array(z.string()),
  fieldDisplayMode: z.record(z.string(), z.string()),
  photoShape: z.enum(['circle', 'rectangle']).optional(),
  photoOriginal: z.string().optional(),
  headerLayout: z.enum(['centered', 'photo-left', 'photo-right']).optional(),
}).passthrough()

const WorkItemSchema = z.object({
  id: z.string(),
  company: z.string(),
  position: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  description: z.string(),
  highlights: z.array(z.string()).optional(),
  hidden: z.boolean().optional(),
}).passthrough()

const EducationItemSchema = z.object({
  id: z.string(),
  school: z.string(),
  degree: z.string(),
  major: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  description: z.string(),
  hidden: z.boolean().optional(),
}).passthrough()

const ProjectItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  description: z.string(),
  technologies: z.array(z.string()),
  highlights: z.array(z.string()).optional(),
  hidden: z.boolean().optional(),
}).passthrough()

const SkillItemSchema = z.object({
  id: z.string(),
  content: z.string(),
}).passthrough()

const CustomTextSectionSchema = z.object({
  id: z.string(),
  content: z.string(),
}).passthrough()

const CustomCardItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  description: z.string(),
  keywords: z.array(z.string()),
  hidden: z.boolean().optional(),
}).passthrough()

const CustomCardSectionSchema = z.object({
  id: z.string(),
  items: z.array(CustomCardItemSchema),
}).passthrough()

const EvaluationResultSchema = z.object({
  score: z.number().nullable(),
  text: z.string(),
  evaluatedAt: z.string(),
}).passthrough()

const JdScanResultSchema = z.object({
  score: z.number().nullable(),
  text: z.string(),
  jdText: z.string(),
  scannedAt: z.string(),
}).passthrough()

const InterviewResultSchema = z.object({
  text: z.string(),
  jdText: z.string(),
  preparedAt: z.string(),
}).passthrough()

// ========== 完整 Resume Schema ==========

const ResumeSchema = z.object({
  id: z.string(),
  title: z.string(),
  templateId: z.string(),
  themeAccentColor: z.string().optional(),
  whiteHeaderText: z.boolean().optional(),
  iconFollowAccent: z.boolean().optional(),
  headerTextColor: z.enum(['black', 'white', 'accent']).optional(),
  headerIconColor: z.enum(['black', 'white', 'accent']).optional(),
  fontFamily: z.string().optional(),
  lineHeight: z.number().optional(),
  bodyFontSize: z.number().optional(),
  sectionTitleFontSize: z.number().optional(),
  entryTitleFontSize: z.number().optional(),
  pagePadding: z.number().optional(),
  moduleSpacing: z.number().optional(),
  paragraphSpacing: z.number().optional(),
  basicInfo: BasicInfoSchema,
  workExperience: z.array(WorkItemSchema),
  education: z.array(EducationItemSchema),
  projects: z.array(ProjectItemSchema),
  skills: z.array(SkillItemSchema),
  selfEvaluation: z.string(),
  customTexts: z.array(CustomTextSectionSchema),
  customCards: z.array(CustomCardSectionSchema),
  sectionOrder: z.array(z.string()),
  sectionTitles: z.record(z.string(), z.string()),
  hiddenSections: z.array(z.string()),
  lastEvaluation: EvaluationResultSchema.optional(),
  lastJdScan: JdScanResultSchema.optional(),
  lastInterview: InterviewResultSchema.optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
}).passthrough()

// ========== 校验结果类型 ==========

export interface ValidationError {
  /** 中文格式化的字段路径，如 "基本信息 - 姓名" */
  path: string
  /** 中文错误消息 */
  message: string
}

export interface ValidationResult {
  success: boolean
  data?: unknown
  errors?: ValidationError[]
}

// ========== Zod 错误中文映射 ==========

/** Zod issue code → 中文消息模板 */
const CODE_MESSAGES: Record<string, (path: string, issue: z.ZodIssue) => string> = {
  invalid_type: (path, issue) => {
    const data = issue as unknown as Record<string, unknown>
    const expected = TYPE_LABELS[String(data.expected)] || String(data.expected)
    const received = TYPE_LABELS[String(data.received)] || String(data.received)
    return `字段 ${path} 应为${expected}类型，实际为${received}`
  },
  too_small: (path, issue) => {
    const data = issue as unknown as Record<string, unknown>
    if (data.origin === 'string') return `字段 ${path} 不能为空`
    return `字段 ${path} 的值过小`
  },
  too_big: (path) => `字段 ${path} 的值过大`,
  invalid_value: (path, issue) => {
    const data = issue as unknown as Record<string, unknown>
    const values = Array.isArray(data.values) ? data.values : [data.values]
    return `字段 ${path} 的值无效，应为 ${values.map((v: unknown) => typeof v === 'string' ? v : JSON.stringify(v)).join(' / ')} 之一`
  },
  invalid_format: (path) => `字段 ${path} 格式不正确`,
  invalid_union: (path) => `字段 ${path} 不满足任一联合类型`,
  unrecognized_keys: (path, issue) => {
    const data = issue as unknown as Record<string, unknown>
    const keys = Array.isArray(data.keys) ? data.keys : []
    return `字段 ${path} 包含未知键：${keys.join(', ')}`
  },
  invalid_key: (path) => `字段 ${path} 的键无效`,
  invalid_element: (path) => `字段 ${path} 的元素无效`,
  not_multiple_of: (path) => `字段 ${path} 不是有效倍数`,
  custom: (path) => `字段 ${path} 自定义校验失败`,
}

const TYPE_LABELS: Record<string, string> = {
  string: '字符串',
  number: '数字',
  boolean: '布尔值',
  array: '数组',
  object: '对象',
  undefined: '未定义',
  null: '空值',
}

function translateIssue(issue: z.ZodIssue): ValidationError {
  const path = formatPath(issue.path as (string | number)[])
  const factory = CODE_MESSAGES[issue.code]
  const message = factory ? factory(path, issue) : `字段 ${path} 验证失败`
  return { path, message }
}

// ========== 导出校验函数 ==========

/**
 * 校验 JSON 字符串是否符合 Resume 类型
 * 使用 passthrough 模式，允许额外字段（前向兼容）
 */
export function validateResumeJSON(json: string): ValidationResult {
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    return {
      success: false,
      errors: [{ path: '', message: 'JSON 格式不正确，无法解析' }],
    }
  }

  const result = ResumeSchema.safeParse(parsed)
  if (result.success) {
    return { success: true, data: result.data }
  }

  // 最多展示前 10 条错误，避免信息过载
  const errors = result.error.issues.slice(0, 10).map(translateIssue)
  if (result.error.issues.length > 10) {
    errors.push({
      path: '',
      message: `...还有 ${result.error.issues.length - 10} 个错误未显示`,
    })
  }

  return { success: false, errors }
}
