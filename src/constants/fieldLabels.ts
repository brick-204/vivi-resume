/**
 * 简历字段中文标签映射
 * 供 Schema 校验错误翻译、AI 导入字段展示等场景共享使用
 */

export const FIELD_LABELS: Record<string, string> = {
  // 顶层
  id: '简历 ID',
  title: '简历标题',
  templateId: '模板 ID',
  basicInfo: '基本信息',
  // workExperience 在顶层 Resume 中是"工作经历"（数组），在 BasicInfo 中是"工作经验"（年限字符串）
  // 由于 key 相同，Record 只能有一个值，这里用顶层含义；BasicInfo 场景在 ImportFieldView 中单独标注
  workExperience: '工作经历',
  education: '教育经历',
  projects: '项目经历',
  skills: '技能',
  selfEvaluation: '自我评价',
  customTexts: '自定义文本',
  customCards: '自定义列表',
  sectionOrder: '模块顺序',
  sectionTitles: '模块标题',
  hiddenSections: '隐藏模块',
  createdAt: '创建时间',
  updatedAt: '更新时间',
  // BasicInfo
  name: '姓名',
  photo: '头像',
  email: '邮箱',
  phone: '电话',
  location: '所在地',
  website: '个人网站',
  summary: '个人简介',
  gender: '性别',
  birthday: '生日',
  age: '年龄',
  expectedCity: '期望城市',
  wechat: '微信号',
  qq: 'QQ',
  salaryRange: '薪资要求',
  hiddenFields: '隐藏字段',
  customFields: '自定义字段',
  fieldOrder: '字段顺序',
  fieldDisplayMode: '字段显示模式',
  photoShape: '头像形状',
  photoOriginal: '原始头像',
  headerLayout: '头部布局',
  // WorkItem
  company: '公司',
  position: '职位',
  startDate: '开始日期',
  endDate: '结束日期',
  description: '描述',
  highlights: '亮点',
  hidden: '隐藏',
  // EducationItem
  school: '学校',
  degree: '学历',
  major: '专业',
  // ProjectItem
  role: '角色',
  technologies: '技术栈',
  // SkillItem
  content: '内容',
  // CustomField
  label: '标签',
  value: '值',
  // CustomCardItem
  keywords: '关键词',
  items: '列表项',
}
