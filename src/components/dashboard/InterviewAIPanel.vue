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
      <!-- parseJd 入口：单一 JD 粘贴 + 结果，无 tab -->
      <template v-if="mode === 'parseJd'">
        <div class="ia-input">
          <n-input
            v-model:value="jdText"
            type="textarea"
            placeholder="粘贴 JD 文本，AI 将提取公司/职位/薪资/地点/正文"
            :autosize="{ minRows: 6, maxRows: 14 }"
            :disabled="parseJdState.isStreaming"
            @keydown.enter.ctrl="handleStart"
          />
          <n-button type="primary" :loading="parseJdState.isStreaming" @click="handleStart">
            <template #icon>
              <Icon :icon="parseJdState.isStreaming ? 'mdi:stop' : 'mdi:play'" :width="16" />
            </template>
            {{ parseJdState.isStreaming ? '取消' : '开始解析' }}
          </n-button>
        </div>
        <div v-if="parseJdState.isStreaming || parseJdState.errorMessage" class="ia-result">
          <div v-if="parseJdState.errorMessage && !parseJdState.isStreaming" class="ia-error-card">
            <Icon icon="mdi:alert-circle-outline" :width="16" />
            <span class="ia-error-card__msg">{{ parseJdState.errorMessage }}</span>
            <n-button size="small" type="primary" ghost @click="handleStart">重试</n-button>
          </div>
          <div v-if="parseJdState.isStreaming" class="ia-result__content ia-result__content--streaming">
            {{ parseJdState.resultText }}
            <span v-if="!parseJdState.isConnected" class="ia-result__placeholder">正在连接 AI 服务...</span>
            <span v-if="parseJdState.isConnected && !hasParseJdResult" class="ia-result__placeholder">正在解析 JD...</span>
            <span class="ia-result__cursor" aria-hidden="true">▌</span>
          </div>
        </div>
      </template>

      <!-- 三合一 AI 助手：每 tab 自包含输入区 + 独立结果区 -->
      <template v-else>
        <div class="ia-privacy">
          <Icon icon="mdi:shield-check-outline" :width="14" />
          <span>您的姓名、联系方式等个人敏感信息已自动替换为占位符，您隐藏的模块和字段也不会发送给 AI，仅用于分析简历内容匹配度</span>
        </div>

        <n-tabs v-model:value="activeMode" type="line" size="small" display-directive="show" @update:value="onModeChange">
          <!-- 模拟面试 -->
          <n-tab-pane name="mockInterview" tab="模拟面试">
            <n-tabs v-model:value="tabStates.mockInterview.activeSubTab" type="line" size="small" display-directive="show">
              <n-tab-pane name="gen" tab="生成">
                <div class="ia-input">
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
                  <div v-if="missingHint" class="ia-missing">
                    <Icon icon="mdi:alert-outline" :width="16" />
                    <span>{{ missingHint }}</span>
                  </div>
                  <n-button
                    type="primary"
                    :disabled="!!missingHint || tabStates.mockInterview.isStreaming"
                    :loading="tabStates.mockInterview.isStreaming"
                    @click="handleStart"
                  >
                    <template #icon>
                      <Icon :icon="tabStates.mockInterview.isStreaming ? 'mdi:stop' : 'mdi:play'" :width="16" />
                    </template>
                    {{ tabStates.mockInterview.isStreaming ? '生成中…' : '开始生成' }}
                  </n-button>
                </div>
              </n-tab-pane>
              <n-tab-pane name="result" tab="结果">
                <!-- 本 tab 独立结果区 -->
                <div v-if="tabStates.mockInterview.isStreaming || tabStates.mockInterview.resultText || tabStates.mockInterview.errorMessage" class="ia-result">
                  <div v-if="!tabStates.mockInterview.isStreaming && tabStates.mockInterview.resultText && tabStates.mockInterview.isLoadedResult" class="ia-result__hint">
                    <Icon icon="mdi:clock-outline" :width="14" />
                    上次生成于 {{ formatDateTime(tabStates.mockInterview.loadedAt) }}
                  </div>
                  <div v-if="tabStates.mockInterview.wasTruncated && tabStates.mockInterview.resultText && !tabStates.mockInterview.isStreaming" class="ia-truncation-warning">
                    <Icon icon="mdi:alert-outline" :width="16" />
                    AI 输出因长度限制被截断，结果可能不完整
                  </div>
                  <div v-if="tabStates.mockInterview.errorMessage && !tabStates.mockInterview.isStreaming" class="ia-error-card">
                    <Icon icon="mdi:alert-circle-outline" :width="16" />
                    <span class="ia-error-card__msg">{{ tabStates.mockInterview.errorMessage }}</span>
                    <n-button size="small" type="primary" ghost @click="handleStart">重试</n-button>
                  </div>
                  <div v-if="tabStates.mockInterview.isStreaming" class="ia-result__content ia-result__content--streaming">
                    {{ tabStates.mockInterview.resultText }}
                    <span v-if="!tabStates.mockInterview.isConnected" class="ia-result__placeholder">正在连接 AI 服务...</span>
                    <span v-if="tabStates.mockInterview.isConnected && !tabStates.mockInterview.resultText" class="ia-result__placeholder">正在生成面试题...</span>
                    <span class="ia-result__cursor" aria-hidden="true">▌</span>
                  </div>
                  <div v-else-if="tabStates.mockInterview.resultText" class="ia-result__content">
                    <div class="ia-result__rich" v-html="renderedMockInterview" />
                  </div>
                </div>
                <div v-else class="ia-result__empty">暂无结果，去「生成」子页开始</div>
              </n-tab-pane>
            </n-tabs>
          </n-tab-pane>

          <!-- 面试复盘 -->
          <n-tab-pane name="review" tab="面试复盘">
            <n-tabs v-model:value="tabStates.review.activeSubTab" type="line" size="small" display-directive="show">
              <n-tab-pane name="gen" tab="生成">
                <div class="ia-input">
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
                  <n-select
                    v-if="roundOptions.length > 0"
                    v-model:value="reviewRoundId"
                    :options="roundOptions"
                    placeholder="选择面试轮次"
                    @update:value="onRoundSelect"
                  />
                  <div class="ia-readonly__row ia-readonly__row--block">
                    <span class="ia-readonly__label">面试问题</span>
                    <span class="ia-readonly__value ia-readonly__value--multi">{{ reviewQuestions || '（该轮暂无问题）' }}</span>
                  </div>
                  <div class="ia-readonly__row ia-readonly__row--block">
                    <span class="ia-readonly__label">我的回答</span>
                    <span class="ia-readonly__value ia-readonly__value--multi">{{ reviewAnswers || '（未填写，可空）' }}</span>
                  </div>
                  <div v-if="missingHint" class="ia-missing">
                    <Icon icon="mdi:alert-outline" :width="16" />
                    <span>{{ missingHint }}</span>
                  </div>
                  <n-button
                    type="primary"
                    :disabled="!!missingHint || tabStates.review.isStreaming"
                    :loading="tabStates.review.isStreaming"
                    @click="handleStart"
                  >
                    <template #icon>
                      <Icon :icon="tabStates.review.isStreaming ? 'mdi:stop' : 'mdi:play'" :width="16" />
                    </template>
                    {{ tabStates.review.isStreaming ? '生成中…' : '开始生成' }}
                  </n-button>
                </div>
              </n-tab-pane>
              <n-tab-pane name="result" tab="结果">
                <div v-if="tabStates.review.isStreaming || tabStates.review.resultText || tabStates.review.errorMessage" class="ia-result">
                  <div v-if="!tabStates.review.isStreaming && tabStates.review.resultText && tabStates.review.isLoadedResult" class="ia-result__hint">
                    <Icon icon="mdi:clock-outline" :width="14" />
                    上次生成于 {{ formatDateTime(tabStates.review.loadedAt) }}
                  </div>
                  <div v-if="tabStates.review.wasTruncated && tabStates.review.resultText && !tabStates.review.isStreaming" class="ia-truncation-warning">
                    <Icon icon="mdi:alert-outline" :width="16" />
                    AI 输出因长度限制被截断，结果可能不完整
                  </div>
                  <div v-if="tabStates.review.errorMessage && !tabStates.review.isStreaming" class="ia-error-card">
                    <Icon icon="mdi:alert-circle-outline" :width="16" />
                    <span class="ia-error-card__msg">{{ tabStates.review.errorMessage }}</span>
                    <n-button size="small" type="primary" ghost @click="handleStart">重试</n-button>
                  </div>
                  <div v-if="tabStates.review.isStreaming" class="ia-result__content ia-result__content--streaming">
                    {{ tabStates.review.resultText }}
                    <span v-if="!tabStates.review.isConnected" class="ia-result__placeholder">正在连接 AI 服务...</span>
                    <span v-if="tabStates.review.isConnected && !tabStates.review.resultText" class="ia-result__placeholder">正在复盘面试...</span>
                    <span class="ia-result__cursor" aria-hidden="true">▌</span>
                  </div>
                  <div v-else-if="tabStates.review.resultText" class="ia-result__content">
                    <div class="ia-result__rich" v-html="renderedReview" />
                  </div>
                </div>
                <div v-else class="ia-result__empty">暂无结果，去「生成」子页开始</div>
              </n-tab-pane>
            </n-tabs>
          </n-tab-pane>

          <!-- JD 扫描 -->
          <n-tab-pane name="jdScan" tab="JD 扫描">
            <n-tabs v-model:value="tabStates.jdScan.activeSubTab" type="line" size="small" display-directive="show">
              <n-tab-pane name="gen" tab="生成">
                <div class="ia-input">
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
                  <n-button
                    type="primary"
                    :disabled="!!missingHint || tabStates.jdScan.isStreaming"
                    :loading="tabStates.jdScan.isStreaming"
                    @click="handleStart"
                  >
                    <template #icon>
                      <Icon :icon="tabStates.jdScan.isStreaming ? 'mdi:stop' : 'mdi:play'" :width="16" />
                    </template>
                    {{ tabStates.jdScan.isStreaming ? '生成中…' : '开始扫描' }}
                  </n-button>
                </div>
              </n-tab-pane>
              <n-tab-pane name="result" tab="结果">
                <!-- 本 tab 独立结果区（含匹配度圆环） -->
                <div v-if="tabStates.jdScan.isStreaming || tabStates.jdScan.resultText || tabStates.jdScan.errorMessage" class="ia-result">
                  <div v-if="!tabStates.jdScan.isStreaming && tabStates.jdScan.resultText && tabStates.jdScan.isLoadedResult" class="ia-result__hint">
                    <Icon icon="mdi:clock-outline" :width="14" />
                    上次生成于 {{ formatDateTime(tabStates.jdScan.loadedAt) }}
                  </div>
                  <div v-if="tabStates.jdScan.wasTruncated && tabStates.jdScan.resultText && !tabStates.jdScan.isStreaming" class="ia-truncation-warning">
                    <Icon icon="mdi:alert-outline" :width="16" />
                    AI 输出因长度限制被截断，结果可能不完整
                  </div>
                  <div v-if="tabStates.jdScan.errorMessage && !tabStates.jdScan.isStreaming" class="ia-error-card">
                    <Icon icon="mdi:alert-circle-outline" :width="16" />
                    <span class="ia-error-card__msg">{{ tabStates.jdScan.errorMessage }}</span>
                    <n-button size="small" type="primary" ghost @click="handleStart">重试</n-button>
                  </div>
                  <!-- 匹配度圆环（流式 + 完成都显示） -->
                  <div v-if="tabStates.jdScan.matchScore !== null && (tabStates.jdScan.isStreaming || tabStates.jdScan.resultText)" class="ia-result__score">
                    <div class="score-ring" :style="jdScanRingStyle">
                      <span class="score-ring__value">{{ tabStates.jdScan.matchScore }}%</span>
                    </div>
                    <div class="score-ring__info">
                      <span class="score-ring__label">{{ getScoreLabel(tabStates.jdScan.matchScore) }}</span>
                      <span class="score-ring__desc">匹配度</span>
                    </div>
                  </div>
                  <div v-if="tabStates.jdScan.isStreaming" class="ia-result__content ia-result__content--streaming">
                    {{ tabStates.jdScan.resultText }}
                    <span v-if="!tabStates.jdScan.isConnected" class="ia-result__placeholder">正在连接 AI 服务...</span>
                    <span v-if="tabStates.jdScan.isConnected && !tabStates.jdScan.resultText" class="ia-result__placeholder">正在分析匹配度...</span>
                    <span class="ia-result__cursor" aria-hidden="true">▌</span>
                  </div>
                  <div v-else-if="tabStates.jdScan.resultText" class="ia-result__content">
                    <div class="ia-result__rich" v-html="renderedJdScan" />
                  </div>
                </div>
                <div v-else class="ia-result__empty">暂无结果，去「生成」子页开始</div>
              </n-tab-pane>
            </n-tabs>
          </n-tab-pane>
        </n-tabs>
      </template>
    </template>

    <template #footer>
      <div class="ia-footer">
        <n-button @click="handleClose">关闭</n-button>
      </div>
    </template>
  </n-modal>
