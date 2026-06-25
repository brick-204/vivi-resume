import { useResumeStore } from '@/stores/resumeStore'
import { getTemplate } from '@/config/templates'
import { getSampleResume } from '@/config/sampleData'
import { createEmptyResume, type Resume, CONFIGURABLE_SECTIONS } from '@/types/resume'

/**
 * 根据模板 ID 构建一份完整简历数据（含示例数据 + 模板样式配置）
 * 纯函数，不涉及 store 写入，供不同写入策略的入口函数复用
 */
function buildResumeFromTemplate(templateId: string): Resume {
  const templateConfig = getTemplate(templateId)
  const sampleData = getSampleResume()
  const fontDefaults = templateConfig.style.fontDefaults

  const resume = createEmptyResume()
  Object.assign(resume, {
    templateId,
    themeAccentColor: templateConfig.style.accentColor,
    headerTextColor: templateConfig.style.headerTextMode || 'black',
    headerIconColor: templateConfig.style.headerIconMode || 'black',
    ...(fontDefaults?.bodyFontSize != null && { bodyFontSize: fontDefaults.bodyFontSize }),
    ...(fontDefaults?.sectionTitleFontSize != null && { sectionTitleFontSize: fontDefaults.sectionTitleFontSize }),
    ...(fontDefaults?.entryTitleFontSize != null && { entryTitleFontSize: fontDefaults.entryTitleFontSize }),
    basicInfo: sampleData.basicInfo,
    workExperience: sampleData.workExperience,
    education: sampleData.education,
    projects: sampleData.projects,
    skills: sampleData.skills,
    selfEvaluation: sampleData.selfEvaluation,
  })
  return resume
}

/**
 * 使用指定模板创建一份新简历（含示例数据），保存并返回简历 ID
 * 适用于：TemplatesView 首次选择模板（需要等待持久化完成再跳转）
 */
export async function createResumeFromTemplate(templateId: string): Promise<string> {
  const store = useResumeStore()
  const resume = buildResumeFromTemplate(templateId)
  const id = await store.createResumeWithData(resume)
  return id
}

/**
 * 使用指定模板创建一份新简历（含示例数据），立即返回 ID 并在后台保存。
 * 适用于：模版市场「使用此模板」— 需要立即导航到编辑器，不等待 IndexedDB 写入。
 */
export function createResumeFromTemplateDeferred(templateId: string): string {
  const store = useResumeStore()
  const resume = buildResumeFromTemplate(templateId)

  // 内存写入（同步），立即可用
  store.addResumeInMemory(resume)
  // 后台持久化，不阻塞导航
  store.saveToStorageNow().catch((e) => {
    console.error('[createResumeFromTemplateDeferred] Background save failed:', e)
  })
  return resume.id
}

/**
 * 创建一份纯空白简历（无示例数据），立即返回 ID 并在后台保存。
 * 适用于：模版市场「空白模板」— 从零开始创作。
 */
export function createBlankResumeDeferred(): string {
  const store = useResumeStore()
  const resume = createEmptyResume()
  // 空白模板使用经典风格布局（流式向下），用户可自行切换其他模板
  resume.templateId = 'classic'
  // 主题色默认黑色，简洁无彩色
  resume.themeAccentColor = '#000000'
  // 只保留基本信息模块，其余隐藏，待用户自行添加
  resume.hiddenSections = [...CONFIGURABLE_SECTIONS]

  // 内存写入（同步），立即可用
  store.addResumeInMemory(resume)
  // 后台持久化，不阻塞导航
  store.saveToStorageNow().catch((e) => {
    console.error('[createBlankResumeDeferred] Background save failed:', e)
  })
  return resume.id
}

/**
 * 将模板配置和示例数据应用到当前简历（不保存，由调用方决定何时保存）
 * 适用于：TemplatesView applyTemplate（需要保存后再跳转）
 */
export function applyTemplateToCurrentResume(templateId: string): void {
  const store = useResumeStore()
  const sampleData = getSampleResume()
  const templateConfig = getTemplate(templateId)
  const fontDefaults = templateConfig.style.fontDefaults

  store.updateCurrentResume({
    templateId,
    themeAccentColor: templateConfig.style.accentColor,
    headerTextColor: templateConfig.style.headerTextMode || 'black',
    headerIconColor: templateConfig.style.headerIconMode || 'black',
    ...(fontDefaults?.bodyFontSize != null && { bodyFontSize: fontDefaults.bodyFontSize }),
    ...(fontDefaults?.sectionTitleFontSize != null && { sectionTitleFontSize: fontDefaults.sectionTitleFontSize }),
    ...(fontDefaults?.entryTitleFontSize != null && { entryTitleFontSize: fontDefaults.entryTitleFontSize }),
    basicInfo: sampleData.basicInfo,
    workExperience: sampleData.workExperience,
    education: sampleData.education,
    projects: sampleData.projects,
    skills: sampleData.skills,
    selfEvaluation: sampleData.selfEvaluation,
  })
}
