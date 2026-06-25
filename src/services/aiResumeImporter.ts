/**
 * AI 简历导入服务
 * 解析 AI 输出的 JSON、专用 Schema 校验、HTML 归一化、系统字段填充
 *
 * 注意：AI 流式调用由 AIImportModal 组件直接通过 streamChat + buildMessages 完成，
 * 本模块仅负责解析流式完成后的 AI 输出文本
 */

import type { Resume, WorkItem, EducationItem, ProjectItem, SkillItem, CustomTextSection, CustomCardSection } from '@/types/resume'
import { createEmptyResume, generateId } from '@/types/resume'
import { type ValidationError } from '@/schemas/resumeSchema'
import { markdownToHtml } from '@/utils/markdownConverter'
import { sanitizeHtml } from '@/utils/sanitizeHtml'
import { normalizeContent } from '@/utils/normalizeContent'
import { Editor } from '@tiptap/vue-3'
import { CORE_TIPTAP_EXTENSIONS } from '@/config/tiptapExtensions'
import { z } from 'zod'

// ========== 类型定义 ==========

export interface AIImportResult {
  success: boolean
  resume?: Resume
  errors?: ValidationError[]
  rawText?: string
  /** 是否为部分恢复的结果（JSON 尾部损坏时截取有效前缀） */
  partial?: boolean
  /** 修复/提取后的 JSON 文本，供手动编辑器使用 */
  extractedJson?: string
}

// ========== AI 导入专用 Schema ==========
// AI 不输出系统级字段（id/createdAt/updatedAt/templateId），
// 由 fillDefaults 在校验通过后生成

const AIWorkItemSchema = z.object({
  company: z.string().default(''),
  position: z.string().default(''),
  startDate: z.string().default(''),
  endDate: z.string().default(''),
  description: z.string().default(''),
  hidden: z.boolean().optional(),
}).passthrough()

const AIEducationItemSchema = z.object({
  school: z.string().default(''),
  degree: z.string().default(''),
  major: z.string().default(''),
  startDate: z.string().default(''),
  endDate: z.string().default(''),
  description: z.string().default(''),
  hidden: z.boolean().optional(),
}).passthrough()

const AIProjectItemSchema = z.object({
  name: z.string().default(''),
  role: z.string().default(''),
  startDate: z.string().default(''),
  endDate: z.string().default(''),
  description: z.string().default(''),
  technologies: z.array(z.string()).default([]),
  hidden: z.boolean().optional(),
}).passthrough()

const AISkillItemSchema = z.object({
  content: z.string().default(''),
}).passthrough()

const AIBasicInfoSchema = z.object({
  name: z.string().default(''),
  title: z.string().default(''),
  photo: z.string().default(''),
  email: z.string().default(''),
  phone: z.string().default(''),
  location: z.string().default(''),
  website: z.string().default(''),
  summary: z.string().default(''),
  gender: z.string().default(''),
  birthday: z.string().default(''),
  age: z.string().default(''),
  expectedCity: z.string().default(''),
  workExperience: z.string().default(''),
  wechat: z.string().default(''),
  qq: z.string().default(''),
  salaryRange: z.string().default(''),
  hiddenFields: z.record(z.string(), z.boolean()).default({}),
  customFields: z.array(z.object({
    label: z.string().default(''),
    value: z.string().default(''),
    hidden: z.boolean().optional().default(false),
  }).passthrough()).default([]),
  fieldOrder: z.array(z.string()).default([]),
  fieldDisplayMode: z.record(z.string(), z.string()).default({}),
  headerLayout: z.enum(['centered', 'photo-left', 'photo-right']).optional(),
}).passthrough()

/** AI 导入专用 Schema — 不含系统级字段，宽松校验 */
const AIImportResumeSchema = z.object({
  title: z.string().default(''),
  basicInfo: AIBasicInfoSchema.optional(),
  workExperience: z.array(AIWorkItemSchema).default([]),
  education: z.array(AIEducationItemSchema).default([]),
  projects: z.array(AIProjectItemSchema).default([]),
  skills: z.array(AISkillItemSchema).default([]),
  selfEvaluation: z.string().default(''),
  customTexts: z.array(z.object({ content: z.string().default('') }).passthrough()).default([]),
  customCards: z.array(z.object({
    items: z.array(z.object({
      name: z.string().default(''),
      role: z.string().default(''),
      startDate: z.string().default(''),
      endDate: z.string().default(''),
      description: z.string().default(''),
      keywords: z.array(z.string()).default([]),
      hidden: z.boolean().optional(),
    }).passthrough()).default([]),
  }).passthrough()).default([]),
  sectionOrder: z.array(z.string()).default([]),
  sectionTitles: z.record(z.string(), z.string()).default({}),
  hiddenSections: z.array(z.string()).default([]),
  lineHeight: z.number().optional(),
  pagePadding: z.number().optional(),
  moduleSpacing: z.number().optional(),
  paragraphSpacing: z.number().optional(),
}).passthrough()

