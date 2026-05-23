<template>
  <div class="resume-document resume--twocolumn" :style="ctx.templateCSSVars.value">
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

const ctx = useResumeDocument(() => props.resume, 'twocolumn')
provide(ResumeDocumentKey, ctx)
</script>

<style lang="scss">
@use '../shared/base.scss';
</style>

<style lang="scss" scoped>
.resume--twocolumn {
  display: grid;
  grid-template-columns: 220px 1fr;
  gap: 0;
  max-width: 800px;
  padding: 0;
  overflow: hidden;
  border-radius: 8px;

  :deep(.resume__header) {
    grid-column: 1 / -1;
    text-align: left;
    background: var(--t-header-bg);
    color: var(--t-header-text);
    padding: $spacing-xl;
    margin-bottom: 0;

    &::after { display: none; }
  }

  :deep(.header__name) {
    color: var(--t-header-text);
    font-size: $font-size-2xl;
  }

  :deep(.header__title) {
    color: rgba(255, 255, 255, 0.85);
  }

  :deep(.header__fields) {
    flex-direction: column;
    align-items: flex-start;
    gap: $spacing-sm;
  }

  :deep(.header__field) {
    color: rgba(255, 255, 255, 0.8);
    font-size: $font-size-xs;
  }

  :deep(.header__field-icon) {
    color: rgba(255, 255, 255, 0.9);
  }

  :deep(.resume__section:first-child) {
    grid-column: 1;
    padding: $spacing-lg;
    margin-top: 0;
    background: rgba(0, 0, 0, 0.03);
    border-right: 1px solid rgba(0, 0, 0, 0.06);
  }

  :deep(.resume__section:not(:first-child)) {
    grid-column: 2;
    padding: $spacing-lg;
    margin-top: 0;
  }

  :deep(.section__title) {
    font-size: $font-size-xs;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--t-accent);
    font-weight: 700;

    &::after { display: none; }
  }

  :deep(.section__icon) {
    display: none;
  }

  :deep(.entry) {
    flex-direction: column;
    gap: 0;
  }

  :deep(.entry__timeline) {
    display: none;
  }

  :deep(.entry__date) {
    background: var(--t-accent);
    color: #ffffff;
    border: none;
    font-size: 10px;
  }
}
</style>