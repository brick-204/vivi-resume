<template>
  <n-modal
    :show="visible"
    preset="card"
    :style="{ maxWidth: '680px', width: '90vw' }"
    :mask-closable="false"
    @update:show="v => { if (!v) handleClose() }"
  >
    <template #header>
      <div class="jd-scan-header">
        <Icon icon="mdi:text-search" :width="20" />
        <span>JD 关键词扫描</span>
      </div>
    </template>

    <!-- 隐私提示 -->
    <div v-if="!isStreaming" class="jd-scan-privacy">
      <Icon icon="mdi:shield-check-outline" :width="14" />
      <span>您的姓名、联系方式等个人敏感信息已自动替换为占位符，不会发送给 AI，仅用于分析简历内容匹配度</span>
    </div>

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
      <!-- 操作栏：上次扫描时间 -->
      <div v-if="!isStreaming && hasResult && isLoadedResult" class="jd-scan-result__hint">
        <Icon icon="mdi:clock-outline" :width="14" />
        上次扫描于 {{ scannedAtLabel }}
      </div>

      <!-- 截断警告 -->
      <div v-if="wasTruncated && hasResult && !isStreaming" class="jd-truncation-warning">
        <Icon icon="mdi:alert-outline" :width="16" />
        AI 输出因长度限制被截断，结果可能不完整
      </div>

      <!-- Tab 切换：扫描结果 / 原始 JD -->
      <n-tabs v-if="hasResult && !isStreaming" v-model:value="activeTab" type="line" size="small">
        <n-tab-pane name="result" tab="扫描结果">
          <!-- 匹配度圆环 -->
          <div v-if="matchScore !== null" class="jd-scan-result__score">
            <div class="score-ring" :style="scoreRingStyle">
              <span class="score-ring__value">{{ matchScore }}%</span>
            </div>
            <div class="score-ring__info">
              <span class="score-ring__label">{{ getScoreLabel(matchScore) }}</span>
              <span class="score-ring__desc">匹配度</span>
            </div>
          </div>

          <!-- 结果内容 -->
          <div class="jd-scan-result__content">
            <div class="jd-scan-result__rich" v-html="renderedResult" />
          </div>
        </n-tab-pane>
        <n-tab-pane name="jd" tab="原始 JD">
          <div class="jd-scan-result__jd-text">{{ jdText }}</div>
        </n-tab-pane>
      </n-tabs>

      <!-- 流式期间：直接显示结果（无 Tab） -->
      <template v-if="isStreaming">
        <!-- 匹配度圆环 -->
        <div v-if="matchScore !== null" class="jd-scan-result__score">
          <div class="score-ring" :style="scoreRingStyle">
            <span class="score-ring__value">{{ matchScore }}%</span>
          </div>
          <div class="score-ring__info">
            <span class="score-ring__label">{{ getScoreLabel(matchScore) }}</span>
            <span class="score-ring__desc">匹配度</span>
          </div>
        </div>

        <div class="jd-scan-result__content">
          <template>{{ resultText }}</template>
          <span v-if="!isConnected" class="jd-scan-result__placeholder">正在连接 AI 服务...</span>
          <span v-if="isConnected && !hasResult" class="jd-scan-result__placeholder">正在分析...</span>
          <span class="jd-scan-result__cursor">▌</span>
        </div>
      </template>
    </div>

    <template #footer>
      <div class="jd-scan-footer">
        <n-button
          v-if="isStreaming || hasResult"
          type="primary"
          :ghost="hasResult && !isStreaming"
          :disabled="isStreaming ? false : !jdText.trim()"
          @click="handleStartScan"
        >
          <template #icon>
            <Icon :icon="isStreaming ? 'mdi:stop' : 'mdi:refresh'" :width="16" />
          </template>
          {{ isStreaming ? '取消扫描' : '重新扫描' }}
        </n-button>
        <n-button @click="handleClose">关闭</n-button>
      </div>
    </template>
  </n-modal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Icon } from '@iconify/vue'
import { NModal, NButton, NInput, NTabs, NTabPane } from 'naive-ui'
import type { AIServiceConfig } from '@/types/aiConfig'
import { streamChat, AIServiceError, AI_ERROR_MESSAGES } from '@/services/aiService'
import { buildMessages } from '@/services/aiPrompts'
import { useResumeStore } from '@/stores/resumeStore'
import { useAIConfigStore } from '@/stores/aiConfigStore'
import { serializeResumeForEvaluation } from '@/services/resumeSerializer'
import { markdownToHtml } from '@/utils/markdownConverter'
import { sanitizeHtml } from '@/utils/sanitizeHtml'
import { getScoreColor, getScoreLabel, formatDateTime } from '@/utils/evaluationScore'
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
const wasTruncated = ref(false)
const isLoadedResult = ref(false)   // 当前显示的是从 store 加载的旧结果
const loadedScannedAt = ref('')     // 旧结果的扫描时间
const activeTab = ref('result')     // Tab 切换：result | jd
let abortController: AbortController | null = null
let saveDone = false  // 防止 handleClose 和 finally 双重保存

