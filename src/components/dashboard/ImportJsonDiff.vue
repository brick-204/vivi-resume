<template>
  <div class="import-json-diff">
    <!-- 左右比对展示区 -->
    <div class="json-diff-split">
      <!-- 左侧：AI 原始输出（只读，带 diff 高亮） -->
      <div class="json-diff-pane">
        <div class="json-diff-pane__header">
          <span>AI 原始输出</span>
        </div>
        <div
          ref="leftScrollRef"
          class="json-diff-pane__content"
          @scroll="onLeftScroll"
        >
          <div
            v-for="(line, i) in leftLines"
            :key="i"
            class="diff-line"
            :class="lineClass(line, 'left')"
          >
            <span class="diff-line__num">{{ line.oldLineNum ?? '' }}</span>
            <span class="diff-line__content">
              <template v-if="line.type === 'modified' && line.oldCharDiffs">
                <span
                  v-for="(seg, j) in line.oldCharDiffs"
                  :key="j"
                  :class="seg.type === 'removed' ? 'diff-char-removed' : ''"
                >{{ seg.value }}</span>
              </template>
              <template v-else>{{ line.oldContent ?? '' }}</template>
            </span>
          </div>
        </div>
      </div>
      <div class="json-diff-divider" />
      <!-- 右侧：当前编辑（可编辑 textarea + diff 高亮覆盖层） -->
      <div class="json-diff-pane json-diff-pane--editable">
        <div class="json-diff-pane__header">
          <span>当前编辑</span>
          <span v-if="validationStatus === 'ok'" class="json-diff-status json-diff-status--ok">
            <Icon icon="mdi:check-circle" :width="14" /> 通过
          </span>
          <span v-else-if="validationStatus === 'error'" class="json-diff-status json-diff-status--err">
            <Icon icon="mdi:alert-circle" :width="14" /> {{ errorCount }} 个错误
          </span>
        </div>
        <div class="json-diff-edit-wrapper">
          <!-- diff 高亮背景层（只读，覆盖在 textarea 上方但 pointer-events: none） -->
          <div
            ref="rightHighlightRef"
            class="json-diff-highlight-layer"
            aria-hidden="true"
          >
            <div
              v-for="(line, i) in rightLines"
              :key="i"
              class="diff-line"
              :class="lineClass(line, 'right')"
            >
              <span class="diff-line__num">{{ line.newLineNum ?? '' }}</span>
              <span class="diff-line__content">
                <template v-if="line.type === 'modified' && line.newCharDiffs">
                  <span
                    v-for="(seg, j) in line.newCharDiffs"
                    :key="j"
                    :class="seg.type === 'added' ? 'diff-char-added' : ''"
                  >{{ seg.value }}</span>
                </template>
                <template v-else>{{ line.newContent ?? '' }}</template>
              </span>
            </div>
          </div>
          <!-- 可编辑 textarea（透明文字，用户实际编辑的区域） -->
          <!-- 始终显示格式化后的 JSON，确保与高亮层对齐 -->
          <textarea
            ref="textareaRef"
            :value="formattedEditable"
            class="json-diff-textarea"
            spellcheck="false"
            @input="onTextareaInput"
            @scroll="onTextareaScroll"
          />
        </div>
      </div>
    </div>

    <!-- 工具栏 -->
    <div class="json-diff-toolbar">
      <div class="json-diff-toolbar__left">
        <n-button size="tiny" quaternary @click="handleFormat">
          <template #icon>
            <Icon icon="mdi:format-align-left" :width="14" />
          </template>
          格式化
        </n-button>
        <n-button size="tiny" quaternary @click="handleReset">
          <template #icon>
            <Icon icon="mdi:restore" :width="14" />
          </template>
          重置为 AI 输出
        </n-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { Icon } from '@iconify/vue'
import { NButton } from 'naive-ui'
import { computeSideBySideDiff, type SideBySideLine } from '@/utils/textDiff'

const props = defineProps<{
  originalJson: string
  editableJson: string
  validationStatus: 'ok' | 'error' | 'idle'
  errorCount: number
}>()

const emit = defineEmits<{
  'update:editableJson': [value: string]
  format: []
  reset: []
}>()

