<template>
  <div class="resume-document resume--twocolumn" :style="ctx.templateCSSVars.value">
    <BasicHeader @click-section="$emit('click-section', $event)" />
    <template v-for="sectionId in ctx.contentSections.value" :key="sectionId">
      <SummarySection v-if="sectionId === 'summary'" :section-id="sectionId" @click-section="$emit('click-section', $event)" />
      <WorkSection v-else-if="sectionId === 'work'" :section-id="sectionId" @click-section="$emit('click-section', $event)" />
      <EducationSection v-else-if="sectionId === 'education'" :section-id="sectionId" @click-section="$emit('click-section', $event)" />
      <ProjectsSection v-else-if="sectionId === 'projects'" :section-id="sectionId" @click-section="$emit('click-section', $event)" />
      <SkillsSection v-else-if="sectionId === 'skills'" :section-id="sectionId" @click-section="$emit('click-section', $event)" />
      <EvaluationSection v-else-if="sectionId === 'evaluation'" :section-id="sectionId" @click-section="$emit('click-section', $event)" />
      <CustomTextSection v-else-if="sectionId.startsWith('customText_')" :section-id="sectionId" @click-section="$emit('click-section', $event)" />
      <CustomCardSection v-else-if="sectionId.startsWith('customCard_')" :section-id="sectionId" @click-section="$emit('click-section', $event)" />
    </template>
  </div>
</template>

<script setup lang="ts">
import { provide } from 'vue'
import type { Resume } from '@/types/resume'
import { useResumeDocument } from '../shared/useResumeDocument'
import { ResumeDocumentKey } from '../shared/ResumeDocumentKey'
import BasicHeader from '../shared/sections/BasicHeader.vue'
import SummarySection from '../shared/sections/SummarySection.vue'
import WorkSection from '../shared/sections/WorkSection.vue'
import EducationSection from '../shared/sections/EducationSection.vue'
import ProjectsSection from '../shared/sections/ProjectsSection.vue'
import SkillsSection from '../shared/sections/SkillsSection.vue'
import EvaluationSection from '../shared/sections/EvaluationSection.vue'
import CustomTextSection from '../shared/sections/CustomTextSection.vue'
import CustomCardSection from '../shared/sections/CustomCardSection.vue'

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

  :deep(.header__contact) {
    flex-direction: column;
    align-items: flex-start;
    gap: $spacing-sm;
  }

  :deep(.contact__item) {
    color: rgba(255, 255, 255, 0.8);
    font-size: $font-size-xs;
  }

  :deep(.contact__icon) {
    color: rgba(255, 255, 255, 0.9);
  }

  :deep(.resume__section:first-of-type) {
    grid-column: 1;
    padding: $spacing-lg;
    margin-top: 0;
    background: rgba(0, 0, 0, 0.03);
    border-right: 1px solid rgba(0, 0, 0, 0.06);
  }

  :deep(.resume__section:not(:first-of-type)) {
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