/**
 * 回收站配置化映射
 * ponytail: 用配置驱动消除重复分支
 */

// 固有数组模块配置
export const ARRAY_SECTION_CONFIG = {
  work: { deletedKey: 'work' as const, resumeKey: 'workExperience' as const, label: '工作经历' },
  education: { deletedKey: 'education' as const, resumeKey: 'education' as const, label: '教育经历' },
  projects: { deletedKey: 'projects' as const, resumeKey: 'projects' as const, label: '项目经历' },
  skills: { deletedKey: 'skills' as const, resumeKey: 'skills' as const, label: '专业技能' },
} as const

export type ArraySectionId = keyof typeof ARRAY_SECTION_CONFIG

// 单富文本模块配置
export const TEXT_SECTION_CONFIG = {
  evaluation: { deletedKey: 'evaluation' as const, resumeKey: 'selfEvaluation' as const, label: '自我评价' },
} as const

export type TextSectionId = keyof typeof TEXT_SECTION_CONFIG

export function isArraySection(sectionId: string): sectionId is ArraySectionId {
  return sectionId in ARRAY_SECTION_CONFIG
}

export function isTextSection(sectionId: string): sectionId is TextSectionId {
  return sectionId in TEXT_SECTION_CONFIG
}

export function getArraySectionConfig(sectionId: ArraySectionId) {
  return ARRAY_SECTION_CONFIG[sectionId]
}

export function getTextSectionConfig(sectionId: TextSectionId) {
  return TEXT_SECTION_CONFIG[sectionId]
}

/** 固有数组 sectionId 集合（用于 card 回收站的 key 判定） */
export const ARRAY_SECTION_IDS = Object.keys(ARRAY_SECTION_CONFIG) as ArraySectionId[]

/** card 回收站存储 key：固有 section 用自身 id，自定义卡片统一 'customCards' */
export type DeletedCardKey = ArraySectionId | 'customCards'

/** 将 sectionId 映射到 DeletedItems 的存储 key（类型安全，替代 as keyof 断言） */
export function getDeletedCardKey(sectionId: string): DeletedCardKey {
  return isArraySection(sectionId) ? sectionId : 'customCards'
}
