<template>
  <n-modal
    :show="show"
    preset="card"
    :style="{ maxWidth: '760px', width: '90vw' }"
    :mask-closable="false"
    @update:show="(v: boolean) => { if (!v) handleClose() }"
  >
    <template #header>
      <div class="ia-header">
        <Icon icon="mdi:robot-outline" :width="20" />
        <span>{{ headerTitle }}</span>
      </div>
    </template>

    <!-- 未配置 AI：引导 -->
    <div v-if="!hasActiveConfig" class="ia-no-config">
      <Icon icon="mdi:alert-outline" :width="20" />
      <span class="ia-no-config__msg">请先配置 AI 服务后使用</span>
      <n-button size="small" type="primary" @click="goToAISettings">
        前往配置
      </n-button>
    </div>

    <template v-else>
      <n-tabs v-if="mode !== 'parseJd'" v-model:value="activeMode" type="line" size="small" @update:value="onModeChange">
        <n-tab-pane name="mockInterview" tab="模拟面试" />
        <n-tab-pane name="review" tab="面试复盘" />
        <n-tab-pane name="parseJd" tab="JD 解析" />
      </n-tabs>

      <!-- 输入区（非流式且无结果时） -->
      <div v-if="!isStreaming && !hasResult" class="ia-input">
        <!-- 模拟面试 -->
        <template v-if="activeMode === 'mockInterview'">
          <n-input
            v-model:value="mockPosition"
            placeholder="岗位名称，如：高级前端工程师"
          />
          <n-input
            v-model:value="mockJd"
            type="textarea"
            placeholder="粘贴目标职位的 JD（可选，结合 JD 生成针对性面试题）"
            :autosize="{ minRows: 4, maxRows: 10 }"
          />
          <n-select
            v-model:value="mockResumeId"
            :options="resumeOptions"
            placeholder="关联简历（可选，注入简历摘要生成更贴合的题目）"
            clearable
          />
        </template>

        <!-- 面试复盘 -->
        <template v-else-if="activeMode === 'review'">
          <n-input
            v-model:value="reviewPosition"
            placeholder="岗位名称"
          />
          <n-input
            v-model:value="reviewJd"
            type="textarea"
            placeholder="JD（可选）"
            :autosize="{ minRows: 3, maxRows: 8 }"
          />
          <n-select
            v-if="roundOptions.length > 0"
            v-model:value="reviewRoundId"
            :options="roundOptions"
            placeholder="选择某轮面试自动带出问题/回答（也可手填）"
            clearable
            @update:value="onRoundSelect"
          />
          <n-input
            v-model:value="reviewQuestions"
            type="textarea"
            placeholder="面试问题（多行）"
            :autosize="{ minRows: 3, maxRows: 8 }"
          />
          <n-input
            v-model:value="reviewAnswers"
            type="textarea"
            placeholder="我的回答（多行）"
            :autosize="{ minRows: 4, maxRows: 12 }"
          />
        </template>

        <!-- JD 解析 -->
        <template v-else>
          <n-input
            v-model:value="jdText"
            type="textarea"
            placeholder="粘贴 JD 文本，AI 将提取公司/职位/薪资/地点/正文"
            :autosize="{ minRows: 6, maxRows: 14 }"
            @keydown.enter.ctrl="handleStart"
          />
        </template>

        <n-button type="primary" @click="handleStart">
          <template #icon>
            <Icon icon="mdi:play" :width="16" />
          </template>
          开始
        </n-button>
      </div>

      <!-- 结果区 -->
      <div v-else class="ia-result">
        <!-- 截断警告 -->
        <div v-if="wasTruncated && hasResult && !isStreaming" class="ia-truncation-warning">
          <Icon icon="mdi:alert-outline" :width="16" />
          AI 输出因长度限制被截断，结果可能不完整
        </div>

        <!-- 错误状态 -->
        <div v-if="errorMessage && !isStreaming" class="ia-error-card">
          <Icon icon="mdi:alert-circle-outline" :width="16" />
          <span class="ia-error-card__msg">{{ errorMessage }}</span>
          <n-button size="small" type="primary" ghost @click="handleStart">重试</n-button>
        </div>

        <!-- 流式期间：纯文本 + 光标 -->
        <div v-if="isStreaming" class="ia-result__content">
          {{ resultText }}
          <span v-if="!isConnected" class="ia-result__placeholder">正在连接 AI 服务...</span>
          <span v-if="isConnected && !hasResult" class="ia-result__placeholder">{{ placeholderText }}</span>
          <span class="ia-result__cursor" aria-hidden="true">▌</span>
        </div>

        <!-- 完成：mockInterview/review 渲染 markdown -->
        <div
          v-else-if="hasResult && activeMode !== 'parseJd'"
          class="ia-result__content"
        >
          <div class="ia-result__rich" v-html="renderedResult" />
        </div>

        <!-- 完成：parseJd 不在此渲染（成功时已 emit 关闭，失败走错误卡片） -->
      </div>
    </template>

    <template #footer>
      <div class="ia-footer">
        <n-button
          v-if="isStreaming || hasResult"
          type="primary"
          :ghost="hasResult && !isStreaming"
          :autofocus="isStreaming"
          @click="handleStart"
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
import { NModal, NButton, NInput, NSelect, NTabs, NTabPane } from 'naive-ui'
import { useRouter } from 'vue-router'
import { streamChat, AIServiceError, AI_ERROR_MESSAGES } from '@/services/aiService'
import type { ChatMessage } from '@/services/aiService'
import { useAIConfigStore } from '@/stores/aiConfigStore'
import { useResumeStore } from '@/stores/resumeStore'
import { useInterviewStore } from '@/stores/interviewStore'
import { serializeResumeForEvaluation } from '@/services/resumeSerializer'
import { markdownToHtml } from '@/utils/markdownConverter'
import { sanitizeHtml } from '@/utils/sanitizeHtml'
import {
  buildMockInterviewMessages,
  buildInterviewReviewMessages,
  buildParseJdMessages,
} from '@/services/interviewPrompts'
import { message as naiveMessage } from '@/plugins/naive-ui'

