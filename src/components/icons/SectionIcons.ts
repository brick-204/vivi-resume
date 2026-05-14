// 简历模块图标组件

export const UserIcon = {
  template: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="5" r="3" stroke="currentColor" stroke-width="1.5"/>
    <path d="M3 14C3 11.5 5.5 9 8 9C10.5 9 13 11.5 13 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
  </svg>`
}

export const MessageIcon = {
  template: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M3 4H13C13.5523 4 14 4.44772 14 5V10C14 10.5523 13.5523 11 13 11H5L2 13V5C2 4.44772 2.44772 4 3 4Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
    <path d="M5 7H11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
  </svg>`
}

export const BriefcaseIcon = {
  template: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <rect x="2" y="5" width="12" height="8" rx="2" stroke="currentColor" stroke-width="1.5"/>
    <path d="M5 5V3C5 2.44772 5.44772 2 6 2H10C10.5523 2 11 2.44772 11 3V5" stroke="currentColor" stroke-width="1.5"/>
    <path d="M8 9H8.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
  </svg>`
}

export const EducationIcon = {
  template: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M2 6L8 3L14 6" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
    <path d="M2 6V10L8 13L14 10V6" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
    <path d="M8 13V9" stroke="currentColor" stroke-width="1.5"/>
    <circle cx="8" cy="7.5" r="1.5" stroke="currentColor" stroke-width="1"/>
  </svg>`
}

export const RocketIcon = {
  template: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M8 2L11 5L11.5 10L8 13L4.5 10L5 5L8 2Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
    <path d="M8 6V6.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    <path d="M4 13L3 14M12 13L13 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
  </svg>`
}

export const ZapIcon = {
  template: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M9 2L4 9H7L6 14L12 7H9L9 2Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
  </svg>`
}

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
