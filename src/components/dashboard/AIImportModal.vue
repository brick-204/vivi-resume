<template>
  <n-modal
    :show="show"
    preset="card"
    :style="{ maxWidth: '700px', width: '90vw' }"
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

      <!-- 简历摘要（成功或部分恢复） -->
      <div v-if="displayResume" class="preview-resume">
        <div v-if="!isPartialRecovery && displayErrors.length === 0" class="preview-resume__success">
          <Icon icon="mdi:check-circle-outline" :width="20" />
          <span>简历解析成功，请确认以下信息</span>
        </div>
        <div v-else class="preview-resume__partial">
          <Icon icon="mdi:information-outline" :width="20" />
          <span>以下为已识别的信息</span>
        </div>
        <div class="preview-resume__fields">
          <div v-if="displayResume.basicInfo.photo" class="preview-field preview-field--photo">
            <label>头像</label>
            <img :src="displayResume.basicInfo.photo" alt="头像预览" class="preview-field__photo" />
          </div>
          <div class="preview-field">
            <label>姓名</label>
            <span>{{ displayResume.basicInfo.name || '（未识别）' }}</span>
          </div>
          <div class="preview-field">
            <label>职位</label>
            <span>{{ displayResume.basicInfo.title || '（未识别）' }}</span>
          </div>
          <div class="preview-field">
            <label>工作经历</label>
            <span>{{ displayResume.workExperience.length }} 条</span>
          </div>
          <div class="preview-field">
            <label>教育经历</label>
            <span>{{ displayResume.education.length }} 条</span>
          </div>
          <div class="preview-field">
            <label>项目经验</label>
            <span>{{ displayResume.projects.length }} 条</span>
          </div>
          <div class="preview-field">
            <label>技能</label>
            <span>{{ displayResume.skills.length }} 条</span>
          </div>
        </div>
      </div>

      <!-- 折叠区：手动调整 JSON -->
      <div class="preview-section-toggle">
        <div class="preview-section-toggle__header" @click="showJsonEditor = !showJsonEditor">
          <Icon :icon="showJsonEditor ? 'mdi:chevron-down' : 'mdi:chevron-right'" :width="16" />
          <Icon icon="mdi:code-json" :width="16" />
          <span>手动调整 JSON</span>
          <span v-if="editedResume" class="preview-section-toggle__status preview-section-toggle__status--ok">
            <Icon icon="mdi:check-circle" :width="14" /> 已校验通过
          </span>
          <span v-else-if="editedErrors.length" class="preview-section-toggle__status preview-section-toggle__status--err">
            <Icon icon="mdi:alert-circle" :width="14" /> {{ editedErrors.length }} 个错误
          </span>
        </div>
        <div v-if="showJsonEditor" class="preview-json-editor">
          <NInput
            v-model:value="editableJsonText"
            type="textarea"
            :autosize="{ minRows: 6, maxRows: 16 }"
            class="preview-json-editor__textarea"
          />
          <div class="preview-json-editor__actions">
            <n-button size="tiny" quaternary @click="handleFormatJson">
              <template #icon>
                <Icon icon="mdi:format-align-left" :width="14" />
              </template>
              格式化
            </n-button>
            <n-button size="tiny" quaternary @click="handleResetJson">
              <template #icon>
                <Icon icon="mdi:restore" :width="14" />
              </template>
              重置为 AI 输出
            </n-button>
          </div>
        </div>
      </div>

      <!-- 折叠区：查看 AI 原始输出 -->
      <div class="preview-section-toggle">
        <div class="preview-section-toggle__header" @click="showRawOutput = !showRawOutput">
          <Icon :icon="showRawOutput ? 'mdi:chevron-down' : 'mdi:chevron-right'" :width="16" />
          <Icon icon="mdi:text-box-outline" :width="16" />
          <span>查看 AI 原始输出</span>
        </div>
        <div v-if="showRawOutput" class="preview-raw-output">{{ resultText }}</div>
      </div>

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
import { NModal, NButton, NSpin, NInput } from 'naive-ui'
import { useAIConfigStore } from '@/stores/aiConfigStore'
import { streamChat, AIServiceError, AI_ERROR_MESSAGES } from '@/services/aiService'
import { buildMessages } from '@/services/aiPrompts'
import { parseAIImportResult } from '@/services/aiResumeImporter'
import { parseFile, isSupportedFileType, getSupportedFileType, type SupportedFileType } from '@/utils/fileParser'
import type { Resume } from '@/types/resume'
import { useResumeStore } from '@/stores/resumeStore'
import type { ValidationError } from '@/schemas/resumeSchema'
import { message as naiveMessage } from '@/plugins/naive-ui'

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
const showRawOutput = ref(false)
const showJsonEditor = ref(false)
let validateTimer: ReturnType<typeof setTimeout> | null = null

