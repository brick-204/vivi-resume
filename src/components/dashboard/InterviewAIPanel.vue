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
      <!-- 隐私提示：三合一模式统一显示在内容区顶部（parseJd 入口不发简历，不显示） -->
      <div v-if="mode !== 'parseJd' && !isStreaming" class="ia-privacy">
        <Icon icon="mdi:shield-check-outline" :width="14" />
        <span>您的姓名、联系方式等个人敏感信息已自动替换为占位符，您隐藏的模块和字段也不会发送给 AI，仅用于分析简历内容匹配度</span>
      </div>

      <n-tabs v-if="mode !== 'parseJd'" v-model:value="activeMode" type="line" size="small" @update:value="onModeChange">
        <n-tab-pane name="mockInterview" tab="模拟面试" />
        <n-tab-pane name="review" tab="面试复盘" />
        <n-tab-pane name="jdScan" tab="JD 扫描" />
      </n-tabs>

      <!-- 输入区（非流式且无结果时） -->
      <div v-if="!isStreaming && !hasResult" class="ia-input">
        <!-- 模拟面试 -->
        <template v-if="activeMode === 'mockInterview'">
          <!-- 只读自动填充：岗位 / JD / 关联简历，缺一不可 -->
          <div class="ia-readonly">
            <div class="ia-readonly__row">
              <span class="ia-readonly__label">岗位名称</span>
              <span class="ia-readonly__value">{{ mockPosition || '未填写' }}</span>
            </div>
            <div class="ia-readonly__row">
              <span class="ia-readonly__label">目标职位 JD</span>
              <span class="ia-readonly__value ia-readonly__value--multi">{{ mockJd || '未填写' }}</span>
            </div>
            <div class="ia-readonly__row">
              <span class="ia-readonly__label">关联简历</span>
              <span class="ia-readonly__value">{{ resumeTitle || '未关联' }}</span>
            </div>
          </div>
          <!-- 缺项拦截提示 -->
          <div v-if="missingHint" class="ia-missing">
            <Icon icon="mdi:alert-outline" :width="16" />
            <span>{{ missingHint }}</span>
          </div>
        </template>

        <!-- 面试复盘 -->
        <template v-else-if="activeMode === 'review'">
          <div class="ia-readonly">
            <div class="ia-readonly__row">
              <span class="ia-readonly__label">岗位名称</span>
              <span class="ia-readonly__value">{{ reviewPosition || '未填写' }}</span>
            </div>
            <div class="ia-readonly__row">
              <span class="ia-readonly__label">目标职位 JD</span>
              <span class="ia-readonly__value ia-readonly__value--multi">{{ reviewJd || '未填写' }}</span>
            </div>
            <div class="ia-readonly__row">
              <span class="ia-readonly__label">关联简历</span>
              <span class="ia-readonly__value">{{ resumeTitle || '未关联' }}</span>
            </div>
          </div>
          <!-- 轮次选择：默认第1轮，可切换 -->
          <n-select
            v-if="roundOptions.length > 0"
            v-model:value="reviewRoundId"
            :options="roundOptions"
            placeholder="选择面试轮次"
            @update:value="onRoundSelect"
          />
          <!-- 面试问题（只读，来自选中轮） -->
          <div class="ia-readonly__row ia-readonly__row--block">
            <span class="ia-readonly__label">面试问题</span>
            <span class="ia-readonly__value ia-readonly__value--multi">{{ reviewQuestions || '（该轮暂无问题）' }}</span>
          </div>
          <!-- 我的回答（只读，允许缺省） -->
          <div class="ia-readonly__row ia-readonly__row--block">
            <span class="ia-readonly__label">我的回答</span>
            <span class="ia-readonly__value ia-readonly__value--multi">{{ reviewAnswers || '（未填写，可空）' }}</span>
          </div>
          <!-- 缺项拦截提示 -->
          <div v-if="missingHint" class="ia-missing">
            <Icon icon="mdi:alert-outline" :width="16" />
            <span>{{ missingHint }}</span>
          </div>
        </template>

        <!-- JD 扫描：JD 只读来自面试，简历来自关联简历 -->
        <template v-else-if="activeMode === 'jdScan'">
          <div class="ia-readonly">
            <div class="ia-readonly__row">
              <span class="ia-readonly__label">目标职位 JD</span>
              <span class="ia-readonly__value ia-readonly__value--multi">{{ scanJd || '未填写' }}</span>
            </div>
            <div class="ia-readonly__row">
              <span class="ia-readonly__label">关联简历</span>
              <span class="ia-readonly__value">{{ resumeTitle || '未关联' }}</span>
            </div>
          </div>
          <div v-if="missingHint" class="ia-missing">
            <Icon icon="mdi:alert-outline" :width="16" />
            <span>{{ missingHint }}</span>
          </div>
        </template>

        <!-- JD 解析（仅新建面试入口，可粘贴 JD） -->
        <template v-else>
          <n-input
            v-model:value="jdText"
            type="textarea"
            placeholder="粘贴 JD 文本，AI 将提取公司/职位/薪资/地点/正文"
            :autosize="{ minRows: 6, maxRows: 14 }"
            @keydown.enter.ctrl="handleStart"
          />
        </template>

        <n-button type="primary" :disabled="!!missingHint" @click="handleStart">
          <template #icon>
            <Icon icon="mdi:play" :width="16" />
          </template>
          开始
        </n-button>
      </div>

      <!-- 结果区 -->
      <div v-else class="ia-result">
        <!-- 上次结果时间提示 -->
        <div v-if="!isStreaming && hasResult && isLoadedResult" class="ia-result__hint">
          <Icon icon="mdi:clock-outline" :width="14" />
          上次生成于 {{ loadedAtLabel }}
        </div>

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

        <!-- JD 扫描：匹配度圆环（流式 + 完成都显示） -->
        <div v-if="activeMode === 'jdScan' && matchScore !== null && (isStreaming || hasResult)" class="ia-result__score">
          <div class="score-ring" :style="scoreRingStyle">
            <span class="score-ring__value">{{ matchScore }}%</span>
          </div>
          <div class="score-ring__info">
            <span class="score-ring__label">{{ getScoreLabel(matchScore) }}</span>
            <span class="score-ring__desc">匹配度</span>
          </div>
        </div>

        <!-- 流式期间：纯文本 + 光标 -->
        <div v-if="isStreaming" class="ia-result__content">
          {{ resultText }}
          <span v-if="!isConnected" class="ia-result__placeholder">正在连接 AI 服务...</span>
          <span v-if="isConnected && !hasResult" class="ia-result__placeholder">{{ placeholderText }}</span>
          <span class="ia-result__cursor" aria-hidden="true">▌</span>
        </div>

        <!-- 完成：渲染 markdown -->
        <div
          v-else-if="hasResult"
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
import { getScoreColor, getScoreLabel, formatDateTime } from '@/utils/evaluationScore'
import { buildMessages } from '@/services/aiPrompts'
import {
  buildMockInterviewMessages,
  buildInterviewReviewMessages,
  buildParseJdMessages,
} from '@/services/interviewPrompts'
import { message as naiveMessage } from '@/plugins/naive-ui'