/** 尝试格式化 JSON，失败返回原文 */
function tryFormat(text: string): string {
  try {
    return JSON.stringify(JSON.parse(text), null, 2)
  } catch {
    return text
  }
}

/** 格式化后的原始 JSON（用于 diff 基准） */
const formattedOriginal = computed(() => tryFormat(props.originalJson))

/** 格式化后的编辑 JSON（用于 diff 比较和 textarea/高亮层渲染） */
const formattedEditable = computed(() => tryFormat(props.editableJson))

/** 计算行级 side-by-side diff（始终计算，即使文本相同也渲染 equal 行） */
const sideBySideLines = computed<SideBySideLine[]>(() => {
  return computeSideBySideDiff(formattedOriginal.value, formattedEditable.value)
})

/** 左侧面板行：过滤掉纯 added 行（左侧不显示） */
const leftLines = computed(() =>
  sideBySideLines.value.filter(line => line.type !== 'added'),
)

/** 右侧面板行：过滤掉纯 removed 行（右侧不显示） */
const rightLines = computed(() =>
  sideBySideLines.value.filter(line => line.type !== 'removed'),
)

/** 为 diff-line 生成 CSS class 对象 */
function lineClass(line: SideBySideLine, side: 'left' | 'right'): Record<string, boolean> {
  return {
    'diff-line--removed': line.type === 'removed' && side === 'left',
    'diff-line--added': line.type === 'added' && side === 'right',
    'diff-line--modified': line.type === 'modified',
    'diff-line--modified-left': line.type === 'modified' && side === 'left',
    'diff-line--modified-right': line.type === 'modified' && side === 'right',
  }
}

function onTextareaInput(e: Event) {
  const newValue = (e.target as HTMLTextAreaElement).value
  emit('update:editableJson', newValue)
}

function handleFormat() {
  emit('format')
}

function handleReset() {
  emit('reset')
}

// ==================== 滚动同步 ====================

const leftScrollRef = ref<HTMLElement | null>(null)
const rightHighlightRef = ref<HTMLElement | null>(null)
const textareaRef = ref<HTMLTextAreaElement | null>(null)

let isSyncingScroll = false

/** 从 textarea 滚动驱动同步 */
function onTextareaScroll() {
  if (isSyncingScroll) return
  isSyncingScroll = true

  const scrollTop = textareaRef.value?.scrollTop ?? 0

  // 同步右侧高亮层
  if (rightHighlightRef.value) {
    rightHighlightRef.value.scrollTop = scrollTop
  }

  // 比例同步左侧面板
  if (leftScrollRef.value && textareaRef.value) {
    const textArea = textareaRef.value
    const ratio = textArea.scrollHeight - textArea.clientHeight
      ? scrollTop / (textArea.scrollHeight - textArea.clientHeight)
      : 0
    const leftMax = leftScrollRef.value.scrollHeight - leftScrollRef.value.clientHeight
    leftScrollRef.value.scrollTop = ratio * leftMax
  }

  isSyncingScroll = false
}

/** 从左侧面板滚动驱动同步 */
function onLeftScroll() {
  if (isSyncingScroll) return
  isSyncingScroll = true

  const scrollTop = leftScrollRef.value?.scrollTop ?? 0

  if (textareaRef.value && leftScrollRef.value) {
    const leftEl = leftScrollRef.value
    const ratio = leftEl.scrollHeight - leftEl.clientHeight
      ? scrollTop / (leftEl.scrollHeight - leftEl.clientHeight)
      : 0
    const rightMax = textareaRef.value.scrollHeight - textareaRef.value.clientHeight
    textareaRef.value.scrollTop = ratio * rightMax

    // 同步右侧高亮层
    if (rightHighlightRef.value) {
      rightHighlightRef.value.scrollTop = textareaRef.value.scrollTop
    }
  }

  isSyncingScroll = false
}
</script>

<style lang="scss" scoped>
.import-json-diff {
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;
}

.json-diff-split {
  display: flex;
  border: 1px solid $border-glass;
  border-radius: $radius-sm;
  overflow: hidden;
  height: 300px;
}

