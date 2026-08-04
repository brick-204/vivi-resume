<template>
  <n-modal
    :show="show"
    preset="card"
    :style="{ maxWidth: '820px', width: '90vw' }"
    :mask-closable="false"
    @update:show="(v: boolean) => { if (!v) handleClose() }"
  >
    <template #header>
      <div class="cc-header">
        <Icon icon="mdi:compare-horizontal" :width="20" />
        <span>AI 择业</span>
      </div>
    </template>

    <!-- 未配置 AI：引导 -->
    <div v-if="!hasActiveConfig" class="cc-no-config">
      <Icon icon="mdi:alert-outline" :width="20" />
      <span class="cc-no-config__msg">请先配置 AI 服务后使用</span>
      <n-button size="small" type="primary" @click="goToAISettings">
        前往配置
      </n-button>
    </div>

    <template v-else>
      <n-tabs v-model:value="activeTab" type="line" animated>
        <!-- 机会对比：选择面试 + 自定义要求 -->
        <n-tab-pane name="compare" tab="机会对比">
          <div class="cc-select">
            <!-- 联网搜索能力提示 -->
            <div v-if="!webSearchEnabled" class="cc-search-hint">
              <Icon icon="mdi:information-outline" :width="14" />
              <span>当前服务商不支持联网搜索，仅基于您填写的资料比较</span>
            </div>
            <!-- 隐私提示 -->
            <div class="cc-privacy">
              <Icon icon="mdi:shield-check-outline" :width="14" />
              <span>仅发送公司、岗位、薪资、JD、福利等核心字段；不发送关联简历、联系方式（联系人/电话）、面试问题与回答、面试链接等敏感信息</span>
            </div>

            <!-- 多选列表 -->
            <div v-if="interviewList.length > 0" class="cc-list">
              <button class="cc-select-all" @click="toggleSelectAll">
                <Icon
                  :icon="allSelected ? 'mdi:checkbox-multiple-marked-outline' : 'mdi:checkbox-multiple-blank-outline'"
                  :width="18"
                />
                {{ allSelected ? '取消全选' : '全选' }}
              </button>
              <label
                v-for="i in interviewList"
                :key="i.id"
                class="cc-item"
                :class="{ 'cc-item--checked': selectedIds.has(i.id) }"
              >
                <input
                  type="checkbox"
                  :checked="selectedIds.has(i.id)"
                  @change="toggleSelect(i.id)"
                />
                <span class="cc-item__main">
                  <span class="cc-item__company">{{ i.company || '未填写公司' }} · {{ i.position || '未填写岗位' }}</span>
                  <span class="cc-item__meta">
                    <span class="cc-item__status" :style="{ background: statusStyle(i.status).bg, color: statusStyle(i.status).color }">{{ statusLabel(i.status) }}</span>
                    {{ i.salary || '薪资未填' }} · {{ i.location || '地点未填' }}
                  </span>
                </span>
              </label>
            </div>
            <div v-else class="cc-empty">暂无可比较的面试记录</div>

            <!-- 用户自定义比较要求 -->
            <div class="cc-custom-prompt">
              <label class="cc-custom-prompt__label">
                <Icon icon="mdi:format-list-checks" :width="14" />
                额外要求（可选）
              </label>
              <n-input
                v-model:value="userPrompt"
                type="textarea"
                :autosize="{ minRows: 2, maxRows: 4 }"
                placeholder="如：优先考虑成长空间、不接受 996、希望离家近、看重期权…"
                :disabled="isStreaming"
              />
            </div>

            <div class="cc-select__action">
              <span class="cc-select__count">已选 {{ selectedIds.size }} 个{{ selectedIds.size < 2 ? '（至少选 2 个）' : '' }}</span>
              <n-button type="primary" :disabled="!canStart || isStreaming" :loading="isStreaming" @click="handleStart">
                <template #icon>
                  <Icon icon="mdi:play" :width="16" />
                </template>
                {{ isStreaming ? '生成中…' : '开始比较' }}
              </n-button>
            </div>
          </div>
        </n-tab-pane>

        <!-- 最新结果：推荐卡片 + 报告 -->
        <n-tab-pane name="result" tab="最新结果">
          <div class="cc-result">
            <!-- 空态：无结果且非流式 -->
            <div v-if="!isStreaming && !hasResult" class="cc-result__empty">
              <Icon icon="mdi:file-document-outline" :width="32" />
              <span>还没有对比结果</span>
              <n-button size="small" type="primary" ghost @click="activeTab = 'compare'">去「机会对比」生成</n-button>
            </div>

            <template v-else>
              <!-- 推荐卡片 -->
              <div v-if="recommendation" class="cc-result__recommend">
                <div class="score-ring" :style="recommendRingStyle">
                  <span class="score-ring__value">{{ recommendDisplay }}</span>
                </div>
                <div class="score-ring__info">
                  <span class="score-ring__label">{{ recommendation.company }}</span>
                  <span class="score-ring__desc">推荐 offer{{ recommendation.confidence !== null ? ` · 置信度 ${recommendation.confidence}%` : '' }}</span>
                </div>
              </div>

              <!-- 历史结果时间提示（仅展示用，不复用） -->
              <div v-if="!isStreaming && hasResult && isLoadedHistory" class="cc-result__hint">
                <Icon icon="mdi:clock-outline" :width="14" />
                上次生成于 {{ loadedAtLabel }}（重新生成将覆盖）
              </div>

              <!-- 截断警告 -->
              <div v-if="wasTruncated && hasResult && !isStreaming" class="cc-truncation-warning">
                <Icon icon="mdi:alert-outline" :width="16" />
                AI 输出因长度限制被截断，结果可能不完整
              </div>

              <!-- 错误状态 -->
              <div v-if="errorMessage && !isStreaming" class="cc-error-card">
                <Icon icon="mdi:alert-circle-outline" :width="16" />
                <span class="cc-error-card__msg">{{ errorMessage }}</span>
                <n-button size="small" type="primary" ghost @click="handleStart">重试</n-button>
              </div>

              <!-- 流式期间：纯文本 + 光标 -->
              <div v-if="isStreaming" class="cc-result__content cc-result__content--streaming">
                {{ resultText }}
                <span v-if="!isConnected" class="cc-result__placeholder">正在连接 AI 服务...</span>
                <span v-if="isConnected && !hasResult" class="cc-result__placeholder">正在综合评估...</span>
                <span class="cc-result__cursor" aria-hidden="true">▌</span>
              </div>

              <!-- 完成：渲染 markdown -->
              <div v-else-if="hasResult" class="cc-result__content">
                <div class="cc-result__rich" v-html="renderedResult" />
              </div>
            </template>
          </div>
        </n-tab-pane>
      </n-tabs>
    </template>

    <template #footer>
      <div class="cc-footer">
        <n-button
          v-if="isStreaming"
          type="primary"
          :autofocus="true"
          @click="handleStart"
        >
          <template #icon>
            <Icon icon="mdi:stop" :width="16" />
          </template>
          取消生成
        </n-button>
        <n-button @click="handleClose">关闭</n-button>
      </div>
    </template>
  </n-modal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { Icon } from '@iconify/vue'
