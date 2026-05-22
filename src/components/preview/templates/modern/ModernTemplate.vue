<template>
  <div class="resume-document resume--modern" :style="ctx.templateCSSVars.value">
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

const ctx = useResumeDocument(() => props.resume, 'modern')
provide(ResumeDocumentKey, ctx)
</script>

<style lang="scss">
@use '../shared/base.scss';
</style>

<style lang="scss" scoped>
.resume--modern {
  :deep(.resume__header) {
    text-align: left;
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

  :deep(.header__contact) {
    justify-content: flex-start;
  }

  :deep(.contact__item) {
    color: rgba(255, 255, 255, 0.8);
  }

  :deep(.contact__icon) {
    color: rgba(255, 255, 255, 0.9);
  }

  :deep(.resume__section) {
    background: rgba(0, 0, 0, 0.02);
    border: 1px solid rgba(0, 0, 0, 0.06);
    border-radius: var(--t-radius);
    padding: $spacing-lg;
    margin-bottom: $spacing-md;
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
    margin-bottom: $spacing-md;
  }

  :deep(.entry__date) {
    background: var(--t-accent);
    color: #ffffff;
    border: none;
  }
}
</style>
