<template>
  <n-modal
    :show="show"
    preset="card"
    :style="{ maxWidth: '900px', width: '90vw' }"
    :mask-closable="false"
    @update:show="v => { if (!v) handleClose() }"
  >
    <template #header>
      <div class="ai-import-header">
        <Icon icon="mdi:robot-outline" :width="20" />
        <span>AI 智能导入</span>
      </div>
    </template>

    <!-- State 1: Drop-zone -->
    <div v-if="state === 'dropzone'" class="ai-import-dropzone">
      <div class="ai-import-privacy">
        <Icon icon="mdi:shield-alert-outline" :width="14" />
        <span>文件内容将发送给 AI 服务进行解析，请确保文件中不包含不希望泄露的敏感信息</span>
      </div>
      <div
        class="drop-zone"
        :class="{
          'drop-zone--drag-over': isDragOver && isValidType,
          'drop-zone--invalid': (isDragOver && !isValidType) || invalidDrop
        }"
        @dragenter.prevent="onDragEnter"
        @dragover.prevent="onDragOver"
        @dragleave.prevent="onDragLeave"
        @drop.prevent="onDrop"
        @click="triggerFileInput"
      >
        <div class="drop-zone__icon">
          <Icon :icon="isDragOver ? (isValidType ? 'mdi:file-check' : 'mdi:file-alert') : 'mdi:file-upload-outline'" :width="48" />
        </div>
        <p class="drop-zone__text">{{ dropText }}</p>
        <p class="drop-zone__hint">支持 .md / .docx / .pdf 格式</p>
        <input ref="fileInput" type="file" accept=".md,.docx,.pdf" @change="onFileSelect" hidden />
      </div>
      <div v-if="!aiConfigStore.activeConfig" class="ai-import-no-config">
        <Icon icon="mdi:alert-circle-outline" :width="16" />
        <span>尚未配置 AI 服务，请先配置</span>
        <n-button size="tiny" @click="goToAISettings">去配置</n-button>
      </div>
    </div>

    <!-- State 2: AI 解析（流式） -->
    <div v-if="state === 'parsing'" class="ai-import-parsing">
      <div class="parsing-file-info">
        <Icon :icon="fileTypeIcon" :width="20" />
        <span>{{ fileName }}</span>
      </div>
      <div v-if="isFileParsing" class="parsing-streaming">
        <NSpin :size="16" />
        <span>正在解析文件...</span>
      </div>
      <div v-else-if="isStreaming" class="parsing-streaming">
        <NSpin :size="16" />
        <span>{{ isConnected ? `正在解析... ${elapsedSeconds}s` : '正在连接 AI 服务...' }}</span>
      </div>
      <div class="parsing-raw">
        <span v-if="resultText" class="parsing-raw__text">{{ resultText }}</span>
        <span v-if="isStreaming" class="parsing-raw__cursor">▌</span>
      </div>
      <div v-if="wasTruncated && !isStreaming" class="parsing-warning">
        <Icon icon="mdi:alert-outline" :width="16" />
        AI 输出因长度限制被截断，解析结果可能不完整
      </div>
    </div>

    <!-- State 3: 预览确认 -->
    <div v-if="state === 'preview'" class="ai-import-preview">
      <!-- 校验错误 -->
      <div v-if="displayErrors.length > 0" class="preview-errors">
        <div class="preview-errors__header">
          <Icon icon="mdi:alert-circle-outline" :width="16" />
          <span>{{ displayResume ? '部分字段解析异常，可核对后导入或手动调整' : 'AI 输出校验失败，请重试或手动调整' }}</span>
        </div>
        <ul class="preview-errors__list">
          <li v-for="(err, i) in displayErrors" :key="i">
            <span v-if="err.path" class="preview-errors__path">{{ err.path }}</span>
            <span>{{ err.message }}</span>
          </li>
        </ul>
      </div>

      <!-- 部分恢复提示 -->
      <div v-if="displayResume && isPartialRecovery" class="preview-partial-banner">
        <Icon icon="mdi:alert-outline" :width="16" />
        <span>已从 AI 输出中部分恢复数据（尾部可能不完整），请核对后导入或手动调整</span>
      </div>

      <!-- 成功/部分恢复提示 -->
      <div v-if="displayResume" class="preview-status">
        <div v-if="!isPartialRecovery && displayErrors.length === 0" class="preview-status__success">
          <Icon icon="mdi:check-circle-outline" :width="20" />
          <span>简历解析成功，请确认以下信息</span>
        </div>
        <div v-else class="preview-status__partial">
          <Icon icon="mdi:information-outline" :width="20" />
          <span>以下为已识别的信息</span>
        </div>
      </div>

      <!-- Tabs: 字段视图 / JSON Diff（始终显示，即使解析失败也允许查看和编辑） -->
      <NTabs v-if="editableJsonText" v-model:value="activeTab" type="line" size="small" class="preview-tabs">
        <NTabPane name="fields" tab="字段视图">
          <ImportFieldView
            v-if="displayResume"
            :resume="displayResume"
            :errors="displayErrors"
            @field-change="handleFieldChange"
          />
          <div v-else class="preview-no-resume-hint">
            <Icon icon="mdi:information-outline" :width="16" />
            <span>JSON 解析失败，无法展示字段视图。请切换到 JSON Diff 修复格式后重试</span>
            <n-button size="tiny" type="primary" ghost @click="activeTab = 'jsonDiff'">
              去 JSON Diff
            </n-button>
          </div>
        </NTabPane>
        <NTabPane name="jsonDiff" tab="JSON Diff">
          <ImportJsonDiff
            :original-json="resultText"
            :editable-json="editableJsonText"
            :validation-status="jsonValidationStatus"
            :error-count="editedErrors.length || validationErrors.length"
            @update:editable-json="val => { editableJsonText = val }"
            @format="handleFormatJson"
            @reset="handleResetJson"
          />
          <!-- 当有错误时，提供返回错误提示的按钮 -->
          <div v-if="displayErrors.length > 0" class="preview-back-to-errors">
            <n-button size="tiny" quaternary @click="showErrorDetail = !showErrorDetail">
              <template #icon>
                <Icon icon="mdi:alert-circle-outline" :width="14" />
              </template>
              {{ showErrorDetail ? '收起错误详情' : '查看错误详情' }}
            </n-button>
            <div v-if="showErrorDetail" class="preview-errors-inline">
              <ul class="preview-errors__list">
                <li v-for="(err, i) in displayErrors" :key="i">
                  <span v-if="err.path" class="preview-errors__path">{{ err.path }}</span>
                  <span>{{ err.message }}</span>
                </li>
              </ul>
            </div>
          </div>
        </NTabPane>
      </NTabs>

      <!-- 重新解析按钮 -->
      <div class="preview-retry">
        <n-button ghost :disabled="retryCount >= MAX_RETRIES" @click="handleRetry">
          <template #icon>
            <Icon icon="mdi:refresh" :width="16" />
          </template>
          重新解析{{ retryCount >= MAX_RETRIES ? '（已达上限）' : '' }}
        </n-button>
      </div>
    </div>

    <template #footer>
      <div class="ai-import-footer">
        <n-button @click="handleClose">
          {{ isStreaming ? '取消解析' : '取消' }}
        </n-button>
        <n-button
          v-if="state === 'preview' && canImport"
          type="primary"
          :loading="isImporting"
          @click="handleConfirm"
        >
          <template #icon>
            <Icon icon="mdi:check" :width="16" />
          </template>
          导入并编辑
        </n-button>
      </div>
    </template>
  </n-modal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Icon } from '@iconify/vue'
