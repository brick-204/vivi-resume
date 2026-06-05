# Vivi Resume

一个简洁优雅的在线简历编辑器，帮助你展现最好的自己。

## 功能特性

- **8 种简历模板** - 经典、现代、简约、时间轴、优雅、双栏、侧边栏、专业风格
- **实时预览** - 编辑内容时即时查看简历效果
- **主题色定制** - 12 种预设主题色 + 自定义 RGBA 取色器
- **文字设置** - 字体、行高（slider + select）、正文字号、一/二级标题字号
- **间距设置** - 页边距（0-100px）、模块间距（0-50px）、段落间距（0-50px），slider + 输入框
- **模块化管理** - 自由添加、删除、排序简历模块（基本信息除外）
- **拖拽排序** - 模块和基本信息字段均支持拖拽调整顺序
- **富文本编辑** - 基于 Tiptap 的富文本编辑器，支持加粗、斜体、列表等
- **自定义模块** - 支持自定义文本模块和自定义列表模块，数量不限
- **头部布局** - 居中 / 左对齐+照片居左 / 左对齐+照片居右三种布局
- **头部配色** - 文字颜色和图标颜色独立设置（黑色 / 白色 / 主题色）
- **本地图片上传** - 支持本地上传头像照片，Web Worker 异步裁剪处理
- **智能导航** - 点击左侧模块标签，右侧预览自动滚动到对应区域
- **撤销/重做** - 支持最多 50 步操作历史
- **JSON 导入导出** - 导出 JSON 保留全部设置，导入时完整还原
- **PDF 导出** - 生成可直接打印或发送的 PDF 文件
- **IndexedDB 存储** - 数据保存在浏览器 IndexedDB，支持照片 Blob 存储
- **响应式设计** - 适配桌面端和移动端

## 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | Vue 3.4 + TypeScript 5 |
| 状态管理 | Pinia 2.1 |
| 路由 | Vue Router 4.3 |
| 构建 | Vite 5 |
| 样式 | Sass + CSS 自定义属性 |
| 拖拽 | vuedraggable 4.1 |
| 富文本 | Tiptap 3.23 |
| 图标 | Iconify (mdi + simple-icons) |
| 存储 | IndexedDB (idb 8.0) |
| 安全 | isomorphic-dompurify |
| PDF | html2pdf.js |

## 项目结构

