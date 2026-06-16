<template>
  <n-modal
    :show="visible"
    preset="card"
    :style="{ maxWidth: '680px', width: '90vw' }"
    :mask-closable="false"
    @update:show="v => { if (!v) handleCancel() }"
  >
    <template #header>
      <div class="jd-scan-header">
        <Icon icon="mdi:text-search" :width="20" />
        <span>JD 关键词扫描</span>
      </div>
    </template>

    <!-- JD 输入区 -->
    <div v-if="!isStreaming && !hasResult" class="jd-scan-input">
      <n-input
        v-model:value="jdText"
        type="textarea"
        placeholder="粘贴目标职位的 JD（职位描述），Ctrl+Enter 快速开始..."
        :autosize="{ minRows: 4, maxRows: 10 }"
        @keydown.enter.ctrl="handleStartScan"
      />
      <div class="jd-scan-input__hint">
        AI 将提取 JD 中的关键技能和要求，与你的简历内容进行匹配分析
      </div>
      <n-button
        type="primary"
        :disabled="!jdText.trim()"
        @click="handleStartScan"
      >
        <template #icon>
          <Icon icon="mdi:play" :width="16" />
        </template>
        开始扫描
      </n-button>
    </div>

    <!-- 扫描结果区 -->
    <div v-else class="jd-scan-result">
      <!-- 匹配度圆环 -->
      <div v-if="matchScore !== null" class="jd-scan-result__score">
        <div class="score-ring" :style="scoreRingStyle">
          <span class="score-ring__value">{{ matchScore }}%</span>
        </div>
        <div class="score-ring__label">{{ getScoreLabel(matchScore) }}</div>
      </div>

      <!-- 流式渲染区 -->
      <div class="jd-scan-result__content">
        <template v-if="isStreaming">{{ resultText }}</template>
        <div v-else-if="hasResult" class="jd-scan-result__rich" v-html="renderedResult" />
        <span v-if="isStreaming && !isConnected" class="jd-scan-result__placeholder">正在连接 AI 服务...</span>
        <span v-if="isStreaming && isConnected && !hasResult" class="jd-scan-result__placeholder">正在分析...</span>
        <span v-if="isStreaming" class="jd-scan-result__cursor">▌</span>
      </div>
    </div>

    <template #footer>
      <div class="jd-scan-footer">
        <n-button @click="handleCancel">
          {{ isStreaming ? '取消扫描' : hasResult ? '重新扫描' : '取消' }}
        </n-button>
      </div>
    </template>
  </n-modal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Icon } from '@iconify/vue'
import { NModal, NButton, NInput } from 'naive-ui'
import type { AIServiceConfig } from '@/types/aiConfig'
import { streamChat, AIServiceError, AI_ERROR_MESSAGES } from '@/services/aiService'
import { buildMessages } from '@/services/aiPrompts'
import { useResumeStore } from '@/stores/resumeStore'
import { useAIConfigStore } from '@/stores/aiConfigStore'
import { serializeResumeForEvaluation } from '@/services/resumeSerializer'
import { markdownToHtml } from '@/utils/markdownConverter'
import { sanitizeHtml } from '@/utils/sanitizeHtml'
import { getScoreColor, getScoreLabel } from '@/utils/evaluationScore'
import { message as naiveMessage } from '@/plugins/naive-ui'

const resumeStore = useResumeStore()
const aiConfigStore = useAIConfigStore()

const props = defineProps<{
  visible: boolean
  config: AIServiceConfig | null
}>()

const emit = defineEmits<{
  close: []
}>()

const jdText = ref('')
const resultText = ref('')
const isStreaming = ref(false)
const isConnected = ref(false)
const matchScore = ref<number | null>(null)
let abortController: AbortController | null = null

const hasResult = computed(() => resultText.value.length > 0)

const scoreRingStyle = computed(() => {
  const score = matchScore.value
  if (score === null) return {}
  const color = getScoreColor(score)
  const percentage = score / 100
  return {
    '--ring-color': color,
    '--ring-percentage': `${percentage}`,
  }
})