// ========== Zod 错误中文映射 ==========

const FIELD_LABELS: Record<string, string> = {
  title: '简历标题',
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
  headerLayout: '头部布局',
  company: '公司',
  position: '职位',
  startDate: '开始日期',
  endDate: '结束日期',
  description: '描述',
  hidden: '隐藏',
  school: '学校',
  degree: '学位',
  major: '专业',
  role: '角色',
  technologies: '技术栈',
  content: '内容',
  keywords: '关键词',
  items: '列表项',
}

function formatPath(path: Array<string | number>): string {
  return path.map(p => {
    if (typeof p === 'number') return `[${p}]`
    return FIELD_LABELS[p] || p
  }).join(' - ')
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
  required: (path) => `字段 ${path} 为必填项`,
}

function translateAIImportIssue(issue: z.ZodIssue): ValidationError {
  const path = formatPath(issue.path as (string | number)[])
  const factory = CODE_MESSAGES[issue.code]
  const message = factory ? factory(path, issue) : `字段 ${path} 验证失败`
  return { path, message }
}

/** 校验 AI 输出是否符合 AI 导入专用 Schema */
function validateAIImportJSON(json: string): { success: boolean; data?: unknown; errors?: ValidationError[] } {
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    return {
      success: false,
      errors: [{ path: '', message: 'JSON 格式不正确，无法解析' }],
    }
  }

  // 预处理：将 AI 可能输出的非标准值修正为 Schema 可接受的格式
  const preprocessed = preprocessAIData(parsed)

  const result = AIImportResumeSchema.safeParse(preprocessed)
  if (result.success) {
    return { success: true, data: result.data }
  }

  const errors = result.error.issues.slice(0, 10).map(translateAIImportIssue)
  if (result.error.issues.length > 10) {
    errors.push({
      path: '',
      message: `...还有 ${result.error.issues.length - 10} 个错误未显示`,
    })
  }

  return { success: false, errors }
}

/**
 * 预处理 AI 输出数据，修复常见的非标准输出
 * 1. 字符串字段输出了 null/undefined → 转为空字符串
 * 2. 数组字段输出了 null/undefined → 转为空数组
 * 3. 对象字段输出了 null/undefined → 转为空对象
 * 4. 数组项中的字段类型修正
 */
function preprocessAIData(data: unknown): unknown {
  if (!data || typeof data !== 'object') return data
  const obj = data as Record<string, unknown>

  // 修正顶层字段
  const STRING_FIELDS = ['title', 'selfEvaluation']
  const ARRAY_FIELDS = ['workExperience', 'education', 'projects', 'skills', 'customTexts', 'customCards', 'hiddenSections', 'sectionOrder']

  for (const field of STRING_FIELDS) {
    if (field in obj && (obj[field] === null || obj[field] === undefined)) {
      obj[field] = ''
    }
  }
  for (const field of ARRAY_FIELDS) {
    if (field in obj && !Array.isArray(obj[field])) {
      obj[field] = []
    }
  }

  // 修正 basicInfo
  if (obj.basicInfo && typeof obj.basicInfo === 'object') {
    const bi = obj.basicInfo as Record<string, unknown>
    const biStringFields = ['name', 'title', 'photo', 'email', 'phone', 'location', 'website', 'summary', 'gender', 'birthday', 'age', 'expectedCity', 'workExperience', 'wechat', 'qq', 'salaryRange']
    for (const field of biStringFields) {
      if (field in bi && (bi[field] === null || bi[field] === undefined)) {
        bi[field] = ''
      }
    }
    if (bi.hiddenFields === null || bi.hiddenFields === undefined) bi.hiddenFields = {}
    if (bi.customFields === null || bi.customFields === undefined) bi.customFields = []
    if (bi.fieldOrder === null || bi.fieldOrder === undefined) bi.fieldOrder = []
    if (bi.fieldDisplayMode === null || bi.fieldDisplayMode === undefined) bi.fieldDisplayMode = {}
  } else if (obj.basicInfo === null || obj.basicInfo === undefined) {
    obj.basicInfo = {}
  }

  // 修正数组项中的字段
  const arrayItemFixers: Array<[string, string[]]> = [
    ['workExperience', ['company', 'position', 'startDate', 'endDate', 'description']],
    ['education', ['school', 'degree', 'major', 'startDate', 'endDate', 'description']],
    ['projects', ['name', 'role', 'startDate', 'endDate', 'description']],
    ['skills', ['content']],
  ]
  for (const [arrayField, stringFields] of arrayItemFixers) {
    const items = obj[arrayField]
    if (!Array.isArray(items)) continue
    for (const item of items) {
      if (!item || typeof item !== 'object') continue
      const record = item as Record<string, unknown>
      for (const field of stringFields) {
        if (field in record && (record[field] === null || record[field] === undefined)) {
          record[field] = ''
        }
      }
      // 修正 technologies/keywords：非数组则转为空数组
      if ('technologies' in record && !Array.isArray(record.technologies)) {
        record.technologies = []
      }
      if ('keywords' in record && !Array.isArray(record.keywords)) {
        record.keywords = []
      }
    }
  }

  // 修正 sectionTitles
  if (obj.sectionTitles === null || obj.sectionTitles === undefined) {
    obj.sectionTitles = {}
  }

  return obj
}