```
src/
├── assets/
│   └── styles/            # 全局样式、变量、混入（含 range-slider mixin）
├── components/
│   ├── common/            # 公共组件（Modal、Button、Input）
│   ├── editor/            # 编辑器组件
│   │   ├── sections/      # 各模块编辑组件（BasicInfo、WorkExperience…）
│   │   ├── SectionNavigator.vue  # 左侧导航 + 主题色 + 文字/间距设置
│   │   └── AddSectionModal.vue   # 添加模块弹窗
│   ├── preview/           # 预览组件
│   │   ├── ResumePreview.vue     # 预览容器（页边距控制）
│   │   ├── ResumeDocument.vue    # 模板路由组件
│   │   └── templates/     # 8 种模板组件 + 共享样式
│   │       └── shared/    # base.scss、useResumeDocument、CSS vars
│   ├── home/              # 首页组件（ResumeCard、ImportModal）
│   └── template/          # 模板卡片组件
├── config/
│   ├── templates.ts       # 8 种模板配置（样式、字体默认值、头部模式）
│   ├── fonts.ts           # 字体选项 + 字号派生逻辑
│   └── sampleData.ts      # 示例简历数据
├── stores/
│   └── resumeStore.ts     # Pinia 状态管理（含 undo/redo）
├── types/
│   └── resume.ts          # TypeScript 类型 + 默认常量
├── utils/
│   ├── storage.ts         # IndexedDB 适配器（含 localStorage 迁移）
│   ├── colorUtils.ts      # 主题色派生（标题色、标签色等）
│   ├── sanitizeHtml.ts    # HTML 安全过滤
│   └── export.ts          # PDF/JSON 导出
├── workers/
│   ├── serializer.worker.ts    # JSON 序列化 Worker
│   └── imageProcessor.worker.ts # 图片裁剪/缩放 Worker
├── views/
│   ├── HomeView.vue       # 首页（简历列表）
│   ├── EditorView.vue     # 编辑器页面
│   └── TemplatesView.vue  # 模板选择页面
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
2. 进入模板选择页面，选择喜欢的模板
3. 点击「应用模板」进入编辑器（自动填入示例数据）

### 编辑内容

编辑器左侧为编辑面板，包含以下模块：

- **基本信息** - 姓名、职位、联系方式、头像（支持本地上传，字段可拖拽排序、隐藏、切换显示模式）
- **个人简介** - 富文本编辑，支持加粗、斜体、列表、对齐等
- **工作经历** - 公司、职位、时间、描述（支持条目拖拽排序）
- **教育经历** - 学校、学位、专业、时间
- **项目经验** - 项目名称、角色、技术栈、描述
- **技能** - 富文本编辑
- **自我评价** - 综合评价文字
- **自定义文本** - 自由添加的富文本模块
- **自定义列表** - 自由添加的列表模块（含名称、角色、时间、描述、关键词）

右侧实时显示简历预览效果。

### 样式设置

- **主题色** - 12 种预设色一键切换，或打开自定义取色器精确调色
- **文字设置** - 字体选择、行高滑动条、正文字号 / 一级标题字号 / 二级标题字号
- **间距设置** - 页边距滑动条 + 输入框、模块间距、段落间距

### 模块管理

- **添加模块** - 点击编辑面板顶部「+」按钮
- **删除模块** - 点击模块标签上的「×」按钮（基本信息不可删除）
- **拖拽排序** - 拖动模块标签左侧的手柄图标调整顺序
- **导航跳转** - 点击模块标签，预览区自动滚动到对应区域
- **撤销/重做** - 支持 Ctrl+Z / Ctrl+Shift+Z

### 更换模板

点击编辑器顶部「更换模板」按钮，返回模板选择页面重新选择。已有内容的简历切换模板时不会改变主题色和文字/间距设置。

### 导出简历

- **导出 PDF** - 生成可直接打印或发送的 PDF 文件
- **导出 JSON** - 保存为 JSON 文件，完整保留模板、主题色、文字/间距设置等全部数据

## 模板展示

| 模板名称 | 特点 |
|---------|------|
| 经典风格 | 居中头部 + 时间线设计，专业大方 |
| 现代风格 | 彩色头部 + 卡片式布局，时尚大胆 |
| 简约风格 | 极简排版 + 大写标题，干净利落 |
| 时间轴风格 | 强调时间线视觉，突出职业历程 |
| 优雅风格 | 经典排版 + 精致细节，专业优雅 |
| 双栏布局 | 左侧信息栏 + 右侧内容，结构清晰 |
| 侧边栏风格 | 左侧信息栏 + 右侧内容区，层次分明 |
| 专业风格 | 深色标题栏 + 简洁排版，沉稳干练 |

## 设计特点

- **Glassmorphism** - 玻璃拟态设计风格
- **深色主题** - 舒适的深色背景配色
- **流畅动画** - 平滑的过渡和 FLIP 动画效果
- **CSS 变量** - 模板样式通过 CSS 自定义属性灵活控制，支持主题色 / 字号 / 行高 / 间距全链路传递
- **Web Worker** - JSON 序列化和图片处理在 Worker 线程完成，不阻塞主线程

## 数据存储

简历数据存储在浏览器 **IndexedDB**（`vivi-resume` 数据库）：

- 照片以 Blob 形式存储，避免 Base64 字符串占用过多内存
- 高频写入（拖拽排序）使用 300ms 防抖
- 串行化写入防止竞态条件
- 首次启动自动从旧版 localStorage 迁移数据

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

### CSS 变量传递链路

```
Resume 数据 (resumeStore)
  → useResumeDocument (computed CSS vars)
    → 模板组件 :style 绑定
      → base.scss / SidebarTemplate.vue 读取 var(--t-xxx)
```

关键 CSS 变量：`--t-accent`、`--t-line-height`、`--t-body-font-size`、`--t-module-spacing`、`--t-paragraph-spacing`、`--t-max-width`

### 添加新模板

1. 在 `src/config/templates.ts` 中添加 `TemplateConfig` 对象（含 `style` 和 `fontDefaults`）
2. 在 `src/components/preview/templates/` 下创建模板组件
3. 在 `ResumeDocument.vue` 的 `TEMPLATE_MAP` 中注册

### 模块顺序管理

- `sectionOrder: string[]` - 定义模块显示顺序
- `hiddenSections: string[]` - 存储已隐藏/删除的模块
- `DEFAULT_SECTION_ORDER` - 默认模块顺序常量
- `SECTION_CONFIG` - 模块配置（名称、图标等）

编辑器使用 vuedraggable 实现模块和条目的拖拽排序。

## License

Apache-2.0