</template>

<script setup lang="ts">
import { ref, computed, watch, reactive } from 'vue'
import { Icon } from '@iconify/vue'
import { NModal, NButton, NInput, NSelect, NTabs, NTabPane } from 'naive-ui'
import { useRouter } from 'vue-router'
import { streamChat, AIServiceError, AI_ERROR_MESSAGES } from '@/services/aiService'
import type { ChatMessage, ContentPart } from '@/services/aiService'
import { useAIConfigStore } from '@/stores/aiConfigStore'
import { useResumeStore } from '@/stores/resumeStore'
import { useInterviewStore } from '@/stores/interviewStore'
import { usePetStore } from '@/stores/petStore'
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
const petStore = usePetStore()

const hasActiveConfig = computed(() => !!aiConfigStore.activeConfig)

// JD 解析入口（从新建面试进来）仅此单一功能，标题改为「JD 解析与提取」；
// 其余入口为三合一 AI 助手面板
const headerTitle = computed(() =>
  props.mode === 'parseJd' ? 'JD 解析与提取' : '面试 AI 助手',
)

// ========== 流式状态机：每 tab 独立状态（mockInterview/review/jdScan） ==========
// parseJd 是独立入口（不走 tab 切换），用独立局部 ref，不进 tabStates
type BusinessMode = 'mockInterview' | 'review' | 'jdScan'
const BUSINESS_MODES: BusinessMode[] = ['mockInterview', 'review', 'jdScan']

