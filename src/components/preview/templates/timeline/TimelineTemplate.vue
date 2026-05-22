<template>
  <div class="resume-document resume--timeline" :style="ctx.templateCSSVars.value">
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
