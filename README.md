# Vivi Resume

一个简洁优雅的在线简历编辑器，帮助你展现最好的自己。

**在线预览**: [https://vivi-resume.pages.dev](https://vivi-resume.pages.dev)

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
- **图片导出** - 基于 modern-screenshot 导出高清 PNG 图片，自动处理布局适配
- **DOCX 导出** - 使用 docx 库从结构化数据生成 Word 文档，样式尽量对齐预览模板，支持主题色/字体/字号等样式还原
- **回收站系统** - 删除的简历进入回收站，保留期可配置（默认 30 天，设置中可选 7/15/30 天）；编辑器内卡片/模块单独进入回收箱，保留 7 天，支持字段级合并冲突处理

### AI 辅助

- **7 种富文本 AI 操作** - 润色、简化、扩展、总结、帮写、翻译、JD 定制
- **AI 帮帮** - 一键入口整合 AI 评估、JD 扫描、一键优化、面试准备
- **SSE 流式生成** - 兼容 OpenAI API 格式，10+ 服务商（DeepSeek、Moonshot、智谱、通义千问等）
- **自动续写** - 检测 token 截断后自动续写，确保完整输出
- **空段落上下文预填** - AI 帮写时自动注入当前条目上下文（职位@公司、项目名等）
- **AI 简历评估** - 全模块逐一评估（含评分），评估结果自动持久化
- **JD 扫描** - 粘贴目标职位 JD，AI 分析匹配度并给出优化建议
- **一键优化** - AI 对整份简历所有模块进行系统性润色优化
- **面试准备** - 根据简历 + JD 生成行为面试题、技术面试题和复习要点
- **AI 隐私保护** - 所有发送简历给 AI 的入口（评估/JD 扫描/一键优化/面试准备/咨询）自动脱敏：姓名、联系方式等敏感字段替换为占位符，隐藏的模块和字段不发送；基本信息编辑器内以「AI 隐私保护」徽章标记会脱敏的字段
- **AI 智能导入** - 上传 PDF/Word/Markdown 文件，AI 解析为结构化 JSON，Zod Schema 校验，字段视图/JSON Diff 双视图预览
- **AI 智能咨询** - 右下角悬浮聊天抽屉，多轮对话记忆 + 历史会话管理（VS Code 风格标签 + 下拉历史，软删除可恢复，上限 10 条，双击标签/历史项可重命名），支持注入简历上下文（脱敏后发送）、上传文件/图片（图片走多模态 image_url、文本文件提取内容注入），流式中可随时停止生成，未配置 AI 时引导跳转设置；支持📌常驻侧栏（无遮罩边编辑边问）、左右方向切换、拖拽调宽
- **评分徽章** - 三档评分色标（≥80 优秀/≥60 良好/<60 待改进），简历卡片与评估弹窗复用
- **Token 用量追踪** - 实时显示累计输入/输出 token 用量，防抖持久化

### 桌面宠物

- **Lottie 桌宠 v仔** - 屏幕角落悬浮的 Lottie 动画桌宠，替代原咨询 FAB，陪伴整个编辑过程
- **随机说话** - 定时（45s）随机冒泡一句；保存/导出/AI 报错/进编辑器等业务节点触发即时反馈（气泡 5s 自动消失，抽屉打开时暂停）
- **交互** - 单击弹出 action 列（AI 咨询入口等），长按拖拽吸附到屏幕左/右边缘
- **自定义桌宠** - 设置面板上传自定义桌宠，支持三种素材：Lottie JSON、.lottie zip 包（fflate 解压 + 图片资源内联）、图片（GIF/APNG/WebP/PNG/SVG/AVIF）；持久化到 IndexedDB，与内置桌宠合并展示
- **桌宠回收站** - 删除的自定义桌宠进入回收站，复用简历回收站的保留期到期自动清理机制

### 我的面试

- **面试记录追踪** - 以公司 + 职位为维度记录每次面试，关联简历、JD、薪资、地点、渠道、联系人；支持多轮面试（轮次类型/时间/形式/面试官/会议链接/问题/回答/笔记）
- **三段分区** - 进行中（按下一面紧急度排序）/ 即将面试 / 已结束，分区可折叠，按关联简历筛选
- **状态流转** - 起草 / 已投递 / 面试中 / Offer / 未通过 / 已关闭六态，自动推断分区归属
- **AI 模拟面试** - 基于关联简历 + JD 生成针对性模拟面试，结果随面试记录持久化
- **面试复盘** - AI 根据记录的问题与回答生成复盘建议
- **JD 匹配扫描** - 粘贴 JD 分析匹配度，结果缓存到面试记录
- **面试足迹地图** - 基于高德地图标注面试地点并连线测距，支持「工作地点 / 面试地点」模式切换、POI 搜索、定位、全屏；保存面试时后台静默预地理编码回写经纬度，避免进地图时临时编码卡顿
- **AI 择业** - 面试记录 ≥2 条时，勾选多条面试/offer 让 AI 从薪酬福利、岗位匹配、公司前景、工作地点、面试进度五维横向对比，输出推荐公司 + 置信度 + Markdown 报告；只发送面试摘要不发送简历内容，支持联网搜索的服务商（智谱/月之暗面/通义千问）可联网核实公司背景
- **批量删除与回收站** - 批量勾选删除，删除进回收站软删除，保留期到期自动清理（复用简历回收站机制）
- **双后端持久化** - IndexedDB / 目录模式同步，与简历同骨架（shallowRef + 不可变 commit + 防抖落盘 + 页面隐藏兜底）

### Dashboard

- **两列布局** - 侧边导航 + 内容区，平板及以下自动折叠为抽屉
- **首页展示** - Hero 主视觉 + 模板轮播、AI 功能演示、特性网格、行动号召
- **模板市场** - 用户数据实时预览，每个模板展示自身主题色；无简历时默认展示
- **AI 设置面板** - 多服务商配置管理，Token 用量置顶高亮
- **目录模式同步** - 绑定本地目录后自动双向同步，支持进度显示和冲突保护
- **回收站** - 删除的简历进入回收站，保留期可配置（默认 30 天，可选 7/15/30 天），支持永久删除和清空
- **主题切换** - 浅色 / 深色 / 跟随系统三种模式，跟随系统监听 `prefers-color-scheme`
- **路由结构** - `/` 首页（展示页）、`/dashboard` 控制台（管理页）、`/editor/:id` 编辑器（编辑页）

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
| 桌宠动画 | lottie-web（Lottie 渲染）+ fflate（.lottie zip 解压） |
| 地图 | 高德地图 JS API（面试足迹地图、POI 搜索、地理编码） |
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
│   │   ├── AIImportModal.vue      # AI 智能导入模态框（文件上传 + 字段/JSON Diff 预览）
│   │   ├── TrashPanel.vue         # 简历回收站面板（恢复/永久删除/清空）
│   │   ├── InterviewPanel.vue     # 「我的面试」面板（三段分区 + 简历筛选 + 批量删除）
│   │   ├── InterviewDetail.vue    # 面试详情（轮次时间线 + AI 模拟面试/复盘/JD 扫描入口）
│   │   ├── InterviewEditForm.vue  # 面试信息编辑表单
│   │   ├── InterviewRoundEditor.vue # 面试轮次编辑（时间/形式/面试官/问题回答）
│   │   ├── InterviewCard.vue      # 面试卡片（列表项）
│   │   ├── InterviewCreateModal.vue # 新建面试方式选择弹窗
│   │   ├── InterviewAIPanel.vue   # 面试 AI 面板（模拟面试/复盘/JD 扫描）
│   │   ├── InterviewFootprintPanel.vue # 面试足迹地图（高德地图标注/连线/POI/定位/全屏）
│   │   ├── CareerChoiceModal.vue  # AI 择业弹窗（多 offer 横向对比 + 推荐置信度）
│   │   ├── PoiSearchModal.vue     # 高德 POI 搜索选址弹窗
│   │   ├── UpcomingInterviewBanner.vue # 即将面试提示横幅
│   │   ├── SettingsPanel.vue      # 通用设置面板
│   │   └── SyncOverlay.vue       # 同步遮罩（进度、冲突保护）
│   ├── editor/            # 编辑器组件
│   │   ├── sections/      # 各模块编辑组件（BasicInfo、WorkExperience…）
│   │   ├── SectionNavigator.vue  # 左侧导航 + 主题色 + 文字/间距设置
│   │   ├── SectionEditor.vue     # 右侧编辑面板
│   │   ├── AddSectionModal.vue   # 添加模块弹窗
│   │   ├── TrashBinPanel.vue     # 编辑器回收箱（卡片/模块删除恢复 + 合并冲突）
│   │   └── MergeConflictModal.vue # 回收恢复字段冲突合并弹窗
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
│   │   ├── ConsultDrawer.vue       # AI 智能咨询抽屉（多轮对话 + 历史会话 + 文件/图片附件 + 常驻侧栏）
│   │   ├── DesktopPet.vue          # Lottie 桌宠（悬浮 + 拖拽吸附 + action 列 + 说话气泡）
│   │   ├── PetPreview.vue          # 桌宠预览（设置面板内实时预览选中/上传桌宠）
│   │   ├── JDScanModal.vue         # JD 扫描模态框
│   │   ├── FullResumeOptimizeModal.vue # 一键优化模态框
│   │   ├── InterviewPrepModal.vue  # 面试准备模态框
│   │   └── ResumeEvaluationModal.vue  # AI 简历评估弹窗（流式 + 自动续写 + 持久化）
│   ├── home/              # 首页组件（ResumeCard、ImportModal）
│   └── template/          # 模板卡片组件
├── composables/
│   ├── useWorkerImageProcessor.ts # Worker 图片处理
│   ├── useSyncLock.ts            # 同步锁（防并发）
│   ├── useTheme.ts               # 主题切换（浅色/深色/跟随系统）
│   ├── useScaledPreview.ts       # 缩放预览
│   ├── useSectionTitle.ts        # 模块标题
│   ├── useFlipAnimation.ts       # FLIP 动画
│   ├── usePageBreaks.ts          # 分页计算
│   ├── useResumeSearch.ts        # 全文搜索 + 缓存
│   ├── useAriaLive.ts            # 无障碍实时播报
│   ├── useInView.ts             # 视口可见性观察
│   └── usePetRenderer.ts        # 桌宠渲染（lottie-web 加载/销毁 + img 切换 + 加载防御）
├── config/
│   ├── templates.ts       # 8 种模板配置（样式、字体默认值、头部模式）
│   ├── desktopPets.ts     # 桌宠配置（内置 v仔 + 自定义桌宠内存缓存 + lottie 校验）
│   ├── fonts.ts           # 字体选项 + 字号派生逻辑
│   └── sampleData.ts      # 示例简历数据
├── services/
│   ├── aiService.ts       # AI SSE 流式调用 + 自动续写 + 缓冲区限制（ChatMessage 支持多模态 content）
│   ├── aiPrompts.ts       # AI 操作 Prompt 模板（润色/简化/扩展/总结/帮写/翻译/定制 + JD扫描/一键优化/面试准备）
│   ├── consultPrompts.ts  # AI 咨询 Prompt（系统提示 + 简历上下文模板 + 历史压缩摘要）
│   ├── consultTokens.ts   # 咨询历史压缩辅助（token 估算 + 阈值判断 + 分段划分 + 格式化）
│   ├── aiResumeImporter.ts # AI 智能导入（JSON 提取/修复/部分恢复、Zod 校验、HTML 归一化）
│   ├── resumeSerializer.ts # 简历序列化（Resume → 结构化纯文本，供 AI 使用）
│   ├── amapService.ts     # 高德地图服务（地图渲染/标注/连线/geocode 地理编码/POI 搜索）
│   ├── careerChoicePrompts.ts # AI 择业 Prompt（五维对比 system prompt + 联网/非联网两版）
│   └── webSearchCapability.ts # 联网搜索能力（按服务商方言构建搜索请求体，aiService extraBody 透传）
├── stores/
│   ├── resumeStore.ts     # Pinia 状态管理（shallowRef + dirty flag + 评估结果持久化）
│   ├── aiConfigStore.ts   # AI 服务配置 + Token 用量追踪（防抖持久化）
│   ├── consultStore.ts     # AI 咨询会话管理（多轮记忆 + 历史压缩 + 软删除 + 附件）
│   ├── interviewStore.ts   # 「我的面试」记录管理（三段分区 + 回收站 + 双后端持久化）
│   ├── petStore.ts         # 桌宠状态（说话气泡 + 定时冒泡 + 暂停控制）
│   ├── editorLayoutStore.ts # 编辑器布局状态 + localStorage 持久化
│   └── settingsStore.ts   # 全局设置（目录模式、存储后端切换、桌宠选择）
├── types/
│   ├── resume.ts          # TypeScript 类型 + 默认常量（含 EvaluationResult）
│   ├── aiConfig.ts        # AI 服务配置类型（服务商、操作、配置接口 + 全局级操作类型）
│   ├── interview.ts       # 「我的面试」类型（Interview/InterviewRound + 三段分区推断纯函数）
│   └── consult.ts         # AI 咨询会话类型（ConsultSession/ConsultMessage/ConsultAttachment）
├── utils/
│   ├── storage.ts         # IndexedDB 适配器（含 localStorage 迁移、Blob 照片存储、toPlain）
│   ├── storageAdapter.ts  # 存储适配层（IndexedDB / 目录模式切换，复用 idb.toPlain）
│   ├── timestamp.ts       # formatTimestamp，供各导出路径复用
│   ├── colorUtils.ts      # 主题色派生（标题色、标签色等）
│   ├── evaluationScore.ts # 评估分数工具（三档色值 + 等级文案）
│   ├── resumeStyle.ts     # 简历样式工具（样式覆盖字段剥离）
│   ├── sanitizeHtml.ts    # HTML 安全过滤
│   ├── normalizeContent.ts # 内容标准化
│   ├── markdownConverter.ts # Markdown ↔ HTML 转换（marked + turndown）
│   ├── templateApply.ts   # 模板应用逻辑
│   ├── exportImage.ts     # PNG 图片导出（modern-screenshot）
│   ├── export.ts          # JSON 导出
│   ├── print.ts           # iframe 打印方案
│   ├── petUpload.ts       # 自定义桌宠上传解析（.json / .lottie zip / 图片 三路分流）
│   └── fileParser.ts      # 文件解析（PDF/DOCX/Markdown 文本提取，供 AI 导入与咨询附件复用）
├── data/
│   └── petQuotes.ts       # 桌宠话术库（分类 + 随机抽取 + {name} 占位替换）
├── plugins/
│   └── naive-ui.ts        # Naive UI 主题覆盖 + Provider 注册 + createDiscreteApi
├── workers/
│   ├── imageProcessor.worker.ts # 图片裁剪/缩放 Worker（OffscreenCanvas + convertToBlob）
│   └── types.ts                # Worker 消息类型 + 共享 requestId 计数器
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
- **项目经历** - 项目名称、角色、技术栈、描述，AI 辅助优化
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
- **导出图片** - 基于 modern-screenshot 导出高清 PNG 图片，自动处理布局适配（日期/标签不换行），文件名含时间戳
- **导出 DOCX** - 使用 docx 库生成 Word 文档，样式尽量对齐预览模板，文件名含时间戳
- **导出 JSON** - 保存为 JSON 文件，完整保留模板、主题色、文字/间距设置等全部数据

### AI 辅助功能

#### AI 帮帮

编辑器顶部的「AI 帮帮」按钮整合了四种全局级 AI 功能：

- **AI 评估** - 全模块逐一评估，生成 0-100 评分和详细建议
- **JD 扫描** - 粘贴目标职位 JD，AI 分析匹配度并给出优化建议
- **一键优化** - AI 对整份简历所有模块进行系统性润色优化
- **面试准备** - 根据简历 + JD 生成行为面试题、技术面试题和复习要点

#### 文本处理

在富文本编辑器（个人简介、工作经历、项目经历等）中，选中或输入内容后可使用 AI 操作：

- **润色** - 将口语化表述优化为专业表达，保持核心信息不变
- **简化** - 去除冗余，保留核心信息，使描述更简洁有力
- **扩展** - 基于 STAR 法则补充合理细节，用量化占位符提示用户补充数据
- **总结** - 提炼 3-5 个核心要点，生成项目符号列表
- **帮写** - 根据用户输入的要求撰写简历内容，支持自定义指令；空段落自动注入上下文
- **翻译** - 自动检测源语言，在中英文之间翻译，保持格式结构
- **定制** - 粘贴目标职位 JD，针对性优化简历内容，突出匹配度

所有操作均使用 SSE 流式实时生成，兼容 OpenAI API 格式，支持 10+ 服务商。当输出因 token 上限截断时，自动检测 `finish_reason: "length"` 并续写，确保完整输出。

#### AI 智能导入

在 Dashboard 简历列表中点击「AI 智能导入」按钮：

- **上传文件** - 支持 .pdf、.docx、.md 三种格式，可拖拽或选择文件上传
- **AI 解析** - AI 自动将文件内容解析为结构化 JSON 数据
- **数据校验** - 使用 Zod Schema 校验解析结果，自动修复常见格式问题
- **预览确认** - 提供字段视图和 JSON Diff 双视图预览，可逐项检查确认后应用

#### AI 智能咨询

页面右下角的悬浮按钮打开 AI 咨询抽屉，可与 AI 进行多轮自由对话（不限于简历内容）：

- **多轮对话** - 完整保留历史上下文，支持流式回复；历史超阈值自动压缩为摘要，避免超出上下文窗口；流式输出中可点击「停止」按钮中止生成
- **历史会话** - VS Code 风格横向标签 + 顶部历史图标下拉列表（含标题/相对时间），最多保留 10 条；点 × 关闭有对话的会话可从历史列表恢复，空会话直接删除；双击标签或历史项可重命名会话
- **简历上下文** - 点「选择简历」勾选简历（可多选），随下一条提问一起注入，让 AI 针对简历内容作答；注入的简历已自动脱敏（敏感信息替换为占位符）
- **文件/图片附件** - 标签栏左侧「+」上传图片（走多模态 image_url 原样传服务商）或文本文件（txt/md/docx/pdf 等，提取纯文本注入消息）
- **隐私保护** - 注入的简历上下文自动脱敏，姓名/联系方式等敏感字段替换为占位符，隐藏的模块和字段不会发送给 AI
- **配置引导** - 未激活任何 AI 服务商时，抽屉内显示提示并一键跳转 AI 设置面板

#### 桌面宠物

屏幕角落悬浮的 Lottie 桌宠（默认 v仔），陪伴整个编辑过程：

- **随机说话** - 每隔约 45 秒随机冒泡一句；保存简历、导出文件、AI 报错、进入编辑器等节点会即时说话反馈，气泡 5 秒自动消失
- **交互** - 单击桌宠弹出 action 列（如「AI 咨询」入口）；长按可拖拽，松手自动吸附到屏幕左/右边缘
- **自定义桌宠** - 在设置面板「桌面宠物」中选择内置桌宠或上传自定义素材，支持三种格式：Lottie JSON、.lottie zip 包、图片（GIF/APNG/WebP/PNG/SVG/AVIF）；上传后持久化保存，随时切换
- **回收站** - 删除的自定义桌宠进入回收站，到期自动清理

#### 简历评估

点击编辑器顶部「AI 评估」按钮，对整份简历进行全面分析：

- 全模块逐一评估（内容完整性、表述专业性、逻辑清晰度、信息密度、格式规范）
- 每个模块给出优点、不足、可操作建议
- 生成 0-100 总体评分，三档色标：≥80 优秀（绿）/ ≥60 良好（黄）/ <60 待改进（红）
- 评估结果自动持久化，下次打开可查看历史结果；评分以徽章形式显示在简历卡片上
- 配合自动续写，确保所有模块都能被完整评估

#### 我的面试

Dashboard 侧边「我的面试」入口，独立于简历的面试流程管理面板：

- **新建面试** - 填写公司、职位、关联简历、JD、薪资、地点、渠道、联系人等信息
- **多轮面试** - 一条面试记录下添加多轮（一面/二面/HR面/终面/加面…），每轮记录时间、形式（现场/视频/电话）、面试官、会议链接、面试问题与回答、笔记
- **三段分区** - 进行中（按下一面时间紧急度排序，无安排垫底）/ 即将面试 / 已结束，每个分区可单独折叠，顶部可按关联简历筛选
- **状态管理** - 起草 → 已投递 → 面试中 → Offer/未通过/已关闭，状态决定分区归属
- **AI 模拟面试** - 在面试详情页发起，基于关联简历 + JD 生成针对性模拟面试题，结果缓存到该面试记录
- **面试复盘** - AI 根据记录的面试问题与回答生成复盘建议
- **JD 匹配扫描** - 粘贴目标 JD，AI 分析匹配度并打分，结果随面试记录保存
- **批量删除** - 切换批量模式勾选多条删除；删除进入回收站，保留期内可恢复

#### 面试足迹

「我的面试」内的「面试足迹」入口，基于高德地图可视化面试地点分布：

- **地图标注与连线** - 把有地点的面试标注在地图上并连线测距，直观呈现面试地理分布
- **地点模式切换** - 「工作地点 / 面试地点」两种模式，分别标注对应类型的地点，无该类地点的面试静默跳过
- **POI 搜索** - 在编辑面试地点时可搜索高德 POI 选址（需在设置里配置高德 Key）
- **定位与全屏** - 支持地图定位到当前位置、全屏查看
- **预地理编码** - 保存面试时若地点有文本但无经纬度，后台静默编码回写，进地图时无需临时编码

> 面试足迹依赖高德地图 JS API，需在设置面板「地图」区填入高德 Key（设置内附获取教程链接）。

#### AI 择业

「我的面试」面板顶部，当面试记录 ≥2 条时出现「AI 择业」按钮，多 offer 横向对比：

- **五维对比** - 从薪酬福利、岗位匹配、公司前景、工作地点、面试进度五个维度横向对比勾选的面试/offer
- **推荐与置信度** - 输出「推荐：公司（置信度 N%）」首行 + Markdown 报告（综合对比表 / 逐项分析 / 推荐理由 / 风险提示），推荐圆环颜色随置信度变化
- **隐私保护** - 只发送公司/岗位/薪资/地点/JD/福利/状态/轮次摘要，不发送关联简历、联系方式、面试问答
- **联网搜索增强** - 当前服务商支持联网时（智谱/月之暗面/通义千问），AI 可联网核实公司背景；不支持时仅基于资料比较

#### 回收站

删除的简历和编辑器内的卡片/模块均不会立即丢失：

- **简历回收站**（Dashboard 侧边「回收站」入口）— 删除的简历保留 7/15/30 天（设置面板可配置，默认 30 天），到期自动清理；支持单条恢复、永久删除和清空
- **编辑器回收箱**（预览区「预览 / 回收箱」Tab 切换）— 工作经历、教育经历、项目经历、技能的卡片，以及自我评价等模块删除后进入回收箱，保留 7 天，可查看内容后恢复或彻底删除
- **合并冲突处理** - 恢复时若原位置已有同名字段，弹出合并弹窗逐字段选择保留原值 / 用回收值 / 合并两者

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
- **Web Worker** - 图片处理在 Worker 线程完成（OffscreenCanvas 编码），不阻塞主线程
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
| 编辑器进入 INP | 骨架屏过渡、预览区分帧渲染、AI 弹窗懒挂载、store 并行初始化 |
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

### AI 智能咨询架构

咨询是独立路径，**绕过 `buildMessages`**，直接构造完整 messages 数组调用 `streamChat`：

```
用户提问（可选附带简历上下文 + 文件/图片附件）
  → consultStore.sendMessage（构造 system + 历史 + 当轮 messages）
    → consultPrompts（系统提示 + 简历上下文模板 + 历史压缩摘要）
    → aiService.streamChat（SSE 流式 + 自动续写）
      → 流式 Markdown 回写抽屉对话区
```

- **会话持久化**：`consultStore` 管理 `sessions`（shallowRef，IndexedDB `consultSessions` store，上限 10 条），assistant 消息立即落盘（不走防抖，防刷新丢失）；`commitSession` 生成新数组引用触发响应式
- **软删除**：`ConsultSession.closed` 标记已从标签栏关闭但保留在历史列表，可点击恢复；空会话（无对话）关闭时真删除
- **历史压缩**：`consultTokens.ts` 估算 token（多模态 content 按文本长度估算），超阈值调一次非流式 `streamChat` 把旧段压缩为 `history-summary` 摘要注入前置消息，原始消息归档备份
- **多模态**：`ChatMessage.content` 为 `string | ContentPart[]`，带图片附件的 user 消息以 `[{type:'text'}, {type:'image_url'}]` 数组发送；文本文件提取纯文本注入消息文本；压缩格式化时图片占位为 `[图片]`
- **配置引导**：未激活 AI 服务商时 `ConsultDrawer` 显示提示并跳转 `/dashboard?tab=ai`

### 桌面宠物架构

桌宠是独立 UI 模块，悬浮于全局，与 AI 咨询抽屉联动（桌宠单击 action 列触发 `open` 事件打开咨询）：

```
DesktopPet.vue（悬浮 + 拖拽吸附 + action 列）
  → usePetRenderer（lottie-web 加载/销毁，img 直接 <img>，加载失败防御）
  → petStore（说话状态汇聚：currentQuote + 定时冒泡 + 暂停）
    → petQuotes.ts（分类话术 + 随机抽取）
  → desktopPets.ts（内置 v仔 + 自定义桌宠内存缓存合并）
```

- **渲染**：`usePetRenderer` 按 `type` 分流——lottie 用 lottie-web `loadAnimation`，img 用 `<img src>`；切换桌宠时销毁旧实例，加载异常降级不崩
- **说话**：`petStore` 是状态汇聚点，各业务点（保存/导出/AI 报错/进编辑器）调 `say()`；定时 45s 随机冒泡，单句 5s 自动消失；抽屉打开时 `setPaused(true)` 暂停
- **自定义上传**：`petUpload.ts` 三路分流——.json 直接 Lottie 对象、.lottie 用 fflate 解压 + 图片资源内联为 data URL、图片转 data URL；通过 `storageAdapter` 持久化到 IndexedDB，store 启动时 `setCustomPetsCache` 注入内存缓存
- **回收站复用**：自定义桌宠删除后带 `deletedAt` 进入回收站，复用简历回收站的保留期到期清理逻辑

## License

Apache-2.0
