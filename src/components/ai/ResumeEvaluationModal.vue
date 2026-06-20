<template>
  <n-modal
    :show="show"
    preset="card"
    :style="{ maxWidth: '800px', width: '90vw' }"
    :mask-closable="false"
    @update:show="v => { if (!v) handleClose() }"
  >
    <template #header>
      <div class="eval-header">
        <Icon icon="mdi:clipboard-check-outline" :width="20" />
        <span>AI 简历评估</span>
      </div>
    </template>

    <!-- 操作栏 -->
    <div class="eval-actions">
      <n-button
        v-if="!isStreaming"
        type="primary"
        :disabled="!canStart"
        @click="startEvaluation"
      >
        <template #icon>
          <Icon :icon="hasResult ? 'mdi:refresh' : 'mdi:play'" :width="16" />
        </template>
        {{ hasResult ? '重新评估' : '开始评估' }}
      </n-button>
      <div v-if="!isStreaming && hasResult && isLoadedResult" class="eval-actions__hint">
        <Icon icon="mdi:clock-outline" :width="14" />
        上次评估于 {{ evaluatedAtLabel }}
      </div>
      <div v-if="!isStreaming && !aiConfigStore.activeConfig" class="eval-actions__hint eval-actions__hint--warn">
        <Icon icon="mdi:alert-circle-outline" :width="14" />
        请先在首页配置 AI 服务
      </div>
      <div v-if="isStreaming" class="eval-status">
        <NSpin :size="16" />
        <span>{{ isConnected ? `正在评估... ${elapsedSeconds}s` : '正在连接 AI 服务...' }}</span>
      </div>
    </div>

    <!-- 隐私提示 -->
    <div v-if="!isStreaming" class="eval-privacy-notice">
      <Icon icon="mdi:shield-check-outline" :width="14" />
      <span>您的姓名、联系方式等个人敏感信息已自动替换为占位符，不会发送给 AI，仅用于评估简历结构与内容质量</span>
    </div>

    <!-- 总分展示 -->
    <transition name="eval-score-fade">
      <div v-if="overallScore !== null" class="eval-score">
        <div class="eval-score__circle" :style="scoreCircleStyle">
          <span class="eval-score__number">{{ overallScore }}</span>
          <span class="eval-score__label">/100</span>
        </div>
        <span class="eval-score__text">{{ scoreLabel }}</span>
      </div>
    </transition>

    <!-- 内容区域 -->
    <div class="eval-content">
      <!-- 截断警告 -->
      <div v-if="wasTruncated && hasResult && !isStreaming" class="eval-truncation-warning">
        <Icon icon="mdi:alert-outline" :width="16" />
        AI 输出因长度限制被截断，结果可能不完整
      </div>

      <template v-if="hasResult">
        <!-- 流式期间纯文本（打字机效果） -->
        <template v-if="isStreaming">{{ resultText }}</template>
        <!-- 流式结束后渲染 HTML -->
        <div v-else class="eval-content__rich" v-html="renderedResult" />
      </template>
      <div v-else class="eval-placeholder">
        <Icon icon="mdi:file-document-edit-outline" :width="40" />
        <span>{{ isStreaming ? '正在生成评估报告...' : '点击「开始评估」对您的简历进行全面分析' }}</span>
      </div>
      <span v-if="isStreaming" class="eval-cursor">▌</span>
    </div>

    <template #footer>
      <div class="eval-footer">
        <n-button @click="handleClose">
          {{ isStreaming ? '停止生成' : '关闭' }}
        </n-button>
      </div>
    </template>
  </n-modal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Icon } from '@iconify/vue'
import { NModal, NButton, NSpin } from 'naive-ui'
import { useResumeStore } from '@/stores/resumeStore'
import { useAIConfigStore } from '@/stores/aiConfigStore'
import { serializeResumeForEvaluation } from '@/services/resumeSerializer'
import { streamChat, AIServiceError, AI_ERROR_MESSAGES } from '@/services/aiService'
import { markdownToHtml } from '@/utils/markdownConverter'
import { sanitizeHtml } from '@/utils/sanitizeHtml'
import { getScoreColor, formatDateTime } from '@/utils/evaluationScore'
import { message as naiveMessage } from '@/plugins/naive-ui'