// ========== JSON 提取 ==========

interface ExtractResult {
  json: string | null
  error: string | null
  /** 是否为部分恢复的结果（截取了有效前缀） */
  partial?: boolean
}

/**
 * 尝试修复 AI 输出中常见的 JSON 格式问题
 * 1. 移除注释（AI 可能输出 // 或块注释）
 * 2. 移除 JSON 值中的非法换行符（未转义的 \n）
 * 3. 修复数组元素/对象属性之间缺少的逗号
 * 4. 移除末尾多余的逗号（trailing comma）
 */
function repairJSON(json: string): string {
  let result = json

  // 策略1：移除注释（必须在其他修复之前，避免注释干扰后续解析）
  result = fixComments(result)

  // 策略2：修复字符串值中未转义的换行符
  result = fixUnescapedNewlines(result)

  // 策略3：修复数组元素/对象属性之间缺少的逗号
  result = fixMissingCommas(result)

  // 策略4：移除末尾多余逗号（}, ] 前面的逗号，也可清理策略3的过度插入）
  result = result.replace(/,\s*([}\]])/g, '$1')

  return result
}

/**
 * 移除 AI 输出中的注释（单行 // 和多行块注释，仅在字符串外）
 * AI 有时会在 JSON 中输出类似 JavaScript 的注释，这不是合法 JSON
 */
function fixComments(json: string): string {
  const result: string[] = []
  let i = 0
  let inString = false

  while (i < json.length) {
    const ch = json[i]

    if (inString) {
      result.push(ch)
      if (ch === '\\' && i + 1 < json.length) {
        i++
        result.push(json[i])
      } else if (ch === '"') {
        inString = false
      }
      i++
      continue
    }

    // 字符串外
    if (ch === '"') {
      result.push(ch)
      inString = true
      i++
      continue
    }

    // 检查 // 单行注释
    if (ch === '/' && i + 1 < json.length && json[i + 1] === '/') {
      i += 2
      while (i < json.length && json[i] !== '\n') i++
      continue
    }

    // 检查 /* 多行注释 */
    if (ch === '/' && i + 1 < json.length && json[i + 1] === '*') {
      i += 2
      while (i < json.length && !(json[i] === '*' && i + 1 < json.length && json[i + 1] === '/')) i++
      if (i < json.length) i += 2
      continue
    }

    result.push(ch)
    i++
  }

  return result.join('')
}

/**
 * 修复 AI 输出中数组元素/对象属性之间缺少逗号的问题
 * 逐字符扫描，跟踪字符串状态，在两个值之间缺少逗号时自动补充
 * 常见场景：} { → }, { 或 "a" "b" → "a", "b" 或 数字 数字
 */
