<template>
  <div class="task-list-excerpt" v-html="rendered" />
</template>

<script setup lang="ts">
/**
 * 笔记封面摘要：优先渲染首个 TaskList（最多 maxItems 条），
 否则回退到 extractPlainText 前 maxChars 字。
 * 用于 JournalPanel 笔记卡片的「任务清单粘连」修复——
 * 旧实现 deriveExcerpt 只剥标签后接 line-clamp，Tiptap 任务清单去标签后变成裸文本，
 * checkbox/勾选态/排序粘连全部丢失。
 */
import { computed } from 'vue'
import { extractPlainText } from '@/types/journal'
import { sanitizeHtml } from '@/utils/sanitizeHtml'

const props = withDefaults(
  defineProps<{
    html: string
    maxItems?: number
    maxChars?: number
  }>(),
  { maxItems: 3, maxChars: 60 },
)

const rendered = computed(() => {
  const html = props.html
  if (!html) return ''

  // ponytail: TaskList 在浏览器渲染，无需 SSR；server 端没有 DOMParser 走纯文本回退
  if (typeof DOMParser !== 'undefined') {
    const doc = new DOMParser().parseFromString(html, 'text/html')
    const ul = doc.querySelector('ul[data-type="taskList"]')
    if (ul && ul.children.length > 0) {
      const clone = ul.cloneNode(true) as HTMLUListElement
      const items = Array.from(clone.children)
      if (items.length > props.maxItems) {
        items.slice(props.maxItems).forEach(li => li.remove())
      }
      // ponytail: 任务清单容器禁止 line-clamp，让 ul 自适应高度
      return sanitizeHtml(clone.outerHTML)
    }
  }

  const text = extractPlainText(html)
  if (!text) {
    return /<img\b/i.test(html) ? '<span class="task-list-excerpt__placeholder">[图片]</span>' : '<span class="task-list-excerpt__placeholder">空笔记</span>'
  }
  const slice = text.length > props.maxChars ? text.slice(0, props.maxChars) + '…' : text
  // ponytail: escapeHtml 用模板字符串手动转义就够了，sanitizeHtml 内部会再走一遍 DOMPurify
  const escaped = slice
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  return sanitizeHtml(`<span class="task-list-excerpt__text">${escaped}</span>`)
})
</script>

<style lang="scss" scoped>
// ponytail: 复制 RichTextEditor.vue:916-946 的 taskList 规则集——TaskListExcerpt 是唯一消费者，不抽公共 scss
.task-list-excerpt {
  font-size: $font-size-xs;
  color: $text-secondary;
  line-height: 1.5;

  :deep(ul[data-type="taskList"]) {
    list-style: none;
    margin: 0;
    padding-left: 0;
  }

  :deep(ul[data-type="taskList"] li) {
    display: flex;
    align-items: flex-start;
    gap: 0.4em;
    margin-bottom: 0.25em;
  }

  :deep(ul[data-type="taskList"] li > label) {
    flex-shrink: 0;
    user-select: none;
    margin-top: 0.25em;
  }

  :deep(ul[data-type="taskList"] li > label input[type="checkbox"]) {
    cursor: pointer;
    width: 14px;
    height: 14px;
    accent-color: $primary-color;
  }

  :deep(ul[data-type="taskList"] li[data-checked="true"] > div) {
    color: $text-light;
    text-decoration: line-through;
  }

  :deep(&__placeholder) {
    color: $text-light;
  }
}
</style>