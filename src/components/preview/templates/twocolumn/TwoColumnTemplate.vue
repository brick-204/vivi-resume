<template>
  <div class="resume-document resume--twocolumn" :style="ctx.templateCSSVars.value">
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
  width: 100%;
  max-width: var(--t-max-width, 800px);
  margin: 0 auto;
  padding: 0;
  overflow: hidden;
  border-radius: 8px;

  :deep(.resume__header) {
    grid-column: 1 / -1;
    &:not(.resume__header--photo-left):not(.resume__header--photo-right) {
      text-align: center;
    }
    background: var(--t-header-bg);
    color: var(--t-header-text);
    padding: $spacing-xl;
    margin-bottom: $spacing-lg;
    border-radius: var(--t-radius);

    &::after { display: none; }
  }

  :deep(.header__name) {
    font-size: $font-size-2xl;
  }

  :deep(.header__field) {
    font-size: $font-size-xs;
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
    font-size: var(--t-section-title-font-size, $font-size-xs);
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
    font-size: var(--t-entry-date-font-size, 10px);
  }
}
</style>