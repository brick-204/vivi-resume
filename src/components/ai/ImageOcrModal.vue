<template>
  <n-modal
    :show="visible"
    preset="card"
    :auto-focus="false"
    :style="{ maxWidth: '640px', width: '90vw', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }"
    :mask-closable="false"
    @update:show="v => { if (!v) handleClose() }"
  >
    <template #header>
      <div class="ocr-header">
        <Icon icon="mdi:image-search-outline" :width="20" />
        <span>AI 识图</span>
      </div>
    </template>

    <!-- 输入区：未开始识别时展示 -->
    <div v-if="!isStreaming && !resultText && !errorMessage" class="ocr-input ocr-body">
      <div
        class="ocr-dropzone"
        :class="{ 'ocr-dropzone--dragover': dragover }"
        @dragover.prevent="dragover = true"
        @dragleave.prevent="dragover = false"
        @drop.prevent="onDrop"
      >
        <template v-if="imageDataUrl">
          <div class="ocr-preview-wrap">
            <NImage
              :src="imageDataUrl"
              :preview-src="imageDataUrl"
              :width="460"
              :height="200"
              object-fit="contain"
              class="ocr-preview"
            />
          </div>
          <NButton size="small" quaternary @click="clearImage">
            <template #icon>
              <Icon icon="mdi:close" :width="16" />
            </template>
            清除
          </NButton>
        </template>
        <button v-else ref="addBtnRef" type="button" class="ocr-dropzone__add" @click="triggerFileInput">
          <Icon icon="mdi:image-plus-outline" :width="32" />
          <span>点击上传 / 粘贴 / 拖拽图片</span>
          <span class="ocr-dropzone__hint">支持截图、照片，自动压缩后发送给 AI 识别</span>
        </button>
      </div>
      <input
        ref="fileInputRef"
        type="file"
        accept="image/*"
        class="ocr-file-input"
        @change="onFileChange"
      />
      <div class="ocr-actions">
        <NButton
          type="primary"
          :disabled="!imageDataUrl || processing"
          :loading="processing"
          @click="handleStartOcr"
        >
          <template #icon>
            <Icon icon="mdi:text-recognition" :width="16" />
          </template>
          识别文字
        </NButton>
      </div>
    </div>

    <!-- 识别中 / 结果区 -->
    <div v-else class="ocr-result ocr-body">
      <!-- 错误 -->
      <div v-if="errorMessage" class="ocr-error">
        <Icon icon="mdi:alert-circle-outline" :width="18" />
        <span>{{ errorMessage }}</span>
      </div>

      <!-- 结果文本（流式 + 完成） -->
      <template v-else>
        <div class="ocr-result__bar">
          <span class="ocr-result__status">
            <template v-if="isStreaming">
              <Icon icon="mdi:loading" :width="14" class="ocr-spin" />
              识别中…
            </template>
            <template v-else>识别完成</template>
          </span>
          <NButton
            v-if="!isStreaming && resultText"
            size="small"
            quaternary
            @click="onCopyClick"
          >
            <template #icon>
              <Icon icon="mdi:content-copy" :width="14" />
            </template>
            复制
          </NButton>
        </div>
        <n-input
          :value="resultText"
          type="textarea"
          readonly
          :autosize="{ minRows: 4, maxRows: 10 }"
          placeholder="识别结果将显示在这里"
        />
      </template>

      <!-- 底部操作 -->
      <div class="ocr-result__actions">
        <NButton
          v-if="isStreaming"
          size="small"
          @click="handleCancel"
        >
          <template #icon>
            <Icon icon="mdi:stop" :width="14" />
          </template>
          停止
        </NButton>
        <NButton v-else size="small" @click="handleReset">
          <template #icon>
            <Icon icon="mdi:refresh" :width="14" />
          </template>
          识别下一张
        </NButton>
      </div>
    </div>
  </n-modal>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { Icon } from '@iconify/vue'