interface TabState {
  resultText: string
  isStreaming: boolean
  isConnected: boolean
  wasTruncated: boolean
  errorMessage: string
  matchScore: number | null       // 仅 jdScan 用
  isLoadedResult: boolean
  loadedAt: string
  abortController: AbortController | null
  scoreParseTimer: ReturnType<typeof setTimeout> | null
  pendingScoreText: string
  activeSubTab: 'gen' | 'result'  // 内嵌子 tab 激活页
  saveDone: boolean               // 防止 handleClose 和 catch 双重保存
}

function createEmptyTabState(): TabState {
  return {
    resultText: '',
    isStreaming: false,
    isConnected: false,
    wasTruncated: false,
    errorMessage: '',
    matchScore: null,
    isLoadedResult: false,
    loadedAt: '',
    abortController: null,
    scoreParseTimer: null,
    pendingScoreText: '',
    activeSubTab: 'gen',
    saveDone: false,
  }
}

const tabStates = reactive<Record<BusinessMode, TabState>>({
  mockInterview: createEmptyTabState(),
  review: createEmptyTabState(),
  jdScan: createEmptyTabState(),
})

// parseJd 独立状态（不参与 tab 切换，成功即 emit 关闭）
const parseJdState = reactive({
  resultText: '',
  isStreaming: false,
  isConnected: false,
  wasTruncated: false,
  errorMessage: '',
  abortController: null as AbortController | null,
})