function fixMissingCommas(json: string): string {
  const result: string[] = []
  let i = 0
  let inString = false
  // 上一个非空白字符是否为"值结束符"（}, ], ", 或裸值 true/false/null/数字 的末尾）
  let lastCharWasValueEnd = false
  // 上一个非空白字符是否为冒号（冒号后的第一个值不需要逗号分隔）
  let lastCharWasColon = false

  while (i < json.length) {
    const ch = json[i]

    if (inString) {
      result.push(ch)
      if (ch === '\\' && i + 1 < json.length) {
        i++
        result.push(json[i])
      } else if (ch === '"') {
        inString = false
        lastCharWasValueEnd = true
        lastCharWasColon = false
      }
      i++
      continue
    }

    // 字符串外
    if (ch === '"') {
      // 冒号后的第一个值（key 的值）不需要逗号
      if (lastCharWasValueEnd && !lastCharWasColon) {
        result.push(',')
      }
      result.push(ch)
      inString = true
      lastCharWasValueEnd = false
      lastCharWasColon = false
      i++
      continue
    }

    if (ch === '{' || ch === '[') {
      // 冒号后的 {/[ 是 key 的值，不需要逗号
      if (lastCharWasValueEnd && !lastCharWasColon) {
        result.push(',')
      }
      result.push(ch)
      lastCharWasValueEnd = false
      lastCharWasColon = false
      i++
      continue
    }

    if (ch === '}' || ch === ']') {
      result.push(ch)
      lastCharWasValueEnd = true
      lastCharWasColon = false
      i++
      continue
    }

    if (ch === ',') {
      result.push(ch)
      lastCharWasValueEnd = false
      lastCharWasColon = false
      i++
      continue
    }

    if (ch === ':') {
      result.push(ch)
      lastCharWasValueEnd = false
      lastCharWasColon = true
      i++
      continue
    }

    // 空白字符：保留但不改变状态
    if (/\s/.test(ch)) {
      result.push(ch)
      i++
      continue
    }

    // 其他字符（裸值：true, false, null, 数字等）
    // 冒号后的裸值是 key 的值，不需要逗号
    if (lastCharWasValueEnd && !lastCharWasColon) {
      result.push(',')
    }
    result.push(ch)
    lastCharWasValueEnd = false
    lastCharWasColon = false
    i++
    // 消费裸值的剩余部分
    while (i < json.length) {
      const nextCh = json[i]
      if (/[\s{}[\],:"']/.test(nextCh)) break
      result.push(nextCh)
      i++
    }
    lastCharWasValueEnd = true
  }

  return result.join('')
}

/**
 * 修复 JSON 字符串值中未转义的换行符
 * 逐字符扫描，跟踪引号状态，在引号内的裸换行替换为 \\n
 */
function fixUnescapedNewlines(json: string): string {
  const chars = [...json]
  let inString = false
  let escape = false

  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i]

    if (escape) {
      escape = false
      continue
    }

    if (ch === '\\') {
      escape = true
      continue
    }

    if (ch === '"') {
      inString = !inString
      continue
    }

    // 在字符串内部遇到未转义的换行符
    if (inString && (ch === '\n' || ch === '\r')) {
      chars[i] = ch === '\r' ? '' : '\\n'
    }
  }

  return chars.join('')
}

/**
 * 部分恢复 JSON：当 repairJSON 修复后 JSON.parse 仍失败时，
 * 截取有效前缀并补全闭合符号，尽可能恢复更多数据。
 *
 * 算法：
 * 1. 从 JSON.parse 错误中提取 position 作为截断参考点
 * 2. 从位置 0 扫描到该 position，跟踪 {/[ 深度和字符串状态
 * 3. 找到最后一个 depth===1 的完整 key-value 结束位置
 * 4. 在该位置截断，移除末尾逗号，补全所有未闭合的 ]/}
 * 5. JSON.parse 验证截断后的结果
 */
