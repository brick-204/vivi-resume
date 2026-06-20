<template>
  <n-modal
    :show="show"
    preset="card"
    :style="{ maxWidth: '900px', width: '90vw', height: '80vh' }"
    :content-style="contentStyle"
    :mask-closable="false"
    @update:show="v => { if (!v) handleClose() }"
  >
    <template #header>
      <div class="optimize-header">
        <Icon icon="mdi:creation" :width="20" />
        <span>AI 一键优化</span>
      </div>
    </template>

    <!-- 未开始：展示待优化模块列表 -->
    <div v-if="!isStreaming && !hasResult" class="optimize-setup">
      <div class="optimize-setup__hint">
        <Icon icon="mdi:information-outline" :width="16" />
        AI 将对以下模块逐一润色优化，基本信息不会被修改
      </div>
      <div class="optimize-setup__privacy">
        <Icon icon="mdi:shield-check-outline" :width="14" />
        <span>您的姓名、联系方式等个人敏感信息已自动替换为占位符，不会发送给 AI，仅用于优化简历结构与内容质量</span>
      </div>
      <div class="optimize-section-list">
        <div
          v-for="sec in optimizableSections"
          :key="sec.sectionId"
          class="optimize-section-item"
        >
          <Icon :icon="getSectionIcon(sec.sectionId)" :width="16" />
          <span>{{ sec.title }}</span>
        </div>
      </div>
      <n-input
        v-model:value="customInstruction"
        type="textarea"
        placeholder="可选：输入优化方向，如「更偏向技术岗位」「突出管理经验」..."
        :autosize="{ minRows: 1, maxRows: 3 }"
        :disabled="isStreaming"
        @keydown.enter.ctrl="handleStart"
      />
      <div class="optimize-setup__actions">
        <n-button
          type="primary"
          :disabled="!canStart"
          @click="handleStart"
        >
          <template #icon>
            <Icon icon="mdi:play" :width="16" />
          </template>
          开始优化
        </n-button>
        <span class="optimize-setup__token-hint">
          <Icon icon="mdi:lightning-bolt-outline" :width="14" />
          全局优化将消耗较多 Token
        </span>
      </div>
    </div>

    <!-- 流式输出 + 结果展示 -->
    <div v-else class="optimize-result">
      <!-- 流式状态 -->
      <div v-if="isStreaming" class="optimize-streaming">
        <NSpin :size="16" />
        <span>{{ isConnected ? `正在优化... ${elapsedSeconds}s` : '正在连接 AI 服务...' }}</span>
      </div>

      <!-- 截断警告 -->
      <div v-if="wasTruncated && hasResult && !isStreaming" class="optimize-warning">
        <Icon icon="mdi:alert-outline" :width="16" />
        AI 输出因长度限制被截断，部分模块结果可能不完整
      </div>

      <!-- Section 分组结果 -->
      <div v-if="parsedSections.length > 0" class="optimize-sections">
        <div
          v-for="(sec, idx) in parsedSections"
          :key="sec.sectionId"
          class="optimize-section-card"
        >
          <div class="optimize-section-card__header">
            <div class="optimize-section-card__title">
              <Icon :icon="getSectionIcon(sec.sectionId)" :width="16" />
              <span>{{ sec.sectionTitle }}</span>
            </div>
            <label class="optimize-section-card__toggle">
              <input type="checkbox" :checked="appliedIds.has(sec.sectionId)" @change="toggleSection(sec.sectionId)" />
              <span>应用</span>
            </label>
          </div>
          <div class="optimize-section-card__diff">
            <div class="optimize-section-card__pane">
              <div class="optimize-section-card__pane-header">原文</div>
              <div class="optimize-section-card__pane-content">{{ sec.originalText }}</div>
            </div>
            <div class="optimize-section-card__pane">
              <div class="optimize-section-card__pane-header">
                优化后
                <span v-if="isStreaming && idx === parsedSections.length - 1" class="optimize-section-card__streaming-hint">生成中...</span>
              </div>
              <div class="optimize-section-card__pane-content optimize-section-card__pane-content--optimized">{{ sec.optimizedText }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 未解析的流式原始文本（在解析出 section 之前显示） -->
      <div v-if="isStreaming && parsedSections.length === 0" class="optimize-raw">
        <span v-if="resultText" class="optimize-raw__text">{{ resultText }}</span>
        <span class="optimize-raw__cursor">▌</span>
      </div>

      <!-- 非流式且无解析结果时，显示原始文本 -->
      <div v-if="!isStreaming && parsedSections.length === 0 && resultText" class="optimize-raw">
        <div class="optimize-raw__text">{{ resultText }}</div>
      </div>

      <!-- 再次优化：修改要求后重新生成 -->
      <div v-if="hasResult && !isStreaming" class="optimize-retry">
        <n-input
          v-model:value="customInstruction"
          type="textarea"
          placeholder="调整优化方向，如「更偏向管理岗」「突出沟通能力」..."
          :autosize="{ minRows: 1, maxRows: 3 }"
          @keydown.enter.ctrl="handleStart"
        />
        <n-button
          type="primary"
          ghost
          :disabled="!canStart"
          @click="handleStart"
        >
          <template #icon>
            <Icon icon="mdi:refresh" :width="16" />
          </template>
          重新优化
        </n-button>
      </div>
    </div>

    <template #footer>
      <div class="optimize-footer">
        <n-button @click="handleClose">
          {{ isStreaming ? '取消生成' : '取消' }}
        </n-button>
        <n-button
          v-if="hasResult && !isStreaming"
          type="primary"
          :disabled="appliedIds.size === 0"
          @click="handleApply"
        >
          <template #icon>
            <Icon icon="mdi:check" :width="16" />
          </template>
          应用选中 ({{ appliedIds.size }}/{{ parsedSections.length }})
        </n-button>
      </div>
    </template>
  </n-modal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Icon } from '@iconify/vue'
