# Vivi Resume

一个简洁优雅的在线简历编辑器，帮助你展现最好的自己。

## 功能特性

### 简历编辑

- **8 种简历模板** - 经典、现代、简约、时间轴、优雅、双栏、侧边栏（默认）、专业风格
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
- **JSON 导入导出** - 导出 JSON 保留全部设置，导入时完整还原
- **PDF 导出** - iframe 打印方案，生成可直接打印或发送的 PDF 文件

### AI 辅助

- **7 种 AI 操作** - 润色、简化、扩展、总结、帮写、翻译、JD 定制
- **SSE 流式生成** - 兼容 OpenAI API 格式，10+ 服务商（DeepSeek、Moonshot、智谱、通义千问等）
- **自动续写** - 检测 token 截断后自动续写，确保完整输出
- **空段落上下文预填** - AI 帮写时自动注入当前条目上下文（职位@公司、项目名等）
- **AI 简历评估** - 全模块逐一评估（含评分），评估结果自动持久化
- **评分徽章** - 三档评分色标（≥80 优秀/≥60 良好/<60 待改进），简历卡片与评估弹窗复用
- **Token 用量追踪** - 实时显示累计输入/输出 token 用量，防抖持久化

### Dashboard

- **两列布局** - 侧边导航 + 内容区，移动端自动折叠为抽屉
- **模板市场** - 用户数据实时预览，每个模板展示自身主题色；无简历时默认展示
- **AI 设置面板** - 多服务商配置管理，Token 用量置顶高亮
- **目录模式同步** - 绑定本地目录后自动双向同步，支持进度显示和冲突保护
- **主题切换** - 浅色 / 深色 / 跟随系统三种模式，跟随系统监听 `prefers-color-scheme`

## 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | Vue 3.4 + TypeScript 5 |
| 状态管理 | Pinia 2.1 |
| 路由 | Vue Router 4.3 |
| 构建 | Vite 5 + manualChunks 拆包 |
| 样式 | Sass + CSS 自定义属性 + 浅色/深色主题变量 |
| 拖拽 | vuedraggable 4.1 |
| 富文本 | Tiptap 3.23 |
| 图标 | Iconify (mdi + simple-icons)，按需 bundle |
| UI 组件库 | Naive UI 2.44（AI 弹窗、配置表单等） |
| AI 文本 | SSE 流式调用（兼容 OpenAI API 格式）+ 自动续写 |
| Markdown | marked（解析）+ turndown（反转） |
| 存储 | IndexedDB (idb 8.0)，支持目录模式同步 |
| 安全 | isomorphic-dompurify |
| PDF | iframe 打印方案 |

## 项目结构

