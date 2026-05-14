// 简历模块图标组件

// 基本信息 - 用户头像
export const UserIcon = {
  template: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="5" r="3" stroke="currentColor" stroke-width="1.5"/>
    <path d="M2.5 14C2.5 11 5 9 8 9C11 9 13.5 11 13.5 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
  </svg>`
}

// 个人简介 - 文档/引号
export const MessageIcon = {
  template: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" stroke-width="1.5"/>
    <path d="M5 6H11M5 9H9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
  </svg>`
}

// 工作经历 - 公文包
export const BriefcaseIcon = {
  template: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <rect x="1.5" y="5.5" width="13" height="9" rx="2" stroke="currentColor" stroke-width="1.5"/>
    <path d="M5.5 5.5V3.5C5.5 2.67 6.17 2 7 2H9C9.83 2 10.5 2.67 10.5 3.5V5.5" stroke="currentColor" stroke-width="1.5"/>
    <path d="M8 10V10.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
  </svg>`
}

// 教育经历 - 学士帽
export const EducationIcon = {
  template: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M8 2L14 5.5L8 9L2 5.5L8 2Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
    <path d="M5 7.5V11.5C5 12.5 6.5 13.5 8 13.5C9.5 13.5 11 12.5 11 11.5V7.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    <path d="M14 5.5V10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
  </svg>`
}

// 项目经验 - 火箭
export const RocketIcon = {
  template: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M8 1.5C8 1.5 11 3 11 7C11 9 10 10.5 10 10.5L8 12L6 10.5C6 10.5 5 9 5 7C5 3 8 1.5 8 1.5Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
    <path d="M8 7V7.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    <path d="M5 12L3.5 14.5M11 12L12.5 14.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
  </svg>`
}

// 技能 - 闪电/能量
export const ZapIcon = {
  template: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M9 1L4 7H7.5L6.5 15L13 7H9.5L9 1Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
  </svg>`
}

// 自我评价 - 星星
export const StarIcon = {
  template: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M8 1L10 5.5L15 6L11.5 9.5L12.5 15L8 12L3.5 15L4.5 9.5L1 6L6 5.5L8 1Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
  </svg>`
}

// 图标映射
export const iconMap: Record<string, any> = {
  basic: UserIcon,
  summary: MessageIcon,
  work: BriefcaseIcon,
  education: EducationIcon,
  projects: RocketIcon,
  skills: ZapIcon,
  evaluation: StarIcon
}