// ========== 当前模式 ==========
const activeMode = ref<Mode>(props.mode)
const activeBusinessMode = computed<BusinessMode>(() =>
  activeMode.value === 'parseJd' ? 'mockInterview' : activeMode.value,
)

// 各 tab 结果的 markdown 渲染：拆成三个独立 computed，流式期间互不重算
function makeRenderer(mode: BusinessMode) {
  return computed(() => {
    const t = tabStates[mode]
    if (!t.resultText || t.isStreaming) return ''
    return sanitizeHtml(markdownToHtml(t.resultText))
  })
}
const renderedMockInterview = makeRenderer('mockInterview')
const renderedReview = makeRenderer('review')
const renderedJdScan = makeRenderer('jdScan')

// parseJd 流式 placeholder 用：是否已有内容
const hasParseJdResult = computed(() => parseJdState.resultText.length > 0)

// ========== JD 扫描：匹配度圆环（绑定 jdScan tab） ==========
const jdScanRingStyle = computed(() => {
  const score = tabStates.jdScan.matchScore
  if (score === null) return {}
  return {
    '--ring-color': getScoreColor(score),
    '--ring-percentage': `${score / 100}`,
  }
})

/** 从文本提取匹配度分数，写入指定 tab */
function parseScoreFor(mode: BusinessMode, text: string) {
  const match = text.match(/匹配度[^\d]*(\d{1,3})\s*%/)
  tabStates[mode].matchScore = match ? parseInt(match[1]) : null
}

