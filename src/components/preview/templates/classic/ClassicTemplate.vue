<template>
  <div class="resume-document resume--classic" :style="ctx.templateCSSVars.value">
    <BasicHeader @click-section="$emit('click-section', $event)" />
    <AnimatedSectionList
      :sections="ctx.contentSections.value"
      @click-section="$emit('click-section', $event)"
    />
  </div>
</template>

<script setup lang="ts">
import { provide } from 'vue'
import type { Resume } from '@/types/resume'
import { useResumeDocument } from '../shared/useResumeDocument'
import { ResumeDocumentKey } from '../shared/ResumeDocumentKey'
import BasicHeader from '../shared/sections/BasicHeader.vue'
import AnimatedSectionList from '../shared/AnimatedSectionList.vue'

const props = defineProps<{ resume: Resume }>()
defineEmits<{ 'click-section': [tabId: string] }>()

const ctx = useResumeDocument(() => props.resume, 'classic')
provide(ResumeDocumentKey, ctx)
</script>

<style lang="scss">
@use '../shared/base.scss';
</style>

<style lang="scss" scoped>
.resume--classic {
  :deep(.resume__header) {
    text-align: center;
  }
}
</style>
