<template>
  <div v-if="show" class="find-replace-bar">
    <div class="find-replace-bar__row">
      <input
        ref="findInputRef"
        v-model="findText"
        class="find-replace-bar__input"
        placeholder="查找..."
        @keydown.enter.prevent="goNext"
        @keydown.shift.enter.prevent="goPrev"
        @keydown.escape="emit('close')"
        @input="onFindChange"
      />
      <button
        type="button"
        class="find-replace-bar__btn find-replace-bar__btn--toggle"
        :class="{ 'is-active': ignoreCase }"
        title="区分大小写"
        @click="ignoreCase = !ignoreCase; onFindChange()"
      >
        <Icon icon="mdi:format-letter-case" :width="16" />
      </button>
      <span class="find-replace-bar__count">
        <template v-if="findText">{{ currentIndex + 1 }} / {{ matches.length }}</template>
      </span>
      <button type="button" class="find-replace-bar__btn" title="上一个" :disabled="matches.length === 0" @click="goPrev">
        <Icon icon="mdi:chevron-up" :width="16" />
      </button>
      <button type="button" class="find-replace-bar__btn" title="下一个" :disabled="matches.length === 0" @click="goNext">
        <Icon icon="mdi:chevron-down" :width="16" />
      </button>
      <button type="button" class="find-replace-bar__btn" title="关闭" @click="emit('close')">
        <Icon icon="mdi:close" :width="16" />
      </button>
    </div>
    <div class="find-replace-bar__row">
      <input
        v-model="replaceText"
        class="find-replace-bar__input"
        placeholder="替换为..."
        @keydown.escape="emit('close')"
      />
      <button type="button" class="find-replace-bar__btn" :disabled="matches.length === 0" title="替换当前" @click="replaceCurrent">
        替换
      </button>
      <button type="button" class="find-replace-bar__btn" :disabled="matches.length === 0" title="替换全部" @click="replaceAll">
        全部
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
/**
 * Tiptap Editor 最小类型接口
 * 避免直接导入 @tiptap/core 导致 @tiptap/pm 构建错误
 */
interface TiptapEditor {
  state: { doc: ProseMirrorNode }
  commands: {
    setTextSelection(range: { from: number; to: number }): void
    scrollIntoView(): void
    focus(): void
  }
  chain(): { command(fn: (props: { tr: ProseMirrorTransaction }) => boolean): { run(): void }; focus(): { command(fn: (props: { tr: ProseMirrorTransaction }) => boolean): { run(): void } } }
}

interface ProseMirrorNode {
  descendants(fn: (node: ProseMirrorNode, pos: number) => void): void
  isText?: boolean
  text?: string
}

interface ProseMirrorTransaction {
  insertText(text: string, from: number, to: number): ProseMirrorTransaction
}

import { Icon } from '@iconify/vue'

const props = defineProps<{
  editor: TiptapEditor | null
  show: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

const findText = ref('')
const replaceText = ref('')
const ignoreCase = ref(true)
const matches = ref<{ from: number; to: number }[]>([])
const currentIndex = ref(0)
const findInputRef = ref<HTMLInputElement>()

/** 查找所有匹配位置 */
function findAllMatches(): { from: number; to: number }[] {
  if (!props.editor || !findText.value) return []

  const results: { from: number; to: number }[] = []
  const searchText = ignoreCase.value ? findText.value.toLowerCase() : findText.value
  const doc = props.editor.state.doc

  doc.descendants((node: ProseMirrorNode, pos: number) => {
    if (!node.isText || !node.text) return
    const nodeText = ignoreCase.value ? node.text.toLowerCase() : node.text
    let index = 0
    while ((index = nodeText.indexOf(searchText, index)) !== -1) {
      results.push({ from: pos + index, to: pos + index + findText.value.length })
      index += 1
    }
  })

  return results
}

/** 更新匹配列表 */
function onFindChange() {
  matches.value = findAllMatches()
  currentIndex.value = 0
  highlightCurrent()
}

/** 高亮当前匹配项 */
function highlightCurrent() {
  if (!props.editor || matches.value.length === 0) return
  const match = matches.value[currentIndex.value]
  if (match) {
    props.editor.commands.setTextSelection(match)
    props.editor.commands.scrollIntoView()
  }
}

/** 下一个匹配 */
function goNext() {
  if (matches.value.length === 0) return
  currentIndex.value = (currentIndex.value + 1) % matches.value.length
  highlightCurrent()
}

/** 上一个匹配 */
function goPrev() {
  if (matches.value.length === 0) return
  currentIndex.value = (currentIndex.value - 1 + matches.value.length) % matches.value.length
  highlightCurrent()
}

/** 替换当前匹配 */
function replaceCurrent() {
  if (!props.editor || matches.value.length === 0) return
  const match = matches.value[currentIndex.value]
  if (!match) return

  props.editor.chain().focus().command(({ tr }: { tr: ProseMirrorTransaction }) => {
    tr.insertText(replaceText.value, match.from, match.to)
    return true
  }).run()

  // 重新搜索
  onFindChange()
}

/** 替换所有匹配（单次 transaction，逆序替换避免位置偏移） */
function replaceAll() {
  if (!props.editor || matches.value.length === 0) return

  const allMatches = findAllMatches()
  // 单次 transaction 中逆序替换，避免位置偏移，且只触发一次编辑器更新
  props.editor.chain().focus().command(({ tr }: { tr: ProseMirrorTransaction }) => {
    for (let i = allMatches.length - 1; i >= 0; i--) {
      const match = allMatches[i]
      tr.insertText(replaceText.value, match.from, match.to)
    }
    return true
  }).run()

  // 重新搜索
  onFindChange()
}

// 打开时自动聚焦
watch(() => props.show, (val) => {
  if (val) {
    nextTick(() => {
      findInputRef.value?.focus()
    })
  } else {
    // 关闭时清空搜索
    findText.value = ''
    replaceText.value = ''
    matches.value = []
    currentIndex.value = 0
  }
})
</script>

<style lang="scss" scoped>
.find-replace-bar {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: $spacing-xs $spacing-sm;
  background: $bg-glass;
  border-bottom: 1px solid $border-glass;

  &__row {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  &__input {
    flex: 1;
    min-width: 0;
    height: 26px;
    padding: 0 8px;
    font-size: $font-size-xs;
    font-family: $font-family;
    color: $text-primary;
    background: $editor-bg;
    border: 1px solid $border-glass;
    border-radius: $radius-md;
    outline: none;
    transition: border-color $transition-fast;

    &:focus {
      border-color: rgba($primary-color, 0.5);
    }

    &::placeholder {
      color: $text-light;
    }
  }

  &__count {
    font-size: 11px;
    color: $text-light;
    white-space: nowrap;
    min-width: 36px;
    text-align: center;
    font-variant-numeric: tabular-nums;
  }

  &__btn {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 26px;
    padding: 0 6px;
    background: transparent;
    color: $text-secondary;
    border: 1px solid $border-glass;
    border-radius: $radius-md;
    cursor: pointer;
    font-size: $font-size-xs;
    font-family: $font-family;
    transition: all $transition-fast;
    white-space: nowrap;

    &:hover:not(:disabled) {
      background: rgba($primary-color, 0.08);
      color: $primary-light;
      border-color: rgba($primary-color, 0.3);
    }

    &:disabled {
      opacity: 0.35;
      cursor: not-allowed;
    }

    &--toggle {
      &.is-active {
        background: rgba($primary-color, 0.15);
        color: $primary-light;
        border-color: rgba($primary-color, 0.4);
      }
    }
  }
}
</style>
