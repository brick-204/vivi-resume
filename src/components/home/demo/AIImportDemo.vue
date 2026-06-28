<template>
  <div class="ai-demo ai-demo--import">
    <div class="import-demo__upload">
      <div class="import-demo__upload-header">
        <Icon icon="mdi:cloud-upload-outline" :width="14" />
        上传文件
      </div>
      <div class="import-demo__upload-zone" :class="{ 'import-demo__upload-zone--active': isDragging }">
        <Icon icon="mdi:file-document-outline" :width="28" class="import-demo__upload-icon" />
        <div class="import-demo__upload-text">
          <span class="import-demo__upload-label">{{ currentFile }}</span>
          <span class="import-demo__upload-hint">拖入或选择文件</span>
        </div>
        <div class="import-demo__upload-formats">
          <span class="import-demo__format-tag">.pdf</span>
          <span class="import-demo__format-tag">.docx</span>
          <span class="import-demo__format-tag">.md</span>
        </div>
      </div>
    </div>
    <div class="import-demo__divider">
      <Icon icon="mdi:arrow-right" :width="20" />
    </div>
    <div class="import-demo__result">
      <div class="import-demo__result-header import-demo__result-header--accent">
        <Icon icon="mdi:file-import-outline" :width="14" />
        AI 解析结果
      </div>
      <div class="import-demo__fields">
        <div
          v-for="(field, idx) in fields"
          :key="idx"
          class="import-demo__field"
          :class="{ 'import-demo__field--visible': idx < visibleCount }"
          :style="{ transitionDelay: `${idx * 0.25}s` }"
        >
          <span class="import-demo__field-label">{{ field.label }}</span>
          <span class="import-demo__field-value">{{ field.value }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { Icon } from '@iconify/vue'

const files = ['张三_前端工程师.pdf', '李四_产品经理.docx', '王五_UX设计师.md']
const currentFile = ref(files[0])
const isDragging = ref(false)

const fields = [
  { label: '姓名', value: '张三' },
  { label: '职位', value: '前端工程师' },
  { label: '工作经历', value: '3 段工作经历已解析' },
  { label: '项目经历', value: '5 个项目已提取' },
  { label: '教育经历', value: '2 段教育经历已识别' },
  { label: '技能', value: '12 项技能关键词' },
]

const visibleCount = ref(0)
let timer: ReturnType<typeof setInterval> | null = null
let isDisposed = false
let fileIndex = 0

const startAnimation = () => {
  if (isDisposed) return
  visibleCount.value = 0
  isDragging.value = true

  // 模拟文件拖入
  setTimeout(() => {
    if (isDisposed) return
    isDragging.value = false
    currentFile.value = files[fileIndex % files.length]
    fileIndex++

    // 字段逐个出现
    let step = 0
    timer = setInterval(() => {
      step++
      visibleCount.value = step
      if (step >= fields.length) {
        if (timer) clearInterval(timer)
        setTimeout(startAnimation, 2500)
      }
    }, 300)
  }, 800)
}

onMounted(() => startAnimation())
onUnmounted(() => {
  isDisposed = true
  if (timer) clearInterval(timer)
})
</script>

<style lang="scss" scoped>
.ai-demo--import {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: $spacing-md;
  align-items: stretch;
  padding: $spacing-lg;

  @include mobile {
    grid-template-columns: 1fr;
  }
}

.import-demo__upload,
.import-demo__result {
  @include glass;
  border-radius: $radius-md;
  overflow: hidden;
}

.import-demo__upload-header,
.import-demo__result-header {
  display: flex;
  align-items: center;
  gap: $spacing-xs;
  padding: $spacing-sm $spacing-md;
  font-size: $font-size-xs;
  font-weight: 600;
  color: $text-secondary;
  background: $bg-glass;
  border-bottom: 1px solid $border-glass;
}

.import-demo__result-header--accent {
  color: $primary-light;
}

.import-demo__upload-zone {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: $spacing-sm;
  padding: $spacing-xl $spacing-md;
  border: 2px dashed $border-glass;
  border-radius: $radius-md;
  margin: $spacing-md;
  transition: all 0.3s ease;

  &--active {
    border-color: $primary-color;
    background: rgba($primary-color, 0.04);
  }
}

.import-demo__upload-icon {
  color: $text-light;
  transition: color 0.3s ease;

  .import-demo__upload-zone--active & {
    color: $primary-light;
  }
}

.import-demo__upload-text {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.import-demo__upload-label {
  font-size: $font-size-sm;
  font-weight: 600;
  color: $text-primary;
}

.import-demo__upload-hint {
  font-size: $font-size-xs;
  color: $text-light;
}

.import-demo__upload-formats {
  display: flex;
  gap: $spacing-xs;
}

.import-demo__format-tag {
  padding: 2px 8px;
  border-radius: $radius-full;
  font-size: 10px;
  font-weight: 600;
  background: $bg-glass;
  color: $text-secondary;
  border: 1px solid $border-glass;
}

.import-demo__divider {
  display: flex;
  align-items: center;
  color: $primary-light;

  @include mobile {
    justify-content: center;
    transform: rotate(90deg);
  }
}

.import-demo__fields {
  padding: $spacing-sm $spacing-md;
  display: flex;
  flex-direction: column;
  gap: $spacing-xs;
}

.import-demo__field {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: $spacing-xs $spacing-sm;
  border-radius: $radius-sm;
  background: $bg-glass;
  border: 1px solid $border-glass;
  opacity: 0;
  transform: translateX(-8px);
  transition: all 0.4s ease;

  &--visible {
    opacity: 1;
    transform: translateX(0);
  }
}

.import-demo__field-label {
  font-size: $font-size-xs;
  font-weight: 600;
  color: $text-secondary;
  flex-shrink: 0;
}

.import-demo__field-value {
  font-size: $font-size-xs;
  color: $primary-light;
  font-weight: 500;
}
</style>
