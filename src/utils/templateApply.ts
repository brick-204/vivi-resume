import { useResumeStore } from '@/stores/resumeStore'
import { getTemplate } from '@/config/templates'
import { getSampleResume } from '@/config/sampleData'
import { createEmptyResume } from '@/types/resume'

/**
 * 使用指定模板创建一份新简历（含示例数据），保存并返回简历 ID
 * 适用于：模版市场「使用此模板」、TemplatesView 首次选择模板
 *
 * 一次性构建完整简历数据再写入 store，避免中间"空简历"状态
 * 触发响应式更新导致模板市场卡片预览闪烁
 */
export async function createResumeFromTemplate(templateId: string): Promise<string> {
  const store = useResumeStore()
  const templateConfig = getTemplate(templateId)
  const sampleData = getSampleResume()
  const fontDefaults = templateConfig.style.fontDefaults

  // 先构建完整简历，再一次性写入 store
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

  const id = await store.createResumeWithData(resume)
  return id
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
