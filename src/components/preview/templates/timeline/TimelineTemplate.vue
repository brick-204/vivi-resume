<template>
  <div class="resume-document resume--timeline" :style="ctx.templateCSSVars.value">
    <BasicHeader @click-section="(s: string, i?: string) => emit('click-section', s, i)" />
    <AnimatedSectionList
      :sections="ctx.contentSections.value"
      @click-section="(s: string, i?: string) => emit('click-section', s, i)"
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
const emit = defineEmits<{ 'click-section': [tabId: string, itemId?: string] }>()

const ctx = useResumeDocument(() => props.resume, 'timeline')
provide(ResumeDocumentKey, ctx)
</script>

<style lang="scss">
@use '../shared/base.scss';
</style>

<style lang="scss" scoped>
.resume--timeline {
  :deep(.resume__header) {
    text-align: center;

    &::after {
      height: 0;
    }
  }

  :deep(.section__title) {
    font-weight: 800;

    &::after {
      height: 2px;
      background: var(--t-accent);
    }
  }

  :deep(.timeline__dot) {
    width: 12px;
    height: 12px;
    background: var(--t-accent);
    border: none;
  }

  :deep(.timeline__line) {
    width: 2px;
    background: var(--t-accent);
    opacity: 0.3;
  }

  :deep(.entry__date) {
    background: var(--t-date-bg);
    color: var(--t-accent);
    border-color: var(--t-date-border);
    font-weight: 600;
  }
}
</style>
