<template>
  <div class="resume-document resume--elegant" :style="ctx.templateCSSVars.value">
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

const ctx = useResumeDocument(() => props.resume, 'elegant')
provide(ResumeDocumentKey, ctx)
</script>

<style lang="scss">
@use '../shared/base.scss';
</style>

<style lang="scss" scoped>
.resume--elegant {
  :deep(.resume__header) {
    text-align: center;
    padding-bottom: $spacing-lg;
    margin-bottom: $spacing-lg;
    border-bottom: 1px solid #e5e7eb;

    &::after { display: none; }
  }

  :deep(.header__name) {
    font-size: $font-size-2xl;
    font-weight: 700;
    letter-spacing: 0.02em;
  }

  :deep(.header__title) {
    font-weight: 400;
    color: var(--t-header-title-color);
    font-style: italic;
  }

  :deep(.section__title) {
    font-weight: 700;
    letter-spacing: 0.02em;

    &::after {
      height: 2px;
      background: var(--t-accent);
      width: 40px;
    }
  }

  :deep(.entry) {
    flex-direction: column;
    gap: 0;
  }

  :deep(.entry__timeline) {
    display: none;
  }

  :deep(.entry__content) {
    padding-left: $spacing-md;
    border-left: 2px solid var(--t-accent);
  }

  :deep(.entry__date) {
    background: transparent;
    border: 1px solid #e5e7eb;
    color: var(--t-text-secondary);
  }

  :deep(.tech-tag) {
    border-radius: 4px;
  }
}
</style>