/** 流式期间 500ms 节流提取分数（仅 jdScan 调用），timer 存在对应 tab */
function scheduleScoreParse(mode: BusinessMode, text: string) {
  const tab = tabStates[mode]
  tab.pendingScoreText = text
  if (!tab.scoreParseTimer) {
    tab.scoreParseTimer = setTimeout(() => {
      tab.scoreParseTimer = null
      parseScoreFor(mode, tab.pendingScoreText)
    }, 500)
  }
}

// ========== 缓存：加载上次结果 ==========

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
  const hasJdImages = !!targetInterview.value.jdImages?.length
  if (m === 'mockInterview' || m === 'review') {
    if (!mockPosition.value.trim()) return '请回到面试补充「岗位名称」后再使用'
    // JD 文本和截图至少一个非空即放行
    if (!mockJd.value.trim() && !hasJdImages) return '请回到面试补充「目标职位 JD」或上传 JD 截图后再使用'
    if (!resumeTitle.value) return '请回到面试关联简历后再使用'
  }
  if (m === 'jdScan') {
    if (!scanJd.value.trim() && !hasJdImages) return '请回到面试补充「目标职位 JD」或上传 JD 截图后再使用'
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

/** 重置单个 tab 状态为空（保留 abortController/timer 由调用方先清） */
function resetTabState(mode: BusinessMode) {
  Object.assign(tabStates[mode], createEmptyTabState())
}

/** 打开弹窗时一次性加载三个 tab 的上次结果缓存 */
const loadAllCachedResults = () => {
  const iv = targetInterview.value
  BUSINESS_MODES.forEach(mode => {
    const tab = tabStates[mode]
    tab.resultText = ''
    tab.matchScore = null
    tab.isLoadedResult = false
    tab.loadedAt = ''
    tab.activeSubTab = 'gen'
    if (!iv) return
    type Cached = { text: string; generatedAt?: string; scannedAt?: string; score?: number | null }
    const cached: Cached | undefined = mode === 'mockInterview' ? iv.lastMockInterview
      : mode === 'review' ? iv.lastReview
      : iv.lastJdScan
    if (cached?.text) {
      tab.resultText = cached.text
      tab.isLoadedResult = true
      tab.loadedAt = cached.generatedAt || cached.scannedAt || ''
      // 有历史结果 → 默认显示「结果」子页
      tab.activeSubTab = 'result'
      if (mode === 'jdScan') {
        tab.matchScore = cached.score ?? null
        parseScoreFor(mode, cached.text)
      }
    }
  })
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
    // abort 所有 tab 的进行中请求，清 timer
    BUSINESS_MODES.forEach(mode => {
      const tab = tabStates[mode]
      if (tab.abortController) { tab.abortController.abort(); tab.abortController = null }
      if (tab.scoreParseTimer) { clearTimeout(tab.scoreParseTimer); tab.scoreParseTimer = null }
      resetTabState(mode)
    })
    // parseJd 状态重置
    if (parseJdState.abortController) { parseJdState.abortController.abort(); parseJdState.abortController = null }
    parseJdState.resultText = ''
    parseJdState.isStreaming = false
    parseJdState.isConnected = false
    parseJdState.wasTruncated = false
    parseJdState.errorMessage = ''

    activeMode.value = props.mode
    // 复盘模式：默认第1轮
    if (props.mode === 'review') initReviewRound()
    // 一次性加载三 tab 缓存（parseJd 无缓存）
    loadAllCachedResults()
  }
})

