<template>
  <div class="rich-text-editor" :class="{ 'rich-text-editor--not-interacted': !interacted }">
    <label v-if="label" class="rich-text-editor__label">{{ label }}</label>
    <div v-if="editor" class="rich-text-editor__wrapper" :class="{ 'rich-text-editor__wrapper--focused': focused }" @mousedown="focusEditor">
      <div class="rich-text-editor__toolbar">
        <!-- 撤销/重做 -->
        <button type="button" class="toolbar-btn" title="撤销" :disabled="!editor.can().undo()" @click="editor.chain().focus().undo().run()">
          <Icon icon="mdi:undo" :width="18" />
        </button>
        <button type="button" class="toolbar-btn" title="重做" :disabled="!editor.can().redo()" @click="editor.chain().focus().redo().run()">
          <Icon icon="mdi:redo" :width="18" />
        </button>
        <span class="toolbar-divider" />

        <!-- 文本格式 -->
        <button type="button" class="toolbar-btn" :class="{ 'is-active': editor.isActive('bold') }" title="粗体" @click="editor.chain().focus().toggleBold().run()">
          <Icon icon="mdi:format-bold" :width="18" />
        </button>
        <button type="button" class="toolbar-btn" :class="{ 'is-active': editor.isActive('italic') }" title="斜体" @click="editor.chain().focus().toggleItalic().run()">
          <Icon icon="mdi:format-italic" :width="18" />
        </button>
        <button type="button" class="toolbar-btn" :class="{ 'is-active': editor.isActive('underline') }" title="下划线" @click="editor.chain().focus().toggleUnderline().run()">
          <Icon icon="mdi:format-underline" :width="18" />
        </button>
        <button type="button" class="toolbar-btn" :class="{ 'is-active': editor.isActive('strike') }" title="删除线" @click="editor.chain().focus().toggleStrike().run()">
          <Icon icon="mdi:format-strikethrough" :width="18" />
        </button>
        <span class="toolbar-divider" />

        <!-- 颜色 -->
        <NPopover trigger="click" placement="bottom" :width="272">
          <template #trigger>
            <button type="button" class="toolbar-btn" :class="{ 'is-active': currentFontColor }" title="文字颜色">
              <Icon icon="mdi:format-color-text" :width="18" />
              <span v-if="currentFontColor" class="toolbar-btn__color-bar" :style="{ background: currentFontColor }" />
            </button>
          </template>
          <div class="color-palette">
            <div class="color-palette__swatches">
              <button class="color-palette__swatch color-palette__swatch--clear" title="去除颜色" @click="onFontColorClear">
                <Icon icon="mdi:close" :width="12" />
              </button>
              <button
                v-for="color in FONT_PRESET_COLORS"
                :key="color"
                class="color-palette__swatch"
                :class="{ 'color-palette__swatch--active': currentFontColor === color }"
                :style="{ background: color }"
                :title="color"
                @click="onFontColorChange(color)"
              />
            </div>
            <n-color-picker
              :value="currentFontColor || '#000000'"
              size="small"
              :show-alpha="false"
              :modes="['hex']"
              @update:value="onFontColorChange"
            />
          </div>
        </NPopover>
        <NPopover trigger="click" placement="bottom" :width="272">
          <template #trigger>
            <button type="button" class="toolbar-btn" :class="{ 'is-active': currentBgColor }" title="背景颜色">
              <Icon icon="mdi:format-color-fill" :width="18" />
              <span v-if="currentBgColor" class="toolbar-btn__color-bar" :style="{ background: currentBgColor }" />
            </button>
          </template>
          <div class="color-palette">
            <div class="color-palette__swatches">
              <button class="color-palette__swatch color-palette__swatch--clear" title="去除颜色" @click="onBgColorClear">
                <Icon icon="mdi:close" :width="12" />
              </button>
              <button
                v-for="color in BG_PRESET_COLORS"
                :key="color"
                class="color-palette__swatch"
                :class="{ 'color-palette__swatch--active': currentBgColor === color }"
                :style="{ background: color }"
                :title="color"
                @click="onBgColorChange(color)"
              />
            </div>
            <n-color-picker
              :value="currentBgColor || '#ffffff'"
              size="small"
              :show-alpha="false"
              :modes="['hex']"
              @update:value="onBgColorChange"
            />
          </div>
        </NPopover>
        <span class="toolbar-divider" />

        <!-- 对齐 -->
        <button type="button" class="toolbar-btn" :class="{ 'is-active': editor.isActive({ textAlign: 'left' }) }" title="左对齐" @click="editor.chain().focus().setTextAlign('left').run()">
          <Icon icon="mdi:format-align-left" :width="18" />
        </button>
        <button type="button" class="toolbar-btn" :class="{ 'is-active': editor.isActive({ textAlign: 'center' }) }" title="居中" @click="editor.chain().focus().setTextAlign('center').run()">
          <Icon icon="mdi:format-align-center" :width="18" />
        </button>
        <button type="button" class="toolbar-btn" :class="{ 'is-active': editor.isActive({ textAlign: 'right' }) }" title="右对齐" @click="editor.chain().focus().setTextAlign('right').run()">
          <Icon icon="mdi:format-align-right" :width="18" />
        </button>
        <span class="toolbar-divider" />

        <!-- 列表 -->
        <button type="button" class="toolbar-btn" :class="{ 'is-active': editor.isActive('bulletList') }" title="无序列表" @click="editor.chain().focus().toggleBulletList().run()">
          <Icon icon="mdi:format-list-bulleted" :width="18" />
        </button>
        <button type="button" class="toolbar-btn" :class="{ 'is-active': editor.isActive('orderedList') }" title="有序列表" @click="editor.chain().focus().toggleOrderedList().run()">
          <Icon icon="mdi:format-list-numbered" :width="18" />
        </button>
        <button type="button" class="toolbar-btn" :class="{ 'is-active': editor.isActive('taskList') }" title="待办清单" @click="editor.chain().focus().toggleTaskList().run()">
          <Icon icon="mdi:checkbox-marked-outline" :width="18" />
        </button>
        <span class="toolbar-divider" />

        <!-- 链接 -->
        <button type="button" class="toolbar-btn" :class="{ 'is-active': editor.isActive('link') }" title="添加链接" @click="onAddLink">
          <Icon icon="mdi:link-variant" :width="18" />
        </button>
        <button v-if="editor.isActive('link')" type="button" class="toolbar-btn" title="移除链接" @click="editor.chain().focus().unsetLink().run()">
          <Icon icon="mdi:link-off" :width="18" />
        </button>
        <span class="toolbar-divider" />

        <!-- 清除样式 -->
        <button type="button" class="toolbar-btn" title="清除样式" @click="onClearFormat">
          <Icon icon="mdi:format-clear" :width="18" />
        </button>
        <!-- 图片（仅 allowImage，手账笔记用） -->
        <template v-if="allowImage">
          <span class="toolbar-divider" />
          <button type="button" class="toolbar-btn" title="插入图片" :disabled="imageInserting" @click="onPickImage">
            <Icon icon="mdi:image-outline" :width="18" />
          </button>
        </template>
      </div>

      <!-- AI 操作按钮：只显示一个「AI帮写」入口 -->
      <AIButtonGroup
        v-if="showAIBtns"
        :current-operation="currentAIOperation"
        :has-active-config="!!aiConfigStore.activeConfig"
        :disabled="disabled"
        @operation="handleAIOperation"
        @go-settings="goToAISettings"
      />

      <!-- 查找替换栏 -->
      <FindReplaceBar
        :editor="editor ?? null"
        :show="showFindReplace"
        @close="showFindReplace = false"
      />

      <EditorContent :editor="editor" class="rich-text-editor__body" :style="{ minHeight }" />

      <!-- 字数统计 -->
      <div v-if="editor" class="rich-text-editor__count">
        {{ charCount }} 字符 · {{ wordCount }} 词
      </div>
    </div>
    <span v-if="error" class="rich-text-editor__error">{{ error }}</span>

    <!-- AI 结果预览弹窗 -->
    <AIResultPreview
      :visible="showAIPreview"
      :config="aiConfigStore.activeConfig ?? null"
      :operation="currentAIOperation"
      :original-text="aiOriginalText"
      :prefilled-instruction="props.aiContext"
      :scene="aiScene"
      @close="onAIPreviewClose"
      @apply="applyAIResult"
    />

    <!-- 链接输入弹窗 -->
    <LinkInputModal
      :show="showLinkModal"
      :initial-url="linkModalInitialUrl"
      @close="showLinkModal = false"
      @confirm="onLinkConfirm"
      @remove="onLinkRemove"
    />

    <!-- 图片上传（隐藏 file input，仅 allowImage） -->
    <input
      v-if="allowImage"
      ref="imageInputRef"
      type="file"
      accept="image/*"
      class="rich-text-editor__image-input"
      @change="onImageInputChange"
    >
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onBeforeUnmount, nextTick } from 'vue'
import { useEditor, EditorContent } from '@tiptap/vue-3'
import Placeholder from '@tiptap/extension-placeholder'
import Image from '@tiptap/extension-image'
import { CORE_TIPTAP_EXTENSIONS } from '@/config/tiptapExtensions'
import { Icon } from '@iconify/vue'
import { normalizeContent } from '@/utils/normalizeContent'
import { compressUploadedImage } from '@/utils/imageCompression'
import { useWorkerImageProcessor } from '@/composables/useWorkerImageProcessor'
import { NColorPicker, NPopover } from 'naive-ui'
import { message as naiveMessage } from '@/plugins/naive-ui'
import { useRouter } from 'vue-router'
import { useAIConfigStore } from '@/stores/aiConfigStore'
import type { AIOperation } from '@/types/aiConfig'
import { htmlToMarkdown } from '@/utils/markdownConverter'
import { sanitizeHtml } from '@/utils/sanitizeHtml'
import AIButtonGroup from '@/components/ai/AIButtonGroup.vue'
import AIResultPreview from '@/components/ai/AIResultPreview.vue'
import LinkInputModal from '@/components/common/LinkInputModal.vue'
import FindReplaceBar from '@/components/common/FindReplaceBar.vue'
import { ResizableImageView } from '@/components/common/ResizableImageView'

