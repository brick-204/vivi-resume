# Vivi Resume

一个简洁优雅的在线简历编辑器，帮助你展现最好的自己。

## 功能特性

- **多模板支持** - 6 种精心设计的简历模板（经典、现代、简约、时间轴、优雅、双栏）
- **实时预览** - 编辑内容时即时查看简历效果
- **模板画廊** - 全页面模板选择体验，实时预览每个模板效果
- **模块化管理** - 自由添加、删除、排序简历模块（基本信息除外）
- **拖拽排序** - 通过拖拽调整模块顺序，预览区实时同步
- **本地图片上传** - 支持本地上传头像照片
- **智能导航** - 点击左侧模块标签，右侧预览自动滚动到对应区域
- **本地存储** - 数据保存在浏览器本地，无需注册登录
- **导出功能** - 支持 PDF 和 JSON 格式导出
- **导入功能** - 可导入之前保存的 JSON 简历文件
- **响应式设计** - 适配桌面端和移动端

## 技术栈

- **Vue 3.4** - 渐进式 JavaScript 框架
- **Vue Router 4.3** - 官方路由管理器
- **Pinia 2.1** - Vue 3 状态管理库
- **Vite 5** - 下一代前端构建工具
- **TypeScript 5** - JavaScript 的类型超集
- **Sass** - CSS 预处理器
- **html2pdf.js** - HTML 转 PDF 库

## 项目结构

```
src/
├── assets/
│   └── styles/          # 全局样式、变量、混入
├── components/
│   ├── common/          # 公共组件（Modal、Button、Input）
│   ├── editor/          # 编辑器组件（各板块编辑区）
│   │   ├── sections/    # 各模块编辑组件
│   │   └── AddSectionModal.vue  # 添加模块弹窗
│   ├── preview/         # 预览组件（ResumeDocument、ResumePreview）
│   └── template/        # 模板相关组件（TemplateCard、TemplateSelector）
├── config/
│   ├── templates.ts     # 模板配置（6 种模板样式定义）
│   └── sampleData.ts    # 示例简历数据
├── stores/
│   └── resumeStore.ts   # Pinia 状态管理
├── types/
│   └── resume.ts        # TypeScript 类型定义
├── utils/
│   └── export.ts        # 导出功能工具函数
├── views/
│   ├── HomeView.vue     # 首页（简历列表）
│   ├── EditorView.vue   # 编辑器页面
│   └ TemplatesView.vue  # 模板画廊页面
├── App.vue
├── main.ts
└── router/index.ts
```

## 快速开始

### 安装依赖

```bash
pnpm install
```

### 启动开发服务器

```bash
pnpm start
```

访问 `http://localhost:5173`

### 构建生产版本

```bash
pnpm build
```

### 预览生产版本

```bash
pnpm preview
```

## 使用指南

### 创建简历

1. 点击首页「创建新简历」按钮
2. 进入模板画廊，选择喜欢的模板
3. 点击「应用模板」进入编辑器

### 编辑内容

编辑器左侧为编辑面板，包含以下模块：

- **基本信息** - 姓名、职位、联系方式、头像（支持本地上传）
- **个人简介** - 个人概述与自我介绍
- **工作经历** - 公司、职位、时间、描述
- **教育经历** - 学校、学位、专业、时间
- **项目经验** - 项目名称、角色、技术栈、描述
- **技能** - 技能名称、熟练程度（1-5级）
- **语言能力** - 语言及熟练程度
- **自我评价** - 综合评价文字

右侧实时显示简历预览效果。

### 模块管理

- **添加模块** - 点击编辑面板顶部「+」按钮，选择需要添加的模块
- **删除模块** - 点击模块标签上的「×」按钮移除模块（基本信息不可删除）
- **拖拽排序** - 拖动模块标签左侧的手柄图标调整顺序，右侧预览区同步更新
- **导航跳转** - 点击左侧模块标签，右侧预览自动滚动到对应区域

### 更换模板

点击编辑器顶部「更换模板」按钮，返回模板画廊重新选择。

### 导出简历

- **导出 PDF** - 生成可直接打印或发送的 PDF 文件
- **导出 JSON** - 保存为 JSON 文件，方便备份和导入

## 模板展示

| 模板名称 | 特点 |
|---------|------|
| 经典风格 | 居中头部 + 时间线设计，专业大方 |
| 现代风格 | 彩色头部 + 卡片式布局，时尚大胆 |
| 简约风格 | 极简排版 + 大写标题，干净利落 |
| 时间轴风格 | 强调时间线视觉，突出职业历程 |
| 优雅风格 | 经典排版 + 精致细节，专业优雅 |
| 双栏布局 | 左侧信息栏 + 右侧内容，结构清晰 |

## 设计特点

- **Glassmorphism** - 玻璃拟态设计风格
- **深色主题** - 舒适的深色背景配色
- **流畅动画** - 平滑的过渡和交互效果
- **CSS 变量** - 模板样式通过 CSS 自定义属性灵活控制

## 数据存储

简历数据存储在浏览器 `localStorage`：

- `vivi-resume-list` - 简历列表
- `vivi-resume-current` - 当前编辑的简历

## 开发说明

### 样式系统

全局 Sass 变量和混入通过 Vite 配置自动注入：

```typescript
// vite.config.ts
css: {
  preprocessorOptions: {
    scss: {
      additionalData: `
        @use "@/assets/styles/variables" as *;
        @use "@/assets/styles/mixins" as *;
      `
    }
  }
}
```

### 组件复用

`ResumeDocument.vue` 是核心渲染组件，接受 `resume` 和 `templateId` 作为 props，可在编辑器预览和模板画廊中复用。

### 添加新模板

在 `src/config/templates.ts` 中添加新的 `TemplateConfig` 对象，并在 `ResumeDocument.vue` 中添加对应的 CSS 变体样式。

### 模块顺序管理

简历模块顺序通过 `sectionOrder` 和 `hiddenSections` 字段管理：

- `sectionOrder: string[]` - 定义模块显示顺序
- `hiddenSections: string[]` - 存储已隐藏/删除的模块
- `DEFAULT_SECTION_ORDER` - 默认模块顺序常量
- `SECTION_CONFIG` - 模块配置（名称、图标等）

编辑器使用原生 HTML5 拖拽 API 实现模块排序，无需额外依赖库。

## License

MIT