import { NModal, NButton, NInput, NTabs, NTabPane } from 'naive-ui'
import { useRouter } from 'vue-router'
import { streamChat, AIServiceError, AI_ERROR_MESSAGES } from '@/services/aiService'
import type { ChatMessage } from '@/services/aiService'
import { useAIConfigStore } from '@/stores/aiConfigStore'
import { useInterviewStore } from '@/stores/interviewStore'
import { markdownToHtml } from '@/utils/markdownConverter'
import { sanitizeHtml } from '@/utils/sanitizeHtml'
import { getScoreColor, formatDateTime } from '@/utils/evaluationScore'
import { buildCareerChoiceMessages, type CareerChoiceInterviewInput } from '@/services/careerChoicePrompts'
import { buildWebSearchBody } from '@/services/webSearchCapability'
import { message as naiveMessage } from '@/plugins/naive-ui'
import type { Interview, InterviewStatus, InterviewRound } from '@/types/interview'

const props = defineProps<{ show: boolean }>()
const emit = defineEmits<{ close: [] }>()

const router = useRouter()
const aiConfigStore = useAIConfigStore()
const interviewStore = useInterviewStore()
const { lastCareerChoice } = storeToRefs(interviewStore)

const hasActiveConfig = computed(() => !!aiConfigStore.activeConfig)

// 联网搜索能力：按当前服务商判断
const webSearchEnabled = computed(() => {
  const p = aiConfigStore.activeConfig?.provider
  return !!p && buildWebSearchBody(p) !== null
})

// ========== 面试列表（全部未删除，不分状态） ==========
const interviewList = computed(() => interviewStore.interviews)