import { NModal, NButton, NImage, NInput } from 'naive-ui'
import { message as naiveMessage } from '@/plugins/naive-ui'
import { useWorkerImageProcessor } from '@/composables/useWorkerImageProcessor'
import { ocrImage, formatOcrError, isOcrErrorPrefix } from '@/services/ocrService'

const props = defineProps<{ visible: boolean }>()
const emit = defineEmits<{ close: [] }>()

const { resizeImage } = useWorkerImageProcessor()

const fileInputRef = ref<HTMLInputElement | null>(null)
const addBtnRef = ref<HTMLButtonElement | null>(null)
const imageDataUrl = ref('')
const processing = ref(false)
const isStreaming = ref(false)
const resultText = ref('')
const errorMessage = ref('')
const dragover = ref(false)
let abortController: AbortController | null = null

// 弹窗开关时重置
watch(() => props.visible, (val) => {
  if (val) {
    if (abortController) { abortController.abort(); abortController = null }
    isStreaming.value = false
    errorMessage.value = ''
    // ponytail: preset="card" 无默认 action 按钮，auto-focus=false 后手动把焦点移进弹窗，
    // 否则焦点留在触发按钮上、背景被 naive 加 aria-hidden → a11y 警告
    nextTick(() => { addBtnRef.value?.focus() })
  }
})

function triggerFileInput() {
  fileInputRef.value?.click()
}

function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) addImage(file)
  input.value = ''
}

function onDrop(e: DragEvent) {
  dragover.value = false
  const file = Array.from(e.dataTransfer?.files ?? []).find(f => f.type.startsWith('image/'))
  if (file) addImage(file)
}

/** 全局粘贴监听：弹窗打开时直接 Ctrl+V 贴图 */
function onPaste(e: ClipboardEvent) {
  if (!props.visible || isStreaming.value) return
  // 已有结果或已有图时不抢粘贴
  if (imageDataUrl.value || resultText.value) return
  const file = Array.from(e.clipboardData?.items ?? [])
    .filter(item => item.type.startsWith('image/'))
    .map(item => item.getAsFile())
    .find((f): f is File => !!f)
  if (file) {
    e.preventDefault()
    addImage(file)
  }
}

watch(() => props.visible, (val) => {
  if (val) document.addEventListener('paste', onPaste)
  else document.removeEventListener('paste', onPaste)
}, { immediate: true })

/** File → objectURL → HTMLImageElement → resizeImage 压缩 → data URL */
async function addImage(file: File) {
  if (processing.value) return
  processing.value = true
  try {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = async () => {
      try {
        imageDataUrl.value = await resizeImage(img, 1600, 'image/jpeg', 0.85)
      } catch {
        naiveMessage.error('图片处理失败')
      } finally {
        URL.revokeObjectURL(url)
        processing.value = false
      }
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      processing.value = false
      naiveMessage.error('图片加载失败')
    }
    img.src = url
  } catch {
    processing.value = false
  }
}

function clearImage() {
  imageDataUrl.value = ''
}

async function handleStartOcr() {
  if (!imageDataUrl.value || isStreaming.value) return
  // 重置结果态
  resultText.value = ''
  errorMessage.value = ''
  isStreaming.value = true
  abortController = new AbortController()

  try {
    const final = await ocrImage(
      imageDataUrl.value,
      (chunk) => {
        // 流式期间：一旦发现累积文本是错误标识符前缀，停止往结果框写入
        // 避免用户看到 【OCR:FAILED】... 闪过
        const next = resultText.value + chunk
        if (isOcrErrorPrefix(next)) return
        resultText.value = next
      },
      abortController.signal,
    )
    // finalText 是清洗后的完整结果，覆盖流式累积
    resultText.value = final
    // 自动复制到剪贴板
    await copyResult(true)
  } catch (err) {
    if ((err as Error)?.name === 'AbortError') {
      // 取消，保留已识别部分
    } else if ((err as Error)?.message === 'UNSUPPORTED_VISION') {
      // 模型不支持视觉：只跳气泡提示，结果框留空（不放任何模型返回内容）
      // 明确告知是 AI 模型限制（非系统问题）+ 引导切换多模态 AI
      naiveMessage.warning(
        '当前 AI 模型不支持图片识别。请在「AI 设置」中改用支持多模态/视觉的 AI（如 gpt-4o、glm-4v 等）后重试',
        { duration: 8000 },
      )
      resultText.value = ''
    } else if ((err as Error)?.message === 'OCR_FAILED') {
      // 模型支持视觉但识别失败：气泡提示，结果框留空
      naiveMessage.warning(
        'AI 识别失败，可能是图片过模糊或无文字，请换张图重试',
        { duration: 6000 },
      )
      resultText.value = ''
    } else {
      errorMessage.value = formatOcrError(err)
    }
  } finally {
    isStreaming.value = false
    abortController = null
  }
}