import { NModal, NButton, NInput, NSpin } from 'naive-ui'
import { useResumeStore } from '@/stores/resumeStore'
import { useAIConfigStore } from '@/stores/aiConfigStore'
import { serializeResumeForEvaluation } from '@/services/resumeSerializer'
import { streamChat, AIServiceError, AI_ERROR_MESSAGES } from '@/services/aiService'
import { buildMessages } from '@/services/aiPrompts'
import { parseOptimizedSections, applyOptimizedSections, getOptimizableSections } from '@/services/fullResumeOptimizer'
import type { SectionResult } from '@/services/fullResumeOptimizer'
import { message as naiveMessage } from '@/plugins/naive-ui'

const props = defineProps<{ show: boolean }>()
const emit = defineEmits<{
  close: []
  apply: [updates: Record<string, unknown>]
}>()

const resumeStore = useResumeStore()
const aiConfigStore = useAIConfigStore()

const customInstruction = ref('')
const resultText = ref('')
const isStreaming = ref(false)
const isConnected = ref(false)
const wasTruncated = ref(false)
const elapsedSeconds = ref(0)
const parsedSections = ref<SectionResult[]>([])
const appliedIds = ref<Set<string>>(new Set())

/** 内容区样式：flex 布局 + Y 轴滚动 */
const contentStyle: Record<string, string> = {
  flex: '1',
  minHeight: '0',
  overflowY: 'auto',
  display: 'flex',
  flexDirection: 'column',
}

let abortController: AbortController | null = null
let elapsedTimer: ReturnType<typeof setInterval> | null = null

/** 待优化的 section 列表 */
const optimizableSections = computed(() => {
  const resume = resumeStore.currentResume
  if (!resume) return []
  return getOptimizableSections(resume)
})

const hasResult = computed(() => resultText.value.length > 0)
const canStart = computed(() => !!aiConfigStore.activeConfig)

/** section 图标映射 */
function getSectionIcon(sectionId: string): string {
  const iconMap: Record<string, string> = {
    summary: 'mdi:account-outline',
    work: 'mdi:briefcase-outline',
    education: 'mdi:school-outline',
    projects: 'mdi:rocket-launch-outline',
    skills: 'mdi:lightning-bolt',
    evaluation: 'mdi:star-outline',
  }
  if (iconMap[sectionId]) return iconMap[sectionId]
  if (sectionId.startsWith('customText')) return 'mdi:text-box-outline'
  if (sectionId.startsWith('customCard')) return 'mdi:view-list-outline'
  return 'mdi:puzzle-outline'
}