// ponytail: 内建中文映射（与 InterviewCard 同值），不为复用 6 行常量重构导出
const STATUS_LABEL: Record<InterviewStatus, string> = {
  drafting: '草稿', submitted: '已投递', interviewing: '面试中',
  offer: 'Offer', rejected: '未通过', closed: '已结束',
}
const STATUS_STYLE: Record<InterviewStatus, { bg: string; color: string }> = {
  drafting: { bg: 'rgba(120, 120, 120, 0.15)', color: '#999' },
  submitted: { bg: 'rgba(52, 152, 219, 0.15)', color: '#3498db' },
  interviewing: { bg: 'rgba(243, 156, 18, 0.15)', color: '#f39c12' },
  offer: { bg: 'rgba(39, 174, 96, 0.15)', color: '#27ae60' },
  rejected: { bg: 'rgba(231, 76, 60, 0.15)', color: '#e74c3c' },
  closed: { bg: 'rgba(120, 120, 120, 0.15)', color: '#999' },
}
const statusLabel = (s: InterviewStatus) => STATUS_LABEL[s]
const statusStyle = (s: InterviewStatus) => STATUS_STYLE[s]

/** 轮次摘要：共 N 轮，最后一面：X */
function roundsSummary(rounds: InterviewRound[]): string {
  if (rounds.length === 0) return '未安排面试轮次'
  const last = rounds[rounds.length - 1]
  return `共 ${rounds.length} 轮，最后一面：${last.roundType}`
}

// ========== 多选 ==========
const selectedIds = ref<Set<string>>(new Set())
const canStart = computed(() => selectedIds.value.size >= 2)
// 用户自定义比较要求（每次生成时读取，不持久化）
const userPrompt = ref('')
// 当前激活 tab：compare 机会对比 / result 最新结果
const activeTab = ref<'compare' | 'result'>('compare')

