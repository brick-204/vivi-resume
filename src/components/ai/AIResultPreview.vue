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
        <Icon :icon="currentOpInfo.icon" :width="20" />
        <span>AI {{ currentOpInfo.label }}</span>
      </div>
    </template>

    <!-- 操作类型选择 -->
    <div class="operation-selector">
      <div class="operation-selector__options">
        <button
          v-for="op in operations"
          :key="op.id"
          class="op-chip"
          :class="{
            'op-chip--active': selectedOperation === op.id,
            'op-chip--disabled': !opAvailable(op.id) && selectedOperation !== op.id,
          }"
          :disabled="isStreaming || (!opAvailable(op.id) && selectedOperation !== op.id)"
          :title="opTip(op.id)"
          @click="selectOperation(op.id)"
        >
          <Icon :icon="op.icon" :width="14" />
          <span>{{ op.label }}</span>
          <span v-if="op.minChars" class="op-chip__badge">≥{{ op.minChars }}字</span>
        </button>
      </div>
      <div v-if="selectedOpMinChars && charCount < selectedOpMinChars" class="operation-selector__warn">
        <Icon icon="mdi:alert-circle-outline" :width="14" />
        当前内容仅 {{ charCount }} 字，{{ currentOpInfo.label }}需要至少 {{ selectedOpMinChars }} 字
      </div>
    </div>

    <!-- 自定义指令输入 -->
    <div class="custom-instruction">
      <n-input
        v-model:value="localCustomInstruction"
        type="textarea"
        :placeholder="instructionPlaceholder"
        :autosize="{ minRows: 1, maxRows: 3 }"
        :disabled="isStreaming"
        @keydown.enter.ctrl="handleStartIfReady"
      />
    </div>

    <!-- 开始 / 重新生成按钮 -->
    <div v-if="showStartButton" class="start-bar">
      <n-button
        type="primary"
        :disabled="!canStart"
        @click="handleStartGenerate"
      >
        <template #icon>
          <Icon :icon="hasResult ? 'mdi:refresh' : 'mdi:play'" :width="16" />
        </template>
        {{ hasResult ? '重新生成' : '开始' }}
      </n-button>
      <span v-if="!canStart && selectedOperation === 'write'" class="start-bar__hint">
        帮写需要输入要求才能开始
      </span>
    </div>

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
          <span v-if="isStreaming" class="preview-pane__status">
            {{ isConnected ? `${elapsedSeconds}s` : '连接中...' }}
          </span>
        </div>
        <div class="preview-pane__content preview-pane__content--result">
          <template v-if="hasResult">
            <!-- 流式期间显示纯文本（打字机效果），结束后渲染 HTML -->
            <template v-if="isStreaming">{{ resultText }}</template>
            <div v-else class="preview-pane__rich" v-html="renderedResult" />
          </template>
          <span v-else class="preview-pane__placeholder">
            {{ isStreaming && !isConnected ? '正在连接 AI 服务...' : isStreaming ? '正在生成...' : '等待生成...' }}
          </span>
          <span v-if="isStreaming" class="preview-pane__cursor">▌</span>
        </div>
      </div>
    </div>

    <!-- 多轮追问输入区 -->
    <div v-if="showRefineInput && !isStreaming" class="refine-bar">
      <n-input
        v-model:value="refineInstruction"
        type="textarea"
        placeholder="输入修改要求继续优化，如：更简洁一些、突出量化成果..."
        :autosize="{ minRows: 1, maxRows: 2 }"
        @keydown.enter.ctrl="refineGenerate"
      />
      <n-button
        type="primary"
        :disabled="!refineInstruction.trim()"
        @click="refineGenerate"
      >
        <template #icon>
          <Icon icon="mdi:refresh" :width="16" />
        </template>
        继续优化
      </n-button>
    </div>

    <template #footer>
      <div class="preview-footer">
        <n-button @click="handleCancel">
          {{ isStreaming ? '取消生成' : '不应用' }}
        </n-button>
        <n-button
          type="primary"
          :disabled="isStreaming || !hasResult"
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
import { NModal, NButton, NSpin, NInput } from 'naive-ui'
import type { AIOperation, AIServiceConfig } from '@/types/aiConfig'
import { AI_OPERATIONS } from '@/types/aiConfig'
import { markdownToHtml } from '@/utils/markdownConverter'
import { sanitizeHtml } from '@/utils/sanitizeHtml'
import { performAIOperation, streamChat, AIServiceError, AI_ERROR_MESSAGES } from '@/services/aiService'
import type { ChatMessage } from '@/services/aiService'
import { buildMessages } from '@/services/aiPrompts'
import { useAIConfigStore } from '@/stores/aiConfigStore'
import { message as naiveMessage } from '@/plugins/naive-ui'