const props = withDefaults(defineProps<{
  label?: string
  placeholder?: string
  modelValue?: string
  disabled?: boolean
  rows?: number
  error?: string
  showAIBtns?: boolean
  aiContext?: string
  /** AI 场景：resume 简历（默认）/ journal 求职手账（去简历化 prompt，隐藏 tailor） */
  aiScene?: 'resume' | 'journal'
  /** 允许插入图片（仅手账笔记用；简历 section 不开）。开启后工具栏出现图片按钮，并支持粘贴/拖拽图片（均经 worker 压缩） */
  allowImage?: boolean
}>(), {
  rows: 3,
  showAIBtns: true,
  aiScene: 'resume',
  allowImage: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const router = useRouter()
const aiConfigStore = useAIConfigStore()

const minHeight = computed(() => {
  const rowHeight = 24
  const padding = 32
  return `${props.rows * rowHeight + padding}px`
})

const FONT_PRESET_COLORS = [
  '#ffffff', '#1c1917', '#78716c', '#dc2626', '#ea580c', '#ca8a04',
  '#16a34a', '#2563eb', '#7c3aed', '#db2777', '#0891b2', '#4f46e5', '#f97316',
]
const BG_PRESET_COLORS = [
  '#ffffff', '#fef08a', '#bbf7d0', '#bfdbfe', '#e9d5ff', '#fecdd3',
  '#fed7aa', '#ccfbf1', '#e2e8f0', '#fce7f3', '#dbeafe', '#d9f99d', '#fde68a',
]

const currentFontColor = ref('')
const currentBgColor = ref('')

// AI 相关状态
const currentAIOperation = ref<AIOperation | null>(null)
const showAIPreview = ref(false)
const aiOriginalText = ref('')

// 链接弹窗状态
const showLinkModal = ref(false)
const linkModalInitialUrl = ref('')

// 查找替换状态
const showFindReplace = ref(false)

// 字数统计
const charCount = ref(0)
const wordCount = ref(0)

/** 根据文本内容更新字符/词数统计 */
const updateWordCount = (text: string) => {
  charCount.value = text.length
  const chineseChars = (text.match(/\p{Script=Han}/gu) || []).length
  const englishWords = text.replace(/\p{Script=Han}/gu, ' ').trim().split(/\s+/).filter(Boolean).length
  wordCount.value = chineseChars + englishWords
}

// 编辑器聚焦状态
const focused = ref(false)

// ponytail: 首次交互前压制图片调节点显示。
// 文档开头是图片时，ProseMirror 初始化/首次 focus 会瞬间 NodeSelection 选中开头 atom 图片，
// 触发 selectNode → ProseMirror-selectednode → 调节点 opacity:0→1 淡入又淡出（"出现又消失"）。
// 用 interacted 标志在首次用户交互前强制隐藏手柄；首次 mousedown/keydown 后释放，正常显示。
const interacted = ref(false)

// 点击编辑器区域时聚焦到 ProseMirror
// ponytail: 仅对工具栏/count 等 wrapper 内的非内容区空白调 focus()。
// 落在 .ProseMirror 内容区（含图片）的点击必须放行——ProseMirror 原生 mousedown→click
// 负责光标定位和图片 NodeSelection，这里抢先 focus() 会冲掉选区/干扰定位，
// 导致图片要点多次才出调节点、图片右侧空白点击不聚焦光标。
const focusEditor = (e: MouseEvent) => {
  const target = e.target as HTMLElement
  if (target.closest('button, a, input, [contenteditable="true"]')) return
  if (target.closest('.ProseMirror')) return
  editor.value?.commands.focus()
}

// 内部更新标志：防止 onUpdate → emit → watch → setContent 的循环
let isInternalUpdate = false

const editor = useEditor({
  content: normalizeContent(props.modelValue),
  extensions: [
    ...CORE_TIPTAP_EXTENSIONS,
    // 仅手账开 allowImage 时加载——Image 不进 CORE（CORE 被 fullResumeOptimizer 共用，简历不能插图）
    // 自定义 NodeView 全接管（ResizableImageView）：根治三个 bug——
    // ① 自带 ResizableNodeView 的 onUpdate 不更新 el.src，setContent 后 src 错乱（第一张变第二张）
    // ② Tiptap getRenderedAttributes 不含 options.HTMLAttributes，自带 NodeView 的 img 拿不到 class
    // ③ 自定义 stopEvent 让手柄拖拽不被 ProseMirror 拦截，选中/光标定位可靠
    // atom:true 让 ProseMirror 把图片当原子节点，默认 selectClickedLeaf 用 inside 选中，无需自定义 handleClick
    // ImageOptions 接口无 atom 字段，用 extend 覆盖 Node spec 的 atom() + addNodeView()
    ...(props.allowImage
      ? [Image.extend({
          atom: true,
          addNodeView() {
            return ({ node, getPos, HTMLAttributes }) => {
              // ponytail: HTMLAttributes 参数含 src/alt/title（getRenderedAttributes 结果），
              // 但不含 class —— class 在 ResizableImageView 内手动设
              void HTMLAttributes
              return new ResizableImageView({
                editor: this.editor,
                node,
                getPos,
                HTMLAttributes,
              })
            }
          },
        }).configure({
          inline: false,
          allowBase64: true,
          HTMLAttributes: { class: 'rich-text-image' },
        })]
      : []),
    Placeholder.configure({
      placeholder: props.placeholder || '',
    }),
  ],
  editable: !props.disabled,
  editorProps: {
    attributes: {
      class: 'rich-text-editor__content',
      // ponytail: contenteditable 默认无可访问名称，屏幕阅读器只读到"编辑区"
      'aria-label': props.label || '富文本编辑区',
    },
    handleKeyDown: (_view, event) => {
      // Tab 键：插入 4 个真实空格（U+0020），而非 NBSP
      // 真实空格配合 white-space: pre-wrap 可以在边界自动换行
      if (event.key === 'Tab') {
        event.preventDefault()
        if (editor.value) {
          editor.value.chain().focus().insertContent('    ').run()
        }
        return true
      }
      // Ctrl+F：打开查找替换
      if ((event.ctrlKey || event.metaKey) && event.key === 'f') {
        event.preventDefault()
        showFindReplace.value = true
        return true
      }
      return false
    },
    // ponytail: 粘贴/拖拽图片拦截——Tiptap Image 默认 paste 会直接塞原图 base64（不压缩），
    // 这里拦截纯图片粘贴/拖拽，走 worker 压缩后再 setImage。
    // 若剪贴板同时含文本（如从网页复制图文），放行默认行为避免吞文字（图片可能丢，文字保留）
    handlePaste: (_view, event) => {
      if (!props.allowImage) return false
      const data = event.clipboardData
      if (!data) return false
      const hasText = data.getData('text/plain') || data.getData('text/html')
      if (hasText) return false
      const file = pickImageFromClipboard(data)
      if (file) {
        event.preventDefault()
        void insertImageFromFile(file)
        return true
      }
      return false
    },
    handleDrop: (_view, event) => {
      if (!props.allowImage) return false
      const file = pickImageFromFileList(event.dataTransfer)
      if (file) {
        event.preventDefault()
        void insertImageFromFile(file)
        return true
      }
      return false
    },
    // 图片选中：Image 配了 atom:true，ProseMirror 默认 selectClickedLeaf 用 inside 选中图片节点，
    // 无需自定义 handleClick（pos 不可靠，已移除）
  },
  onCreate: ({ editor }) => {
    // 初始化字数统计（编辑器创建时内容已就绪）
    updateWordCount(editor.state.doc.textContent)
    // ponytail: 文档开头若是 atom 节点（如纯图片笔记），ProseMirror 首次 focus 会把选区
    // 设到文档开头并选中该 atom 节点（NodeSelection）——图片被默认选中、调节点弹出。
    // 把初始选区设到文档末尾，首次 focus 光标落在末尾而非选中开头的图片。
    const firstChild = editor.state.doc.firstChild
    if (firstChild?.isAtom) {
      editor.commands.setTextSelection(editor.state.doc.content.size)
    }
  },
  onUpdate: ({ editor }) => {
    // Tiptap getHTML() 可能在尾部产生空段落（<p></p>），
    // 剔除它们避免描述区域末尾出现多余空行，导致 entry__desc 和 entry__tags 之间间距变大
    const rawHtml = editor.getHTML()
    const cleanedHtml = rawHtml.replace(/(?:<p>(?:\s|&nbsp;)*<\/p>\s*)+$/i, '')
    // 标记为内部更新，防止 watch 中的 setContent 循环
    isInternalUpdate = true
    emit('update:modelValue', cleanedHtml)
    // 使用 nextTick 后重置标志，确保 Vue 响应式更新完成
    nextTick(() => { isInternalUpdate = false })
    updateWordCount(editor.state.doc.textContent)
  },
  onFocus: () => { focused.value = true },
  onBlur: () => { focused.value = false },
})

// ponytail: 首次用户交互（mousedown/keydown 进内容区）前 interacted=false，
// CSS 压制图片调节点显示，杜绝初始化瞬间"四角调节点出现又消失"。
// capture 阶段抢在 ProseMirror 处理前标记，确保首次点图片时标志已翻转、调节点正常显示。
// immediate:useEditor 异步创建，确保 editor 就绪即挂监听，不漏首次。
let markInteractedCleanup: (() => void) | null = null
watch(editor, (ed) => {
  markInteractedCleanup?.()
  if (!ed) return
  const dom = ed.view.dom
  const mark = () => { interacted.value = true; cleanup() }
  const cleanup = () => {
    dom.removeEventListener('mousedown', mark, true)
    dom.removeEventListener('keydown', mark, true)
    markInteractedCleanup = null
  }
  dom.addEventListener('mousedown', mark, true)
  dom.addEventListener('keydown', mark, true)
  markInteractedCleanup = cleanup
}, { immediate: true })

// ========== AI 操作 ==========

// ponytail: AI 操作期间临时存放从正文剥离的图片 src，applyAIResult 时按占位符回填。
// 仅 allowImage 时才可能有图片；简历场景此数组恒空，剥离/回填为 no-op。
const aiPendingImages = ref<string[]>([])
// 占位符：带编号，给 AI 语义提示「此处有图」，同时便于回填按序匹配
const buildPlaceholder = (n: number) => `〔图片${n}〕`

/** 从 HTML 中剥离所有 <img>，替换成带编号占位符文本，返回剥离后的 HTML 与图片 src 列表 */
const stripImagesForAI = (html: string): { text: string; images: string[] } => {
  if (!props.allowImage || !html) return { text: html, images: [] }
  const images: string[] = []
  // ponytail: 粗暴正则抠 img src——AI 链路不要求精确 DOM 解析，避免引入 DOMParser
  const text = html.replace(/<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi, (_m, src: string) => {
    images.push(src)
    return buildPlaceholder(images.length)
  })
  return { text, images }
}

const imgTag = (src: string) => `<img src="${src}" alt="" class="rich-text-image">`

/** 把 HTML 文本里的占位符按序替换回 <img> 标签；多余的图片兜底附末尾，不丢图。
 *  占位符被 marked 包在 <p> 内，而 Image 是块级节点不能嵌于 <p>，故替换时断开段落 */
const reinsertImages = (html: string, images: string[]): string => {
  if (!images.length) return html
  let idx = 0
  const takeImg = () => (idx < images.length ? imgTag(images[idx++]) : '')

  // 先处理「整段只有占位符」：<p>〔图片N〕</p> → <img>
  let result = html.replace(/<p>\s*〔图片\d+〕\s*<\/p>/gi, () => takeImg())

  // 再处理「占位符与文字混排」：<p>前文〔图片N〕后文</p> → <p>前文</p><img><p>后文</p>
  result = result.replace(/<p>([\s\S]*?)<\/p>/gi, (m, inner: string) => {
    if (!/〔图片\d+〕/.test(inner)) return m
    const parts: string[] = []
    let last = 0
    for (const match of inner.matchAll(/〔图片\d+〕/g)) {
      const before = inner.slice(last, match.index!)
      if (before.trim()) parts.push(`<p>${before}</p>`)
      const img = takeImg()
      if (img) parts.push(img)
      last = match.index! + match[0].length
    }
    const after = inner.slice(last)
    if (after.trim()) parts.push(`<p>${after}</p>`)
    return parts.join('') || m
  })

  // 占位符少于图片（AI 删了部分占位符）：剩余图片附末尾，避免丢失
  if (idx < images.length) {
    result += images.slice(idx).map(imgTag).join('')
  }
  return result
}

const handleAIOperation = (operation: AIOperation) => {
  if (!aiConfigStore.activeConfig) {
    naiveMessage.warning('请先配置 AI 服务')
    return
  }

  // 剥离图片：AI 只处理文字 + 占位符，base64 不进 prompt（省 token），图片在 apply 时回填
  const { text, images } = stripImagesForAI(editor.value?.getHTML() || '')
  aiPendingImages.value = images
  aiOriginalText.value = htmlToMarkdown(text)
  currentAIOperation.value = operation
  showAIPreview.value = true
}

const onAIPreviewClose = () => {
  showAIPreview.value = false
  // 关闭弹窗时清除当前操作状态，避免按钮图标继续转圈
  currentAIOperation.value = null
  aiPendingImages.value = []
}

const applyAIResult = (html: string) => {
  if (!editor.value) return
  const safeHtml = normalizeContent(sanitizeHtml(html))
  // 回填图片：占位符是纯文本，sanitize 不会动；img 标签在此步后才插入，绕过 sanitize 白名单
  const withImages = reinsertImages(safeHtml, aiPendingImages.value)
  editor.value.commands.setContent(withImages)
  // 取 Tiptap 规范化后的 HTML，确保格式一致
  const normalizedHtml = editor.value.getHTML()
  emit('update:modelValue', normalizedHtml)
  currentAIOperation.value = null
  aiPendingImages.value = []
  naiveMessage.success('已应用 AI 生成结果')
}

const goToAISettings = () => {
  router.push({ path: '/dashboard', query: { tab: 'ai' } })
}

// ========== 图片插入（仅 allowImage） ==========

const { resizeImage } = useWorkerImageProcessor()
const imageInputRef = ref<HTMLInputElement | null>(null)
const imageInserting = ref(false)

/** 从剪贴板 DataTransfer 取首个图片文件，无则 null */
const pickImageFromClipboard = (data: DataTransfer | null): File | null => {
  if (!data) return null
  for (const item of data.items) {
    if (item.type.startsWith('image/')) {
      return item.getAsFile()
    }
  }
  return null
}

/** 从拖拽 DataTransfer 取首个图片文件，无则 null */
const pickImageFromFileList = (data: DataTransfer | null): File | null => {
  if (!data) return null
  const file = data.files?.[0]
  return file && file.type.startsWith('image/') ? file : null
}

/** 读 File → 压缩成 WebP → 在当前选区插入图片。压缩失败则提示 */
const insertImageFromFile = async (file: File) => {
  if (!editor.value || imageInserting.value) return
  imageInserting.value = true
  try {
    const rawDataUrl = await fileToDataUrl(file)
    // 复用照片上传压缩管线：resize 到 800px + 逐步降质量到 500KB 以下，输出 WebP（体积比 JPEG 小约 30%）
    const compressed = await compressUploadedImage(rawDataUrl, resizeImage, undefined, undefined, 'image/webp')
    editor.value.chain().focus().setImage({ src: compressed }).run()
  } catch (e) {
    console.error('[RichTextEditor] 图片插入失败:', e)
    naiveMessage.error('图片插入失败，请重试')
  } finally {
    imageInserting.value = false
  }
}

const fileToDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('图片读取失败'))
    reader.readAsDataURL(file)
  })