const toggleSelect = (id: string) => {
  const next = new Set(selectedIds.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  selectedIds.value = next
}

// 全选 / 取消全选：作用于当前所有面试
const allSelected = computed(() => {
  if (interviewList.value.length === 0) return false
  return interviewList.value.every(i => selectedIds.value.has(i.id))
})
const toggleSelectAll = () => {
  if (allSelected.value) {
    selectedIds.value = new Set()
  } else {
    selectedIds.value = new Set(interviewList.value.map(i => i.id))
  }
}

// ========== 历史结果（仅展示，不复用——每次都重新生成） ==========
const isLoadedHistory = ref(false)
const loadedAtLabel = computed(() =>
  lastCareerChoice.value ? formatDateTime(lastCareerChoice.value.generatedAt) : '',
)

// ========== 流式状态机（照搬 InterviewAIPanel） ==========
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

// ========== 推荐卡片提取（仿 InterviewAIPanel matchScore，500ms 节流） ==========
const recommendation = ref<{ company: string; confidence: number | null } | null>(null)
const recommendDisplay = computed(() => {
  const c = recommendation.value?.confidence
  return c !== null && c !== undefined ? `${c}%` : '--'
})
const recommendRingStyle = computed(() => {
  const c = recommendation.value?.confidence
  if (c === null || c === undefined) {
    return { '--ring-color': 'rgba(120,120,120,0.4)', '--ring-percentage': '0' }
  }
  return {
    '--ring-color': getScoreColor(c),
    '--ring-percentage': `${c / 100}`,
  }
})

let recommendParseTimer: ReturnType<typeof setTimeout> | null = null
let pendingRecommendText = ''
watch(resultText, (text) => {
  if (!text) { recommendation.value = null; return }
  pendingRecommendText = text
  if (!isStreaming.value) {
    parseRecommend(text)
  } else if (!recommendParseTimer) {
    recommendParseTimer = setTimeout(() => {
      recommendParseTimer = null
      parseRecommend(pendingRecommendText)
    }, 500)
  }
})
function parseRecommend(text: string): { company: string; confidence: number | null } | null {
  // 匹配首行「推荐：公司名（置信度 85%）」，置信度可选
  const m = text.match(/^推荐[：:]\s*(.+?)(?:（置信度\s*(\d{1,3})\s*%）)?\s*$/m)
  if (m) {
    const parsed = {
      company: m[1].trim(),
      // ponytail: clamp 到 100，防 AI 偶发输出 >100 导致圆环 conic-gradient 超 360deg 错位
      confidence: m[2] ? Math.min(100, parseInt(m[2])) : null,
    }
    recommendation.value = parsed
    return parsed
  }
  return null
}

// ========== 弹窗打开/关闭初始化 ==========
watch(() => props.show, (val) => {
  if (val) {
    if (abortController) {
      abortController.abort()
      abortController = null
    }
    if (recommendParseTimer) {
      clearTimeout(recommendParseTimer)
      recommendParseTimer = null
    }
    isStreaming.value = false
    isConnected.value = false
    wasTruncated.value = false
    errorMessage.value = ''
    // 加载历史结果展示（仅看，不复用——每次「开始比较」都重新生成）
    const cached = lastCareerChoice.value
    if (cached?.text) {
      resultText.value = cached.text
      recommendation.value = {
        company: cached.recommendationCompany,
        confidence: cached.confidence,
      }
      isLoadedHistory.value = true
      // 有历史 → 默认看结果；无历史 → 默认去选择
      activeTab.value = 'result'
    } else {
      resultText.value = ''
      recommendation.value = null
      isLoadedHistory.value = false
      activeTab.value = 'compare'
    }
    // 保留 selectedIds，方便用户重开继续比较
  }
})

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
  if (!canStart.value) {
    naiveMessage.warning('请至少选择 2 个面试进行比较')
    return
  }

  if (abortController) {
    abortController.abort()
    abortController = null
  }

  resultText.value = ''
  recommendation.value = null
  isStreaming.value = true
  isConnected.value = false
  wasTruncated.value = false
  errorMessage.value = ''
  isLoadedHistory.value = false
  // 切到结果 tab 看流式进度
  activeTab.value = 'result'
  abortController = new AbortController()

  // 构造输入：从 selectedIds 取面试，映射核心字段（剥离敏感字段，不发简历）
  const byId = new Map(interviewList.value.map(i => [i.id, i]))
  const inputs: CareerChoiceInterviewInput[] = [...selectedIds.value]
    .map(id => byId.get(id))
    .filter((i): i is Interview => !!i)
    .map(i => ({
      company: i.company,
      position: i.position,
      salary: i.salary,
      location: i.location,
      jd: i.jd,
      benefits: i.benefits,
      status: statusLabel(i.status),
      roundsSummary: roundsSummary(i.rounds),
    }))

  if (inputs.length < 2) {
    isStreaming.value = false
    naiveMessage.warning('选中的面试已失效，请重新选择')
    return
  }

  const messages: ChatMessage[] = buildCareerChoiceMessages({
    interviews: inputs,
    webSearchEnabled: webSearchEnabled.value,
    userPrompt: userPrompt.value,
  })
  // 联网搜索参数：支持则注入服务商特定 body，否则 undefined
  const searchBody = buildWebSearchBody(config.provider)

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
        maxTokens: 4096,
        extraBody: searchBody ?? undefined,
      },
    )
    wasTruncated.value = result.wasTruncated
    // 生成成功且有内容 → 缓存最近一次（仅历史展示，不复用）
    const finalText = result.finalText || resultText.value
    if (finalText && !errorMessage.value) {
      // 用 finalText 回填 resultText（清洗后的完整文本），保证展示与缓存一致
      resultText.value = finalText
      const rec = parseRecommend(finalText)
      interviewStore.saveCareerChoiceResult({
        text: finalText,
        recommendationCompany: rec?.company ?? '',
        confidence: rec?.confidence ?? null,
        selectedIds: [...selectedIds.value],
        generatedAt: new Date().toISOString(),
      })
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
    // 择业不持久化，已接收的部分结果丢弃
  }
  emit('close')
}

const goToAISettings = () => {
  emit('close')
  router.push({ path: '/dashboard', query: { tab: 'ai' } })
}
</script>

<style lang="scss" scoped>
.cc-header {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  font-weight: 600;
  @include gradient-text;
}

