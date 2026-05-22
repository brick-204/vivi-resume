<template>
  <div class="resume-document resume--elegant" :style="ctx.templateCSSVars.value">
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
    color: var(--t-accent);
    font-style: italic;
  }

  :deep(.header__contact) {
    justify-content: center;
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