const props = defineProps<{ show: boolean }>()
const emit = defineEmits<{ close: [] }>()

const resumeStore = useResumeStore()
const aiConfigStore = useAIConfigStore()

const resultText = ref('')
const isStreaming = ref(false)
const isConnected = ref(false)
const elapsedSeconds = ref(0)
const isLoadedResult = ref(false)    // 当前显示的是从 store 加载的旧结果
const loadedEvaluatedAt = ref('')    // 旧结果的评估时间
const wasTruncated = ref(false)      // AI 输出是否被截断
let abortController: AbortController | null = null
let elapsedTimer: ReturnType<typeof setInterval> | null = null
let saveDone = false  // 防止 handleClose 和 finally 双重保存

// ========== System Prompt ==========

const EVALUATION_SYSTEM_PROMPT = `你是一位专业的简历评估顾问，拥有丰富的 HR 和招聘经验。你将对用户提交的简历进行全面、专业、客观的评估。

## 评估要求

你必须对用户简历中**每一个存在的模块**逐一进行评估，不可遗漏、不可跳过。
即使用户某个模块内容很少或只有一行，也必须单独评估。
如果某个模块标注了"（未填写）"，请明确指出该模块缺失并建议补充。

评估维度：
1. **内容完整性**：各模块信息是否完整、有无缺失关键字段
2. **表述专业性**：措辞是否专业、有无口语化或模糊表述
3. **逻辑清晰度**：信息组织是否有条理、时间线是否连贯
4. **信息密度**：是否充分量化成果、有无废话
5. **格式规范**：格式是否统一、排版是否整洁
6. **ATS 友好度**：简历对 ATS（自动简历筛选系统）的兼容性，包括：
   - 关键词密度：核心技能和行业关键词是否充分出现，是否覆盖常见同义词
   - 格式可解析性：是否使用 ATS 可识别的标准格式（避免纯图片文字、复杂表格、特殊符号）
   - 联系方式规范：电话、邮箱等是否使用标准格式，便于 ATS 提取
   - 模块结构清晰：各模块标题是否使用常见命名（如"工作经历"而非创意标题），便于 ATS 正确分类
   - 日期格式统一：时间表述是否规范一致（如 2020-01 或 2020.01），便于 ATS 解析时间线

## 输出格式（严格遵循 Markdown）

## 总体评分
XX/100

## 各模块评估

（对用户简历中列出的【模块名】逐一评估，每个模块必须包含以下三项：）

### 模块名称
- **优点**：具体指出做得好的地方（哪怕只有一点）
- **不足**：具体指出需要改进的地方
- **建议**：给出可操作的改进建议

## 总体建议
（3-5 条最关键的改进行动，按优先级排列）

## 注意事项
- 评分要客观公正，不要一味夸赞或贬低
- 每个模块都必须有「优点」「不足」「建议」三项，不可省略
- 建议要具体可操作，避免"加强描述"这类空话
- 直接输出评估报告，不要添加任何解释或前缀`

// ========== 计算属性 ==========

/** 是否有生成结果 */
const hasResult = computed(() => resultText.value.length > 0)

/** 是否可以开始评估 */
const canStart = computed(() => !!aiConfigStore.activeConfig)

/** 上次评估时间的可读文本 */
const evaluatedAtLabel = computed(() => formatDateTime(loadedEvaluatedAt.value))

/** 从流式文本中提取总分 */
const overallScore = computed(() => {
  const match = resultText.value.match(/总体评分[^\d]*(\d{1,3})\s*\/\s*100/)
  return match ? parseInt(match[1]) : null
})

/** 分数颜色 */
const scoreColor = computed(() => getScoreColor(overallScore.value))

/** 分数圆环样式 */
const scoreCircleStyle = computed(() => ({
  borderColor: scoreColor.value,
  color: scoreColor.value,
}))