// 切 tab：什么都不动——后台生成中的 tab 继续跑，chunk 写各自 state
const onModeChange = () => {
  // 切到复盘：默认第1轮
  if (activeMode.value === 'review') initReviewRound()
}

// ========== 构造消息 ==========
const buildMessagesForMode = (): ChatMessage[] => {
  const jdImages = targetInterview.value?.jdImages
  if (activeMode.value === 'mockInterview') {
    return buildMockInterviewMessages({
      position: mockPosition.value.trim(),
      jd: mockJd.value.trim(),
      resumeText: resumeText.value || undefined,
      jdImages,
    })
  }
  if (activeMode.value === 'review') {
    return buildInterviewReviewMessages({
      position: reviewPosition.value.trim(),
      jd: reviewJd.value.trim(),
      questions: reviewQuestions.value.trim(),
      answers: reviewAnswers.value.trim(),
      jdImages,
    })
  }
  if (activeMode.value === 'jdScan') {
    // 复用简历编辑页 JD 扫描：content=简历文本，customInstruction=JD
    const messages = buildMessages('scan', resumeText.value, scanJd.value.trim())
    // 共享 buildMessages 不带图，有 JD 截图时在组件层把图追加进 user 消息
    return appendJdImages(messages, jdImages, '请结合下方 JD 截图与文本分析简历与岗位的匹配度')
  }
  return buildParseJdMessages({ jdText: jdText.value.trim() })
}

/**
 * jdScan 专用：把 buildMessages('scan') 产出的纯文本 user 消息追加 JD 截图。
 * 无图原样返回；有图把最后一条 user 的 string content 转成 ContentPart[]。
 */