/** 工具栏「图片」按钮：触发隐藏 file input */
const onPickImage = () => {
  imageInputRef.value?.click()
}

/** file input change：取首个文件插入，随后清空 value 允许重复选同一文件 */
const onImageInputChange = (e: Event) => {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) void insertImageFromFile(file)
  input.value = ''
}

// ========== 原有逻辑 ==========

const onFontColorChange = (color: string) => {
  currentFontColor.value = color
  editor.value?.chain().focus().setColor(color).run()
}

const onFontColorClear = () => {
  currentFontColor.value = ''
  editor.value?.chain().focus().unsetColor().run()
}

const onBgColorChange = (color: string) => {
  currentBgColor.value = color
  editor.value?.chain().focus().toggleHighlight({ color }).run()
}

const onBgColorClear = () => {
  currentBgColor.value = ''
  editor.value?.chain().focus().unsetHighlight().run()
}

const onClearFormat = () => {
  if (!editor.value) return
  editor.value.chain().focus()
    .unsetBold()
    .unsetItalic()
    .unsetUnderline()
    .unsetStrike()
    .unsetColor()
    .unsetHighlight()
    .unsetLink()
    .setTextAlign('left')
    .run()
  currentFontColor.value = ''
  currentBgColor.value = ''
}

const onAddLink = () => {
  if (!editor.value) return
  linkModalInitialUrl.value = editor.value.getAttributes('link').href || ''
  showLinkModal.value = true
}

