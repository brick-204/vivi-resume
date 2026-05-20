<template>
  <div class="rich-text-editor">
    <label v-if="label" class="rich-text-editor__label">{{ label }}</label>
    <div v-if="editor" class="rich-text-editor__wrapper">
      <div class="rich-text-editor__toolbar">
        <button
          type="button"
          class="toolbar-btn"
          :class="{ 'is-active': editor.isActive('bold') }"
          title="粗体"
          @click="editor.chain().focus().toggleBold().run()"
        >
          <Icon icon="mdi:format-bold" :width="18" />
        </button>
        <button
          type="button"
          class="toolbar-btn"
          :class="{ 'is-active': editor.isActive('italic') }"
          title="斜体"
          @click="editor.chain().focus().toggleItalic().run()"
        >
          <Icon icon="mdi:format-italic" :width="18" />
        </button>
        <button
          type="button"
          class="toolbar-btn"
          :class="{ 'is-active': editor.isActive('strike') }"
          title="删除线"
          @click="editor.chain().focus().toggleStrike().run()"
        >
          <Icon icon="mdi:format-strikethrough" :width="18" />
        </button>
        <span class="toolbar-divider" />
        <button
          type="button"
          class="toolbar-btn"
          :class="{ 'is-active': editor.isActive('bulletList') }"
          title="无序列表"
          @click="editor.chain().focus().toggleBulletList().run()"
        >
          <Icon icon="mdi:format-list-bulleted" :width="18" />
        </button>
        <button
          type="button"
          class="toolbar-btn"
          :class="{ 'is-active': editor.isActive('orderedList') }"
          title="有序列表"
          @click="editor.chain().focus().toggleOrderedList().run()"
        >
          <Icon icon="mdi:format-list-numbered" :width="18" />
        </button>
      </div>
      <EditorContent :editor="editor" class="rich-text-editor__body" :style="{ minHeight }" />
    </div>
    <span v-if="error" class="rich-text-editor__error">{{ error }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed, watch, onBeforeUnmount } from 'vue'
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { Icon } from '@iconify/vue'
import { normalizeContent } from '@/utils/normalizeContent'

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

const editor = useEditor({
  content: normalizeContent(props.modelValue),
  extensions: [
    StarterKit.configure({
      heading: false,
      code: false,
      codeBlock: false,
      blockquote: false,
      horizontalRule: false,
      undoRedo: false,
    }),
    Placeholder.configure({
      placeholder: props.placeholder || '',
    }),
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

  &:hover {
    background: rgba($text-secondary, 0.15);
  }

  &.is-active {
    background: rgba($primary-color, 0.2);
    color: $primary-light;
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
  color: $text-primary;
  font-size: $font-size-sm;
  line-height: 1.7;
  min-height: 40px;

  p {
    margin: 0 0 0.5em;

    &:last-child {
      margin-bottom: 0;
    }
  }

  ul, ol {
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

  s {
    text-decoration: line-through;
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
