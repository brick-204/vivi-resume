// 模版样式配置
export interface TemplateStyle {
  headerBg: string
  headerTextColor: string
  accentColor: string
  sectionTitleColor: string
  textColor: string
  textSecondaryColor: string
  sectionBorderRadius: string
  tagBg: string
  tagColor: string
  tagBorder: string
  headerLayout: 'centered' | 'left' | 'two-column' | 'sidebar'
  showTimeline: boolean
  // sidebar 模板专用
  sidebarBg?: string
  sidebarTextColor?: string
  // 字体默认值
  fontDefaults?: {
    bodyFontSize?: number
    sectionTitleFontSize?: number
    entryTitleFontSize?: number
  }
}

// 模版配置
export interface TemplateConfig {
  id: string
  name: string
  description: string
  preview: string
  style: TemplateStyle
}

// 预定义模版
export const TEMPLATES: TemplateConfig[] = [
  {
    id: 'classic',
    name: '经典风格',
    description: '居中头部 + 时间线设计，专业大方',
    preview: 'linear-gradient(135deg, #7c5cfc, #a78bfa)',
    style: {
      headerBg: '#ffffff',
      headerTextColor: '#1a1a2e',
      accentColor: '#7c5cfc',
      sectionTitleColor: '#1a1a2e',
      textColor: '#202429',
      textSecondaryColor: '#4a4a6a',
      sectionBorderRadius: '0',
      tagBg: 'rgba(6, 182, 212, 0.1)',
      tagColor: '#0891b2',
      tagBorder: 'rgba(6, 182, 212, 0.2)',
      headerLayout: 'centered',
      showTimeline: true,
      fontDefaults: { bodyFontSize: 14, sectionTitleFontSize: 16, entryTitleFontSize: 14 }
    }
  },
  {
    id: 'modern',
    name: '现代风格',
    description: '彩色头部 + 卡片式布局，时尚大胆',
    preview: 'linear-gradient(135deg, #06b6d4, #22d3ee)',
    style: {
      headerBg: '#06b6d4',
      headerTextColor: '#1e293b',
      accentColor: '#06b6d4',
      sectionTitleColor: '#0e7490',
      textColor: '#202429',
      textSecondaryColor: '#64748b',
      sectionBorderRadius: '12px',
      tagBg: 'rgba(6, 182, 212, 0.15)',
      tagColor: '#0891b2',
      tagBorder: 'rgba(6, 182, 212, 0.3)',
      headerLayout: 'two-column',
      showTimeline: false,
      fontDefaults: { bodyFontSize: 14, sectionTitleFontSize: 16, entryTitleFontSize: 14 }
    }
  },
  {
    id: 'minimal',
    name: '简约风格',
    description: '极简排版 + 大写标题，干净利落',
    preview: 'linear-gradient(135deg, #1e293b, #475569)',
    style: {
      headerBg: '#ffffff',
      headerTextColor: '#0f172a',
      accentColor: '#475569',
      sectionTitleColor: '#0f172a',
      textColor: '#202429',
      textSecondaryColor: '#64748b',
      sectionBorderRadius: '0',
      tagBg: 'transparent',
      tagColor: '#64748b',
      tagBorder: 'rgba(100, 116, 139, 0.3)',
      headerLayout: 'left',
      showTimeline: false,
      fontDefaults: { bodyFontSize: 14, sectionTitleFontSize: 16, entryTitleFontSize: 14 }
    }
  },
  {
    id: 'timeline',
    name: '时间轴风格',
    description: '强调时间线视觉，突出职业历程',
    preview: 'linear-gradient(135deg, #f97316, #fb923c)',
    style: {
      headerBg: '#ffffff',
      headerTextColor: '#1c1917',
      accentColor: '#f97316',
      sectionTitleColor: '#1c1917',
      textColor: '#202429',
      textSecondaryColor: '#78716c',
      sectionBorderRadius: '8px',
      tagBg: 'rgba(249, 115, 22, 0.1)',
      tagColor: '#ea580c',
      tagBorder: 'rgba(249, 115, 22, 0.25)',
      headerLayout: 'centered',
      showTimeline: true,
      fontDefaults: { bodyFontSize: 14, sectionTitleFontSize: 16, entryTitleFontSize: 14 }
    }
  },
  {
    id: 'elegant',
    name: '优雅风格',
    description: '经典排版 + 精致细节，专业优雅',
    preview: 'linear-gradient(135deg, #059669, #34d399)',
    style: {
      headerBg: '#ffffff',
      headerTextColor: '#064e3b',
      accentColor: '#059669',
      sectionTitleColor: '#064e3b',
      textColor: '#202429',
      textSecondaryColor: '#6b7280',
      sectionBorderRadius: '4px',
      tagBg: 'rgba(5, 150, 105, 0.08)',
      tagColor: '#059669',
      tagBorder: 'rgba(5, 150, 105, 0.2)',
      headerLayout: 'left',
      showTimeline: false,
      fontDefaults: { bodyFontSize: 14, sectionTitleFontSize: 16, entryTitleFontSize: 14 }
    }
  },
  {
    id: 'twocolumn',
    name: '双栏布局',
    description: '左侧信息栏 + 右侧内容，结构清晰',
    preview: 'linear-gradient(135deg, #2563eb, #60a5fa)',
    style: {
      headerBg: '#1e40af',
      headerTextColor: '#1e293b',
      accentColor: '#2563eb',
      sectionTitleColor: '#1e40af',
      textColor: '#202429',
      textSecondaryColor: '#6b7280',
      sectionBorderRadius: '8px',
      tagBg: 'rgba(37, 99, 235, 0.1)',
      tagColor: '#2563eb',
      tagBorder: 'rgba(37, 99, 235, 0.2)',
      headerLayout: 'two-column',
      showTimeline: false,
      fontDefaults: { bodyFontSize: 14, sectionTitleFontSize: 16, entryTitleFontSize: 14 }
    }
  },
  {
    id: 'sidebar',
    name: '侧边栏风格',
    description: '左侧信息栏 + 右侧内容区，层次分明',
    preview: 'linear-gradient(135deg, #3b82f6, #93c5fd)',
    style: {
      headerBg: '#3b82f6',
      headerTextColor: '#ffffff',
      accentColor: '#3b82f6',
      sectionTitleColor: '#1e3a5f',
      textColor: '#202429',
      textSecondaryColor: '#6b7280',
      sectionBorderRadius: '0',
      tagBg: 'rgba(59, 130, 246, 0.1)',
      tagColor: '#3b82f6',
      tagBorder: 'rgba(59, 130, 246, 0.2)',
      headerLayout: 'sidebar',
      showTimeline: false,
      sidebarBg: 'linear-gradient(180deg, #dbeafe 0%, #bfdbfe 100%)',
      sidebarTextColor: '#1e3a5f',
      fontDefaults: { bodyFontSize: 13, sectionTitleFontSize: 14, entryTitleFontSize: 13 }
    }
  },
  {
    id: 'professional',
    name: '专业风格',
    description: '深色标题栏 + 简洁排版，沉稳干练',
    preview: 'linear-gradient(135deg, #1a1a2e, #000000)',
    style: {
      headerBg: '#ffffff',
      headerTextColor: 'black',
      accentColor: '#000000',
      sectionTitleColor: '#ffffff',
      textColor: '#202429',
      textSecondaryColor: '#6b7280',
      sectionBorderRadius: '0',
      tagBg: 'transparent',
      tagColor: '#202429',
      tagBorder: 'transparent',
      headerLayout: 'left',
      showTimeline: false,
      fontDefaults: { bodyFontSize: 14, sectionTitleFontSize: 16, entryTitleFontSize: 14 }
    }
  }
]

export const DEFAULT_TEMPLATE_ID = 'sidebar'

export const getTemplate = (id: string): TemplateConfig => {
  return TEMPLATES.find(t => t.id === id) || TEMPLATES[0]
}