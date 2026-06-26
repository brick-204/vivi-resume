<template>
  <div class="import-json-diff">
    <!-- 左右比对展示区 -->
    <div class="json-diff-split">
      <!-- 左侧：AI 原始输出（只读） -->
      <div class="json-diff-pane">
        <div class="json-diff-pane__header">
          <span>AI 原始输出</span>
        </div>
        <div class="json-diff-pane__content">{{ formattedOriginal }}</div>
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
          <div class="json-diff-highlight-layer" aria-hidden="true">
            <template v-if="diffSegments.length > 0">
              <template v-for="(seg, i) in diffSegments" :key="i">
                <span v-if="seg.type === 'equal'" class="diff-equal">{{ seg.value }}</span>
                <span v-else-if="seg.type === 'added'" class="diff-added">{{ seg.value }}</span>
              </template>
            </template>
            <template v-else>
              <span class="diff-equal">{{ formattedEditable }}</span>
            </template>
          </div>
          <!-- 可编辑 textarea（透明文字，用户实际编辑的区域） -->
          <!-- 始终显示格式化后的 JSON，确保与高亮层对齐 -->
          <textarea
            :value="formattedEditable"
            class="json-diff-textarea"
            spellcheck="false"
            @input="onTextareaInput"
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
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { NButton } from 'naive-ui'
import { computeDiff, type DiffSegment } from '@/utils/textDiff'

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

/** 计算差异（右侧面板只显示 added/equal，对应左侧只显示 removed/equal） */
const diffSegments = computed<DiffSegment[]>(() => {
  const orig = formattedOriginal.value
  const edit = formattedEditable.value
  if (orig === edit) return []
  return computeDiff(orig, edit).filter(seg => seg.type !== 'removed')
})

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
    padding: $spacing-md;
    font-size: $font-size-xs;
    line-height: 1.6;
    white-space: pre-wrap;
    word-break: break-word;
    font-family: 'Cascadia Code', 'Fira Code', 'JetBrains Mono', Consolas, monospace;
    @include scrollbar;
  }
}

.json-diff-divider {
  width: 1px;
  background: $border-glass;
  flex-shrink: 0;
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
  padding: $spacing-md;
  font-size: $font-size-xs;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: 'Cascadia Code', 'Fira Code', 'JetBrains Mono', Consolas, monospace;
  overflow-y: auto;
  pointer-events: none; // 不拦截鼠标事件，让点击穿透到 textarea
  color: transparent;   // 文字透明，只显示背景高亮
  @include scrollbar;
}

// textarea：透明文字，用户实际编辑区域
.json-diff-textarea {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  padding: $spacing-md;
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
}

.diff-equal {
  color: transparent; // 高亮层中无变化的部分透明，由 textarea 显示文字
}

.diff-added {
  background: rgba($success-color, 0.20);
  color: transparent; // 文字透明，由 textarea 显示；只保留背景高亮
  border-radius: 2px;
}

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
