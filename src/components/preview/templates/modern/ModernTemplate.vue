<template>
  <div class="resume-document resume--modern" :style="ctx.templateCSSVars.value">
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

const ctx = useResumeDocument(() => props.resume, 'modern')
provide(ResumeDocumentKey, ctx)
</script>

<style lang="scss">
@use '../shared/base.scss';
</style>

<style lang="scss" scoped>
.resume--modern {
  :deep(.resume__header) {
    text-align: center;
    background: var(--t-header-bg);
    color: var(--t-header-text);
    padding: $spacing-xl;
    border-radius: var(--t-radius);
    margin-bottom: $spacing-lg;

    &::after { display: none; }
  }

  :deep(.header__name) {
    color: var(--t-header-text);
  }

  :deep(.header__title) {
    color: rgba(255, 255, 255, 0.85);
  }

  :deep(.header__field) {
    color: rgba(255, 255, 255, 0.8);
  }

  :deep(.header__field-icon) {
    color: rgba(255, 255, 255, 0.9);
  }

  :deep(.resume__section) {
    background: rgba(0, 0, 0, 0.02);
    border: 1px solid rgba(0, 0, 0, 0.06);
    border-radius: var(--t-radius);
    padding: $spacing-lg;
  }

  :deep(.section__title) {
    color: var(--t-accent);

    &::after { display: none; }
  }

  :deep(.entry) {
    flex-direction: column;
    gap: 0;
  }

  :deep(.entry__timeline) {
    display: none;
  }

  :deep(.entry__content) {
    border-left: 3px solid var(--t-accent);
    padding-left: $spacing-md;
  }

  :deep(.entry__date) {
    background: var(--t-accent);
    color: #ffffff;
    border: none;
  }
}
</style>