const renderedResult = computed(() => {
  if (!resultText.value || isStreaming.value) return ''
  const html = markdownToHtml(resultText.value)
  return sanitizeHtml(html)
})

// 实时提取分数（流式期间降频，仅每 500ms 解析一次）
let scoreParseTimer: ReturnType<typeof setTimeout> | null = null
let pendingScoreText = ''

watch(resultText, (text) => {
  if (!text) { matchScore.value = null; return }
  pendingScoreText = text
  // 流式期间节流，非流式时立即解析
  if (!isStreaming.value) {
    parseScore(text)
  } else if (!scoreParseTimer) {
    scoreParseTimer = setTimeout(() => {
      scoreParseTimer = null
      parseScore(pendingScoreText)
    }, 500)
  }
})

function parseScore(text: string) {
  const match = text.match(/匹配度[^\d]*(\d{1,3})\s*%/)
  matchScore.value = match ? parseInt(match[1]) : null
}

// 弹窗打开/关闭时初始化
watch(() => props.visible, (val) => {
  if (val) {
    resultText.value = ''
    isStreaming.value = false
    isConnected.value = false
    matchScore.value = null
    jdText.value = ''
  }
})

const handleStartScan = async () => {
  if (!props.config || !jdText.value.trim() || isStreaming.value) return

  const resume = resumeStore.currentResume
  if (!resume) {
    naiveMessage.warning('请先打开一份简历')
    return
  }

  // 取消上一个请求
  if (abortController) {
    abortController.abort()
    abortController = null
  }

  resultText.value = ''
  isStreaming.value = true
  isConnected.value = false
  matchScore.value = null
  abortController = new AbortController()

  const resumeText = serializeResumeForEvaluation(resume)
  const messages = buildMessages('scan', resumeText, jdText.value.trim())

  try {
    await streamChat(
      props.config,
      messages,
      (chunk) => {
        resultText.value += chunk
        if (!isConnected.value) isConnected.value = true
      },
      {
        signal: abortController.signal,
        onUsage: (usage) => {
          aiConfigStore.addUsage(usage)
        },
        maxTokens: 4096,
      },
    )
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      // 用户取消
    } else if (err instanceof AIServiceError) {
      naiveMessage.error(AI_ERROR_MESSAGES[err.code] || err.message)
    } else {
      naiveMessage.error('JD 扫描失败，请重试')
    }
  } finally {
    isStreaming.value = false
    isConnected.value = false
    abortController = null
  }
}

const handleCancel = () => {
  if (isStreaming.value && abortController) {
    abortController.abort()
  }
  emit('close')
}
</script>

<style lang="scss" scoped>
.jd-scan-header {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  font-weight: 600;
  @include gradient-text;
}

.jd-scan-input {
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;

  &__hint {
    font-size: $font-size-xs;
    color: $text-light;
  }
}

.jd-scan-result {
  display: flex;
  flex-direction: column;
  gap: $spacing-md;

  &__score {
    display: flex;
    align-items: center;
    gap: $spacing-md;
  }

  &__content {
    min-height: 150px;
    max-height: 400px;
    overflow-y: auto;
    padding: $spacing-md;
    font-size: $font-size-sm;
    line-height: 1.7;
    white-space: pre-wrap;
    word-break: break-word;
    @include scrollbar;
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

// 匹配度圆环
.score-ring {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: conic-gradient(
    var(--ring-color) calc(var(--ring-percentage) * 360deg),
    rgba($text-light, 0.2) calc(var(--ring-percentage) * 360deg)
  );
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;

  &::before {
    content: '';
    width: 56px;
    height: 56px;
    border-radius: 50%;
    background: $bg-glass;
    position: absolute;
  }

  &__value {
    position: relative;
    z-index: 1;
    font-size: 16px;
    font-weight: 700;
    color: $text-primary;
    font-variant-numeric: tabular-nums;
  }

  &__label {
    font-size: $font-size-sm;
    font-weight: 600;
    color: $text-secondary;
  }
}

.jd-scan-footer {
  display: flex;
  justify-content: flex-end;
}

@keyframes blink {
  50% { opacity: 0; }
}
</style>
