<template>
  <div class="rich-text-editor">
    <label v-if="label" class="rich-text-editor__label">{{ label }}</label>
    <div v-if="editor" class="rich-text-editor__wrapper" :class="{ 'rich-text-editor__wrapper--focused': focused }" @mousedown="focusEditor">
      <div class="rich-text-editor__toolbar">
        <!-- 撤销/重做 -->
        <button type="button" class="toolbar-btn" title="撤销" @click="editor.chain().focus().undo().run()" :disabled="!editor.can().undo()">
          <Icon icon="mdi:undo" :width="18" />
        </button>
        <button type="button" class="toolbar-btn" title="重做" @click="editor.chain().focus().redo().run()" :disabled="!editor.can().redo()">
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
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onBeforeUnmount } from 'vue'
import { useEditor, EditorContent } from '@tiptap/vue-3'
import Placeholder from '@tiptap/extension-placeholder'
import { CORE_TIPTAP_EXTENSIONS } from '@/config/tiptapExtensions'
import { Icon } from '@iconify/vue'
import { normalizeContent } from '@/utils/normalizeContent'
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

const props = withDefaults(defineProps<{
  label?: string
  placeholder?: string
  modelValue?: string
  disabled?: boolean
  rows?: number
  error?: string
  showAIBtns?: boolean
  aiContext?: string
}>(), {
  rows: 3,
  showAIBtns: true,
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

// 编辑器聚焦状态
const focused = ref(false)

// 点击编辑器区域时聚焦到 ProseMirror
const focusEditor = (e: MouseEvent) => {
  // 如果点击的是工具栏按钮等可交互元素，不干扰其默认行为
  const target = e.target as HTMLElement
  if (target.closest('button, a, input, [contenteditable="true"]')) return
  editor.value?.commands.focus()
}

const editor = useEditor({
  content: normalizeContent(props.modelValue),
  extensions: [
    ...CORE_TIPTAP_EXTENSIONS,
    Placeholder.configure({
      placeholder: props.placeholder || '',
    }),
  ],
  editable: !props.disabled,
  editorProps: {
    attributes: {
      class: 'rich-text-editor__content',
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
  },
  onUpdate: ({ editor }) => {
    emit('update:modelValue', editor.getHTML())
    // 更新字数统计
    const text = editor.state.doc.textContent
    charCount.value = text.length
    const chineseChars = (text.match(/\p{Script=Han}/gu) || []).length
    const englishWords = text.replace(/\p{Script=Han}/gu, ' ').trim().split(/\s+/).filter(Boolean).length
    wordCount.value = chineseChars + englishWords
  },
  onFocus: () => { focused.value = true },
  onBlur: () => { focused.value = false },
})

// ========== AI 操作 ==========

const handleAIOperation = (operation: AIOperation) => {
  if (!aiConfigStore.activeConfig) {
    naiveMessage.warning('请先配置 AI 服务')
    return
  }

  // 打开预览弹窗，由弹窗内部选择具体操作类型
  aiOriginalText.value = htmlToMarkdown(editor.value?.getHTML() || '')
  currentAIOperation.value = operation
  showAIPreview.value = true
}

const onAIPreviewClose = () => {
  showAIPreview.value = false
  // 关闭弹窗时清除当前操作状态，避免按钮图标继续转圈
  currentAIOperation.value = null
}

const applyAIResult = (html: string) => {
  if (!editor.value) return
  const safeHtml = normalizeContent(sanitizeHtml(html))
  editor.value.commands.setContent(safeHtml)
  // 取 Tiptap 规范化后的 HTML，确保格式一致
  const normalizedHtml = editor.value.getHTML()
  emit('update:modelValue', normalizedHtml)
  currentAIOperation.value = null
  naiveMessage.success('已应用 AI 生成结果')
}

const goToAISettings = () => {
  router.push({ path: '/', query: { tab: 'ai' } })
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
  const currentHTML = editor.value.getHTML()
  if (newVal !== currentHTML) {
    editor.value.commands.setContent(normalizeContent(newVal) || '')
  }
})

watch(() => props.disabled, (val) => {
  editor.value?.setOptions({ editable: !val })
})

onBeforeUnmount(() => {
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
      background: var(--input-focus-bg);
      box-shadow: 0 0 0 2px rgba($primary-color, 0.15);
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
    background: $editor-bg;
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
:deep(.rich-text-editor__content) {
  outline: none;
  color: $text-dark;
  font-size: $font-size-sm;
  line-height: 1.7;
  min-height: 40px;
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