```
src/
├── assets/
│   └── styles/            # 全局样式、变量、混入（含 range-slider、rich-text-content mixin）
├── components/
│   ├── common/            # 公共组件（AppHeader、RichTextEditor、ResizeHandle）
│   ├── dashboard/         # Dashboard 页面组件
│   │   ├── SidebarNav.vue         # 侧边导航
│   │   ├── ResumeListPanel.vue    # 简历列表面板
│   │   ├── TemplateMarketPanel.vue # 模板市场面板
│   │   ├── TemplateShowcaseCard.vue # 模板展示卡片
│   │   ├── AISettingsPanel.vue    # AI 设置面板（Token 用量置顶）
│   │   ├── SettingsPanel.vue      # 通用设置面板
│   │   └── SyncOverlay.vue       # 同步遮罩（进度、冲突保护）
│   ├── editor/            # 编辑器组件
│   │   ├── sections/      # 各模块编辑组件（BasicInfo、WorkExperience…）
│   │   ├── SectionNavigator.vue  # 左侧导航 + 主题色 + 文字/间距设置
│   │   ├── SectionEditor.vue     # 右侧编辑面板
│   │   └── AddSectionModal.vue   # 添加模块弹窗
│   ├── preview/           # 预览组件
│   │   ├── ResumePreview.vue     # 预览容器（页边距控制）
│   │   ├── ResumeDocument.vue    # 模板路由组件
│   │   └── templates/     # 8 种模板组件 + 共享样式
│   │       └── shared/    # base.scss、useResumeDocument、CSS vars
│   ├── ai/                # AI 功能组件
│   │   ├── AIButtonGroup.vue       # AI 操作按钮组
│   │   ├── AIConfigCard.vue        # AI 配置卡片
│   │   ├── AIConfigModal.vue       # AI 配置弹窗
│   │   ├── AIResultPreview.vue     # AI 生成结果预览（7 种操作 + 上下文预填）
│   │   └── ResumeEvaluationModal.vue  # AI 简历评估弹窗（流式 + 自动续写 + 持久化）
│   ├── home/              # 首页组件（ResumeCard、ImportModal）
│   └── template/          # 模板卡片组件
├── composables/
│   ├── useWorkerSerializer.ts    # Worker JSON 序列化（toRaw + structuredClone）
│   ├── useWorkerImageProcessor.ts # Worker 图片处理
│   ├── useSyncWorker.ts          # 目录同步 Worker
│   ├── useSyncLock.ts            # 同步锁（防并发）
│   ├── useTheme.ts               # 主题切换（浅色/深色/跟随系统）
│   ├── useScaledPreview.ts       # 缩放预览
│   ├── useSectionTitle.ts        # 模块标题
│   ├── useFlipAnimation.ts       # FLIP 动画
│   └── usePageBreaks.ts          # 分页计算
├── config/
│   ├── templates.ts       # 8 种模板配置（样式、字体默认值、头部模式）
│   ├── fonts.ts           # 字体选项 + 字号派生逻辑
│   └── sampleData.ts      # 示例简历数据
├── services/
│   ├── aiService.ts       # AI SSE 流式调用 + 自动续写 + 缓冲区限制
│   ├── aiPrompts.ts       # AI 操作 Prompt 模板（润色/简化/扩展/总结/帮写/翻译/定制）
│   └── resumeSerializer.ts # 简历序列化（Resume → 结构化纯文本，供 AI 使用）
├── stores/
│   ├── resumeStore.ts     # Pinia 状态管理（shallowRef + dirty flag + 评估结果持久化）
│   ├── aiConfigStore.ts   # AI 服务配置 + Token 用量追踪（防抖持久化）
│   ├── editorLayoutStore.ts # 编辑器布局状态 + localStorage 持久化
│   └── settingsStore.ts   # 全局设置（目录模式、存储后端切换）
├── types/
│   ├── resume.ts          # TypeScript 类型 + 默认常量（含 EvaluationResult）
│   └── aiConfig.ts        # AI 服务配置类型（服务商、操作、配置接口）
├── utils/
│   ├── storage.ts         # IndexedDB 适配器（含 localStorage 迁移、Blob 照片存储）
│   ├── storageAdapter.ts  # 存储适配层（IndexedDB / 目录模式切换）
│   ├── colorUtils.ts      # 主题色派生（标题色、标签色等）
│   ├── evaluationScore.ts # 评估分数工具（三档色值 + 等级文案）
│   ├── resumeStyle.ts     # 简历样式工具（样式覆盖字段剥离）
│   ├── sanitizeHtml.ts    # HTML 安全过滤
│   ├── normalizeContent.ts # 内容标准化
│   ├── markdownConverter.ts # Markdown ↔ HTML 转换（marked + turndown）
│   ├── templateApply.ts   # 模板应用逻辑
│   ├── export.ts          # JSON 导出
│   └── print.ts           # iframe 打印方案
├── plugins/
│   └── naive-ui.ts        # Naive UI 主题覆盖 + Provider 注册 + createDiscreteApi
├── workers/
│   ├── serializer.worker.ts    # JSON 序列化 Worker
│   ├── imageProcessor.worker.ts # 图片裁剪/缩放 Worker
│   ├── sync.worker.ts          # 目录同步 Worker
│   └── types.ts                # Worker 消息类型
├── views/
│   ├── DashboardView.vue  # Dashboard 主页（两列布局）
│   ├── EditorView.vue     # 编辑器页面（含 AI 评估按钮）
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

1. 在 Dashboard 简历列表中点击「新建简历」按钮
2. 进入模板选择页面，选择喜欢的模板
3. 点击「应用模板」进入编辑器（自动填入示例数据）

### 编辑内容

编辑器左侧为编辑面板，包含以下模块：

- **基本信息** - 姓名、职位、联系方式、头像（支持本地上传，字段可拖拽排序、隐藏、切换显示模式）
- **个人简介** - 富文本编辑，支持加粗、斜体、列表、对齐等，AI 辅助润色/精简/扩展
- **工作经历** - 公司、职位、时间、描述（支持条目拖拽排序，AI 辅助优化）
- **教育经历** - 学校、学位、专业、时间
- **项目经验** - 项目名称、角色、技术栈、描述，AI 辅助优化
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

### 更换模板

点击编辑器顶部「更换模板」按钮，返回模板选择页面重新选择。已有内容的简历切换模板时不会改变主题色和文字/间距设置。

### 导出简历

- **导出 PDF** - 使用 iframe 打印方案，生成可直接打印或发送的 PDF 文件
- **导出 JSON** - 保存为 JSON 文件，完整保留模板、主题色、文字/间距设置等全部数据

### AI 辅助功能

#### 文本处理

在富文本编辑器（个人简介、工作经历、项目经验等）中，选中或输入内容后可使用 AI 操作：

- **润色** - 将口语化表述优化为专业表达，保持核心信息不变
- **简化** - 去除冗余，保留核心信息，使描述更简洁有力
- **扩展** - 基于 STAR 法则补充合理细节，用量化占位符提示用户补充数据
- **总结** - 提炼 3-5 个核心要点，生成项目符号列表
- **帮写** - 根据用户输入的要求撰写简历内容，支持自定义指令；空段落自动注入上下文
- **翻译** - 自动检测源语言，在中英文之间翻译，保持格式结构
- **定制** - 粘贴目标职位 JD，针对性优化简历内容，突出匹配度

所有操作均使用 SSE 流式实时生成，兼容 OpenAI API 格式，支持 10+ 服务商。当输出因 token 上限截断时，自动检测 `finish_reason: "length"` 并续写，确保完整输出。

#### 简历评估

点击编辑器顶部「AI 评估」按钮，对整份简历进行全面分析：

- 全模块逐一评估（内容完整性、表述专业性、逻辑清晰度、信息密度、格式规范）
- 每个模块给出优点、不足、可操作建议
- 生成 0-100 总体评分，三档色标：≥80 优秀（绿）/ ≥60 良好（黄）/ <60 待改进（红）
- 评估结果自动持久化，下次打开可查看历史结果；评分以徽章形式显示在简历卡片上
- 配合自动续写，确保所有模块都能被完整评估

## 模板展示

| 模板名称 | 特点 |
|---------|------|
| 经典风格 | 居中头部 + 时间线设计，专业大方 |
| 现代风格 | 彩色头部 + 卡片式布局，时尚大胆 |
| 简约风格 | 极简排版 + 大写标题，干净利落 |
| 时间轴风格 | 强调时间线视觉，突出职业历程 |
| 优雅风格 | 经典排版 + 精致细节，专业优雅 |
| 双栏布局 | 左侧信息栏 + 右侧内容，结构清晰 |
| 侧边栏风格 | 左侧信息栏 + 右侧内容区，层次分明（默认模板） |
| 专业风格 | 深色标题栏 + 简洁排版，沉稳干练 |

## 设计特点

- **Glassmorphism** - 玻璃拟态设计风格，backdrop-filter 适度降级优化性能
- **主题切换** - 浅色 / 深色 / 跟随系统三种模式，`useTheme` composable 管理，`data-theme` 属性作用于 `<html>`
- **Naive UI** - AI 弹窗、配置表单等使用 Naive UI 组件库，深色/浅色主题完整覆盖
- **流畅动画** - 平滑的过渡和 FLIP 动画效果
- **CSS 变量** - 模板样式通过 CSS 自定义属性灵活控制，支持主题色 / 字号 / 行高 / 间距全链路传递
- **Web Worker** - JSON 序列化、图片处理、目录同步在 Worker 线程完成，不阻塞主线程
- **Reduced Motion** - `prefers-reduced-motion: reduce` 下自动禁用 backdrop-filter

## 性能优化

| 优化项 | 方案 |
|--------|------|
| 响应式追踪 | `shallowRef` 管理简历列表，mutation 时整体替换 |
| 自动保存 | `dirty flag` 替代 `deep watch`，O(1) 判断变更 |
| Proxy 剥离 | `toRaw()` + `structuredClone()` 替代 `JSON.parse(stringify())` |
| 代码拆分 | `manualChunks` 拆分 naive-ui、tiptap、vuedraggable |
| 渲染缓存 | `renderHtml` LRU 缓存（200 条），避免重复 sanitize |
| SSE 安全 | 缓冲区大小限制（1MB），防止异常响应耗尽内存 |
| 视觉性能 | backdrop-filter 降级 + reduced-motion 禁用 |
| Token 持久化 | 用量防抖写入（5 秒），避免高频 IndexedDB 操作 |

## 数据存储

简历数据存储在浏览器 **IndexedDB**（`vivi-resume-db` 数据库）：

- 照片以 Blob 形式存储，避免 Base64 字符串占用过多内存
- 高频写入（拖拽排序）使用 300ms 防抖
- 串行化写入防止竞态条件
- 首次启动自动从旧版 localStorage 迁移数据
- 支持目录模式：绑定本地文件夹后自动双向同步

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

### AI 功能架构

```
用户操作（润色/翻译/评估/…）
  → aiConfigStore（选择 AI 服务配置 + Token 用量追踪）
    → aiPrompts（构建 system + user messages）
      → aiService.streamChat（SSE 流式调用 + 自动续写 + 缓冲区限制）
        → onChunk 回调（实时更新 UI）
          → onUsage 回调（Token 用量防抖持久化）
```

- **服务商支持**：10+ 服务商预设 + 自定义 endpoint，部分服务商需 Vite 开发代理解决 CORS
- **SSE 代理**：`vite.config.ts` 中 `sseProxy()` 工厂函数统一配置，禁用 `x-accel-buffering` 保证流式响应
- **自动续写**：检测 `finish_reason: "length"` 后追加 assistant + 续写提示发起新请求，最多续写 3 次
- **文本处理流程**：Tiptap HTML → turndown 转 Markdown → AI 流式生成 Markdown → marked 转 HTML → sanitizeHtml → 写回编辑器
- **简历序列化**：`resumeSerializer.ts` 将 Resume 对象转为结构化纯文本，空模块标记为`（未填写）`
- **评估持久化**：结果存储在 `Resume.lastEvaluation`（IndexedDB 自动兼容新字段），使用 `saveToStorageNow()` 立即写入
- **Token 用量**：`aiConfigStore.totalTokens` 累加输入/输出/总计，5 秒防抖写入 IndexedDB `meta` store
- **评分工具**：`evaluationScore.ts` 提供三档色值（绿/黄/红）和等级文案（优秀/良好/待改进），评估弹窗与简历卡片复用

## License

Apache-2.0