function appendJdImages(messages: ChatMessage[], images: string[] | undefined, hint: string): ChatMessage[] {
  const imgs = images?.filter(u => !!u) ?? []
  if (imgs.length === 0) return messages
  // 找最后一条 user 消息（scan 产出的 user 一定在末尾）
  // ponytail: 隐式依赖 buildMessages('scan') 产出 string user 消息；若未来改多模态
  // 返回 ContentPart[]，这里匹配不到会静默丢图，故 warn 兜底（升级时改走合并逻辑）
  let appended = false
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === 'user' && typeof messages[i].content === 'string') {
      messages[i] = {
        ...messages[i],
        content: [
          { type: 'text', text: `${messages[i].content as string}\n${hint}：` },
          ...imgs.map<ContentPart>(url => ({ type: 'image_url', image_url: { url } })),
        ],
      }
      appended = true
      break
    }
  }
  if (!appended) {
    console.warn('[appendJdImages] 未找到 string 类型的 user 消息，JD 截图未追加——检查 buildMessages 是否已改为多模态输出')
  }
  return messages
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
    parseJdState.errorMessage = 'JD 解析失败：AI 输出不是有效 JSON，请重试或精简 JD'
    return false
  }
}

// ========== 缓存写入（生成成功后）：按 mode 写对应 tab 的结果 ==========
const saveResultCacheFor = (mode: BusinessMode) => {
  // 防止 handleClose 与 catch 双重保存（仿 JDScanModal 的 saveDone）
  if (tabStates[mode].saveDone) return
  tabStates[mode].saveDone = true
  const id = props.interviewId
  const tab = tabStates[mode]
  const text = tab.resultText
  if (!id || !text) return
  if (mode === 'mockInterview') {
    interviewStore.saveMockInterviewResult(id, { text, generatedAt: new Date().toISOString() })
  } else if (mode === 'review') {
    interviewStore.saveReviewResult(id, { text, generatedAt: new Date().toISOString() })
  } else if (mode === 'jdScan') {
    interviewStore.saveJdScanResult(id, {
      score: tab.matchScore,
      text,
      scannedAt: new Date().toISOString(),
    })
  }
  // ponytail: 三 tab 三触发路径(成功/中止/关闭)统一在此触发桌宠 save 话术
  void petStore.sayCategory('save')
}

