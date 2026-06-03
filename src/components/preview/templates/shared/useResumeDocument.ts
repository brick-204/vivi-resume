import { computed } from 'vue'
import type { Resume, FieldDisplayMode, WorkItem, EducationItem, ProjectItem, CustomCardItem, HeaderTextColor, HeaderIconColor } from '@/types/resume'
import { DEFAULT_SECTION_ORDER, DEFAULT_FIELD_ORDER, getSectionTitle, getCustomSectionIndex } from '@/types/resume'
import { getTemplate } from '@/config/templates'
import {
  DEFAULT_FONT_FAMILY,
  deriveSubtitleSize, deriveTagSize,
  deriveSidebarDateSize, deriveSidebarNameSize, deriveSidebarTitleSize, deriveSidebarSmallSize,
} from '@/config/fonts'
import { sanitizeHtml } from '@/utils/sanitizeHtml'
import { normalizeContent } from '@/utils/normalizeContent'
import {
  deriveSectionTitleColor, deriveTagBg, deriveTagColor, deriveTagBorder,
  deriveDecorativeLine, deriveEntryDateBg, deriveEntryDateBorder,
  deriveSidebarBg, deriveSidebarText,
  deriveSidebarFieldColor,
  deriveSidebarIconAccentColor,
} from '@/utils/colorUtils'

