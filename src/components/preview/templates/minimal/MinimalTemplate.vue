<template>
  <div class="resume-document resume--minimal" :style="ctx.templateCSSVars.value">
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

const ctx = useResumeDocument(() => props.resume, 'minimal')
provide(ResumeDocumentKey, ctx)
</script>

<style lang="scss">
@use '../shared/base.scss';
</style>

<style lang="scss" scoped>
.resume--minimal {
  :deep(.resume__header) {
    text-align: center;
    padding-bottom: $spacing-lg;
    margin-bottom: $spacing-lg;
    border-bottom: 2px solid var(--t-text);

    &::after { display: none; }
  }

  :deep(.header__name) {
    font-size: $font-size-2xl;
    font-weight: 700;
  }

  :deep(.header__title) {
    font-weight: 400;
    color: var(--t-header-title-color);
  }

  :deep(.section__title) {
    font-size: $font-size-sm;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--t-text-secondary);
    font-weight: 600;
    padding-bottom: $spacing-xs;

    &::after { display: none; }
  }

  :deep(.section__icon) {
    display: none;
  }

  :deep(.entry) {
    flex-direction: column;
    gap: 0;
    padding-bottom: $spacing-md;
    border-bottom: 1px solid var(--t-line, #e8e8f0);
  }

  :deep(.entry__timeline) {
    display: none;
  }

  :deep(.entry__content) {
    flex: 1;
  }

  :deep(.entry__date) {
    background: transparent;
    border: none;
    padding: 0;
    font-size: $font-size-xs;
    color: var(--t-text-secondary);
  }

  :deep(.tech-tag) {
    background: transparent;
    border: 1px solid var(--t-text-secondary);
    color: var(--t-text-secondary);
    border-radius: 0;
  }
}
</style>