type Mode = 'mockInterview' | 'review' | 'parseJd'

const props = withDefaults(defineProps<{
  show: boolean
  mode?: Mode
  interviewId?: string | null
}>(), {
  mode: 'mockInterview',
  interviewId: null,
})

const emit = defineEmits<{
  close: []
  'parsed-jd': [fields: { company: string; position: string; salary: string; location: string; jd: string }]
}>()

const router = useRouter()
const aiConfigStore = useAIConfigStore()
const resumeStore = useResumeStore()
const interviewStore = useInterviewStore()

const hasActiveConfig = computed(() => !!aiConfigStore.activeConfig)

// JD 解析入口（从新建面试进来）仅此单一功能，标题改为「JD 解析与提取」；
// 其余入口为三合一 AI 助手面板
const headerTitle = computed(() =>
  props.mode === 'parseJd' ? 'JD 解析与提取' : '面试 AI 助手',
)

// ========== 流式状态机（照搬 InterviewPrepModal） ==========
const resultText = ref('')
const isStreaming = ref(false)
const isConnected = ref(false)
const wasTruncated = ref(false)
const errorMessage = ref('')
let abortController: AbortController | null = null

const hasResult = computed(() => resultText.value.length > 0)

const renderedResult = computed(() => {
  if (!resultText.value || isStreaming.value) return ''
  return sanitizeHtml(markdownToHtml(resultText.value))
})

const placeholderText = computed(() => {
  if (activeMode.value === 'parseJd') return '正在解析 JD...'
  if (activeMode.value === 'review') return '正在复盘面试...'
  return '正在生成面试题...'
})

// ========== 当前模式 ==========
const activeMode = ref<Mode>(props.mode)

// ========== 模拟面试输入 ==========
const mockPosition = ref('')
const mockJd = ref('')
const mockResumeId = ref<string | null>(null)

const resumeOptions = computed(() =>
  resumeStore.resumeList.map(r => ({ label: r.title || r.id, value: r.id })),
)