// 显示优先级：编辑后的结果 > 原始解析结果
const displayResume = computed(() => editedResume.value ?? parsedResume.value)
const displayErrors = computed(() =>
  editedResume.value !== null || editedErrors.value.length
    ? editedErrors.value
    : validationErrors.value
)
const canImport = computed(() => !!displayResume.value)

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
    showRawOutput.value = false
    showJsonEditor.value = false
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
      },
    )
    wasTruncated.value = result.wasTruncated

    const parseResult = parseAIImportResult(resultText.value, filePhotoDataUri.value)
    if (parseResult.resume) {
      parsedResume.value = parseResult.resume
      isPartialRecovery.value = !!parseResult.partial
      validationErrors.value = parseResult.errors || []
    } else {
      parsedResume.value = null
      isPartialRecovery.value = !!parseResult.partial
      validationErrors.value = parseResult.errors || []
    }
    // 种子文本：优先使用修复后的 JSON，否则用原始 AI 输出
    editableJsonText.value = parseResult.extractedJson ?? resultText.value
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
    }
  }

  &__path {
    font-size: 11px;
    font-weight: 600;
    color: $primary-light;
    opacity: 0.8;
  }
}

.preview-resume {
  &__success {
    display: flex;
    align-items: center;
    gap: $spacing-xs;
    font-size: $font-size-sm;
    font-weight: 600;
    color: $success-color;
    margin-bottom: $spacing-sm;
  }

  &__partial {
    display: flex;
    align-items: center;
    gap: $spacing-xs;
    font-size: $font-size-sm;
    font-weight: 600;
    color: $primary-light;
    margin-bottom: $spacing-sm;
  }

  &__fields {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: $spacing-sm;
  }
}

.preview-field {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  padding: $spacing-sm $spacing-md;
  background: $bg-glass;
  border: 1px solid $border-glass;
  border-radius: $radius-sm;

  &--photo {
    grid-column: 1 / -1;
  }

  &__photo {
    width: 48px;
    height: 48px;
    border-radius: $radius-full;
    object-fit: cover;
    border: 2px solid $border-glass;
  }

  label {
    font-size: $font-size-xs;
    color: $text-light;
    white-space: nowrap;
    min-width: 60px;
  }

  span {
    font-size: $font-size-sm;
    color: $text-primary;
    font-weight: 500;
  }
}

.preview-retry {
  display: flex;
  justify-content: center;
  padding-top: $spacing-sm;
  border-top: 1px solid $border-glass;
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

.preview-section-toggle {
  border: 1px solid $border-glass;
  border-radius: $radius-sm;
  overflow: hidden;

  &__header {
    display: flex;
    align-items: center;
    gap: $spacing-xs;
    padding: $spacing-sm $spacing-md;
    cursor: pointer;
    font-size: $font-size-sm;
    font-weight: 500;
    color: $text-secondary;
    transition: background $transition-base;

    &:hover {
      background: rgba($primary-color, 0.05);
    }
  }

  &__status {
    display: flex;
    align-items: center;
    gap: 4px;
    margin-left: auto;
    font-size: $font-size-xs;
    font-weight: 600;

    &--ok {
      color: $success-color;
    }

    &--err {
      color: $error-color;
    }
  }
}

.preview-json-editor {
  border-top: 1px solid $border-glass;
  padding: $spacing-sm $spacing-md;
  background: $bg-glass;

  &__textarea {
    font-family: 'Cascadia Code', 'Fira Code', 'JetBrains Mono', Consolas, monospace;
    font-size: $font-size-xs;
    line-height: 1.5;
  }

  &__actions {
    display: flex;
    gap: $spacing-xs;
    margin-top: $spacing-xs;
  }
}

.preview-raw-output {
  border-top: 1px solid $border-glass;
  padding: $spacing-md;
  max-height: 200px;
  overflow-y: auto;
  font-family: 'Cascadia Code', 'Fira Code', 'JetBrains Mono', Consolas, monospace;
  font-size: $font-size-xs;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
  color: $text-light;
  @include scrollbar;
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
  .preview-resume__fields {
    grid-template-columns: 1fr;
  }
}
</style>