import { NModal, NButton, NSpin, NTabs, NTabPane } from 'naive-ui'
import { useAIConfigStore } from '@/stores/aiConfigStore'
import { streamChat, AIServiceError, AI_ERROR_MESSAGES, plainTextToHtml } from '@/services/aiService'
import { buildMessages, JSON_CONTINUATION_PROMPT } from '@/services/aiPrompts'
import { parseAIImportResult } from '@/services/aiResumeImporter'
import { parseFile, isSupportedFileType, getSupportedFileType, type SupportedFileType } from '@/utils/fileParser'
import type { Resume } from '@/types/resume'
import { useResumeStore } from '@/stores/resumeStore'
import type { ValidationError } from '@/schemas/resumeSchema'
import { message as naiveMessage } from '@/plugins/naive-ui'
import ImportFieldView from './ImportFieldView.vue'
import ImportJsonDiff from './ImportJsonDiff.vue'

const props = defineProps<{ show: boolean }>()
const emit = defineEmits<{
  close: []
  import: [resumeId: string]
  goToSettings: []
}>()

const aiConfigStore = useAIConfigStore()
const resumeStore = useResumeStore()

type ImportState = 'dropzone' | 'parsing' | 'preview'

const state = ref<ImportState>('dropzone')
const fileName = ref('')
const fileType = ref<SupportedFileType>('md')
const fileText = ref('')
/** 从文件中提取的图片 data URI，用于自动填入简历头像 */
const filePhotoDataUri = ref<string | undefined>()

