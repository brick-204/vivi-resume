// ========== 简历模块图标 ==========

// 基本信息 - 用户头像
export const USER_ICON = 'mdi:account-outline'

// 个人简介 - 文档/引号
export const MESSAGE_ICON = 'mdi:text-box-outline'

// 工作经历 - 公文包
export const BRIEFCASE_ICON = 'mdi:briefcase-outline'

// 教育经历 - 学士帽
export const EDUCATION_ICON = 'mdi:school-outline'

// 项目经验 - 火箭
export const ROCKET_ICON = 'mdi:rocket-launch-outline'

// 技能 - 闪电/能量
export const ZAP_ICON = 'mdi:lightning-bolt'

// 自我评价 - 星星
export const STAR_ICON = 'mdi:star-outline'

// ========== 功能按钮图标 ==========

// 添加模块 - 加号圆圈
export const PLUS_ICON = 'mdi:plus-circle-outline'

// 加号 - 简单加号
export const PLUS_SIMPLE_ICON = 'mdi:plus'

// 收缩侧栏 - 向左双箭头
export const COLLAPSE_LEFT_ICON = 'mdi:chevron-double-left'

// 展开侧栏 - 向右双箭头
export const COLLAPSE_RIGHT_ICON = 'mdi:chevron-double-right'

// 收缩编辑区 - 向左单箭头
export const COLLAPSE_EDITOR_ICON = 'mdi:chevron-left'

// 删除模块 - 垃圾桶
export const TRASH_ICON = 'mdi:delete-outline'

// 拖拽排序 - 四点手柄
export const DRAG_HANDLE_ICON = 'mdi:drag'

// ========== 显示/隐藏图标 ==========

// 显示模块 - 眼睛
export const EYE_ICON = 'mdi:eye-outline'

// 隐藏模块 - 眼睛关闭
export const EYE_OFF_ICON = 'mdi:eye-off-outline'

// ========== 通用图标 ==========

// 用户头像 - 实心
export const ACCOUNT_ICON = 'mdi:account'

// 上传
export const UPLOAD_ICON = 'mdi:upload'

// 关闭/清除
export const CLOSE_ICON = 'mdi:close'

// 信息提示
export const INFO_ICON = 'mdi:information-outline'

// 图标映射（section id -> icon name）
export const iconMap: Record<string, string> = {
  basic: USER_ICON,
  summary: MESSAGE_ICON,
  work: BRIEFCASE_ICON,
  education: EDUCATION_ICON,
  projects: ROCKET_ICON,
  skills: ZAP_ICON,
  evaluation: STAR_ICON
}