// ========== 面试复盘输入 ==========
const reviewPosition = ref('')
const reviewJd = ref('')
const reviewRoundId = ref<string | null>(null)
const reviewQuestions = ref('')
const reviewAnswers = ref('')

const targetInterview = computed(() =>
  props.interviewId
    ? interviewStore.interviews.find(i => i.id === props.interviewId) ?? null
    : null,
)

const roundOptions = computed(() => {
  if (!targetInterview.value) return []
  return targetInterview.value.rounds.map((r, idx) => ({
    label: `第 ${idx + 1} 轮（${r.roundType}）${r.interviewer ? '· ' + r.interviewer : ''}`,
    value: r.id,
  }))
})

const onRoundSelect = (roundId: string | null) => {
  if (!roundId || !targetInterview.value) return
  const round = targetInterview.value.rounds.find(r => r.id === roundId)
  if (!round) return
  reviewQuestions.value = round.questions
  reviewAnswers.value = round.answers
}

// ========== JD 解析输入 ==========
const jdText = ref('')

// ========== 弹窗打开/关闭初始化 ==========
watch(() => props.show, (val) => {
  if (val) {
    if (abortController) {
      abortController.abort()
      abortController = null
    }
    isStreaming.value = false
    isConnected.value = false
    wasTruncated.value = false
    errorMessage.value = ''
    resultText.value = ''
    activeMode.value = props.mode

    // 复盘模式：若提供 interviewId，预填 position/jd
    if (props.mode === 'review' && targetInterview.value) {
      reviewPosition.value = targetInterview.value.position || ''
      reviewJd.value = targetInterview.value.jd || ''
    }
  }
})

const onModeChange = () => {
  // 切换模式：流式中先 abort 旧请求（否则后台 chunk 继续累积进新 resultText，结果与模式错位）
  if (isStreaming.value && abortController) {
    abortController.abort()
    abortController = null
    isStreaming.value = false
    isConnected.value = false
  }
  // 清空当前结果与错误，保留各模式输入
  resultText.value = ''
  errorMessage.value = ''
  wasTruncated.value = false
}

// ========== 构造消息 ==========
const buildMessagesForMode = (): ChatMessage[] => {
  if (activeMode.value === 'mockInterview') {
    let resumeText: string | undefined
    if (mockResumeId.value) {
      const resume = resumeStore.resumeList.find(r => r.id === mockResumeId.value)
      if (resume) resumeText = serializeResumeForEvaluation(resume)
    }
    return buildMockInterviewMessages({
      position: mockPosition.value.trim(),
      jd: mockJd.value.trim(),
      resumeText,
    })
  }
  if (activeMode.value === 'review') {
    return buildInterviewReviewMessages({
      position: reviewPosition.value.trim(),
      jd: reviewJd.value.trim(),
      questions: reviewQuestions.value.trim(),
      answers: reviewAnswers.value.trim(),
    })
  }
  return buildParseJdMessages({ jdText: jdText.value.trim() })
}

// ========== 校验输入 ==========
const validateInput = (): string | null => {
  if (activeMode.value === 'mockInterview') {
    if (!mockPosition.value.trim()) return '请填写岗位名称'
    return null
  }
  if (activeMode.value === 'review') {
    if (!reviewQuestions.value.trim()) return '请填写面试问题'
    if (!reviewAnswers.value.trim()) return '请填写你的回答'
    return null
  }
  if (!jdText.value.trim()) return '请粘贴 JD 文本'
  return null
}

// ========== JD 解析结果处理 ==========
const handleParseJdResult = (finalText: string): boolean => {
  // strip 可能的 ```json 代码块标记
  let cleaned = finalText.trim()
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/,'')
  try {
    const parsed = JSON.parse(cleaned)
    const fields = {
      company: typeof parsed.company === 'string' ? parsed.company : '',
      position: typeof parsed.position === 'string' ? parsed.position : '',
      salary: typeof parsed.salary === 'string' ? parsed.salary : '',
      location: typeof parsed.location === 'string' ? parsed.location : '',
      jd: typeof parsed.jd === 'string' ? parsed.jd : '',
    }
    emit('parsed-jd', fields)
    naiveMessage.success('JD 解析成功，已回填')
    return true
  } catch {
    naiveMessage.error('JD 解析失败，请重试或精简 JD')
    errorMessage.value = 'JD 解析失败：AI 输出不是有效 JSON，请重试或精简 JD'
    return false
  }
}