const resultText = ref('')
const isStreaming = ref(false)
const isFileParsing = ref(false)
const isConnected = ref(false)
const wasTruncated = ref(false)
const elapsedSeconds = ref(0)

const parsedResume = ref<Resume | null>(null)
const validationErrors = ref<ValidationError[]>([])
const retryCount = ref(0)

// 手动调整相关状态
const editableJsonText = ref('')
const editedResume = ref<Resume | null>(null)
const editedErrors = ref<ValidationError[]>([])
const isPartialRecovery = ref(false)
let validateTimer: ReturnType<typeof setTimeout> | null = null

// Tab 状态
const activeTab = ref<'fields' | 'jsonDiff'>('fields')

// 错误详情折叠状态
const showErrorDetail = ref(false)

// 显示优先级：编辑后的结果 > 原始解析结果
const displayResume = computed(() => editedResume.value ?? parsedResume.value)
const displayErrors = computed(() =>
  editedResume.value !== null || editedErrors.value.length
    ? editedErrors.value
    : validationErrors.value
)
const canImport = computed(() => !!displayResume.value)

/** JSON 校验状态（供 ImportJsonDiff 显示） */
const jsonValidationStatus = computed(() => {
  if (editedResume.value) return 'ok'
  if (editedErrors.value.length) return 'error'
  // 未编辑过，看原始解析结果
  if (parsedResume.value) return 'ok'
  if (validationErrors.value.length) return 'error'
  return 'idle'
})

const MAX_RETRIES = 2
const isImporting = ref(false)

// Drop-zone 相关
const fileInput = ref<HTMLInputElement | null>(null)
const isDragOver = ref(false)
const isValidType = ref(false)
const invalidDrop = ref(false)
let dragCounter = 0

let abortController: AbortController | null = null
let elapsedTimer: ReturnType<typeof setInterval> | null = null

// 流式文本节流：累积 chunk，每 100ms 批量更新一次 resultText
let streamingBuffer = ''
let streamingFlushTimer: ReturnType<typeof setInterval> | null = null

const fileTypeIcon = computed(() => {
  const map: Record<SupportedFileType, string> = {
    md: 'mdi:language-markdown-outline',
    docx: 'mdi:file-word-outline',
    pdf: 'mdi:file-pdf-box',
  }
  return map[fileType.value]
})

const dropText = computed(() => {
  if (invalidDrop.value) return '仅支持 .md / .docx / .pdf 文件'
  if (!isDragOver.value) return '拖拽文件到此处，或点击选择文件'
  return isValidType.value ? '松开以上传' : '仅支持 .md / .docx / .pdf 文件'
})

/** 尝试格式化 JSON 文本（解析后重新序列化），失败返回 null */
function prettyJson(text: string): string | null {
  try {
    return JSON.stringify(JSON.parse(text), null, 2)
  } catch {
    return null
  }
}

/** 对编辑后的 JSON 进行重新校验（300ms 防抖） */
function revalidateEditedJson() {
  if (validateTimer) clearTimeout(validateTimer)
  validateTimer = setTimeout(() => {
    const result = parseAIImportResult(editableJsonText.value, filePhotoDataUri.value)
    editedResume.value = result.resume ?? null
    editedErrors.value = result.errors || []
    isPartialRecovery.value = !!result.partial
  }, 300)
}

watch(editableJsonText, revalidateEditedJson)

// ========== 字段视图变更处理 ==========

/**
 * 设置嵌套对象的值
 * @param obj 目标对象
 * @param path 路径数组，如 ['basicInfo', 'name'] 或 ['workExperience', 0, 'company']
 * @param value 新值
 */
function setNestedValue(obj: any, path: (string | number)[], value: unknown): void {
  let current = obj
  for (let i = 0; i < path.length - 1; i++) {
    if (current[path[i]] === undefined) {
      // 如果路径中间节点不存在，根据下一个 key 的类型创建数组或对象
      current[path[i]] = typeof path[i + 1] === 'number' ? [] : {}
    }
    current = current[path[i]]
  }
  current[path[path.length - 1]] = value
}

/**
 * 处理字段视图的字段变更
 * 解析 editableJsonText → 应用变更 → 重新序列化 → 触发防抖校验
 * 富文本字段（description/summary/content/selfEvaluation）从字段视图收到的值是纯文本，
 * 需要通过 plainTextToHtml 转回 HTML 以保留富文本结构
 */