function partialRecoverJSON(json: string, parseError: string): string | null {
  // 从错误消息中提取 position
  const posMatch = parseError.match(/position\s+(\d+)/i)
  if (!posMatch) return null
  const errorPos = parseInt(posMatch[1], 10)

  // 扫描到 errorPos，跟踪深度和字符串状态
  let depth = 0
  const depthStack: ('{' | '[')[] = []
  let inString = false
  let escape = false
  let lastCompleteKVEnd = -1  // 最后一个 depth===1 的完整值结束位置

  for (let i = 0; i < json.length && i < errorPos; i++) {
    const ch = json[i]

    if (escape) {
      escape = false
      continue
    }

    if (ch === '\\') {
      escape = true
      continue
    }

    if (ch === '"') {
      if (!inString) {
        inString = true
      } else {
        inString = false
        // 字符串值结束，如果 depth === 1（顶层值），记录位置
        if (depth === 1) {
          lastCompleteKVEnd = i + 1
        }
      }
      continue
    }

    if (inString) continue

    if (ch === '{' || ch === '[') {
      depthStack.push(ch)
      depth++
      continue
    }

    if (ch === '}') {
      if (depth > 0) {
        depthStack.pop()
        depth--
        // 对象闭合，如果回到 depth 1，说明一个顶层值结束了
        if (depth === 1) {
          lastCompleteKVEnd = i + 1
        }
      }
      continue
    }

    if (ch === ']') {
      if (depth > 0) {
        depthStack.pop()
        depth--
        if (depth === 1) {
          lastCompleteKVEnd = i + 1
        }
      }
      continue
    }

    // 裸值（true/false/null/数字）在 depth===1 时的结束
    // 我们通过检测裸值后面的逗号或空白+闭合符号来判断
    // 简化处理：在 depth===1 时遇到逗号，说明前一个值已完整
    if (depth === 1 && ch === ',') {
      lastCompleteKVEnd = i
    }
  }

  if (lastCompleteKVEnd <= 0) return null

  // 截取到 lastCompleteKVEnd
  let recovered = json.slice(0, lastCompleteKVEnd)

  // 移除末尾逗号
  recovered = recovered.replace(/,\s*$/, '')

  // 如果字符串未闭合，补上闭合引号
  if (inString) {
    recovered += '"'
  }

  // 补全所有未闭合的 ]/}（从内到外）
  for (let i = depthStack.length - 1; i >= 0; i--) {
    recovered += depthStack[i] === '{' ? '}' : ']'
  }

  // 验证
  try {
    JSON.parse(recovered)
    return recovered
  } catch {
    return null
  }
}

/**
 * 从 AI 输出文本中提取 JSON 字符串
 * 多策略：直接解析 → 修复后解析 → 代码块提取 → 首尾大括号定位
 * 返回具体的失败原因，便于用户理解
 */
function extractJSON(text: string): ExtractResult {
  const trimmed = text.trim()

  // 策略1：直接解析
  try {
    JSON.parse(trimmed)
    return { json: trimmed, error: null }
  } catch {
    // 直接解析失败，继续尝试
  }

  // 策略1.5：尝试修复常见格式问题后再解析
  try {
    const repaired = repairJSON(trimmed)
    JSON.parse(repaired)
    return { json: repaired, error: null }
  } catch {
    // 修复后仍然失败，继续
  }

  // 策略2：提取 ```json ... ``` 代码块
  const codeBlockMatch = trimmed.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/)
  if (codeBlockMatch) {
    const candidate = codeBlockMatch[1].trim()
    try {
      JSON.parse(candidate)
      return { json: candidate, error: null }
    } catch {
      // 代码块内解析失败，尝试修复
      try {
        const repaired = repairJSON(candidate)
        JSON.parse(repaired)
        return { json: repaired, error: null }
      } catch (e) {
        // 修复仍失败，尝试部分恢复（截取有效前缀）
        const blockError = (e as Error).message
        const partial = partialRecoverJSON(candidate, blockError)
        if (partial) {
          return { json: partial, error: null, partial: true }
        }
        return {
          json: null,
          error: `AI 输出包含 JSON 代码块，但 JSON 格式不正确：${translateJSONError(blockError, candidate)}`,
        }
      }
    }
  }

  // 策略3：定位首尾大括号
  const firstBrace = trimmed.indexOf('{')
  const lastBrace = trimmed.lastIndexOf('}')
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    const candidate = trimmed.slice(firstBrace, lastBrace + 1)
    try {
      JSON.parse(candidate)
      return { json: candidate, error: null }
    } catch {
      // 尝试修复
      try {
        const repaired = repairJSON(candidate)
        JSON.parse(repaired)
        return { json: repaired, error: null }
      } catch (e) {
        const braceError = (e as Error).message
        // 修复仍失败，尝试部分恢复（截取有效前缀）
        const partial = partialRecoverJSON(candidate, braceError)
        if (partial) {
          return { json: partial, error: null, partial: true }
        }
        return {
          json: null,
          error: `AI 输出中找到 JSON 片段，但格式不正确：${translateJSONError(braceError, candidate)}`,
        }
      }
    }
  }

  // 所有策略都失败
  if (!trimmed.includes('{')) {
    return {
      json: null,
      error: 'AI 输出中未找到 JSON 数据，AI 可能未按要求的 JSON 格式输出。请重试或更换 AI 模型',
    }
  }

  return {
    json: null,
    error: 'AI 输出格式异常，无法提取有效的 JSON 数据。请重试或更换 AI 模型',
  }
}

