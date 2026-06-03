import type { Resume } from '@/types/resume'
import { DEFAULT_SECTION_ORDER, DEFAULT_FIELD_ORDER } from '@/types/resume'
import timoPhoto from '@/assets/images/timo.png'

// 用于模板画廊预览的示例简历数据
export const sampleResume: Resume = {
  id: 'sample',
  title: '示例简历',
  templateId: 'sidebar',
  basicInfo: {
    name: '张明',
    title: '高级前端工程师',
    photo: timoPhoto,
    email: 'zhangming@email.com',
    phone: '138-0000-1234',
    location: '北京市',
    website: 'github.com/zhangming',
    summary: '拥有 6 年前端开发经验，精通 Vue、React 等主流框架，具备丰富的大型项目架构设计能力。热衷于技术创新和团队协作，主导过多个百万级用户产品的前端架构设计与性能优化。',
    gender: '男',
    birthday: '',
    age: '28',
    maritalStatus: '未婚',
    politicalStatus: '',
    hometown: '湖南长沙',
    expectedCity: '',
    workExperience: '5',
    wechat: '',
    qq: '',
    salaryRange: '',
    hiddenFields: {},
    customFields: [],
    fieldOrder: [...DEFAULT_FIELD_ORDER],
    fieldDisplayMode: {}
  },
  workExperience: [
    {
      id: 'w1',
      company: '字节跳动',
      position: '高级前端工程师',
      startDate: '2021-03',
      endDate: '至今',
      description: '负责核心业务线的前端架构设计和团队技术规划，主导微前端架构落地，推动前端工程化建设。\n- 主导微前端架构设计，将单体应用拆分为 8 个独立模块，部署效率提升 60%\n- 建立前端监控体系，页面性能指标提升 40%，首屏加载时间降至 1.2s\n- 带领 5 人前端团队，制定代码规范和 Code Review 流程，Bug 率降低 35%',
    },
    {
      id: 'w2',
      company: '阿里巴巴',
      position: '前端工程师',
      startDate: '2018-07',
      endDate: '2021-02',
      description: '参与电商平台核心模块开发，负责性能优化和组件库建设。\n- 开发通用组件库，覆盖 50+ 业务组件，被 3 个事业部复用\n- 优化商品详情页渲染性能，LCP 从 3.5s 降至 1.8s',
    }
  ],
  education: [
    {
      id: 'e1',
      school: '北京大学',
      degree: '本科',
      major: '计算机科学与技术',
      startDate: '2014-09',
      endDate: '2018-06',
      description: 'GPA 3.8/4.0，获国家奖学金，ACM 校赛银牌'
    }
  ],
  projects: [
    {
      id: 'p1',
      name: '智能数据可视化平台',
      role: '前端负责人',
      startDate: '2022-01',
      endDate: '2023-06',
      description: '基于 Vue 3 + TypeScript 的数据可视化平台，支持拖拽式报表设计，服务 200+ 内部团队。\n- 设计拖拽式报表编辑器，支持 20+ 图表类型\n- 实现自定义数据源接入，兼容 REST API 和 WebSocket 实时推送',
      technologies: ['Vue 3', 'TypeScript', 'ECharts', 'Pinia']
    },
    {
      id: 'p2',
      name: '跨端组件库',
      role: '核心开发者',
      startDate: '2021-06',
      endDate: '2022-12',
      description: '设计并开发跨端 UI 组件库，覆盖 Web、小程序、React Native 三端，组件覆盖率达 95%。\n- 设计跨端主题系统，一套样式适配三端\n- 编写完善的单元测试，覆盖率 90%+',
      technologies: ['React', 'Vue', 'Storybook', 'Jest']
    }
  ],
  skills: [
    {
      id: 'skills-text',
      content: `Vue / React - 精通
TypeScript - 精通
Node.js - 熟练
性能优化 - 熟练
CI/CD - 掌握
Webpack / Vite - 熟练
Git - 熟练`
    }
  ],
  selfEvaluation: '具备扎实的前端技术功底和良好的产品思维，善于从用户角度思考问题。在团队中担任技术导师角色，帮助团队成员成长。持续关注前沿技术发展，积极参与开源社区贡献。',
  customTexts: [],
  customCards: [],
  sectionTitles: {},
  sectionOrder: [...DEFAULT_SECTION_ORDER],
  hiddenSections: [],
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z'
}

// 获取示例数据的深拷贝，防止意外修改原始数据
export const getSampleResume = (): Resume => JSON.parse(JSON.stringify(sampleResume))
