/**
 * 回收站配置化映射
 * ponytail: 用配置驱动消除重复分支
 */

// 固有模块配置（卡片 + 数组共用）
export const FIXED_SECTION_CONFIG = {
  work: {
    deletedKey: 'work' as const,
    resumeKey: 'workExperience' as const,
    label: '工作经历',
  },
  education: {
    deletedKey: 'education' as const,
    resumeKey: 'education' as const,
    label: '教育经历',
  },
  projects: {
    deletedKey: 'projects' as const,
    resumeKey: 'projects' as const,
    label: '项目经历',
  },
  skills: {
    deletedKey: 'skills' as const,
    resumeKey: 'skills' as const,
    label: '专业技能',
  },
} as const

// 别名，保持向后兼容
export const CARD_SECTION_CONFIG = FIXED_SECTION_CONFIG
export const ARRAY_SECTION_CONFIG = FIXED_SECTION_CONFIG

export type CardSectionId = keyof typeof CARD_SECTION_CONFIG
export type ArraySectionId = keyof typeof ARRAY_SECTION_CONFIG

// 单富文本模块配置
export const TEXT_SECTION_CONFIG = {
  evaluation: {
    deletedKey: 'evaluation' as const,
    resumeKey: 'selfEvaluation' as const,
    label: '自我评价',
  },
} as const

export type TextSectionId = keyof typeof TEXT_SECTION_CONFIG

/** 判断是否为固有卡片模块 */
export function isCardSection(sectionId: string): sectionId is CardSectionId {
  return sectionId in CARD_SECTION_CONFIG
}

/** 判断是否为固有数组模块 */
export function isArraySection(sectionId: string): sectionId is ArraySectionId {
  return sectionId in ARRAY_SECTION_CONFIG
}

/** 判断是否为单富文本模块 */
export function isTextSection(sectionId: string): sectionId is TextSectionId {
  return sectionId in TEXT_SECTION_CONFIG
}

/** 获取卡片模块配置 */
export function getCardConfig(sectionId: string) {
  return CARD_SECTION_CONFIG[sectionId as CardSectionId]
}

/** 获取数组模块配置 */
export function getArraySectionConfig(sectionId: string) {
  return ARRAY_SECTION_CONFIG[sectionId as ArraySectionId]
}

/** 获取单富文本模块配置 */
export function getTextSectionConfig(sectionId: string) {
  return TEXT_SECTION_CONFIG[sectionId as TextSectionId]
}