/**
 * 将 JSON.parse 原始错误翻译为用户友好的中文提示
 * 并附带出错位置附近的上下文片段，方便用户定位
 */
function translateJSONError(rawError: string, jsonText?: string): string {
  // JSON.parse 错误通常格式为 "Unexpected token X in JSON at position N"
  // 或 "Expected property name or '}' in JSON at position N"
  const posMatch = rawError.match(/position\s+(\d+)/i)
  const pos = posMatch ? parseInt(posMatch[1], 10) : -1
  const posLabel = pos >= 0 ? `（位置 ${pos}）` : ''

  // 附带出错位置上下文片段
  const contextSnippet = pos >= 0 && jsonText ? buildErrorContext(jsonText, pos) : ''

  if (rawError.includes('Unexpected token')) {
    return `存在非法字符${posLabel}，可能是 AI 输出了多余的文字或格式标记${contextSnippet}`
  }
  if (rawError.includes('Expected property name') || rawError.includes('Expected \'}\'')) {
    return `对象结构不完整${posLabel}，可能是字段缺失或逗号多余${contextSnippet}`
  }
  if (rawError.includes("Expected ','") || rawError.includes('Expected \',\'')) {
    return `缺少逗号分隔符${posLabel}，AI 输出的数组或对象元素之间可能缺少逗号${contextSnippet}`
  }
  if (rawError.includes('Unexpected end')) {
    return 'JSON 数据不完整，AI 输出可能被截断'
  }
  if (rawError.includes('Bad control character')) {
    return '包含非法控制字符，可能是换行符未正确转义'
  }
  // 兜底：截取前 80 字符
  return rawError.slice(0, 80) + contextSnippet
}

/**
 * 构建出错位置的上下文片段
 * 从 JSON 文本中截取出错位置前后各 30 个字符，并用 ↑ 指示出错点
 */
function buildErrorContext(jsonText: string, errorPos: number): string {
  const contextRadius = 30
  const start = Math.max(0, errorPos - contextRadius)
  const end = Math.min(jsonText.length, errorPos + contextRadius)
  const before = jsonText.slice(start, errorPos)
  const after = jsonText.slice(errorPos, end)
  // 用省略号表示截断，↑ 标记出错位置
  const prefix = start > 0 ? '…' : ''
  const suffix = end < jsonText.length ? '…' : ''
  return `\n${prefix}${before}↑${after}${suffix}`
}

// ========== Tiptap 二次规范化 ==========

function tiptapNormalize(editor: Editor, html: string): string {
  if (!html) return ''
  const safeHtml = normalizeContent(html)
  editor.commands.setContent(safeHtml)
  let result = editor.getHTML()
  result = result.replace(/^(<p>(<br>)?<\/p>)+/, '')
  result = result.replace(/(<p>(<br>)?<\/p>)+$/, '')
  return result
}

function createNormalizeEditor(): Editor {
  return new Editor({ extensions: CORE_TIPTAP_EXTENSIONS as any })
}

function normalizeHTMLField(editor: Editor, text: string): string {
  if (!text || !text.trim()) return ''
  if (/<[a-z][\s\S]*>/i.test(text)) {
    // 已经是 HTML 格式，直接走 tiptap 归一化
    const safe = sanitizeHtml(text)
    return tiptapNormalize(editor, safe)
  }
  // 纯文本：trim 各行后交给 markdownToHtml 处理（它已能正确处理纯文本）
  const trimmedText = text.split('\n').map(l => l.trim()).join('\n')
  const html = sanitizeHtml(markdownToHtml(trimmedText))
  return tiptapNormalize(editor, html)
}


// ========== Resume 归一化 ==========

function normalizeResumeHTML(resume: Resume): Resume {
  const editor = createNormalizeEditor()
  try {
    if (resume.basicInfo.summary) {
      resume.basicInfo.summary = normalizeHTMLField(editor, resume.basicInfo.summary)
    }
    for (const item of resume.workExperience) {
      if (item.description) {
        item.description = normalizeHTMLField(editor, item.description)
      }
    }
    for (const item of resume.education) {
      if (item.description) {
        item.description = normalizeHTMLField(editor, item.description)
      }
    }
    for (const item of resume.projects) {
      if (item.description) {
        item.description = normalizeHTMLField(editor, item.description)
      }
    }
    for (const item of resume.skills) {
      if (item.content) {
        item.content = normalizeHTMLField(editor, item.content)
      }
    }
    if (resume.selfEvaluation) {
      resume.selfEvaluation = normalizeHTMLField(editor, resume.selfEvaluation)
    }
    for (const item of resume.customTexts) {
      if (item.content) {
        item.content = normalizeHTMLField(editor, item.content)
      }
    }
    for (const section of resume.customCards) {
      for (const item of section.items) {
        if (item.description) {
          item.description = normalizeHTMLField(editor, item.description)
        }
      }
    }
  } finally {
    editor.destroy()
  }
  return resume
}

