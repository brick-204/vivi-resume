<template>
  <div class="rich-text-editor">
    <label v-if="label" class="rich-text-editor__label">{{ label }}</label>
    <div v-if="editor" class="rich-text-editor__wrapper">
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
        <ColorPicker
          :model-value="currentFontColor"
          :preset-colors="FONT_PRESET_COLORS"
          icon="mdi:format-color-text"
          title="字体颜色"
          :is-active="editor.isActive('textStyle')"
          @update:model-value="onFontColorChange"
          @clear="onFontColorClear"
        />
        <ColorPicker
          :model-value="currentBgColor"
          :preset-colors="BG_PRESET_COLORS"
          icon="mdi:format-color-fill"
          title="背景颜色"
          :is-active="editor.isActive('highlight')"
          @update:model-value="onBgColorChange"
          @clear="onBgColorClear"
        />
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
      <EditorContent :editor="editor" class="rich-text-editor__body" :style="{ minHeight }" />
    </div>
    <span v-if="error" class="rich-text-editor__error">{{ error }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onBeforeUnmount } from 'vue'
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import Link from '@tiptap/extension-link'
import Color from '@tiptap/extension-color'
import { TextStyle } from '@tiptap/extension-text-style'
import Highlight from '@tiptap/extension-highlight'
import { Icon } from '@iconify/vue'
import { normalizeContent } from '@/utils/normalizeContent'
import ColorPicker from './ColorPicker.vue'

const props = withDefaults(defineProps<{
  label?: string
  placeholder?: string
  modelValue?: string
  disabled?: boolean
  rows?: number
  error?: string
}>(), {
  rows: 3,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

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

const editor = useEditor({
  content: normalizeContent(props.modelValue),
  extensions: [
    StarterKit.configure({
      heading: false,
      code: false,
      codeBlock: false,
      blockquote: false,
      horizontalRule: false,
      link: false,
      underline: false,
    }),
    Placeholder.configure({
      placeholder: props.placeholder || '',
    }),
    Underline,
    TextAlign.configure({
      types: ['paragraph'],
    }),
    Link.configure({
      openOnClick: false,
      HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' },
    }),
    TextStyle,
    Color,
    Highlight.configure({ multicolor: true }),
  ],
  editable: !props.disabled,
  editorProps: {
    attributes: {
      class: 'rich-text-editor__content',
    },
  },
  onUpdate: ({ editor }) => {
    emit('update:modelValue', editor.getHTML())
  },
})

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
  const prev = editor.value.getAttributes('link').href
  const url = prompt('请输入链接地址', prev || 'https://')
  if (url === null) return
  if (url === '') {
    editor.value.chain().focus().extendMarkRange('link').unsetLink().run()
    return
  }
  editor.value.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
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
}

.toolbar-divider {
  width: 1px;
  height: 18px;
  background: $border-glass;
  margin: 0 $spacing-xs;
  flex-shrink: 0;
}

// ProseMirror 内容区样式
:deep(.rich-text-editor__content) {
  outline: none;
  color: $text-dark;
  font-size: $font-size-sm;
  line-height: 1.7;
  min-height: 40px;

  ::selection {
    background: rgba(124, 92, 252, 0.35);
    color: inherit;
  }

  p {
    margin: 0 0 0.5em;

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