/** 切换某个 section 的应用状态 */
function toggleSection(sectionId: string) {
  const newSet = new Set(appliedIds.value)
  if (newSet.has(sectionId)) {
    newSet.delete(sectionId)
  } else {
    newSet.add(sectionId)
  }
  appliedIds.value = newSet
}

/** 弹窗打开/关闭时初始化 */
watch(() => props.show, (val) => {
  if (val) {
    resultText.value = ''
    isStreaming.value = false
    isConnected.value = false
    wasTruncated.value = false
    elapsedSeconds.value = 0
    parsedSections.value = []
    appliedIds.value = new Set()
    customInstruction.value = ''
    if (abortController) {
      abortController.abort()
      abortController = null
    }
    if (elapsedTimer) {
      clearInterval(elapsedTimer)
      elapsedTimer = null
    }
  }
})

/** 开始优化 */
const handleStart = async () => {
  const config = aiConfigStore.activeConfig
  if (!config) {
    naiveMessage.warning('请先配置 AI 服务')
    return
  }

  const resume = resumeStore.currentResume
  if (!resume) {
    naiveMessage.warning('请先打开一份简历')
    return
  }

  // 序列化简历
  const serializedText = serializeResumeForEvaluation(resume)
  if (!serializedText.trim()) {
    naiveMessage.warning('简历内容为空，无法优化')
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
  elapsedSeconds.value = 0
  parsedSections.value = []
  appliedIds.value = new Set()
  lastParseLength = 0
  abortController = new AbortController()

  elapsedTimer = setInterval(() => {
    elapsedSeconds.value++
  }, 1000)

  try {
    const result = await streamChat(
      config,
      buildMessages('optimizeFull', serializedText, customInstruction.value.trim() || undefined),
      (chunk) => {
        resultText.value += chunk
        if (!isConnected.value) {
          isConnected.value = true
        }
        // 尝试实时解析 section
        tryParseSections()
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
    // 最终解析一次
    finalizeParseSections()
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      // 用户取消
    } else if (err instanceof AIServiceError) {
      naiveMessage.error(AI_ERROR_MESSAGES[err.code] || err.message)
    } else {
      naiveMessage.error('优化失败，请重试')
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

/** 尝试实时解析 section（节流，避免过于频繁） */
let lastParseLength = 0
function tryParseSections() {
  // 每增加 200 字符才重新解析
  if (resultText.value.length - lastParseLength < 200) return
  lastParseLength = resultText.value.length
  const resume = resumeStore.currentResume
  if (!resume) return
  const parsed = parseOptimizedSections(resultText.value, resume)
  if (parsed.length > 0) {
    parsedSections.value = parsed
    // 自动勾选所有已解析的 section（首次）
    if (appliedIds.value.size === 0) {
      appliedIds.value = new Set(parsed.map(s => s.sectionId))
    } else {
      // 后续增量勾选新出现的 section
      const newSet = new Set(appliedIds.value)
      for (const s of parsed) {
        if (!appliedIds.value.has(s.sectionId)) {
          newSet.add(s.sectionId)
        }
      }
      appliedIds.value = newSet
    }
  }
}

/** 最终解析（流式结束后调用） */
function finalizeParseSections() {
  const resume = resumeStore.currentResume
  if (!resume) return
  const parsed = parseOptimizedSections(resultText.value, resume)
  if (parsed.length > 0) {
    parsedSections.value = parsed
    // 自动勾选所有
    const newSet = new Set(appliedIds.value)
    for (const s of parsed) {
      newSet.add(s.sectionId)
    }
    appliedIds.value = newSet
  }
}

/** 应用优化结果 */
const handleApply = () => {
  const resume = resumeStore.currentResume
  if (!resume) return

  const updates = applyOptimizedSections(resume, parsedSections.value, appliedIds.value)
  emit('apply', updates)
  emit('close')
}

const handleClose = () => {
  if (isStreaming.value && abortController) {
    abortController.abort()
  }
  emit('close')
}
</script>

<style lang="scss" scoped>
.optimize-header {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  font-weight: 600;
  @include gradient-text;
}

// ========== 设置区 ==========
.optimize-setup {
  display: flex;
  flex-direction: column;
  gap: $spacing-md;

  &__hint {
    display: flex;
    align-items: center;
    gap: $spacing-xs;
    font-size: $font-size-sm;
    color: $text-secondary;
  }

  &__privacy {
    @include privacy-notice;
  }

  &__actions {
    display: flex;
    align-items: center;
    gap: $spacing-md;
  }

  &__token-hint {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: $font-size-xs;
    color: $text-light;
  }
}

.optimize-section-list {
  display: flex;
  flex-wrap: wrap;
  gap: $spacing-xs;
}

.optimize-section-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  background: $bg-glass;
  border: 1px solid $border-glass;
  border-radius: $radius-full;
  font-size: $font-size-xs;
  color: $text-secondary;
}

// ========== 结果区 ==========
.optimize-result {
  display: flex;
  flex-direction: column;
  gap: $spacing-md;
  flex: 1;
  min-height: 0;
  // 移除独立滚动，由 n-card content-style 的 overflow-y 统一处理
}

.optimize-streaming {
  display: flex;
  align-items: center;
  gap: $spacing-xs;
  font-size: $font-size-sm;
  color: #7b93f8;
}

.optimize-warning {
  display: flex;
  align-items: center;
  gap: $spacing-xs;
  padding: $spacing-xs $spacing-md;
  background: rgba($warning-color, 0.08);
  border: 1px solid rgba($warning-color, 0.2);
  border-radius: $radius-sm;
  font-size: $font-size-xs;
  color: $warning-color;
}

.optimize-sections {
  display: flex;
  flex-direction: column;
  gap: $spacing-md;
}

.optimize-section-card {
  @include glass;
  border-radius: $radius-md;
  overflow: hidden;
  background: var(--bg-glass);
  border: 1px solid var(--border-glass);

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: $spacing-sm $spacing-md;
    background: rgba($primary-color, 0.04);
    border-bottom: 1px solid $border-glass;
  }

  &__title {
    display: flex;
    align-items: center;
    gap: $spacing-xs;
    font-size: $font-size-sm;
    font-weight: 600;
    color: $text-primary;
  }

  &__toggle {
    display: flex;
    align-items: center;
    gap: $spacing-xs;
    font-size: $font-size-xs;
    color: $text-secondary;
    cursor: pointer;

    input[type="checkbox"] {
      accent-color: $primary-color;
    }
  }

  &__diff {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }

  &__pane {
    display: flex;
    flex-direction: column;
    min-width: 0;

    &-header {
      display: flex;
      align-items: center;
      gap: $spacing-xs;
      padding: $spacing-xs $spacing-md;
      font-size: $font-size-xs;
      font-weight: 600;
      color: $text-secondary;
      background: $bg-glass;
      border-bottom: 1px solid $border-glass;
    }

    &-content {
      padding: $spacing-sm $spacing-md;
      font-size: $font-size-xs;
      line-height: 1.6;
      color: var(--text-primary);
      white-space: pre-wrap;
      word-break: break-word;
      max-height: 200px;
      overflow-y: auto;
      @include scrollbar;

      &--optimized {
        color: #7b93f8;
      }
    }
  }

  &__streaming-hint {
    font-size: 10px;
    color: #7b93f8;
    animation: blink 1s step-end infinite;
  }
}

.optimize-raw {
  min-height: 120px;
  padding: $spacing-md;
  font-size: $font-size-sm;
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-word;
  color: var(--text-primary);

  &__text {
    color: #7b93f8;
  }

  &__cursor {
    color: #7b93f8;
    animation: blink 1s step-end infinite;
  }
}

.optimize-retry {
  display: flex;
  gap: $spacing-sm;
  align-items: flex-end;
  border-top: 1px solid $border-glass;
  padding-top: $spacing-md;

  .n-input {
    flex: 1;
  }
}

.optimize-footer {
  display: flex;
  justify-content: center;
  gap: $spacing-sm;
  padding-top: $spacing-md;
}

@keyframes blink {
  50% { opacity: 0; }
}

@include mobile {
  .optimize-section-card__diff {
    grid-template-columns: 1fr;
  }
}
</style>