/** 分数评语 */
const scoreLabel = computed(() => {
  const s = overallScore.value
  if (s === null) return ''
  if (s >= 90) return '优秀'
  if (s >= 80) return '良好'
  if (s >= 70) return '中等偏上'
  if (s >= 60) return '及格'
  return '需要大幅改进'
})

/** 渲染后的 HTML（仅非流式时计算） */
const renderedResult = computed(() => {
  if (!resultText.value || isStreaming.value) return ''
  const html = markdownToHtml(resultText.value)
  return sanitizeHtml(html)
})

// ========== 弹窗生命周期 ==========

watch(() => props.show, (val) => {
  if (val) {
    // 取消上一个未完成的请求
    if (abortController) {
      abortController.abort()
      abortController = null
    }
    // 重置流式状态
    isStreaming.value = false
    isConnected.value = false
    elapsedSeconds.value = 0
    if (elapsedTimer) {
      clearInterval(elapsedTimer)
      elapsedTimer = null
    }

    // 加载上次评估结果（如果有）
    const last = resumeStore.currentResume?.lastEvaluation
    if (last?.text) {
      resultText.value = last.text
      isLoadedResult.value = true
      loadedEvaluatedAt.value = last.evaluatedAt
    } else {
      resultText.value = ''
      isLoadedResult.value = false
      loadedEvaluatedAt.value = ''
    }
  }
})

// ========== 核心逻辑 ==========

/** 启动评估 */
const startEvaluation = async () => {
  const config = aiConfigStore.activeConfig
  if (!config) return

  const resume = resumeStore.currentResume
  if (!resume) {
    naiveMessage.warning('请先打开一份简历')
    return
  }

  // 序列化简历
  const serializedText = serializeResumeForEvaluation(resume)
  if (!serializedText.trim()) {
    naiveMessage.warning('简历内容为空，无法评估')
    return
  }

  // 取消上一个未完成的请求
  if (abortController) {
    abortController.abort()
    abortController = null
  }

  // 不在这里清 resultText —— 等首个 chunk 到达时再清，让旧结果持续显示
  isStreaming.value = true
  isConnected.value = false
  elapsedSeconds.value = 0
  isLoadedResult.value = false
  saveDone = false
  wasTruncated.value = false
  abortController = new AbortController()

  // 启动计时器
  elapsedTimer = setInterval(() => {
    elapsedSeconds.value++
  }, 1000)

  try {
    const result = await streamChat(
      config,
      [
        { role: 'system' as const, content: EVALUATION_SYSTEM_PROMPT },
        { role: 'user' as const, content: `请对以下简历进行全面评估，必须对每个【模块】逐一评估：\n\n${serializedText}` },
      ],
      (chunk) => {
        // 首次收到 chunk 时清除旧结果
        if (!isConnected.value) {
          resultText.value = ''
          isConnected.value = true
        }
        resultText.value += chunk
      },
      {
        signal: abortController.signal,
        onUsage: (usage) => {
          aiConfigStore.addUsage(usage)
        },
        maxTokens: 4096, // 配合自动续写，单次 4096 足长输出截断后自动续写
      },
    )
    wasTruncated.value = result.wasTruncated
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      // 用户取消，静默
    } else if (err instanceof AIServiceError) {
      naiveMessage.error(AI_ERROR_MESSAGES[err.code] || err.message)
    } else {
      naiveMessage.error('评估失败，请重试')
    }
  } finally {
    isStreaming.value = false
    isConnected.value = false
    abortController = null
    if (elapsedTimer) {
      clearInterval(elapsedTimer)
      elapsedTimer = null
    }
    // 保存评估结果到 store（handleClose 可能已保存，用 saveDone 去重）
    if (!saveDone && resultText.value && resume.id) {
      saveDone = true
      resumeStore.saveEvaluationResult(resume.id, {
        score: overallScore.value,
        text: resultText.value,
        evaluatedAt: new Date().toISOString(),
      })
    }
  }
}