type Mode = 'mockInterview' | 'review' | 'jdScan' | 'parseJd'

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
  if (activeMode.value === 'jdScan') return '正在分析匹配度...'
  return '正在生成面试题...'
})

// ========== JD 扫描：匹配度圆环（仿 JDScanModal） ==========
const matchScore = ref<number | null>(null)
const scoreRingStyle = computed(() => {
  const score = matchScore.value
  if (score === null) return {}
  return {
    '--ring-color': getScoreColor(score),
    '--ring-percentage': `${score / 100}`,
  }
})
// 实时提取分数：流式期间 500ms 节流
let scoreParseTimer: ReturnType<typeof setTimeout> | null = null
let pendingScoreText = ''
watch(resultText, (text) => {
  if (activeMode.value !== 'jdScan') return
  if (!text) { matchScore.value = null; return }
  pendingScoreText = text
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

// ========== 缓存：加载上次结果 ==========
const isLoadedResult = ref(false)    // 当前显示的是从面试缓存加载的旧结果
const loadedAt = ref('')             // 旧结果生成时间
const loadedAtLabel = computed(() => formatDateTime(loadedAt.value))

// ========== 当前模式 ==========
const activeMode = ref<Mode>(props.mode)

// ========== 绑定面试：只读自动填充来源 ==========
const targetInterview = computed(() =>
  props.interviewId
    ? interviewStore.interviews.find(i => i.id === props.interviewId) ?? null
    : null,
)

// 岗位 / JD：模拟面试与复盘共用，从面试只读取
const mockPosition = computed(() => targetInterview.value?.position ?? '')
const mockJd = computed(() => targetInterview.value?.jd ?? '')
const reviewPosition = computed(() => targetInterview.value?.position ?? '')
const reviewJd = computed(() => targetInterview.value?.jd ?? '')
const scanJd = computed(() => targetInterview.value?.jd ?? '')

// 关联简历：标题（展示）+ 序列化纯文本（注入 prompt）
const linkedResume = computed(() => {
  const rid = targetInterview.value?.resumeId
  if (!rid) return null
  return resumeStore.resumeList.find(r => r.id === rid) ?? null
})
const resumeTitle = computed(() => linkedResume.value?.title || '')
const resumeText = computed(() =>
  linkedResume.value ? serializeResumeForEvaluation(linkedResume.value) : '',
)

// ========== 面试复盘：轮次默认第1轮，可切换 ==========
const reviewRoundId = ref<string | null>(null)
const reviewQuestions = ref('')
const reviewAnswers = ref('')

const roundOptions = computed(() => {
  if (!targetInterview.value) return []
  return targetInterview.value.rounds.map((r, idx) => ({
    label: `第 ${idx + 1} 轮（${r.roundType}）${r.interviewer ? '· ' + r.interviewer : ''}`,
    value: r.id,
  }))
})

const onRoundSelect = (roundId: string | null) => {
  if (!roundId || !targetInterview.value) {
    reviewQuestions.value = ''
    reviewAnswers.value = ''
    return
  }
  const round = targetInterview.value.rounds.find(r => r.id === roundId)
  if (!round) return
  reviewQuestions.value = round.questions
  reviewAnswers.value = round.answers
}

// ========== 缺项拦截提示（只读自动填充模式下，缺一不可） ==========
const missingHint = computed(() => {
  if (activeMode.value === 'parseJd') return ''  // parseJd 走自己的 jdText 校验
  if (!targetInterview.value) return '未关联面试记录'
  const m = activeMode.value
  if (m === 'mockInterview' || m === 'review') {
    if (!mockPosition.value.trim()) return '请回到面试补充「岗位名称」后再使用'
    if (!mockJd.value.trim()) return '请回到面试补充「目标职位 JD」后再使用'
    if (!resumeTitle.value) return '请回到面试关联简历后再使用'
  }
  if (m === 'jdScan') {
    if (!scanJd.value.trim()) return '请回到面试补充「目标职位 JD」后再使用'
    if (!resumeTitle.value) return '请回到面试关联简历后再使用'
  }
  if (m === 'review') {
    // 无任何轮次，或选中轮无问题 → 引导完善
    if (targetInterview.value.rounds.length === 0) return '请回到面试添加面试轮次并填写问题后再使用'
    const round = targetInterview.value.rounds.find(r => r.id === reviewRoundId.value)
    if (round && !round.questions.trim()) return '该轮次暂无面试问题，请回到面试补充后再使用'
  }
  return ''
})

// ========== JD 解析输入（仅新建入口，可粘贴） ==========
const jdText = ref('')

// ========== 弹窗打开/关闭初始化 ==========

/** 加载当前模式对应的上次结果缓存（有则展示，无则清空） */
const loadCachedResult = () => {
  const iv = targetInterview.value
  resultText.value = ''
  matchScore.value = null
  isLoadedResult.value = false
  loadedAt.value = ''
  if (!iv) return
  let cached: { text: string; generatedAt?: string; scannedAt?: string; score?: number | null } | undefined
  if (activeMode.value === 'mockInterview') cached = iv.lastMockInterview
  else if (activeMode.value === 'review') cached = iv.lastReview
  else if (activeMode.value === 'jdScan') cached = iv.lastJdScan
  if (cached?.text) {
    resultText.value = cached.text
    isLoadedResult.value = true
    loadedAt.value = cached.generatedAt || cached.scannedAt || ''
    if (activeMode.value === 'jdScan') {
      matchScore.value = cached.score ?? null
      parseScore(cached.text)
    }
  }
}

/** 复盘模式：默认选第1轮并带出问题/回答 */
const initReviewRound = () => {
  const rounds = targetInterview.value?.rounds ?? []
  if (rounds.length > 0) {
    reviewRoundId.value = rounds[0].id
    onRoundSelect(reviewRoundId.value)
  } else {
    reviewRoundId.value = null
    reviewQuestions.value = ''
    reviewAnswers.value = ''
  }
}

watch(() => props.show, (val) => {
  if (val) {
    if (abortController) {
      abortController.abort()
      abortController = null
    }
    if (scoreParseTimer) {
      clearTimeout(scoreParseTimer)
      scoreParseTimer = null
    }
    isStreaming.value = false
    isConnected.value = false
    wasTruncated.value = false
    errorMessage.value = ''
    activeMode.value = props.mode

    // 复盘模式：默认第1轮
    if (props.mode === 'review') initReviewRound()

    // 加载当前模式缓存（parseJd 无缓存）
    loadCachedResult()
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
  errorMessage.value = ''
  wasTruncated.value = false
  // 切到复盘：默认第1轮
  if (activeMode.value === 'review') initReviewRound()
  // 加载切换后模式的上次结果缓存
  loadCachedResult()
}

// ========== 构造消息 ==========
const buildMessagesForMode = (): ChatMessage[] => {
  if (activeMode.value === 'mockInterview') {
    return buildMockInterviewMessages({
      position: mockPosition.value.trim(),
      jd: mockJd.value.trim(),
      resumeText: resumeText.value || undefined,
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
  if (activeMode.value === 'jdScan') {
    // 复用简历编辑页 JD 扫描：content=简历文本，customInstruction=JD
    return buildMessages('scan', resumeText.value, scanJd.value.trim())
  }
  return buildParseJdMessages({ jdText: jdText.value.trim() })
}

// ========== 校验输入 ==========
const validateInput = (): string | null => {
  // mockInterview/review/jdScan 的缺项由 missingHint 兜底（按钮已 disabled）
  if (activeMode.value === 'parseJd') {
    if (!jdText.value.trim()) return '请粘贴 JD 文本'
  }
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

// ========== 缓存写入（生成成功后） ==========
const saveResultCache = () => {
  const id = props.interviewId
  const text = resultText.value
  if (!id || !text) return
  if (activeMode.value === 'mockInterview') {
    interviewStore.saveMockInterviewResult(id, { text, generatedAt: new Date().toISOString() })
  } else if (activeMode.value === 'review') {
    interviewStore.saveReviewResult(id, { text, generatedAt: new Date().toISOString() })
  } else if (activeMode.value === 'jdScan') {
    interviewStore.saveJdScanResult(id, {
      score: matchScore.value,
      text,
      scannedAt: new Date().toISOString(),
    })
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

  // 缺项拦截（按钮已 disabled，此为兜底）
  if (missingHint.value) {
    naiveMessage.warning(missingHint.value)
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
  matchScore.value = null
  isStreaming.value = true
  isConnected.value = false
  wasTruncated.value = false
  errorMessage.value = ''
  isLoadedResult.value = false
  abortController = new AbortController()

  const messages = buildMessagesForMode()
  // ponytail: jdScan 结果较长（含逐条匹配分析），与 JDScanModal 一致用 4096；其余 2048
  const maxTokens = activeMode.value === 'jdScan' ? 4096 : 2048

  try {
    const t0 = performance.now()
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
          aiConfigStore.recordUsage(config.id, {
            ...usage,
            durationMs: performance.now() - t0,
            feature: 'interview',
            modelId: config.modelId,
          })
        },
        maxTokens,
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

    // 成功且有内容 → 缓存到对应面试（parseJd 无缓存）
    saveResultCache()
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
    // 用户中止时保存已接收的部分结果（仿 JDScanModal）
    saveResultCache()
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

// ========== 只读自动填充区 ==========
.ia-readonly {
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;
  padding: $spacing-md;
  background: $bg-glass;
  border: 1px solid $border-glass;
  border-radius: $radius-md;

  &__row {
    display: flex;
    gap: $spacing-md;
    align-items: flex-start;

    &--block {
      flex-direction: column;
      gap: 4px;
    }
  }

  &__label {
    flex-shrink: 0;
    width: 90px;
    font-size: $font-size-xs;
    color: $text-light;
    line-height: 1.7;
  }

  &__value {
    flex: 1;
    min-width: 0;
    font-size: $font-size-sm;
    color: $text-primary;
    line-height: 1.7;
    word-break: break-word;

    &--multi {
      white-space: pre-wrap;
      max-height: 160px;
      overflow-y: auto;
      @include scrollbar;
    }
  }
}

.ia-missing {
  display: flex;
  align-items: center;
  gap: $spacing-xs;
  padding: $spacing-xs $spacing-md;
  background: rgba($warning-color, 0.08);
  border: 1px solid rgba($warning-color, 0.25);
  border-radius: $radius-sm;
  font-size: $font-size-xs;
  color: $warning-color;
}

.ia-privacy {
  @include privacy-notice;
  margin-bottom: $spacing-md;
}

.ia-result {
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

// 匹配度圆环（仿 JDScanModal）
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

@keyframes ia-blink {
  50% { opacity: 0; }
}
</style>
