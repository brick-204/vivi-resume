<template>
  <TransitionGroup
    name="section-reorder"
    tag="div"
    class="animated-sections"
    @before-leave="onBeforeLeave"
  >
    <template v-for="sectionId in sections" :key="sectionId">
      <ProfessionalSummarySection v-if="sectionId === 'summary'" @click-section="forwardClick" />
      <ProfessionalWorkSection v-else-if="sectionId === 'work'" @click-section="forwardClick" />
      <ProfessionalEducationSection v-else-if="sectionId === 'education'" @click-section="forwardClick" />
      <ProfessionalProjectsSection v-else-if="sectionId === 'projects'" @click-section="forwardClick" />
      <ProfessionalSkillsSection v-else-if="sectionId === 'skills'" @click-section="forwardClick" />
      <ProfessionalEvaluationSection v-else-if="sectionId === 'evaluation'" @click-section="forwardClick" />
      <ProfessionalCustomTextSection v-else-if="sectionId.startsWith('customText_')" :section-id="sectionId" @click-section="forwardClick" />
      <ProfessionalCustomCardSection v-else-if="sectionId.startsWith('customCard_')" :section-id="sectionId" @click-section="forwardClick" />
    </template>
  </TransitionGroup>
</template>

<script setup lang="ts">
import ProfessionalSummarySection from './ProfessionalSummarySection.vue'
import ProfessionalWorkSection from './ProfessionalWorkSection.vue'
import ProfessionalEducationSection from './ProfessionalEducationSection.vue'
import ProfessionalProjectsSection from './ProfessionalProjectsSection.vue'
import ProfessionalSkillsSection from './ProfessionalSkillsSection.vue'
import ProfessionalEvaluationSection from './ProfessionalEvaluationSection.vue'
import ProfessionalCustomTextSection from './ProfessionalCustomTextSection.vue'
import ProfessionalCustomCardSection from './ProfessionalCustomCardSection.vue'
import { onBeforeLeave } from '../shared/transitionUtils'

defineProps<{
  sections: string[]
}>()

const emit = defineEmits<{
  'click-section': [tabId: string, itemId?: string]
}>()

const forwardClick = (sectionId: string, itemId?: string) => emit('click-section', sectionId, itemId)
</script>