const aiConfigStore = useAIConfigStore()

const props = defineProps<{
  visible: boolean
  config: AIServiceConfig | null
  operation: AIOperation | null
  originalText: string
  prefilledInstruction?: string
}>()

const emit = defineEmits<{
  close: []
  apply: [html: string]
}>()

const operations = AI_OPERATIONS
const resultText = ref('')
const isStreaming = ref(false)
const isConnected = ref(false)  // 首个 chunk 是否已到达
const elapsedSeconds = ref(0)   // 生成耗时（秒）
const selectedOperation = ref<AIOperation>('write')
const localCustomInstruction = ref('')
const conversationHistory = ref<ChatMessage[]>([])
const showRefineInput = ref(false)
const refineInstruction = ref('')
let abortController: AbortController | null = null
let elapsedTimer: ReturnType<typeof setInterval> | null = null

/** 原文纯文本字符数（去除 Markdown 格式标记） */
const charCount = computed(() => {
  const plain = props.originalText
    .replace(/\*\*(.+?)\*\*/g, '$1')   // 去粗体
    .replace(/\*(.+?)\*/g, '$1')       // 去斜体
    .replace(/__(.+?)__/g, '$1')       // 去下划线
    .replace(/==(.+?)==/g, '$1')       // 去高亮
    .replace(/~~(.+?)~~/g, '$1')       // 去删除线
    .replace(/\[(.+?)\]\(.+?\)/g, '$1') // 去链接，保留文字
    .replace(/^[#\-*>\s]+/gm, '')     // 去列表标记等
  return plain.replace(/\s/g, '').length
})

/** 当前选中操作的配置 */
const currentOpInfo = computed(() => {
  const op = AI_OPERATIONS.find(o => o.id === selectedOperation.value)
  return op || { id: 'write' as AIOperation, label: '帮写', icon: 'mdi:pencil-plus' }
})

/** 当前选中操作的最少字数要求 */
const selectedOpMinChars = computed(() => {
  const op = AI_OPERATIONS.find(o => o.id === selectedOperation.value)
  return op?.minChars ?? 0
})

/** 是否已有生成结果 */
const hasResult = computed(() => resultText.value.length > 0)

/** 是否显示「开始」按钮（生成未开始 或 生成已完成） */
const showStartButton = computed(() => !isStreaming.value)

/** 是否可以开始生成 */
const canStart = computed(() => {
  // 帮写必须输入要求
  if (selectedOperation.value === 'write') {
    return localCustomInstruction.value.trim().length > 0
  }
  // 定制模式需要原文 + JD
  if (selectedOperation.value === 'tailor') {
    if (selectedOpMinChars.value && charCount.value < selectedOpMinChars.value) return false
    return localCustomInstruction.value.trim().length > 0
  }
  // 其他操作需满足字数要求
  if (selectedOpMinChars.value && charCount.value < selectedOpMinChars.value) {
    return false
  }
  return true
})

/** 指令输入框 placeholder */
const instructionPlaceholder = computed(() => {
  if (selectedOperation.value === 'write') {
    return '请输入撰写要求，如：写一段前端开发的工作经历...'
  }
  if (selectedOperation.value === 'tailor') {
    return '粘贴目标职位的职位描述 (JD)... Ctrl+Enter 快速开始'
  }
  return '输入额外要求（可选），如：使用更正式的语气、突出技术细节... Ctrl+Enter 快速开始'
})

/** 将结果 Markdown 渲染为安全的 HTML（仅非流式时使用） */
const renderedResult = computed(() => {
  if (!resultText.value || isStreaming.value) return ''
  const html = markdownToHtml(resultText.value)
  return sanitizeHtml(html)
})

/** 某个操作是否可用（字数是否满足） */
function opAvailable(opId: AIOperation): boolean {
  const op = AI_OPERATIONS.find(o => o.id === opId)
  if (!op?.minChars) return true
  return charCount.value >= op.minChars
}

/** 操作的提示文字 */
function opTip(opId: AIOperation): string {
  const op = AI_OPERATIONS.find(o => o.id === opId)
  if (!op?.minChars) return op?.label || ''
  if (charCount.value >= op.minChars) return op.label
  return `${op.label}（需至少 ${op.minChars} 字，当前 ${charCount.value} 字）`
}

/** 选择操作类型 */
function selectOperation(opId: AIOperation) {
  if (isStreaming.value) return
  selectedOperation.value = opId
}

/** 弹窗打开时初始化状态 */
watch(() => props.visible, (val) => {
  if (val) {
    // 取消上一个未完成的请求
    if (abortController) {
      abortController.abort()
      abortController = null
    }
    // 重置状态
    resultText.value = ''
    isStreaming.value = false
    isConnected.value = false
    elapsedSeconds.value = 0
    localCustomInstruction.value = props.prefilledInstruction || ''
    conversationHistory.value = []
    showRefineInput.value = false
    refineInstruction.value = ''
    if (elapsedTimer) {
      clearInterval(elapsedTimer)
      elapsedTimer = null
    }

    // 根据传入的 operation 决定默认选中
    if (props.operation) {
      // 如果原操作不是 write，检查字数是否满足
      const op = AI_OPERATIONS.find(o => o.id === props.operation)
      if (op && (!op.minChars || charCount.value >= op.minChars)) {
        selectedOperation.value = props.operation
      } else {
        // 不满足字数要求，回退到 write
        selectedOperation.value = 'write'
      }
    } else {
      selectedOperation.value = 'write'
    }
    // 不自动开始，等用户点击
  }
})

/** 启动 AI 生成 */
const startGenerate = async () => {
  if (!props.config) return
  if (isStreaming.value) return
  if (!canStart.value) return

  // 取消上一个未完成的请求
  if (abortController) {
    abortController.abort()
    abortController = null
  }

  resultText.value = ''
  isStreaming.value = true
  isConnected.value = false
  elapsedSeconds.value = 0
  abortController = new AbortController()

  // 启动计时器
  elapsedTimer = setInterval(() => {
    elapsedSeconds.value++
  }, 1000)

  try {
    await performAIOperation(
      props.config,
      selectedOperation.value,
      props.originalText,
      (chunk) => {
        resultText.value += chunk
      },
      {
        signal: abortController.signal,
        customInstruction: localCustomInstruction.value,
        onConnected: () => {
          isConnected.value = true
        },
        onUsage: (usage) => {
          aiConfigStore.addUsage(usage)
        },
      },
    )

    // 生成完成后，构建对话历史，开启追问输入
    if (resultText.value) {
      const initialMessages = buildMessages(selectedOperation.value, props.originalText, localCustomInstruction.value)
      conversationHistory.value = [
        ...initialMessages,
        { role: 'assistant', content: resultText.value },
      ]
      showRefineInput.value = true
    }
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
    isConnected.value = false
    abortController = null
    if (elapsedTimer) {
      clearInterval(elapsedTimer)
      elapsedTimer = null
    }
  }
}

const handleCancel = () => {
  if (isStreaming.value && abortController) {
    abortController.abort()
  }
  emit('close')
}

/** 点击开始 / 重新生成 */
const handleStartGenerate = () => {
  conversationHistory.value = []
  showRefineInput.value = false
  startGenerate()
}

/** Ctrl+Enter 快速开始 */
const handleStartIfReady = () => {
  if (canStart.value) {
    startGenerate()
  }
}

const handleApply = () => {
  if (!hasResult.value) return
  const html = markdownToHtml(resultText.value)
  emit('apply', html)
  emit('close')
}

/** 多轮追问生成 */
const refineGenerate = async () => {
  if (!props.config || isStreaming.value || !refineInstruction.value.trim()) return

  const messages: ChatMessage[] = [...conversationHistory.value, { role: 'user', content: refineInstruction.value.trim() }]

  // 保留上一轮结果直到新内容到达，避免预览区闪空
  isStreaming.value = true
  isConnected.value = false
  elapsedSeconds.value = 0
  abortController = new AbortController()
  let newContentStarted = false

  elapsedTimer = setInterval(() => {
    elapsedSeconds.value++
  }, 1000)

  try {
    await streamChat(
      props.config,
      messages,
      (chunk) => {
        if (!newContentStarted) {
          newContentStarted = true
          resultText.value = '' // 新内容到达后再清空上一轮结果
        }
        resultText.value += chunk
        if (!isConnected.value) {
          isConnected.value = true
     }
      },
      {
        signal: abortController.signal,
        onUsage: (usage) => {
          aiConfigStore.addUsage(usage)
        },
        maxTokens: 4096,
      },
    )

    // 更新对话历史
    if (resultText.value) {
      conversationHistory.value = [
        ...messages,
        { role: 'assistant', content: resultText.value },
      ]
    }
    refineInstruction.value = ''
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
    isConnected.value = false
    abortController = null
    if (elapsedTimer) {
      clearInterval(elapsedTimer)
      elapsedTimer = null
    }
  }
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

// ========== 操作类型选择器 ==========
.operation-selector {
  padding: $spacing-sm $spacing-md;
  border-bottom: 1px solid $border-glass;
  background: rgba($primary-color, 0.03);

  &__options {
    display: flex;
    flex-wrap: wrap;
    gap: $spacing-xs;
  }

  &__warn {
    display: flex;
    align-items: center;
    gap: 4px;
    margin-top: $spacing-xs;
    font-size: $font-size-xs;
    color: $warning-color;
  }
}

.op-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border: 1px solid $border-glass;
  border-radius: $radius-lg;
  background: transparent;
  color: $text-secondary;
  font-size: $font-size-xs;
  font-family: $font-family;
  cursor: pointer;
  transition: all $transition-fast;
  white-space: nowrap;

  &:hover:not(&--disabled):not(:disabled) {
    border-color: rgba($primary-color, 0.3);
    color: $primary-light;
    background: rgba($primary-color, 0.06);
  }

  &--active {
    border-color: $primary-color;
    color: $primary-light;
    background: rgba($primary-color, 0.12);

    &:hover {
      background: rgba($primary-color, 0.18);
    }
  }

  &--disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  &__badge {
    font-size: 10px;
    opacity: 0.6;
  }
}

// ========== 自定义指令 ==========
.custom-instruction {
  padding: $spacing-sm $spacing-md;
  border-bottom: 1px solid $border-glass;
  background: rgba($primary-color, 0.02);
}

// ========== 开始按钮栏 ==========
.start-bar {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  padding: $spacing-xs $spacing-md;
  border-bottom: 1px solid $border-glass;

  &__hint {
    font-size: $font-size-xs;
    color: $text-light;
  }
}

// ========== 预览区域 ==========
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

  &__status {
    font-size: 11px;
    color: $text-light;
    font-weight: 400;
  }

  &__rich {
    :deep(p) {
      margin: 0 0 0.5em;
      &:last-child { margin-bottom: 0; }
    }
    :deep(strong) { font-weight: 700; }
    :deep(em) { font-style: italic; }
    :deep(u) { text-decoration: underline; }
    :deep(s) { text-decoration: line-through; }
    :deep(mark) { border-radius: 2px; padding: 0 2px; }
    :deep(a) { color: $primary-light; text-decoration: underline; }
    :deep(ul) { list-style-type: disc; margin: 0.5em 0; padding-left: 1.5em; }
    :deep(ol) { list-style-type: decimal; margin: 0.5em 0; padding-left: 1.5em; }
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

// ========== 多轮追问栏 ==========
.refine-bar {
  display: flex;
  gap: $spacing-sm;
  padding: $spacing-sm $spacing-md;
  border-top: 1px solid $border-glass;
  align-items: flex-end;
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
