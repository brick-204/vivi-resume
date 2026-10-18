import type { Resume } from '@/types/resume'
import { htmlToPlainText } from '@/services/aiService'
import { AI_PROVIDERS, type AIServiceConfig } from '@/types/aiConfig'

export interface ExtensionField { key: string; label: string; value: string }

export function buildExtensionAiConfig(config: AIServiceConfig) {
  let endpoint = config.endpoint.trim()
  if (endpoint.startsWith('/api/ai/')) {
    const provider = AI_PROVIDERS.find(item => {
      const prefix = `/api/ai/${item.id}`
      return item.defaultEndpoint && (endpoint === prefix || endpoint.startsWith(`${prefix}/`))
    })
    if (!provider) throw new Error('自定义开发代理无法供插件使用，请将 AI 地址改为服务商的 HTTP 或 HTTPS 完整地址后再同步')
    endpoint = new URL(provider.defaultEndpoint).origin + endpoint.slice(`/api/ai/${provider.id}`.length)
  }
  const url = new URL(endpoint)
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('AI 接口必须使用 HTTP 或 HTTPS 完整地址')
  return { endpoint, endpointComplete: !!config.endpointComplete, modelId: config.modelId, apiKey: config.apiKey }
}

/** 仅导出用户可见、可填的内容；不传模板、历史 AI 结果或回收站。 */
export function buildExtensionProfile(resume: Resume): { title: string; fields: ExtensionField[] } {
  const fields: ExtensionField[] = []
  const add = (key: string, label: string, raw: string | undefined, rich = false) => {
    const value = (rich ? htmlToPlainText(raw || '') : raw || '').trim().slice(0, 4000)
    if (value) fields.push({ key, label, value })
  }
  const info = resume.basicInfo
  const basic: [string, string][] = [
    ['name', '姓名'], ['email', '邮箱'], ['phone', '电话'], ['gender', '性别'],
    ['birthday', '出生日期'], ['age', '年龄'], ['location', '所在地'], ['expectedCity', '期望城市'],
    ['title', '职位/头衔'], ['workExperience', '工作年限'], ['salaryRange', '期望薪资'],
    ['website', '个人网站'], ['wechat', '微信'], ['qq', 'QQ'],
  ]
  for (const [key, label] of basic) {
    if (!info.hiddenFields?.[key]) add(key, label, info[key as keyof typeof info] as string)
  }
  if (!resume.hiddenSections.includes('summary')) add('summary', '个人简介', info.summary, true)
  for (const item of info.customFields || []) {
    if (!item.hidden) add(`custom.${item.id}`, item.label, item.value)
  }
  if (!resume.hiddenSections.includes('work')) {
    resume.workExperience.filter(item => !item.hidden).forEach((item, index) => {
      const prefix = `work.${index}`
      add(`${prefix}.company`, `工作 ${index + 1} · 公司`, item.company)
      add(`${prefix}.position`, `工作 ${index + 1} · 职位`, item.position)
      add(`${prefix}.startDate`, `工作 ${index + 1} · 开始时间`, item.startDate)
      add(`${prefix}.endDate`, `工作 ${index + 1} · 结束时间`, item.endDate)
      add(`${prefix}.description`, `工作 ${index + 1} · 描述`, item.description, true)
    })
  }
  if (!resume.hiddenSections.includes('education')) {
    resume.education.filter(item => !item.hidden).forEach((item, index) => {
      const prefix = `education.${index}`
      add(`${prefix}.school`, `教育 ${index + 1} · 学校`, item.school)
      add(`${prefix}.major`, `教育 ${index + 1} · 专业`, item.major)
      add(`${prefix}.degree`, `教育 ${index + 1} · 学历`, item.degree)
      add(`${prefix}.startDate`, `教育 ${index + 1} · 开始时间`, item.startDate)
      add(`${prefix}.endDate`, `教育 ${index + 1} · 结束时间`, item.endDate)
      add(`${prefix}.description`, `教育 ${index + 1} · 描述`, item.description, true)
    })
  }
  if (!resume.hiddenSections.includes('projects')) {
    resume.projects.filter(item => !item.hidden).forEach((item, index) => {
      const prefix = `project.${index}`
      add(`${prefix}.name`, `项目 ${index + 1} · 名称`, item.name)
      add(`${prefix}.role`, `项目 ${index + 1} · 职责`, item.role)
      add(`${prefix}.startDate`, `项目 ${index + 1} · 开始时间`, item.startDate)
      add(`${prefix}.endDate`, `项目 ${index + 1} · 结束时间`, item.endDate)
      add(`${prefix}.technologies`, `项目 ${index + 1} · 技术栈`, item.technologies.join('、'))
      add(`${prefix}.description`, `项目 ${index + 1} · 描述`, item.description, true)
    })
  }
  if (!resume.hiddenSections.includes('skills')) {
    resume.skills.forEach((item, index) => add(`skill.${index}`, `技能 ${index + 1}`, item.content, true))
  }
  if (!resume.hiddenSections.includes('evaluation')) add('selfEvaluation', '自我评价', resume.selfEvaluation, true)
  return { title: resume.title, fields: fields.slice(0, 120) }
}