// ========== 开始：parseJd 走独立分支，三 tab 走闭包捕获 mode 的统一分支 ==========
const handleStart = async () => {
  // parseJd 入口：独立状态机
  if (activeMode.value === 'parseJd') {
    return handleParseJdStart()
  }

  const mode = activeBusinessMode.value
  const tab = tabStates[mode]

  // 流式中点击 → 取消该 tab 的生成
  if (tab.isStreaming) {
    if (tab.abortController) tab.abortController.abort()
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

  // 该 tab 已有进行中请求则先 abort（理论上 tab.isStreaming 已挡住，兜底）
  if (tab.abortController) { tab.abortController.abort(); tab.abortController = null }

  tab.resultText = ''
  tab.matchScore = null
  tab.isStreaming = true
  tab.isConnected = false
  tab.wasTruncated = false
  tab.errorMessage = ''
  tab.isLoadedResult = false
  tab.saveDone = false
  // 点开始后自动切到「结果」子页看流式进度
  tab.activeSubTab = 'result'
  tab.abortController = new AbortController()

  const messages = buildMessagesForMode()
  // ponytail: jdScan 结果较长（含逐条匹配分析），与 JDScanModal 一致用 4096；其余 2048
  const maxTokens = mode === 'jdScan' ? 4096 : 2048

  try {
    const t0 = performance.now()
    const result = await streamChat(
      config,
      messages,
      (chunk) => {
        tab.resultText += chunk
        if (!tab.isConnected) tab.isConnected = true
        // jdScan 流式期间节流提取分数，写入该 tab
        if (mode === 'jdScan') scheduleScoreParse(mode, tab.resultText)
      },
      {
        signal: tab.abortController!.signal,
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
    tab.wasTruncated = result.wasTruncated
    // 成功且有内容 → 缓存到对应面试
    saveResultCacheFor(mode)
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      // 用户取消：保留已接收的部分结果
      if (tab.resultText) saveResultCacheFor(mode)
    } else if (err instanceof AIServiceError) {
      const msg = AI_ERROR_MESSAGES[err.code] || err.message
      naiveMessage.error(msg)
      tab.errorMessage = msg
    } else {
      naiveMessage.error('生成失败，请重试')
      tab.errorMessage = '生成失败，请重试'
    }
  } finally {
    tab.isStreaming = false
    tab.isConnected = false
    tab.abortController = null
    // 收尾时立即提取一次最终分数（jdScan）
    if (mode === 'jdScan' && tab.scoreParseTimer) {
      clearTimeout(tab.scoreParseTimer)
      tab.scoreParseTimer = null
      parseScoreFor(mode, tab.resultText)
    }
  }
}

// ========== parseJd 独立启动（不走 tab 状态） ==========
const handleParseJdStart = async () => {
  const s = parseJdState
  if (s.isStreaming) {
    if (s.abortController) s.abortController.abort()
    return
  }
  const config = aiConfigStore.activeConfig
  if (!config) { naiveMessage.warning('请先配置 AI 服务'); return }
  const validateMsg = validateInput()
  if (validateMsg) { naiveMessage.warning(validateMsg); return }

  if (s.abortController) { s.abortController.abort(); s.abortController = null }
  s.resultText = ''
  s.isStreaming = true
  s.isConnected = false
  s.wasTruncated = false
  s.errorMessage = ''
  s.abortController = new AbortController()

  const messages = buildMessagesForMode()
  try {
    const t0 = performance.now()
    const result = await streamChat(
      config,
      messages,
      (chunk) => { s.resultText += chunk; if (!s.isConnected) s.isConnected = true },
      {
        signal: s.abortController!.signal,
        onUsage: (usage) => {
          aiConfigStore.recordUsage(config.id, {
            ...usage, durationMs: performance.now() - t0, feature: 'interview', modelId: config.modelId,
          })
        },
        maxTokens: 2048,
      },
    )
    s.wasTruncated = result.wasTruncated
    if (!s.errorMessage) {
      const ok = handleParseJdResult(result.finalText)
      if (ok) { s.isStreaming = false; emit('close'); return }
      s.resultText = ''
    }
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      // 用户取消
    } else if (err instanceof AIServiceError) {
      const msg = AI_ERROR_MESSAGES[err.code] || err.message
      naiveMessage.error(msg)
      s.errorMessage = msg
    } else {
      naiveMessage.error('生成失败，请重试')
      s.errorMessage = '生成失败，请重试'
    }
  } finally {
    s.isStreaming = false
    s.isConnected = false
    s.abortController = null
  }
}

const handleClose = () => {
  // 关闭时 abort 所有正在生成的 tab，并保存已接收的部分结果
  BUSINESS_MODES.forEach(mode => {
    const tab = tabStates[mode]
    if (tab.isStreaming && tab.abortController) {
      tab.abortController.abort()
      if (tab.resultText) saveResultCacheFor(mode)
    }
    if (tab.scoreParseTimer) { clearTimeout(tab.scoreParseTimer); tab.scoreParseTimer = null }
  })
  if (parseJdState.isStreaming && parseJdState.abortController) {
    parseJdState.abortController.abort()
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
    font-size: 15px;
    line-height: 1.75;
    color: $text-primary;
    word-break: break-word;
    @include scrollbar;
  }

  // 流式纯文本态：保留原始换行，光标行内跟随
  &__content--streaming {
    white-space: pre-wrap;
  }

  &__rich {
    // ponytail: 不用 pre-wrap——markdown 已转 HTML，pre-wrap 会与 <p> margin 叠加产生莫名隔断
    :deep() {
      @include ai-result-rich;
    }
  }

  &__placeholder {
    color: $text-light;
    font-style: italic;
  }

  &__empty {
    text-align: center;
    padding: $spacing-xl 0;
    color: $text-light;
    font-size: $font-size-sm;
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