const hasResult = computed(() => resultText.value.length > 0)

/** 上次扫描时间的可读文本 */
const scannedAtLabel = computed(() => formatDateTime(loadedScannedAt.value))

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
    // 取消上一个未完成的请求
    if (abortController) {
      abortController.abort()
      abortController = null
    }
    // 清理可能残留的分数解析定时器
    if (scoreParseTimer) {
      clearTimeout(scoreParseTimer)
      scoreParseTimer = null
    }
    isStreaming.value = false
    isConnected.value = false
    activeTab.value = 'result'

    // 加载上次扫描结果（如果有）
    const last = resumeStore.currentResume?.lastJdScan
    if (last?.text) {
      resultText.value = last.text
      jdText.value = last.jdText || ''
      matchScore.value = last.score
      isLoadedResult.value = true
      loadedScannedAt.value = last.scannedAt
      // 立即解析一次分数确保一致
      parseScore(last.text)
    } else {
      resultText.value = ''
      jdText.value = ''
      matchScore.value = null
      isLoadedResult.value = false
      loadedScannedAt.value = ''
    }
  }
})

const handleStartScan = async () => {
  // 流式中点击 → 取消扫描
  if (isStreaming.value) {
    if (abortController) {
      abortController.abort()
    }
    return
  }

  if (!props.config || !jdText.value.trim()) return

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
  wasTruncated.value = false
  isLoadedResult.value = false
  saveDone = false
  activeTab.value = 'result'
  abortController = new AbortController()

  const resumeText = serializeResumeForEvaluation(resume)
  const messages = buildMessages('scan', resumeText, jdText.value.trim())

  try {
    const result = await streamChat(
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
    wasTruncated.value = result.wasTruncated
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
    // 保存扫描结果到 store
    if (!saveDone && resultText.value && resume.id) {
      saveDone = true
      resumeStore.saveJdScanResult(resume.id, {
        score: matchScore.value,
        text: resultText.value,
        jdText: jdText.value,
        scannedAt: new Date().toISOString(),
      })
    }
  }
}

const handleClose = () => {
  if (isStreaming.value && abortController) {
    abortController.abort()
    // 用户中止时保存已接收的部分结果
    const resume = resumeStore.currentResume
    if (!saveDone && resultText.value && resume?.id) {
      saveDone = true
      resumeStore.saveJdScanResult(resume.id, {
        score: matchScore.value,
        text: resultText.value,
        jdText: jdText.value,
        scannedAt: new Date().toISOString(),
      })
    }
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

// ========== 隐私提示 ==========
.jd-scan-privacy {
  @include privacy-notice;
}

.jd-scan-result {
  display: flex;
  flex-direction: column;
  gap: $spacing-md;

  &__hint {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: $font-size-xs;
    color: $text-light;
  }

  &__score {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: $spacing-lg;
    padding: $spacing-lg 0;
    background: $bg-glass;
    border: 1px solid $border-glass;
    border-radius: $radius-md;
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

  &__jd-text {
    padding: $spacing-md;
    font-size: $font-size-sm;
    line-height: 1.7;
    white-space: pre-wrap;
    word-break: break-word;
    color: $text-primary;
    background: $bg-glass;
    border: 1px solid $border-glass;
    border-radius: $radius-md;
    max-height: 400px;
    overflow-y: auto;
    @include scrollbar;
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
  width: 90px;
  height: 90px;
  border-radius: 50%;
  background: conic-gradient(
    var(--ring-color) calc(var(--ring-percentage) * 360deg),
    rgba($text-light, 0.15) calc(var(--ring-percentage) * 360deg)
  );
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;

  &::before {
    content: '';
    width: 70px;
    height: 70px;
    border-radius: 50%;
    background: $bg-glass;
    position: absolute;
  }

  &__value {
    position: relative;
    z-index: 1;
    font-size: 20px;
    font-weight: 700;
    color: $text-primary;
    font-variant-numeric: tabular-nums;
  }

  &__info {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  &__label {
    font-size: $font-size-lg;
    font-weight: 700;
    color: var(--ring-color);
  }

  &__desc {
    font-size: $font-size-xs;
    color: $text-secondary;
  }
}

.jd-scan-footer {
  display: flex;
  justify-content: center;
  gap: $spacing-sm;
  padding-top: $spacing-md;
}

@keyframes blink {
  50% { opacity: 0; }
}

// ========== 截断警告 ==========
.jd-truncation-warning {
  @include truncation-warning;
}
</style>
