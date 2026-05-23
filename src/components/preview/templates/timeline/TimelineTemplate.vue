<template>
  <div class="resume-document resume--timeline" :style="ctx.templateCSSVars.value">
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
    background: rgba(249, 115, 22, 0.1);
    color: var(--t-accent);
    border-color: rgba(249, 115, 22, 0.2);
    font-weight: 600;
  }
}
</style>