export function useResumeDocument(getResume: () => Resume, templateId: string) {
  const resume = computed(getResume)

  // 解析头部文字颜色（向后兼容 + 智能默认值）
  const resolveHeaderTextColor = (r: Resume, _hasColoredHeader: boolean): HeaderTextColor => {
    if (r.headerTextColor) return r.headerTextColor
    if (r.whiteHeaderText === true) return 'white'
    if (r.whiteHeaderText === false) return 'black'
    // 浅色背景默认深色文字
    return 'black'
  }

  // 解析头部图标颜色（向后兼容 + 智能默认值）
  const resolveHeaderIconColor = (r: Resume, _hasColoredHeader: boolean): HeaderIconColor => {
    if (r.headerIconColor) return r.headerIconColor
    if (r.iconFollowAccent === true) return 'accent'
    // 浅色背景默认深色图标
    return 'black'
  }

  // 获取可见的模块顺序
  const visibleSections = computed(() => {
    const order = resume.value.sectionOrder || DEFAULT_SECTION_ORDER
    const hidden = resume.value.hiddenSections || []
    return order.filter(id => !hidden.includes(id))
  })

  // 获取内容模块顺序（排除 basic，因为 basic 在 header 中单独渲染）
  const contentSections = computed(() => {
    return visibleSections.value.filter(id => id !== 'basic')
  })

  // sidebar 模板的内容模块顺序（排除 basic、skills，它们在左侧边栏）
  const sidebarContentSections = computed(() => {
    return visibleSections.value.filter(id => !['basic', 'skills'].includes(id))
  })

  // 检查模块是否可见
  const isSectionVisible = (sectionId: string): boolean => {
    return visibleSections.value.includes(sectionId)
  }

  const templateCSSVars = computed(() => {
    const t = getTemplate(templateId)
    const accent = resume.value.themeAccentColor || t.style.accentColor
    const userAccent = resume.value.themeAccentColor
    const hasColoredHeader = t.style.headerLayout === 'two-column'

    const headerTextColorMode = resolveHeaderTextColor(resume.value, hasColoredHeader)
    const headerIconColorMode = resolveHeaderIconColor(resume.value, hasColoredHeader)

    // 有色头部背景使用浅色渐变（与侧边栏风格一致），而非纯主题色
    const headerBg = hasColoredHeader ? deriveSidebarBg(accent) : t.style.headerBg

    // 文字颜色
    const nameTitleColor = headerTextColorMode === 'white' ? '#ffffff'
      : headerTextColorMode === 'accent' ? deriveSidebarText(accent)
      : '#202429'

    const fieldTextColor = headerTextColorMode === 'white' ? 'rgba(255,255,255,0.85)'
      : headerTextColorMode === 'accent' ? deriveSidebarFieldColor(accent)
      : '#202429'

    // 图标颜色
    const iconColor = headerIconColorMode === 'white' ? 'rgba(255,255,255,0.7)'
      : headerIconColorMode === 'accent' ? deriveSidebarIconAccentColor(accent)
      : '#202429'

    // professional 模板：section bar 使用 sidebar 背景色逻辑
    const isPro = templateId === 'professional'

    // 字体设置
    const fd = t.style.fontDefaults || {}
    const bodyFS = resume.value.bodyFontSize || fd.bodyFontSize || 14
    const sectionTitleFS = resume.value.sectionTitleFontSize || fd.sectionTitleFontSize || 16
    const entryTitleFS = resume.value.entryTitleFontSize || fd.entryTitleFontSize || 14
    const entrySubtitleFS = deriveSubtitleSize(entryTitleFS)
    const ff = resume.value.fontFamily || DEFAULT_FONT_FAMILY

    return {
      '--t-header-bg': headerBg,
      '--t-header-text': nameTitleColor,
      '--t-header-title-color': nameTitleColor,
      '--t-header-field-text': fieldTextColor,
      '--t-header-icon-color': iconColor,
      '--t-accent': accent,
      '--t-section-title': userAccent ? deriveSectionTitleColor(userAccent) : t.style.sectionTitleColor,
      '--t-text': t.style.textColor,
      '--t-text-secondary': t.style.textSecondaryColor,
      '--t-radius': t.style.sectionBorderRadius,
      '--t-tag-bg': userAccent ? deriveTagBg(userAccent) : t.style.tagBg,
      '--t-tag-color': userAccent ? deriveTagColor(userAccent) : t.style.tagColor,
      '--t-tag-border': userAccent ? deriveTagBorder(userAccent) : t.style.tagBorder,
      '--t-line': userAccent ? deriveDecorativeLine(userAccent) : '#e8e8f0',
      '--t-date-bg': userAccent ? deriveEntryDateBg(userAccent) : 'rgba(124, 92, 252, 0.08)',
      '--t-date-border': userAccent ? deriveEntryDateBorder(userAccent) : 'rgba(124, 92, 252, 0.15)',
      ...(isPro ? { '--t-pro-bar-bg': deriveSidebarBg(accent) } : {}),
      // 字体 CSS vars
      '--t-font-family': ff,
      '--t-body-font-size': `${bodyFS}px`,
      '--t-section-title-font-size': `${sectionTitleFS}px`,
      '--t-entry-title-font-size': `${entryTitleFS}px`,
      '--t-entry-subtitle-font-size': `${entrySubtitleFS}px`,
      '--t-entry-date-font-size': `${entrySubtitleFS}px`,
      '--t-entry-desc-font-size': `${bodyFS}px`,
      '--t-tag-font-size': `${deriveTagSize(bodyFS)}px`,
      '--t-section-text-font-size': `${bodyFS}px`,
    }
  })

  const sidebarCSSVars = computed(() => {
    const t = getTemplate('sidebar')
    const accent = resume.value.themeAccentColor || t.style.accentColor
    const userAccent = resume.value.themeAccentColor
    const sidebarText = userAccent ? deriveSidebarText(userAccent) : (t.style.sidebarTextColor || '#1e3a5f')

    // sidebar 模板侧边栏：尊重用户文字/图标颜色选择
    const headerTextColorMode = resolveHeaderTextColor(resume.value, false)
    const headerIconColorMode = resolveHeaderIconColor(resume.value, false)

    // 侧边栏背景不受文字颜色影响
    const sidebarBg = userAccent ? deriveSidebarBg(userAccent) : (t.style.sidebarBg || 'linear-gradient(180deg, #dbeafe 0%, #bfdbfe 100%)')

    // 文字颜色：根据用户选择决定
    const nameTitleColor = headerTextColorMode === 'black' ? '#202429'
      : headerTextColorMode === 'white' ? '#ffffff'
      : sidebarText

    const fieldTextColor = headerTextColorMode === 'black' ? '#202429'
      : headerTextColorMode === 'white' ? 'rgba(255,255,255,0.85)'
      : (userAccent ? deriveSidebarFieldColor(userAccent) : '#2d5a8e')

    // 图标颜色
    const iconColor = headerIconColorMode === 'black' ? '#202429'
      : headerIconColorMode === 'white' ? 'rgba(255,255,255,0.7)'
      : deriveSidebarIconAccentColor(accent)

    const lineColor = userAccent ? deriveDecorativeLine(userAccent) : '#e8e8f0'

    // 字体设置
    const fd = t.style.fontDefaults || {}
    const bodyFS = resume.value.bodyFontSize || fd.bodyFontSize || 13
    const sectionTitleFS = resume.value.sectionTitleFontSize || fd.sectionTitleFontSize || 14
    const entryTitleFS = resume.value.entryTitleFontSize || fd.entryTitleFontSize || 13
    const entrySubtitleFS = deriveSubtitleSize(entryTitleFS)
    const ff = resume.value.fontFamily || DEFAULT_FONT_FAMILY

    return {
      '--sidebar-bg': sidebarBg,
      '--sidebar-text': sidebarText,
      '--sidebar-accent': accent,
      '--sidebar-basic-name-color': nameTitleColor,
      '--sidebar-basic-title-color': nameTitleColor,
      '--sidebar-basic-field-color': fieldTextColor,
      '--sidebar-basic-icon-color': iconColor,
      '--sidebar-entry-border': userAccent ? deriveDecorativeLine(userAccent) : '#f0f0f5',
      '--t-header-bg': t.style.headerBg,
      '--t-header-text': t.style.headerTextColor,
      '--t-header-title-color': accent,
      '--t-header-field-text': t.style.textSecondaryColor,
      '--t-header-icon-color': iconColor,
      '--t-accent': accent,
      '--t-section-title': userAccent ? deriveSectionTitleColor(userAccent) : t.style.sectionTitleColor,
      '--t-text': t.style.textColor,
      '--t-text-secondary': t.style.textSecondaryColor,
      '--t-radius': t.style.sectionBorderRadius,
      '--t-tag-bg': userAccent ? deriveTagBg(userAccent) : t.style.tagBg,
      '--t-tag-color': userAccent ? deriveTagColor(userAccent) : t.style.tagColor,
      '--t-tag-border': userAccent ? deriveTagBorder(userAccent) : t.style.tagBorder,
      '--t-line': lineColor,
      '--t-date-bg': userAccent ? deriveEntryDateBg(userAccent) : 'rgba(124, 92, 252, 0.08)',
      '--t-date-border': userAccent ? deriveEntryDateBorder(userAccent) : 'rgba(124, 92, 252, 0.15)',
      // 字体 CSS vars
      '--t-font-family': ff,
      '--t-body-font-size': `${bodyFS}px`,
      '--t-section-title-font-size': `${sectionTitleFS}px`,
      '--t-entry-title-font-size': `${entryTitleFS}px`,
      '--t-entry-subtitle-font-size': `${entrySubtitleFS}px`,
      '--t-entry-date-font-size': `${deriveSidebarDateSize(entrySubtitleFS)}px`,
      '--t-entry-desc-font-size': `${bodyFS}px`,
      '--t-tag-font-size': `${deriveTagSize(bodyFS)}px`,
      '--t-section-text-font-size': `${bodyFS}px`,
      // sidebar 侧边栏专用字体 vars
      '--sidebar-name-font-size': `${deriveSidebarNameSize(sectionTitleFS)}px`,
      '--sidebar-title-font-size': `${deriveSidebarTitleSize(bodyFS)}px`,
      '--sidebar-field-font-size': `${deriveSidebarSmallSize(bodyFS)}px`,
      '--sidebar-section-title-font-size': `${deriveSidebarSmallSize(bodyFS)}px`,
      '--sidebar-skill-font-size': `${deriveSidebarSmallSize(bodyFS)}px`,
    }
  })

  // 获取技能文本内容
  const getSkillsContent = computed(() => {
    return resume.value.skills?.[0]?.content || ''
  })

  const getCustomTextContent = (sectionId: string): string => {
    const index = getCustomSectionIndex(sectionId)
    if (index === null) return ''
    return resume.value.customTexts?.[index]?.content || ''
  }

  const getCustomCardItems = (sectionId: string) => {
    const index = getCustomSectionIndex(sectionId)
    if (index === null) return []
    return (resume.value.customCards?.[index]?.items || []).filter(i => !i.hidden && !isCardEmpty(i, 'customCard'))
  }

  const isCardEmpty = (item: WorkItem | EducationItem | ProjectItem | CustomCardItem, type: 'work' | 'education' | 'project' | 'customCard'): boolean => {
    if (type === 'work') {
      const w = item as WorkItem
      return !w.position && !w.company && !w.startDate && !w.endDate && !w.description
    }
    if (type === 'education') {
      const e = item as EducationItem
      return !e.school && !e.degree && !e.major && !e.startDate && !e.endDate && !e.description
    }
    if (type === 'project') {
      const p = item as ProjectItem
      return !p.name && !p.role && !p.startDate && !p.endDate && !p.description && !(p.technologies?.length)
    }
    const c = item as CustomCardItem
    return !c.name && !c.role && !c.startDate && !c.endDate && !c.description && !(c.keywords?.length)
  }

  const getVisibleWorkItems = computed(() =>
    resume.value.workExperience.filter(i => !i.hidden && !isCardEmpty(i, 'work'))
  )
  const getVisibleEducationItems = computed(() =>
    resume.value.education.filter(i => !i.hidden && !isCardEmpty(i, 'education'))
  )
  const getVisibleProjectItems = computed(() =>
    resume.value.projects.filter(i => !i.hidden && !isCardEmpty(i, 'project'))
  )

  const formatDate = (date: string) => {
    if (!date) return ''
    if (date === '至今') return '至今'
    const d = new Date(date)
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}`
  }

  const isFieldVisible = (field: string): boolean => {
    return !resume.value.basicInfo.hiddenFields?.[field]
  }

  const renderHtml = (value: string | undefined): string => {
    if (!value) return ''
    return sanitizeHtml(normalizeContent(value))
  }

  const formatBirthday = (date: string): string => {
    if (!date) return ''
    const d = new Date(date)
    return `${d.getFullYear()}年${d.getMonth() + 1}月`
  }

  const formatDateRange = (startDate: string, endDate: string) => {
    const start = formatDate(startDate)
    const end = formatDate(endDate)
    if (start && end) return `${start} - ${end}`
    if (start) return start
    if (end) return end
    return ''
  }

  // 字段图标映射
  const FIELD_ICONS: Record<string, string> = {
    name: 'mdi:account',
    title: 'mdi:briefcase',
    gender: 'mdi:gender-male-female',
    birthday: 'mdi:cake-variant-outline',
    age: 'mdi:calendar-clock',
    maritalStatus: 'mdi:heart-outline',
    politicalStatus: 'mdi:flag-outline',
    hometown: 'mdi:home-outline',
    location: 'mdi:map-marker-outline',
    expectedCity: 'mdi:city-variant-outline',
    workStartDate: 'mdi:calendar-start',
    salaryRange: 'mdi:cash',
    email: 'mdi:email-outline',
    phone: 'mdi:phone-outline',
    wechat: 'mdi:wechat',
    qq: 'simple-icons:tencentqq',
    website: 'mdi:web',
    photo: 'mdi:camera-outline',
  }

  const getFieldIcon = (key: string): string => FIELD_ICONS[key] || 'mdi:tag-outline'

  // 字段标签映射
  const FIELD_LABELS: Record<string, string> = {
    name: '姓名', title: '职位', gender: '性别', birthday: '生日',
    age: '年龄', maritalStatus: '婚姻状态', politicalStatus: '政治面貌',
    hometown: '籍贯', location: '所在地', expectedCity: '期望城市',
    workStartDate: '参加工作时间', salaryRange: '薪资', email: '邮箱',
    phone: '电话', wechat: '微信', qq: 'QQ', website: '网站',
  }

  const getFieldLabel = (key: string): string => FIELD_LABELS[key] || key

  // 字段值获取（含格式化）
  const getFieldValue = (fieldKey: string): string => {
    const bi = resume.value.basicInfo
    if (fieldKey === 'age') return bi.age ? `${bi.age}岁` : ''
    if (fieldKey === 'birthday') return bi.birthday ? formatBirthday(bi.birthday) : ''
    if (fieldKey === 'workStartDate') return bi.workStartDate ? formatDate(bi.workStartDate) : ''
    return (bi[fieldKey as keyof typeof bi] as string) || ''
  }

  // 显示模式辅助
  const getDisplayMode = (key: string): FieldDisplayMode => {
    return resume.value.basicInfo.fieldDisplayMode?.[key] || 'iconLabelValue'
  }

  const showIcon = (key: string): boolean => {
    const mode = getDisplayMode(key)
    return mode === 'iconLabelValue' || mode === 'iconValue'
  }

  const showLabel = (key: string): boolean => {
    const mode = getDisplayMode(key)
    return mode === 'iconLabelValue' || mode === 'labelValue'
  }

  // 标签字段 key 列表
  const TAG_KEYS = ['gender', 'age', 'maritalStatus', 'politicalStatus', 'birthday', 'hometown', 'workStartDate', 'salaryRange', 'expectedCity']
  // 联系字段 key 列表
  const CONTACT_KEYS = ['phone', 'email', 'wechat', 'qq', 'location', 'website']

  // 统一排列：所有可见且有值的字段按 fieldOrder 排列（不含 photo/name/title）
  const ALL_FIELD_KEYS = [...TAG_KEYS, ...CONTACT_KEYS]
  const orderedAllFields = computed(() => {
    const order = resume.value.basicInfo.fieldOrder || DEFAULT_FIELD_ORDER
    return order.filter(k => {
      if (['photo', 'name', 'title'].includes(k)) return false
      if (k.startsWith('custom_')) {
        const field = getCustomFieldByKey(k)
        return field !== null && field.value && !field.hidden
      }
      return ALL_FIELD_KEYS.includes(k) && isFieldVisible(k) && getFieldValue(k)
    }).map(k => {
      const custom = getCustomFieldByKey(k)
      return {
        key: k,
        isCustom: custom !== null,
        label: custom ? custom.label : getFieldLabel(k),
        value: custom ? custom.value : getFieldValue(k),
        showIcon: showIcon(k),
        icon: getFieldIcon(k),
        showLabel: showLabel(k),
      }
    })
  })

  // 获取自定义字段
  const getCustomFieldByKey = (key: string) => {
    if (!key.startsWith('custom_')) return null
    const id = key.replace('custom_', '')
    return (resume.value.basicInfo.customFields || []).find(f => f.id === id) || null
  }

  return {
    resume: resume.value,
    templateId,
    visibleSections,
    contentSections,
    sidebarContentSections,
    isSectionVisible,
    templateCSSVars,
    sidebarCSSVars,
    getSkillsContent,
    getCustomTextContent,
    getCustomCardItems,
    isCardEmpty,
    getVisibleWorkItems,
    getVisibleEducationItems,
    getVisibleProjectItems,
    formatDate,
    isFieldVisible,
    renderHtml,
    formatBirthday,
    formatDateRange,
    FIELD_ICONS,
    FIELD_LABELS,
    getFieldIcon,
    getFieldLabel,
    getFieldValue,
    getDisplayMode,
    showIcon,
    showLabel,
    TAG_KEYS,
    CONTACT_KEYS,
    orderedAllFields,
    getCustomFieldByKey,
    getSectionTitle,
  }
}