.cc-no-config {
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

// ========== 选择态 ==========
.cc-select {
  display: flex;
  flex-direction: column;
  gap: $spacing-md;

  &__action {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: $spacing-sm;
  }

  &__count {
    font-size: $font-size-xs;
    color: $text-secondary;
  }
}

.cc-search-hint {
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

.cc-privacy {
  @include privacy-notice;
}

.cc-list {
  display: flex;
  flex-direction: column;
  gap: $spacing-xs;
  max-height: 320px;
  overflow-y: auto;
  @include scrollbar;
}

.cc-select-all {
  display: flex;
  align-items: center;
  gap: $spacing-xs;
  align-self: flex-start;
  padding: $spacing-xs $spacing-sm;
  border: none;
  background: none;
  font-family: $font-family;
  font-size: $font-size-xs;
  font-weight: 600;
  color: $text-secondary;
  cursor: pointer;
  transition: color $transition-base;

  &:hover {
    color: $primary-color;
  }
}

.cc-item {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  padding: $spacing-sm $spacing-md;
  background: $bg-glass;
  border: 1px solid $border-glass;
  border-radius: $radius-md;
  cursor: pointer;
  transition: all $transition-base;

  &:hover {
    border-color: $primary-color;
  }

  &--checked {
    border-color: $primary-color;
    background: rgba($primary-color, 0.06);
  }

  input[type='checkbox'] {
    flex-shrink: 0;
    width: 16px;
    height: 16px;
    cursor: pointer;
  }

  &__main {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
    flex: 1;
  }

  &__company {
    font-size: $font-size-sm;
    font-weight: 600;
    color: $text-primary;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__meta {
    display: flex;
    align-items: center;
    gap: $spacing-xs;
    font-size: $font-size-xs;
    color: $text-secondary;
  }

  &__status {
    padding: 1px $spacing-sm;
    border-radius: $radius-full;
    font-size: $font-size-xs;
    font-weight: 600;
  }
}

.cc-empty {
  text-align: center;
  padding: $spacing-xl 0;
  color: $text-light;
  font-size: $font-size-sm;
}

// ========== 自定义比较要求 ==========
.cc-custom-prompt {
  display: flex;
  flex-direction: column;
  gap: $spacing-xs;

  &__label {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: $font-size-xs;
    font-weight: 600;
    color: $text-secondary;
  }
}

// ========== 结果态 ==========
.cc-result {
  display: flex;
  flex-direction: column;
  gap: $spacing-md;

  &__empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: $spacing-sm;
    padding: $spacing-xl 0;
    color: $text-light;
    font-size: $font-size-sm;
  }

  &__recommend {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: $spacing-lg;
    padding: $spacing-lg 0;
    background: $bg-glass;
    border: 1px solid $border-glass;
    border-radius: $radius-md;
  }

  &__hint {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: $font-size-xs;
    color: $text-light;
  }

  &__content {
    min-height: 150px;
    max-height: 440px;
    overflow-y: auto;
    padding: $spacing-md;
    font-size: $font-size-sm;
    line-height: 1.7;
    word-break: break-word;
    @include scrollbar;
  }

  // 流式纯文本态：保留原始换行，光标行内跟随
  &__content--streaming {
    white-space: pre-wrap;
  }

  &__rich {
    // ponytail: 不用 pre-wrap——markdown 已转 HTML，pre-wrap 会与 <p> 的 margin 叠加产生莫名隔断
    :deep(p) {
      margin: 0 0 0.6em;
      &:last-child { margin-bottom: 0; }
    }
    :deep(strong) { font-weight: 700; }
    :deep(ul), :deep(ol) {
      margin: 0.4em 0;
      padding-left: 1.5em;
      li { margin: 0.15em 0; }
    }
    :deep(ul) { list-style-type: disc; }
    :deep(ol) { list-style-type: decimal; }
    :deep(table) {
      border-collapse: collapse;
      width: 100%;
      margin: 0.5em 0;
      font-size: $font-size-xs;
    }
    :deep(th), :deep(td) {
      border: 1px solid $border-glass;
      padding: 4px 8px;
      text-align: left;
    }
    :deep(th) {
      background: rgba($primary-color, 0.06);
      font-weight: 600;
    }
    // 小节标题：左侧色条 + 底部细线，结构感强，消除零散隔断
    :deep(h2) {
      display: flex;
      align-items: center;
      gap: $spacing-xs;
      font-size: 1.05em;
      font-weight: 700;
      margin: 1em 0 0.5em;
      padding-left: $spacing-sm;
      position: relative;
      &::before {
        content: '';
        position: absolute;
        left: 0;
        top: 2px;
        bottom: 2px;
        width: 3px;
        border-radius: $radius-full;
        background: $primary-color;
      }
    }
    :deep(h3) {
      font-size: 1em;
      font-weight: 700;
      margin: 0.7em 0 0.3em;
      color: $text-primary;
    }
    // 首个标题不额外撑顶部
    :deep(h2:first-child) { margin-top: 0; }
  }

  &__placeholder {
    color: $text-light;
    font-style: italic;
  }

  &__cursor {
    color: $primary-light;
    animation: cc-blink 1s step-end infinite;
  }
}

.cc-footer {
  display: flex;
  justify-content: center;
  gap: $spacing-sm;
  padding-top: $spacing-md;
}

.cc-truncation-warning {
  @include truncation-warning;
}

.cc-error-card {
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

// 推荐圆环（仿 InterviewAIPanel score-ring）
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

@keyframes cc-blink {
  50% { opacity: 0; }
}
</style>