/** 关闭弹窗 */
const handleClose = () => {
  if (isStreaming.value && abortController) {
    abortController.abort()
    // 用户中止时保存已接收的部分结果（标记 saveDone 防止 finally 重复保存）
    const resume = resumeStore.currentResume
    if (!saveDone && resultText.value && resume?.id) {
      saveDone = true
      resumeStore.saveEvaluationResult(resume.id, {
        score: overallScore.value,
        text: resultText.value,
        evaluatedAt: new Date().toISOString(),
      })
    }
  }
  emit('close')
}
</script>

<style lang="scss" scoped>
.eval-header {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  font-weight: 600;
  @include gradient-text;
}

// ========== 操作栏 ==========
.eval-actions {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  padding-bottom: $spacing-md;
  border-bottom: 1px solid $border-glass;

  &__hint {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: $font-size-xs;
    color: $text-light;

    &--warn {
      color: $warning-color;
    }
  }
}

.eval-status {
  display: flex;
  align-items: center;
  gap: $spacing-xs;
  font-size: $font-size-sm;
  color: $primary-light;
}

// ========== 总分展示 ==========
.eval-score {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: $spacing-md 0;
  gap: $spacing-xs;

  &__circle {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    border: 3px solid;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    transition: all 0.4s ease;
  }

  &__number {
    font-size: 28px;
    font-weight: 700;
    line-height: 1;
  }

  &__label {
    font-size: 11px;
    opacity: 0.6;
    margin-top: 2px;
  }

  &__text {
    font-size: $font-size-xs;
    color: $text-secondary;
  }
}

.eval-score-fade-enter-active {
  transition: all 0.4s ease;
}

.eval-score-fade-enter-from {
  opacity: 0;
  transform: scale(0.8);
}

// ========== 内容区域 ==========
.eval-content {
  min-height: 200px;
  max-height: 500px;
  overflow-y: auto;
  padding: $spacing-md 0;
  font-size: $font-size-sm;
  line-height: 1.7;
  color: $text-primary;
  white-space: pre-wrap;
  word-break: break-word;
  @include scrollbar;

  &__rich {
    white-space: normal;

    :deep(h2) {
      font-size: 16px;
      font-weight: 700;
      color: $text-primary;
      margin: 1.2em 0 0.5em;
      padding-bottom: 4px;
      border-bottom: 1px solid $border-glass;

      &:first-child {
        margin-top: 0;
      }
    }

    :deep(h3) {
      font-size: 14px;
      font-weight: 600;
      color: $text-primary;
      margin: 1em 0 0.3em;
    }

    :deep(p) {
      margin: 0 0 0.5em;

      &:last-child {
        margin-bottom: 0;
      }
    }

    :deep(strong) {
      font-weight: 700;
      color: $primary-light;
    }

    :deep(em) {
      font-style: italic;
    }

    :deep(u) {
      text-decoration: underline;
    }

    :deep(s) {
      text-decoration: line-through;
    }

    :deep(ul) {
      list-style-type: disc;
      margin: 0.5em 0;
      padding-left: 1.5em;
    }

    :deep(ol) {
      list-style-type: decimal;
      margin: 0.5em 0;
      padding-left: 1.5em;
    }

    :deep(li) {
      margin-bottom: 0.25em;
    }

    :deep(mark) {
      border-radius: 2px;
      padding: 0 2px;
    }

    :deep(a) {
      color: $primary-light;
      text-decoration: underline;
    }
  }
}

.eval-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: $spacing-sm;
  min-height: 160px;
  color: $text-light;
  font-size: $font-size-sm;
  text-align: center;
}

.eval-cursor {
  color: $primary-light;
  animation: blink 1s step-end infinite;
}

.eval-footer {
  display: flex;
  justify-content: center;
  gap: $spacing-sm;
  padding-top: $spacing-md;
}

@keyframes blink {
  50% { opacity: 0; }
}

// ========== 截断警告 ==========
.eval-truncation-warning {
  @include truncation-warning;
}

// ========== 隐私提示 ==========
.eval-privacy-notice {
  @include privacy-notice;
}
</style>