// ========== 开始 ==========
const handleStart = async () => {
  // 流式中点击 → 取消
  if (isStreaming.value) {
    if (abortController) abortController.abort()
    return
  }

  const config = aiConfigStore.activeConfig
  if (!config) {
    naiveMessage.warning('请先配置 AI 服务')
    return
  }

  const validateMsg = validateInput()
  if (validateMsg) {
    naiveMessage.warning(validateMsg)
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
  errorMessage.value = ''
  abortController = new AbortController()

  const messages = buildMessagesForMode()

  try {
    const result = await streamChat(
      config,
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
        // ponytail: 先不做续写，截断时提示精简；mockInterview/review/parseJd 统一 2048
        maxTokens: 2048,
      },
    )
    wasTruncated.value = result.wasTruncated

    // JD 解析：用 finalText（清洗后的完整文本）解析，更可靠
    if (activeMode.value === 'parseJd' && !errorMessage.value) {
      const ok = handleParseJdResult(result.finalText)
      if (ok) {
        // 成功：关闭弹窗
        isStreaming.value = false
        emit('close')
        return
      }
      // 失败：保留 resultText 供调试查看？ponytail：清空，走错误卡片
      resultText.value = ''
    }
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      // 用户取消
    } else if (err instanceof AIServiceError) {
      const msg = AI_ERROR_MESSAGES[err.code] || err.message
      naiveMessage.error(msg)
      errorMessage.value = msg
    } else {
      naiveMessage.error('生成失败，请重试')
      errorMessage.value = '生成失败，请重试'
    }
  } finally {
    isStreaming.value = false
    isConnected.value = false
    abortController = null
  }
}

const handleClose = () => {
  if (isStreaming.value && abortController) {
    abortController.abort()
  }
  emit('close')
}

const goToAISettings = () => {
  emit('close')
  router.push({ path: '/dashboard', query: { tab: 'ai' } })
}
</script>

<style lang="scss" scoped>
.ia-header {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  font-weight: 600;
  @include gradient-text;
}

.ia-no-config {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  padding: $spacing-md;
  background: rgba($warning-color, 0.08);
  border: 1px solid rgba($warning-color, 0.25);
  border-radius: $radius-md;
  color: $text-primary;

  &__msg {
    flex: 1;
  }
}

.ia-input {
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;
}

.ia-result {
  display: flex;
  flex-direction: column;
  gap: $spacing-md;

  &__content {
    min-height: 150px;
    max-height: 420px;
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
    :deep(ul) { list-style-type: disc; margin: 0.5em 0; padding-left: 1.5em; }
    :deep(ol) { list-style-type: decimal; margin: 0.5em 0; padding-left: 1.5em; }
    :deep(h2) { font-size: 1.1em; font-weight: 700; margin: 1em 0 0.5em; }
    :deep(h3) { font-size: 1em; font-weight: 700; margin: 0.8em 0 0.4em; }
  }

  &__placeholder {
    color: $text-light;
    font-style: italic;
  }

  &__cursor {
    color: $primary-light;
    animation: ia-blink 1s step-end infinite;
  }
}

.ia-footer {
  display: flex;
  justify-content: center;
  gap: $spacing-sm;
  padding-top: $spacing-md;
}

.ia-truncation-warning {
  @include truncation-warning;
}

.ia-error-card {
  display: flex;
  align-items: center;
  gap: $spacing-xs;
  padding: $spacing-xs $spacing-md;
  background: rgba($error-color, 0.08);
  border: 1px solid rgba($error-color, 0.25);
  border-radius: $radius-sm;
  font-size: $font-size-xs;
  color: $error-color;

  &__msg {
    flex: 1;
  }
}

@keyframes ia-blink {
  50% { opacity: 0; }
}
</style>
