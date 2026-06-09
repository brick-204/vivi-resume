<template>
  <n-modal
    :show="visible"
    preset="card"
    :style="{ maxWidth: '720px', width: '90vw' }"
    :mask-closable="false"
    @update:show="v => { if (!v) handleCancel() }"
  >
    <template #header>
      <div class="preview-header">
        <Icon :icon="operationInfo.icon" :width="20" />
        <span>AI {{ operationInfo.label }}</span>
      </div>
    </template>

    <div class="preview-body">
      <div class="preview-pane">
        <div class="preview-pane__header">原文</div>
        <div class="preview-pane__content">{{ originalText }}</div>
      </div>
      <div class="preview-divider" />
      <div class="preview-pane">
        <div class="preview-pane__header">
          AI 生成结果
          <NSpin v-if="isStreaming" :size="14" />
        </div>
        <div class="preview-pane__content preview-pane__content--result">
          <template v-if="resultText">{{ resultText }}</template>
          <span v-else class="preview-pane__placeholder">
            {{ isStreaming ? '正在生成...' : '等待生成...' }}
          </span>
          <span v-if="isStreaming" class="preview-pane__cursor">▌</span>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="preview-footer">
        <n-button @click="handleCancel">
          {{ isStreaming ? '取消生成' : '不应用' }}
        </n-button>
        <n-button
          type="primary"
          :disabled="isStreaming || !resultText"
          @click="handleApply"
        >
          <template #icon>
            <Icon icon="mdi:check" :width="16" />
          </template>
          应用结果
        </n-button>
      </div>
    </template>
  </n-modal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Icon } from '@iconify/vue'
import { NModal, NButton, NSpin } from 'naive-ui'
import type { AIOperation, AIServiceConfig } from '@/types/aiConfig'
import { AI_OPERATIONS } from '@/types/aiConfig'
import { performAIOperation, plainTextToHtml, AIServiceError, AI_ERROR_MESSAGES } from '@/services/aiService'
import { message as naiveMessage } from '@/plugins/naive-ui'

const props = defineProps<{
  visible: boolean
  config: AIServiceConfig | null
  operation: AIOperation | null
  originalText: string
}>()

const emit = defineEmits<{
  close: []
  apply: [html: string]
}>()

const resultText = ref('')
const isStreaming = ref(false)
let abortController: AbortController | null = null

const operationInfo = computed(() => {
  const op = AI_OPERATIONS.find(o => o.id === props.operation)
  return op || { id: 'polish', label: '润色', icon: 'mdi:auto-fix' }
})

// 当弹窗打开时，启动 AI 调用
watch(() => props.visible, async (val) => {
  if (val && props.config && props.operation) {
    // 取消上一个未完成的请求，防止竞态
    if (abortController) {
      abortController.abort()
      abortController = null
    }

    resultText.value = ''
    isStreaming.value = true
    abortController = new AbortController()

    try {
      await performAIOperation(
        props.config,
        props.operation,
        props.originalText,
        (chunk) => {
          resultText.value += chunk
        },
        abortController.signal,
      )
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        // 用户取消，静默
      } else if (err instanceof AIServiceError) {
        naiveMessage.error(AI_ERROR_MESSAGES[err.code] || err.message)
      } else {
        naiveMessage.error('AI 处理失败，请重试')
      }
    } finally {
      isStreaming.value = false
      abortController = null
    }
  }
})

const handleCancel = () => {
  if (isStreaming.value && abortController) {
    abortController.abort()
  }
  emit('close')
}

const handleApply = () => {
  if (!resultText.value) return
  const html = plainTextToHtml(resultText.value)
  emit('apply', html)
  emit('close')
}
</script>

<style lang="scss" scoped>
.preview-header {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  font-weight: 600;
  @include gradient-text;
}

.preview-body {
  display: flex;
  gap: 0;
  min-height: 200px;
  max-height: 400px;
}

.preview-pane {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;

  &__header {
    display: flex;
    align-items: center;
    gap: $spacing-xs;
    padding: $spacing-sm $spacing-md;
    font-size: $font-size-xs;
    font-weight: 600;
    color: $text-secondary;
    border-bottom: 1px solid $border-glass;
    background: $bg-glass;
  }

  &__content {
    flex: 1;
    padding: $spacing-md;
    font-size: $font-size-sm;
    line-height: 1.7;
    color: $text-primary;
    overflow-y: auto;
    white-space: pre-wrap;
    word-break: break-word;
    @include scrollbar;

    &--result {
      color: $primary-light;
    }
  }

  &__placeholder {
    color: $text-light;
    font-style: italic;
  }

  &__cursor {
    color: $primary-light;
    animation: blink 1s step-end infinite;
  }
}

.preview-divider {
  width: 1px;
  background: $border-glass;
  flex-shrink: 0;
}

.preview-footer {
  display: flex;
  justify-content: flex-end;
  gap: $spacing-sm;
}

@keyframes blink {
  50% { opacity: 0; }
}

// 移动端：上下排列
@include mobile {
  .preview-body {
    flex-direction: column;
  }

  .preview-divider {
    width: auto;
    height: 1px;
  }
}
</style>
