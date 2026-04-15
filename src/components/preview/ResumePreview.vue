<template>
  <div class="resume-preview" ref="previewRef">
    <ResumeDocument
      v-if="resume"
      :resume="resume"
      :template-id="templateId"
      @click-section="$emit('click-section', $event)"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useResumeStore } from '@/stores/resumeStore'
import ResumeDocument from './ResumeDocument.vue'

const store = useResumeStore()
const previewRef = ref<HTMLElement>()

const templateId = computed(() => store.currentResume?.templateId || 'classic')
const resume = computed(() => store.currentResume)

defineEmits<{
  'click-section': [tabId: string]
}>()

// 滚动到指定模块
const scrollToSection = (sectionId: string) => {
  const section = previewRef.value?.querySelector(`[data-section="${sectionId}"]`)
  if (section) {
    section.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

defineExpose({
  getElement: () => previewRef.value,
  scrollToSection
})
</script>

<style lang="scss" scoped>
.resume-preview {
  padding: $spacing-2xl;
  min-height: 100%;
  background: #ffffff;
  @include scrollbar;
}
</style>