/**
 * 判断某个 section 的内容是否为空
 * 用于 AI 导入后自动隐藏原文中没有内容的模块
 */
function isSectionContentEmpty(resume: Resume, sectionId: string): boolean {
  switch (sectionId) {
    case 'summary':
      return !resume.basicInfo.summary?.trim()
    case 'work':
      return resume.workExperience.length === 0
    case 'education':
      return resume.education.length === 0
    case 'projects':
      return resume.projects.length === 0
    case 'skills':
      return resume.skills.length === 0 || resume.skills.every(s => !s.content?.trim())
    case 'evaluation':
      return !resume.selfEvaluation?.trim()
    default:
      // customText / customCard 由其自身内容决定
      if (sectionId.startsWith('customText_')) {
        const idx = parseInt(sectionId.replace('customText_', ''), 10)
        return !resume.customTexts[idx]?.content?.trim()
      }
      if (sectionId.startsWith('customCard_')) {
        const idx = parseInt(sectionId.replace('customCard_', ''), 10)
        return !resume.customCards[idx]?.items?.length
      }
      return false
  }
}

/**
 * 填充系统级字段和默认值
 * AI 输出不含 id/createdAt/updatedAt/templateId，统一由本函数生成
 */
function fillDefaults(data: Record<string, unknown>): Resume {
  const empty = createEmptyResume()

  // 为数组项补充 id
  const ensureWorkIds = (items: Record<string, unknown>[]): WorkItem[] =>
    items.map(item => ({ ...item, id: item.id as string || generateId() } as WorkItem))

  const ensureEducationIds = (items: Record<string, unknown>[]): EducationItem[] =>
    items.map(item => ({ ...item, id: item.id as string || generateId() } as EducationItem))

  const ensureProjectIds = (items: Record<string, unknown>[]): ProjectItem[] =>
    items.map(item => ({ ...item, id: item.id as string || generateId() } as ProjectItem))

  const ensureSkillIds = (items: Record<string, unknown>[]): SkillItem[] =>
    items.map(item => ({ ...item, id: item.id as string || generateId() } as SkillItem))

  const ensureCustomTextIds = (items: Record<string, unknown>[]): CustomTextSection[] =>
    items.map(item => ({ ...item, id: item.id as string || generateId() } as CustomTextSection))

  const ensureCustomCardIds = (items: Record<string, unknown>[]): CustomCardSection[] =>
    items.map(section => ({
      ...section,
      id: (section.id as string) || generateId(),
      items: (section.items as Record<string, unknown>[] || []).map(item => ({
        ...item,
        id: item.id as string || generateId(),
      })),
    } as CustomCardSection))

  const basicInfoData = (data.basicInfo || {}) as Record<string, unknown>

  // 为 customFields 补充 id 并更新 fieldOrder
  const rawCustomFields = (basicInfoData.customFields || []) as Array<Record<string, unknown>>
  const customFields: Resume['basicInfo']['customFields'] = rawCustomFields.map(field => ({
    id: (field.id as string) || generateId(),
    label: (field.label as string) || '',
    value: (field.value as string) || '',
    hidden: (field.hidden as boolean) ?? false,
  }))

  // 如果有自定义字段，将它们加入 fieldOrder（追加到末尾，以 custom_ 前缀标识）
  let fieldOrder = (basicInfoData.fieldOrder || empty.basicInfo.fieldOrder) as string[]
  if (customFields.length > 0) {
    const customFieldIds = customFields.map(f => `custom_${f.id}`)
    fieldOrder = [...fieldOrder, ...customFieldIds]
  }

  const workExperience = ensureWorkIds((data.workExperience || []) as Record<string, unknown>[])
  const education = ensureEducationIds((data.education || []) as Record<string, unknown>[])
  const projects = ensureProjectIds((data.projects || []) as Record<string, unknown>[])
  const skills = ensureSkillIds((data.skills || []) as Record<string, unknown>[])
  const customTexts = ensureCustomTextIds((data.customTexts || []) as Record<string, unknown>[])
  const customCards = ensureCustomCardIds((data.customCards || []) as Record<string, unknown>[])

  return {
    ...empty,
    // 系统级字段：始终由应用生成，忽略 AI 输出
    id: generateId(),
    templateId: 'sidebar',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    title: (data.title || '') as string,
    // 合并 basicInfo 默认值
    basicInfo: {
      ...empty.basicInfo,
      ...basicInfoData,
      hiddenFields: (basicInfoData.hiddenFields || {}) as Record<string, boolean>,
      customFields,
      fieldOrder,
      fieldDisplayMode: (basicInfoData.fieldDisplayMode || {}) as Record<string, 'iconLabelValue' | 'labelValue' | 'iconValue'>,
    },
    // 数组项已补充 id
    workExperience,
    education,
    projects,
    skills,
    selfEvaluation: (data.selfEvaluation || '') as string,
    customTexts,
    customCards,
    sectionOrder: (data.sectionOrder || empty.sectionOrder) as string[],
    sectionTitles: (data.sectionTitles || {}) as Record<string, string>,
    hiddenSections: (data.hiddenSections || []) as string[],
    lineHeight: (data.lineHeight as number) ?? empty.lineHeight,
    pagePadding: (data.pagePadding as number) ?? empty.pagePadding,
    moduleSpacing: (data.moduleSpacing as number) ?? empty.moduleSpacing,
    paragraphSpacing: (data.paragraphSpacing as number) ?? empty.paragraphSpacing,
  }
}