const onLinkConfirm = (url: string) => {
  showLinkModal.value = false
  if (!editor.value) return
  editor.value.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
}

const onLinkRemove = () => {
  showLinkModal.value = false
  if (!editor.value) return
  editor.value.chain().focus().extendMarkRange('link').unsetLink().run()
}

watch(() => props.modelValue, (newVal) => {
  if (!editor.value) return
  // 方案 A：内部更新触发的 props 变化，跳过 setContent 避免循环
  if (isInternalUpdate) return
  // 方案 B：对称化比较 — 对 currentHTML 也做同样的尾部空段落剔除后再比较
  // 避免因标准化差异导致不必要的 setContent（会丢失光标位置）
  const currentHTML = editor.value.getHTML()
  const normalizedCurrent = currentHTML.replace(/(?:<p>(?:\s|&nbsp;)*<\/p>\s*)+$/i, '')
  const normalizedNew = (newVal || '').replace(/(?:<p>(?:\s|&nbsp;)*<\/p>\s*)+$/i, '')
  if (normalizedNew !== normalizedCurrent) {
    editor.value.commands.setContent(normalizeContent(newVal) || '')
  }
})

watch(() => props.disabled, (val) => {
  editor.value?.setOptions({ editable: !val })
})

onBeforeUnmount(() => {
  markInteractedCleanup?.()
  editor.value?.destroy()
})
</script>