.json-diff-pane {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: $spacing-xs $spacing-md;
    font-size: $font-size-xs;
    font-weight: 500;
    color: $text-light;
    background: $bg-glass;
    border-bottom: 1px solid $border-glass;
    flex-shrink: 0;
  }

  &__content {
    flex: 1;
    overflow-y: auto;
    font-size: $font-size-xs;
    line-height: 1.6;
    font-family: 'Cascadia Code', 'Fira Code', 'JetBrains Mono', Consolas, monospace;
    @include scrollbar;
  }
}

.json-diff-divider {
  width: 1px;
  background: $border-glass;
  flex-shrink: 0;
}

// ========== diff 行样式 ==========

.diff-line {
  display: flex;
  min-height: 1.6em;
  line-height: 1.6;
  font-family: 'Cascadia Code', 'Fira Code', 'JetBrains Mono', Consolas, monospace;
  font-size: $font-size-xs;

  &__num {
    flex-shrink: 0;
    width: 36px;
    padding: 0 8px 0 4px;
    text-align: right;
    color: $text-light;
    user-select: none;
    opacity: 0.4;
  }

  &__content {
    flex: 1;
    min-width: 0;
    white-space: pre-wrap;
    word-break: break-word;
  }

  // 左侧：removed 行 — 红色背景 + 红色指示条
  &--removed {
    background: var(--diff-removed-line-bg);
    border-left: 2px solid var(--diff-removed-indicator);
  }

  // 右侧：added 行 — 绿色背景 + 绿色指示条
  &--added {
    background: var(--diff-added-line-bg);
    border-left: 2px solid var(--diff-added-indicator);
  }

  // modified 行 — 左侧红色，右侧绿色
  &--modified-left {
    background: var(--diff-removed-line-bg);
    border-left: 2px solid var(--diff-removed-indicator);
  }

  &--modified-right {
    background: var(--diff-added-line-bg);
    border-left: 2px solid var(--diff-added-indicator);
  }
}

// 左侧面板：removed 字符深红高亮
.diff-char-removed {
  background: var(--diff-removed-char-bg);
  border-radius: 2px;
}

// 右侧高亮层：added 字符深绿高亮
.diff-char-added {
  background: var(--diff-added-char-bg);
  border-radius: 2px;
}

// ========== 右侧可编辑面板：overlay 技巧 ==========

.json-diff-edit-wrapper {
  position: relative;
  flex: 1;
  overflow: hidden;
}

// diff 高亮层：与 textarea 完全相同的排版参数，但文字透明
.json-diff-highlight-layer {
  position: absolute;
  inset: 0;
  font-size: $font-size-xs;
  line-height: 1.6;
  font-family: 'Cascadia Code', 'Fira Code', 'JetBrains Mono', Consolas, monospace;
  overflow: hidden; // 不独立滚动，由 textarea 驱动
  pointer-events: none; // 不拦截鼠标事件
  color: transparent;   // 文字透明，只显示背景高亮
  @include scrollbar;

  .diff-line__content {
    white-space: pre-wrap;
    word-break: break-word;
  }
}

// textarea：透明文字，用户实际编辑区域
.json-diff-textarea {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  padding: 0;
  border: none;
  outline: none;
  resize: none;
  background: transparent;
  font-size: $font-size-xs;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: 'Cascadia Code', 'Fira Code', 'JetBrains Mono', Consolas, monospace;
  color: $text-primary;
  caret-color: $text-primary; // 光标可见
  @include scrollbar;
  // 行号宽度偏移：与高亮层行号对齐
  padding-left: 36px;
}

// ========== 工具栏和状态 ==========

.json-diff-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;

  &__left {
    display: flex;
    gap: $spacing-xs;
  }
}

.json-diff-status {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: $font-size-xs;
  font-weight: 600;

  &--ok {
    color: $success-color;
  }

  &--err {
    color: $error-color;
  }
}

@include mobile {
  .json-diff-split {
    flex-direction: column;
    height: auto;
    max-height: 400px;
  }

  .json-diff-divider {
    width: auto;
    height: 1px;
  }

  .json-diff-pane__content {
    max-height: 150px;
  }

  .json-diff-edit-wrapper {
    max-height: 200px;
  }
}
</style>
