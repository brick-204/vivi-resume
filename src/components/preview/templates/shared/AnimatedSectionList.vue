<template>
  <TransitionGroup
    name="section-reorder"
    tag="div"
    class="animated-sections"
    @before-leave="onBeforeLeave"
  >
    <template v-for="sectionId in sections" :key="sectionId">
      <SummarySection v-if="sectionId === 'summary'" :section-id="sectionId" @click-section="forwardClick" />
      <WorkSection v-else-if="sectionId === 'work'" :section-id="sectionId" @click-section="forwardClick" />
      <EducationSection v-else-if="sectionId === 'education'" :section-id="sectionId" @click-section="forwardClick" />
      <ProjectsSection v-else-if="sectionId === 'projects'" :section-id="sectionId" @click-section="forwardClick" />
      <SkillsSection v-else-if="sectionId === 'skills'" :section-id="sectionId" @click-section="forwardClick" />
      <EvaluationSection v-else-if="sectionId === 'evaluation'" :section-id="sectionId" @click-section="forwardClick" />
      <CustomTextSection v-else-if="sectionId.startsWith('customText_')" :section-id="sectionId" @click-section="forwardClick" />
      <CustomCardSection v-else-if="sectionId.startsWith('customCard_')" :section-id="sectionId" @click-section="forwardClick" />
    </template>
  </TransitionGroup>
</template>

<script setup lang="ts">
import SummarySection from './sections/SummarySection.vue'
import WorkSection from './sections/WorkSection.vue'
import EducationSection from './sections/EducationSection.vue'
import ProjectsSection from './sections/ProjectsSection.vue'
import SkillsSection from './sections/SkillsSection.vue'
import EvaluationSection from './sections/EvaluationSection.vue'
import CustomTextSection from './sections/CustomTextSection.vue'
import CustomCardSection from './sections/CustomCardSection.vue'
import { onBeforeLeave } from './transitionUtils'

defineProps<{
  sections: string[]
}>()

const emit = defineEmits<{
  'click-section': [tabId: string, itemId?: string]
}>()

const forwardClick = (sectionId: string, itemId?: string) => emit('click-section', sectionId, itemId)
</script>