<style lang="scss" scoped>
.rich-text-editor {
  margin-bottom: $spacing-md;

  &__label {
    display: block;
    font-size: $font-size-sm;
    font-weight: 600;
    color: $text-primary;
    margin-bottom: $spacing-sm;
  }

  // ponytail: 首次交互前压制图片调节点——ProseMirror 初始化瞬间会选中开头 atom 图片
  // 触发 selectNode，导致四角手柄 opacity 淡入又淡出。interacted 标志在用户首次
  // mousedown/keydown 后才置 true，此前强制隐藏手柄并去掉 transition 杜绝闪烁。
  &--not-interacted {
    :deep([data-resize-container] [data-resize-handle]) {
      opacity: 0 !important;
      transition: none !important;
    }
  }

  &__wrapper {
    @include input-base;
    padding: 0;
    display: flex;
    flex-direction: column;
    resize: vertical;
    overflow: hidden;

    // 替代 mixin 中无效的 :focus（div 不可聚焦），用 :focus-within 和手动 class
    &:focus {
      outline: none;
      border-color: $border-glass;
      background: $bg-glass;
      box-shadow: none;
    }

    &:focus-within,
    &--focused {
      outline: none;
      border-color: $primary-color;
      background: var(--editor-bg);
      box-shadow: 0 0 0 2px rgba($primary-color, 0.15);

      // ponytail: 聚焦时工具栏同步变黄，蓝框内铺满黄色
      .rich-text-editor__toolbar {
        background: var(--editor-bg);
      }
    }
  }

  &__toolbar {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 2px;
    padding: $spacing-xs $spacing-sm;
    background: $bg-glass;
    border-bottom: 1px solid $border-glass;
    border-radius: $radius-lg $radius-lg 0 0;
    flex-shrink: 0;
  }

  &__body {
    flex: 1;
    padding: $spacing-md;
    overflow-y: auto;
    background: var(--editor-bg);
    display: flex;
    flex-direction: column;
  }

  &__count {
    padding: 2px $spacing-sm;
    font-size: 11px;
    color: $text-light;
    text-align: right;
    border-top: 1px solid $border-glass;
    font-variant-numeric: tabular-nums;
  }

  &__error {
    display: block;
    font-size: $font-size-xs;
    color: $error-color;
    margin-top: $spacing-xs;
  }

  &__image-input {
    display: none;
  }
}