function handleFieldChange(path: (string | number)[], value: unknown) {
  try {
    const obj = JSON.parse(editableJsonText.value)
    // 判断是否为富文本字段：路径末尾为 description / summary / content / selfEvaluation
    const lastKey = path[path.length - 1]
    const isRichTextField = typeof lastKey === 'string'
      && ['description', 'summary', 'content', 'selfEvaluation'].includes(lastKey)
    const finalValue = (isRichTextField && typeof value === 'string') ? plainTextToHtml(value) : value
    setNestedValue(obj, path, finalValue)
    editableJsonText.value = JSON.stringify(obj, null, 2)
  } catch {
    // JSON 当前不可解析时忽略字段变更（用户需先修复 JSON）
  }
}

// 弹窗打开时重置
watch(() => props.show, (val) => {
  if (val) {
    state.value = 'dropzone'
    fileName.value = ''
    fileText.value = ''
    filePhotoDataUri.value = undefined
    resultText.value = ''
    isStreaming.value = false
    isFileParsing.value = false
    isConnected.value = false
    wasTruncated.value = false
    elapsedSeconds.value = 0
    parsedResume.value = null
    validationErrors.value = []
    retryCount.value = 0
    editableJsonText.value = ''
    editedResume.value = null
    editedErrors.value = []
    isPartialRecovery.value = false
    activeTab.value = 'fields'
    showErrorDetail.value = false
    if (validateTimer) {
      clearTimeout(validateTimer)
      validateTimer = null
    }
    isDragOver.value = false
    isValidType.value = false
    invalidDrop.value = false
    dragCounter = 0
    if (abortController) {
      abortController.abort()
      abortController = null
    }
    if (streamingFlushTimer) {
      clearInterval(streamingFlushTimer)
      streamingFlushTimer = null
    }
    streamingBuffer = ''
    if (elapsedTimer) {
      clearInterval(elapsedTimer)
      elapsedTimer = null
    }
  }
})

// ========== Drop-zone 事件 ==========

function onDragEnter(e: DragEvent) {
  dragCounter++
  isDragOver.value = true
  const items = e.dataTransfer?.items
  if (items && items.length > 0) {
    const item = items[0]
    // DataTransferItem 仅有 MIME type，无文件名扩展名；
    // 对已知 MIME 映射支持类型，无 MIME 时（如 .md）宽松放行
    const mimeMap: Record<string, boolean> = {
      'application/pdf': true,
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': true,
      'text/markdown': true,
      'text/x-markdown': true,
    }
    isValidType.value = !item.type || mimeMap[item.type]
  }
}

function onDragOver(e: DragEvent) {
  if (e.dataTransfer) {
    e.dataTransfer.dropEffect = isValidType.value ? 'copy' : 'none'
  }
}

function onDragLeave() {
  dragCounter--
  if (dragCounter <= 0) {
    dragCounter = 0
    isDragOver.value = false
    isValidType.value = false
  }
}

function onDrop(e: DragEvent) {
  dragCounter = 0
  isDragOver.value = false
  isValidType.value = false

  const files = e.dataTransfer?.files
  if (files && files.length > 0) {
    const file = files[0]
    if (isSupportedFileType(file)) {
      handleFile(file)
    } else {
      invalidDrop.value = true
      setTimeout(() => { invalidDrop.value = false }, 2000)
    }
  }
}

function triggerFileInput() {
  fileInput.value?.click()
}

function onFileSelect(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) {
    handleFile(file)
  }
  input.value = ''
}

// ========== 文件处理 ==========

async function handleFile(file: File) {
  if (!aiConfigStore.activeConfig) {
    naiveMessage.warning('请先配置 AI 服务')
    return
  }

  // 先切换到解析状态，让用户看到进度反馈
  fileName.value = file.name
  const detectedType = getSupportedFileType(file)
  if (detectedType) fileType.value = detectedType
  state.value = 'parsing'
  isFileParsing.value = true

  try {
    const result = await parseFile(file)
    fileText.value = result.text
    filePhotoDataUri.value = result.photoDataUri
  } catch (e) {
    naiveMessage.error((e as Error).message || '文件解析失败')
    state.value = 'dropzone'
    isFileParsing.value = false
    return
  }

  isFileParsing.value = false
  await startAIParsing()
}

// ========== AI 解析 ==========