function handleCancel() {
  if (abortController) abortController.abort()
}

async function copyResult(silent = false) {
  if (!resultText.value) return
  try {
    await navigator.clipboard.writeText(resultText.value)
    if (!silent) naiveMessage.success('已复制到剪贴板')
  } catch {
    naiveMessage.warning('复制失败，请手动选中复制')
  }
}

// 模板按钮点击：忽略 MouseEvent，走非静默复制
const onCopyClick = () => copyResult(false)

function handleReset() {
  imageDataUrl.value = ''
  resultText.value = ''
  errorMessage.value = ''
  isStreaming.value = false
}

function handleClose() {
  if (abortController) { abortController.abort(); abortController = null }
  document.removeEventListener('paste', onPaste)
  emit('close')
}
</script>

<style lang="scss" scoped>
.ocr-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
}

.ocr-input {
  display: flex;
  flex-direction: column;
  gap: $spacing-md;
}

.ocr-dropzone {
  border: 1px dashed $border-glass;
  border-radius: $radius-md;
  padding: $spacing-lg;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: $spacing-sm;
  transition: border-color $transition-base, background $transition-base;
  min-height: 160px;
  justify-content: center;

  &--dragover {
    border-color: $primary-color;
    background: var(--bg-secondary, rgba(0, 0, 0, 0.02));
  }

  &__add {
    background: transparent;
    border: none;
    color: $text-light;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    padding: $spacing-lg;
    transition: color $transition-base;

    &:hover {
      color: $primary-color;
    }

    span {
      font-size: 13px;
    }
  }

  &__hint {
    font-size: 11px !important;
    color: $text-light;
  }
}

// ponytail: modal 限高后，body 区独立滚动，内容再多也不撑破弹窗
.ocr-body {
  overflow-y: auto;
  max-height: calc(80vh - 120px); // 减去 header + padding
}

// NImage 容器：锁死尺寸，大图 contain 在内，绝不撑破弹窗
.ocr-preview-wrap {
  width: 100%;
  max-width: 460px;
  height: 200px;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
  border-radius: $radius-sm;
  background: var(--bg-secondary, rgba(0, 0, 0, 0.02));
}

// NImage 已用 :height 控高，这里补圆角 + 点击预览光标
.ocr-preview {
  border-radius: $radius-sm;
  cursor: zoom-in;
}

.ocr-file-input {
  display: none;
}

.ocr-actions {
  display: flex;
  justify-content: center;
}

.ocr-result {
  display: flex;
  flex-direction: column;
  gap: $spacing-md;

  &__bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  &__status {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: $text-secondary;
  }

  &__actions {
    display: flex;
    justify-content: center;
  }
}

.ocr-error {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: $spacing-md;
  border-radius: $radius-sm;
  background: rgba($error-color, 0.08);
  color: $error-color;
  font-size: 13px;
}

.ocr-spin {
  animation: ocr-spin 0.8s linear infinite;
}

@keyframes ocr-spin {
  to { transform: rotate(360deg); }
}
</style>