.toolbar-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  background: transparent;
  color: $text-secondary;
  border: none;
  border-radius: $radius-md;
  cursor: pointer;
  transition: all $transition-fast;
  flex-shrink: 0;
  position: relative;

  &:hover:not(:disabled) {
    background: rgba($text-secondary, 0.15);
  }

  &.is-active {
    background: rgba($primary-color, 0.2);
    color: $primary-light;
  }

  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  &__color-bar {
    position: absolute;
    bottom: 2px;
    left: 5px;
    right: 5px;
    height: 3px;
    border-radius: 1px;
  }
}

.toolbar-divider {
  width: 1px;
  height: 18px;
  background: $border-glass;
  margin: 0 $spacing-xs;
  flex-shrink: 0;
}

// 自定义色板
.color-palette {
  display: flex;
  flex-direction: column;
  gap: 8px;

  &__swatches {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  &__swatch {
    width: 20px;
    height: 20px;
    border-radius: 3px;
    border: 1px solid var(--border-hover);
    cursor: pointer;
    transition: transform 0.15s;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;

    &:hover {
      transform: scale(1.15);
    }

    &--clear {
      background: transparent;
      border: 1px solid var(--border-hover);
      color: $error-color;
      font-size: 0;
    }

    &--active {
      border-color: $primary-light;
      box-shadow: 0 0 0 2px rgba($primary-color, 0.3);
    }
  }
}

// ProseMirror 内容区样式
:deep(.ProseMirror) {
  outline: none;
  color: $text-dark;
  font-size: $font-size-sm;
  line-height: 1.7;
  min-height: 40px;
  flex: 1;
  white-space: pre-wrap;
  word-break: break-word;

  ::selection {
    background: rgba($primary-color, 0.25);
    color: inherit;
  }

  p {
    margin: 0 0 0.5em;
    min-height: 1em;

    &:last-child {
      margin-bottom: 0;
    }
  }

  ul {
    list-style-type: disc;
    margin: 0.5em 0;
    padding-left: 1.5em;
  }

  ol {
    list-style-type: decimal;
    margin: 0.5em 0;
    padding-left: 1.5em;
  }

  li {
    margin-bottom: 0.25em;
  }

  // 待办清单（Tiptap TaskList/TaskItem）
  ul[data-type="taskList"] {
    list-style: none;
    margin: 0.5em 0;
    padding-left: 0;
  }

  ul[data-type="taskList"] li {
    display: flex;
    align-items: flex-start;
    gap: 0.4em;
    margin-bottom: 0.25em;
  }

  ul[data-type="taskList"] li > label {
    flex-shrink: 0;
    user-select: none;
    margin-top: 0.25em;
  }

  ul[data-type="taskList"] li > label input[type="checkbox"] {
    cursor: pointer;
    width: 16px;
    height: 16px;
    accent-color: $primary-color;
  }

  ul[data-type="taskList"] li[data-checked="true"] > div {
    color: $text-light;
    text-decoration: line-through;
  }

  strong {
    font-weight: 700;
  }

  em {
    font-style: italic;
  }

  u {
    text-decoration: underline;
  }

  s {
    text-decoration: line-through;
  }

  a {
    color: $primary-light;
    text-decoration: underline;
    cursor: pointer;
  }

  mark {
    border-radius: 2px;
    padding: 0 2px;
    background: #fef08a;
  }

  mark[data-color] {
    background: attr(data-color);
  }

  // 笔记内图片：块级、限宽不溢出、圆角
  img.rich-text-image {
    display: block;
    max-width: 100%;
    height: auto;
    border-radius: $radius-md;
    margin: 0.5em 0;
  }

  // Tiptap ResizableNodeView 的拖拽手柄：默认零尺寸不可见，这里给它可见外观。
  // 手柄只在图片节点被选中（container 带 ProseMirror-selectednode）时显示，点别处消失。
  [data-resize-container] {
    &[data-node='image'] {
      // 未选中时手柄隐藏，避免一直挂在四角干扰
      [data-resize-handle] {
        opacity: 0;
      }

      // 选中时显示手柄 + 图片描边提示
      &.ProseMirror-selectednode {
        [data-resize-handle] {
          opacity: 1;
        }

        img.rich-text-image {
          outline: 2px solid rgba($primary-color, 0.5);
          outline-offset: 2px;
        }
      }
    }

    // 手柄外观：四角小方块。position:absolute 锚定到 wrapper（relative）的四角
    [data-resize-handle] {
      position: absolute;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: #fff;
      border: 2px solid $primary-color;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
      z-index: 3;
      transition: opacity 0.15s ease;

      // 角手柄往内侧偏移一点，骑在图片角上；光标用对应方向的斜向双箭头
      &[data-resize-handle='top-left']     { top: -6px; left: -6px; cursor: nwse-resize; }
      &[data-resize-handle='top-right']    { top: -6px; right: -6px; cursor: nesw-resize; }
      &[data-resize-handle='bottom-left']  { bottom: -6px; left: -6px; cursor: nesw-resize; }
      &[data-resize-handle='bottom-right'] { bottom: -6px; right: -6px; cursor: nwse-resize; }
    }
  }
}

// Placeholder 样式
:deep(.ProseMirror p.is-editor-empty:first-child::before) {
  content: attr(data-placeholder);
  float: left;
  color: $text-light;
  pointer-events: none;
  height: 0;
}
</style>
