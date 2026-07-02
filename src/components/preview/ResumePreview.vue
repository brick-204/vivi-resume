<template>
  <div ref="previewRef" class="resume-preview" :style="previewStyle">
    <!-- A4 分页线 -->
    <div
      v-for="(top, i) in pageBreaks"
      :key="'break-' + i"
      class="page-break-line"
      :style="{ top: top + 'px' }"
    />
    <!-- 左外侧页码指示器 -->
    <div
      v-for="(top, i) in pageBreaks"
      :key="'label-' + i"
      class="page-break-label"
      :style="{ top: top + 'px' }"
    >
      <Icon icon="mdi:file-document-outline" :width="16" />
      <span class="page-break-label__num">{{ i + 1 }}</span>
    </div>
    <!-- 简历内容 -->
    <ResumeDocument
      v-if="resume"
      :resume="resume"
      :template-id="templateId"
      @click-section="(s: string, i?: string) => emit('click-section', s, i)"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useResumeStore } from '@/stores/resumeStore'
import { DEFAULT_PAGE_PADDING } from '@/types/resume'
import { usePageBreaks, A4_WIDTH_PX } from '@/composables/usePageBreaks'
import { Icon } from '@iconify/vue'
import ResumeDocument from './ResumeDocument.vue'

const store = useResumeStore()
const previewRef = ref<HTMLElement>()

const templateId = computed(() => store.currentResume?.templateId || 'classic')
const resume = computed(() => store.currentResume)
const pagePadding = computed(() =>
  store.currentResume?.pagePadding ?? DEFAULT_PAGE_PADDING
)

const previewStyle = computed(() => {
  const p = pagePadding.value
  return {
    width: `${A4_WIDTH_PX}px`,
    padding: `${p}px`,
  }
})

// A4 分页线
const { pageBreaks } = usePageBreaks(previewRef, pagePadding)

const emit = defineEmits<{
  'click-section': [tabId: string, itemId?: string]
}>()

// 滚动到指定模块
const scrollToSection = (sectionId: string) => {
  const section = previewRef.value?.querySelector(`[data-section="${sectionId}"]`)
  if (section) {
    section.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

// 滚动到指定条目
const scrollToEntry = (sectionId: string, itemId: string) => {
  const entry = previewRef.value?.querySelector(`[data-section="${sectionId}"] [data-item-id="${itemId}"]`)
  if (entry) entry.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

defineExpose({
  getElement: () => previewRef.value,
  scrollToSection,
  scrollToEntry
})
</script>

<style lang="scss" scoped>
.resume-preview {
  position: relative;
  min-height: 100%;
  background: #ffffff;
  @include scrollbar;
}

// A4 分页线（紫色虚线）
.page-break-line {
  position: absolute;
  left: 0;
  right: 0;
  height: 1px;
  background: repeating-linear-gradient(
    90deg,
    rgba($primary-color, 0.4) 0,
    rgba($primary-color, 0.4) 6px,
    transparent 6px,
    transparent 12px
  );
  pointer-events: none;
  z-index: 10;
}

// 左外侧页码指示器（文件图标 + 页码）
.page-break-label {
  position: absolute;
  left: -32px;
  height: 24px;
  padding: 0 6px;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  gap: 2px;
  color: #ffffff;
  background: rgba($primary-color, 0.85);
  border-radius: 4px;
  pointer-events: none;
  z-index: 10;
  box-shadow: 0 2px 8px rgba($primary-color, 0.3);

  &__num {
    font-size: 11px;
    font-weight: 600;
    line-height: 1;
  }
}
</style>