async function startAIParsing() {
  const config = aiConfigStore.activeConfig
  if (!config) return

  resultText.value = ''
  isStreaming.value = true
  isConnected.value = false
  wasTruncated.value = false
  elapsedSeconds.value = 0
  parsedResume.value = null
  validationErrors.value = []

  // 重置流式缓冲区
  streamingBuffer = ''
  streamingFlushTimer = setInterval(() => {
    if (streamingBuffer) {
      resultText.value += streamingBuffer
      streamingBuffer = ''
    }
  }, 100)

  abortController = new AbortController()

  elapsedTimer = setInterval(() => {
    elapsedSeconds.value++
  }, 1000)

  try {
    const result = await streamChat(
      config,
      buildMessages('importResume', fileText.value),
      (chunk) => {
        streamingBuffer += chunk
        if (!isConnected.value) {
          isConnected.value = true
        }
      },
      {
        signal: abortController.signal,
        onUsage: (usage) => {
          aiConfigStore.addUsage(usage)
        },
        maxTokens: 8192,
        continuationPrompt: JSON_CONTINUATION_PROMPT,
        validateSplice: true,
      },
    )
    wasTruncated.value = result.wasTruncated

    // 使用清洗后的 finalText 进行解析（而非 onChunk 累积的原始文本）
    // onChunk 累积的 resultText 仅用于流式显示和 JSON Diff 的"AI 原始输出"参考
    const finalText = result.finalText || resultText.value
    const parseResult = parseAIImportResult(finalText, filePhotoDataUri.value)
    if (parseResult.resume) {
      parsedResume.value = parseResult.resume
      isPartialRecovery.value = !!parseResult.partial
      validationErrors.value = parseResult.errors || []
    } else {
      parsedResume.value = null
      isPartialRecovery.value = !!parseResult.partial
      validationErrors.value = parseResult.errors || []
    }
    // 种子文本：优先使用修复后的 JSON，否则用清洗后的完整文本
    editableJsonText.value = parseResult.extractedJson ?? finalText
    // 重置编辑态校验结果
    editedResume.value = null
    editedErrors.value = []

    state.value = 'preview'
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      state.value = 'dropzone'
    } else if (err instanceof AIServiceError) {
      naiveMessage.error(AI_ERROR_MESSAGES[err.code] || err.message)
      state.value = 'dropzone'
    } else {
      naiveMessage.error('AI 解析失败，请重试')
      state.value = 'dropzone'
    }
  } finally {
    isStreaming.value = false
    isFileParsing.value = false
    isConnected.value = false
    abortController = null
    // 刷出缓冲区剩余内容并清理定时器
    if (streamingFlushTimer) {
      clearInterval(streamingFlushTimer)
      streamingFlushTimer = null
    }
    if (streamingBuffer) {
      resultText.value += streamingBuffer
      streamingBuffer = ''
    }
    if (elapsedTimer) {
      clearInterval(elapsedTimer)
      elapsedTimer = null
    }
  }
}

/** 格式化编辑器中的 JSON */
function handleFormatJson() {
  const formatted = prettyJson(editableJsonText.value)
  if (formatted) {
    editableJsonText.value = formatted
  }
}

/** 重置编辑器为 AI 原始输出 */
function handleResetJson() {
  editableJsonText.value = resultText.value
  editedResume.value = null
  editedErrors.value = []
}

async function handleRetry() {
  if (retryCount.value >= MAX_RETRIES) {
    naiveMessage.warning('已达到最大重试次数')
    return
  }
  retryCount.value++
  state.value = 'parsing'
  await startAIParsing()
}

async function handleConfirm() {
  if (!displayResume.value) return
  isImporting.value = true
  try {
    const id = await resumeStore.importFromAIResult(displayResume.value)
    emit('import', id)
    emit('close')
  } catch (e) {
    naiveMessage.error('导入失败：' + (e as Error).message)
  } finally {
    isImporting.value = false
  }
}

function handleClose() {
  if (isStreaming.value && abortController) {
    abortController.abort()
  }
  emit('close')
}

function goToAISettings() {
  emit('goToSettings')
}
</script>

<style lang="scss" scoped>
.ai-import-header {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  font-weight: 600;
  @include gradient-text;
}

.ai-import-dropzone {
  display: flex;
  flex-direction: column;
  gap: $spacing-md;
}

.ai-import-privacy {
  @include privacy-notice;
}

