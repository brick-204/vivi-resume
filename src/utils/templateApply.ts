import { useResumeStore } from '@/stores/resumeStore'
import { getTemplate } from '@/config/templates'
import { getSampleResume } from '@/config/sampleData'

/**
 * 使用指定模板创建一份新简历（含示例数据），保存并返回简历 ID
 * 适用于：模版市场「使用此模板」、TemplatesView 首次选择模板
 */
export async function createResumeFromTemplate(templateId: string): Promise<string> {
  const store = useResumeStore()

  // 1. 创建空简历
  const id = await store.createResume()
  // 2. 加载为当前简历
  await store.loadResume(id)
  // 3. 应用模板 + 示例数据
  applyTemplateToCurrentResume(templateId)
  // 4. 保存
  await store.saveCurrentResumeNow()

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
