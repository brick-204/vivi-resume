<template>
  <BaseModal :visible="visible" title="导入简历" size="md" @close="$emit('close')">
    <div class="import-modal">
      <!-- 拖拽/点击上传区域 -->
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
        <p class="drop-zone__hint">支持 .json 格式</p>
        <input ref="fileInput" type="file" accept=".json" @change="onFileSelect" hidden />
      </div>
    </div>
  </BaseModal>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Icon } from '@iconify/vue'
import BaseModal from '@/components/common/BaseModal.vue'

defineProps<{ visible: boolean }>()

const emit = defineEmits<{
  close: []
  import: [file: File]
}>()

const fileInput = ref<HTMLInputElement | null>(null)
const isDragOver = ref(false)
const isValidType = ref(false)
const invalidDrop = ref(false)

// 使用计数器避免子元素触发 dragleave 误判
let dragCounter = 0

const dropText = computed(() => {
  if (invalidDrop.value) return '仅支持 .json 文件'
  if (!isDragOver.value) return '拖拽文件到此处，或点击选择文件'
  return isValidType.value ? '松开以上传' : '仅支持 .json 文件'
})

const validateFile = (file: File): boolean => {
  return file.type === 'application/json' || file.name.endsWith('.json')
}

const onDragEnter = (e: DragEvent) => {
  dragCounter++
  isDragOver.value = true
  const items = e.dataTransfer?.items
  if (items && items.length > 0) {
    // 尝试通过 type 或文件名判断
    const item = items[0]
    isValidType.value = item.type === 'application/json' ||
      item.type === '' // 某些系统不提供 MIME，先标记为有效，drop 时再校验
  }
}

const onDragOver = (e: DragEvent) => {
  if (e.dataTransfer) {
    e.dataTransfer.dropEffect = isValidType.value ? 'copy' : 'none'
  }
}

const onDragLeave = () => {
  dragCounter--
  if (dragCounter <= 0) {
    dragCounter = 0
    isDragOver.value = false
    isValidType.value = false
  }
}

const onDrop = (e: DragEvent) => {
  dragCounter = 0
  isDragOver.value = false
  isValidType.value = false

  const files = e.dataTransfer?.files
  if (files && files.length > 0) {
    const file = files[0]
    if (validateFile(file)) {
      emit('import', file)
    } else {
      invalidDrop.value = true
      setTimeout(() => { invalidDrop.value = false }, 2000)
    }
  }
}

const triggerFileInput = () => {
  fileInput.value?.click()
}

const onFileSelect = (e: Event) => {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) {
    emit('import', file)
  }
  input.value = ''
}
</script>

<style lang="scss" scoped>

.import-modal {
  display: flex;
  flex-direction: column;
  gap: $spacing-lg;
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
</style>