/**
 * 将内容为空的 section 从 sectionOrder 中移除
 * 原简历没有的功能模块（如个人简介为空）不应出现
 * 移除后用户可通过编辑器的"添加模块"功能重新添加回来
 */
function removeEmptySections(resume: Resume): Resume {
  const order = resume.sectionOrder
  const keptSections: string[] = []
  const removedSections = new Set<string>()

  // basic 模块始终保留，即使 AI 输出遗漏也强制补入
  if (!order.includes('basic')) {
    keptSections.push('basic')
  }

  for (const sectionId of order) {
    // basic 模块始终保留，不判断
    if (sectionId === 'basic') {
      keptSections.push(sectionId)
      continue
    }
    if (!isSectionContentEmpty(resume, sectionId)) {
      keptSections.push(sectionId)
    } else {
      removedSections.add(sectionId)
    }
  }

  resume.sectionOrder = keptSections
  // 同步清理 hiddenSections 中已移除模块的残留引用
  if (removedSections.size > 0 && resume.hiddenSections.length > 0) {
    resume.hiddenSections = resume.hiddenSections.filter(id => !removedSections.has(id))
  }
  return resume
}

// ========== 导出 API ==========

export function parseAIImportResult(rawText: string, photoDataUri?: string): AIImportResult {
  // 1. 提取 JSON（附带具体失败原因）
  const extractResult = extractJSON(rawText)
  if (!extractResult.json) {
    return {
      success: false,
      rawText,
      errors: [{ path: '', message: extractResult.error || 'AI 输出格式异常，无法提取有效的 JSON 数据，请重试' }],
    }
  }

  // 2. AI 导入专用 Schema 校验（不含系统级字段）
  const validation = validateAIImportJSON(extractResult.json)
  if (!validation.success) {
    return {
      success: false,
      rawText,
      extractedJson: extractResult.json,
      partial: extractResult.partial,
      errors: validation.errors,
    }
  }

  // 3. 填充系统级字段 + 默认值
  let resume = fillDefaults(validation.data as Record<string, unknown>)

  // 4. HTML 归一化
  resume = normalizeResumeHTML(resume)

  // 5. 自动移除内容为空的模块（原简历没有的功能不应出现，用户可后续通过"添加模块"恢复）
  resume = removeEmptySections(resume)

  // 6. 如果 AI 未解析出头像但文件中提取到了图片，自动填入
  // 宽松判断：仅当 photo 为空或明显占位符时才用文件提取的图片覆盖
  const photoPlaceholders = new Set(['', 'n/a', 'na', '无', '暂无', '未提供', 'none', 'null', 'undefined'])
  if (photoPlaceholders.has(resume.basicInfo.photo?.trim().toLowerCase()) && photoDataUri) {
    resume.basicInfo.photo = photoDataUri
  }

  return { success: true, resume, rawText, partial: extractResult.partial, extractedJson: extractResult.json }
}