.ai-import-no-config {
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

.drop-zone {
  @include glass;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: $spacing-3xl $spacing-xl;
  min-height: 220px;
  cursor: pointer;
  transition: all $transition-base;
  text-align: center;

  &--drag-over {
    border-color: $primary-color;
    background: rgba($primary-color, 0.1);
    box-shadow: 0 0 30px rgba($primary-color, 0.2);

    .drop-zone__icon {
      color: $primary-light;
      transform: scale(1.1);
    }
  }

  &--invalid {
    border-color: $error-color;
    background: rgba($error-color, 0.08);

    .drop-zone__icon {
      color: $error-color;
    }

    .drop-zone__text {
      color: $error-color;
    }
  }

  &__icon {
    color: $text-secondary;
    margin-bottom: $spacing-md;
    transition: all $transition-base;
  }

  &__text {
    font-size: $font-size-md;
    color: $text-primary;
    font-weight: 500;
    margin-bottom: $spacing-xs;
  }

  &__hint {
    font-size: $font-size-sm;
    color: $text-light;
  }
}

.ai-import-parsing {
  display: flex;
  flex-direction: column;
  gap: $spacing-md;
}

.parsing-file-info {
  display: flex;
  align-items: center;
  gap: $spacing-xs;
  font-size: $font-size-sm;
  color: $text-secondary;
}

.parsing-streaming {
  display: flex;
  align-items: center;
  gap: $spacing-xs;
  font-size: $font-size-sm;
  color: #7b93f8;
}

.parsing-raw {
  min-height: 120px;
  max-height: 300px;
  overflow-y: auto;
  padding: $spacing-md;
  font-size: $font-size-xs;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
  color: var(--text-primary);
  background: $bg-glass;
  border: 1px solid $border-glass;
  border-radius: $radius-md;
  @include scrollbar;

  &__text {
    color: #7b93f8;
  }

  &__cursor {
    color: #7b93f8;
    animation: blink 1s step-end infinite;
  }
}

.parsing-warning {
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

.ai-import-preview {
  display: flex;
  flex-direction: column;
  gap: $spacing-md;
}

.preview-status {
  &__success {
    display: flex;
    align-items: center;
    gap: $spacing-xs;
    font-size: $font-size-sm;
    font-weight: 600;
    color: $success-color;
  }

  &__partial {
    display: flex;
    align-items: center;
    gap: $spacing-xs;
    font-size: $font-size-sm;
    font-weight: 600;
    color: $primary-light;
  }
}

.preview-errors {
  &__header {
    display: flex;
    align-items: center;
    gap: $spacing-xs;
    font-size: $font-size-sm;
    font-weight: 600;
    color: $error-color;
    margin-bottom: $spacing-sm;
  }

  &__list {
    list-style: none;
    padding: 0;
    margin: 0;
    max-height: 200px;
    overflow-y: auto;
    @include scrollbar;

    li {
      display: flex;
      flex-direction: column;
      gap: 2px;
      padding: 8px 12px;
      border-bottom: 1px solid $border-glass;
      font-size: $font-size-xs;
      color: var(--text-primary);

      &:last-child {
        border-bottom: none;
      }

      // 错误消息可能包含出错位置上下文片段（含换行），保留换行
      > span:last-child {
        white-space: pre-wrap;
        word-break: break-word;
        font-family: 'Cascadia Code', 'Fira Code', 'JetBrains Mono', Consolas, monospace;
      }
    }
  }

  &__path {
    font-size: 11px;
    font-weight: 600;
    color: $primary-light;
    opacity: 0.8;
  }
}

.preview-partial-banner {
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

.preview-tabs {
  :deep(.n-tabs-pane-wrapper) {
    max-height: 55vh;
    overflow-y: auto;
    @include scrollbar;
  }
}

.preview-no-resume-hint {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  padding: $spacing-lg $spacing-md;
  color: $text-light;
  font-size: $font-size-sm;
}

.preview-back-to-errors {
  margin-top: $spacing-sm;
}

.preview-errors-inline {
  margin-top: $spacing-xs;
  padding: $spacing-sm;
  background: $bg-glass;
  border: 1px solid $border-glass;
  border-radius: $radius-sm;
}

.preview-retry {
  display: flex;
  justify-content: center;
  padding-top: $spacing-sm;
  border-top: 1px solid $border-glass;
}

.ai-import-footer {
  display: flex;
  justify-content: center;
  gap: $spacing-sm;
  padding-top: $spacing-md;
}

@keyframes blink {
  50% { opacity: 0; }
}

@include mobile {
  .preview-tabs {
    :deep(.n-tabs-pane-wrapper) {
      max-height: 70vh;
    }
  }
}
</style>
