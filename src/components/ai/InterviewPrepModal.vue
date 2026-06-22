<template>
  <n-modal
    :show="visible"
    preset="card"
    :style="{ maxWidth: '680px', width: '90vw' }"
    :mask-closable="false"
    @update:show="(v: boolean) => { if (!v) handleClose() }"
  >
    <template #header>
      <div class="interview-header">
        <Icon icon="mdi:account-tie" :width="20" />
        <span>面试准备</span>
      </div>
    </template>

    <!-- 隐私提示 -->
    <div v-if="!isStreaming && !hasResult" class="interview-privacy">
      <Icon icon="mdi:shield-check-outline" :width="14" />
      <span>您的姓名、联系方式等个人敏感信息已自动替换为占位符，不会发送给 AI，仅用于生成面试题</span>
    </div>

    <!-- JD 输入区 -->
    <div v-if="!isStreaming && !hasResult" class="interview-input">
      <n-input
        v-model:value="jdText"
        type="textarea"
        placeholder="粘贴目标职位的 JD（可选），AI 将结合 JD 生成针对性面试题。留空则根据简历生成通用面试题。Ctrl+Enter 快速开始..."
        :autosize="{ minRows: 4, maxRows: 10 }"
        @keydown.enter.ctrl="handleStartPrep"
      />
      <div class="interview-input__hint">
        AI 将根据您的简历（和 JD）生成行为面试题、技术面试题和复习要点
      </div>
      <n-button
        type="primary"
        @click="handleStartPrep"
      >
        <template #icon>
          <Icon icon="mdi:play" :width="16" />
        </template>
        开始准备
      </n-button>
    </div>

    <!-- 结果区 -->
    <div v-else class="interview-result">
      <!-- 操作栏：上次准备时间 -->
      <div v-if="!isStreaming && hasResult && isLoadedResult" class="interview-result__hint">
        <Icon icon="mdi:clock-outline" :width="14" />
        上次准备于 {{ preparedAtLabel }}
      </div>

      <!-- 截断警告 -->
      <div v-if="wasTruncated && hasResult && !isStreaming" class="interview-truncation-warning">
        <Icon icon="mdi:alert-outline" :width="16" />
        AI 输出因长度限制被截断，结果可能不完整
      </div>

      <!-- Tab 切换：面试准备 / 原始 JD -->
      <n-tabs v-if="hasResult && !isStreaming" v-model:value="activeTab" type="line" size="small">
        <n-tab-pane name="result" tab="面试准备">
          <div class="interview-result__content">
            <div class="interview-result__rich" v-html="renderedResult" />
          </div>
        </n-tab-pane>
        <n-tab-pane v-if="jdText" name="jd" tab="原始 JD">
          <div class="interview-result__jd-text">{{ jdText }}</div>
        </n-tab-pane>
      </n-tabs>

      <!-- 流式期间：直接显示结果（无 Tab） -->
      <template v-if="isStreaming">
        <div class="interview-result__content">
          <template>{{ resultText }}</template>
          <span v-if="!isConnected" class="interview-result__placeholder">正在连接 AI 服务...</span>
          <span v-if="isConnected && !hasResult" class="interview-result__placeholder">正在生成面试题...</span>
          <span class="interview-result__cursor">▌</span>
        </div>
      </template>
    </div>

    <template #footer>
      <div class="interview-footer">
        <n-button
          v-if="isStreaming || hasResult"
          type="primary"
          :ghost="hasResult && !isStreaming"
          @click="handleStartPrep"
        >
          <template #icon>
            <Icon :icon="isStreaming ? 'mdi:stop' : 'mdi:refresh'" :width="16" />
          </template>
          {{ isStreaming ? '取消生成' : '重新生成' }}
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
import { formatDateTime } from '@/utils/evaluationScore'
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
const wasTruncated = ref(false)
const isLoadedResult = ref(false)
const loadedPreparedAt = ref('')
const activeTab = ref('result')
let abortController: AbortController | null = null
let saveDone = false

const hasResult = computed(() => resultText.value.length > 0)

const preparedAtLabel = computed(() => formatDateTime(loadedPreparedAt.value))

const renderedResult = computed(() => {
  if (!resultText.value || isStreaming.value) return ''
  const html = markdownToHtml(resultText.value)
  return sanitizeHtml(html)
})

// 弹窗打开/关闭时初始化
watch(() => props.visible, (val) => {
  if (val) {
    if (abortController) {
      abortController.abort()
      abortController = null
    }
    isStreaming.value = false
    isConnected.value = false
    activeTab.value = 'result'

    // 加载上次准备结果
    const last = resumeStore.currentResume?.lastInterview
    if (last?.text) {
      resultText.value = last.text
      jdText.value = last.jdText || ''
      isLoadedResult.value = true
      loadedPreparedAt.value = last.preparedAt
    } else {
      resultText.value = ''
      jdText.value = ''
      isLoadedResult.value = false
      loadedPreparedAt.value = ''
    }
  }
})

const handleStartPrep = async () => {
  // 流式中点击 → 取消
  if (isStreaming.value) {
    if (abortController) abortController.abort()
    return
  }

  if (!props.config) {
    naiveMessage.warning('请先配置 AI 服务')
    return
  }

  const resume = resumeStore.currentResume
  if (!resume) {
    naiveMessage.warning('请先打开一份简历')
    return
  }

  // 检查简历内容是否为空
  const resumeText = serializeResumeForEvaluation(resume)
  if (!resumeText.trim()) {
    naiveMessage.warning('简历内容为空，无法生成面试题')
    return
  }

  if (abortController) {
    abortController.abort()
    abortController = null
  }

  resultText.value = ''
  isStreaming.value = true
  isConnected.value = false
  wasTruncated.value = false
  isLoadedResult.value = false
  saveDone = false
  activeTab.value = 'result'
  abortController = new AbortController()

  const messages = buildMessages('interview', resumeText, jdText.value.trim() || undefined)

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
      naiveMessage.error('面试准备生成失败，请重试')
    }
  } finally {
    isStreaming.value = false
    isConnected.value = false
    abortController = null
    if (!saveDone && resultText.value && resume.id) {
      saveDone = true
      resumeStore.saveInterviewResult(resume.id, {
        text: resultText.value,
        jdText: jdText.value,
        preparedAt: new Date().toISOString(),
      })
    }
  }
}

const handleClose = () => {
  if (isStreaming.value && abortController) {
    abortController.abort()
    const resume = resumeStore.currentResume
    if (!saveDone && resultText.value && resume?.id) {
      saveDone = true
      resumeStore.saveInterviewResult(resume.id, {
        text: resultText.value,
        jdText: jdText.value,
        preparedAt: new Date().toISOString(),
      })
    }
  }
  emit('close')
}
</script>

<style lang="scss" scoped>
.interview-header {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  font-weight: 600;
  @include gradient-text;
}

.interview-input {
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;

  &__hint {
    font-size: $font-size-xs;
    color: $text-light;
  }
}

.interview-privacy {
  @include privacy-notice;
}

.interview-result {
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
    :deep(h2) { font-size: 1.1em; font-weight: 700; margin: 1em 0 0.5em; }
    :deep(h3) { font-size: 1em; font-weight: 700; margin: 0.8em 0 0.4em; }
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

.interview-footer {
  display: flex;
  justify-content: center;
  gap: $spacing-sm;
  padding-top: $spacing-md;
}

.interview-truncation-warning {
  @include truncation-warning;
}

@keyframes blink {
  50% { opacity: 0; }
}
</style>
