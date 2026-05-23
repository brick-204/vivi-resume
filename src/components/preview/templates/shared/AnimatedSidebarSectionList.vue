<template>
  <TransitionGroup
    name="section-reorder"
    tag="div"
    class="animated-sections"
    @before-leave="onBeforeLeave"
  >
    <template v-for="sectionId in sections" :key="sectionId">
      <SidebarSummarySection v-if="sectionId === 'summary'" :section-id="sectionId" @click-section="forwardClick" />
      <SidebarWorkSection v-else-if="sectionId === 'work'" :section-id="sectionId" @click-section="forwardClick" />
      <SidebarEducationSection v-else-if="sectionId === 'education'" :section-id="sectionId" @click-section="forwardClick" />
      <SidebarProjectsSection v-else-if="sectionId === 'projects'" :section-id="sectionId" @click-section="forwardClick" />
      <SidebarEvaluationSection v-else-if="sectionId === 'evaluation'" :section-id="sectionId" @click-section="forwardClick" />
      <SidebarCustomTextSection v-else-if="sectionId.startsWith('customText_')" :section-id="sectionId" @click-section="forwardClick" />
      <SidebarCustomCardSection v-else-if="sectionId.startsWith('customCard_')" :section-id="sectionId" @click-section="forwardClick" />
    </template>
  </TransitionGroup>
</template>

<script setup lang="ts">
import SidebarSummarySection from '../sidebar/sections/SidebarSummarySection.vue'
import SidebarWorkSection from '../sidebar/sections/SidebarWorkSection.vue'
import SidebarEducationSection from '../sidebar/sections/SidebarEducationSection.vue'
import SidebarProjectsSection from '../sidebar/sections/SidebarProjectsSection.vue'
import SidebarEvaluationSection from '../sidebar/sections/SidebarEvaluationSection.vue'
import SidebarCustomTextSection from '../sidebar/sections/SidebarCustomTextSection.vue'
import SidebarCustomCardSection from '../sidebar/sections/SidebarCustomCardSection.vue'
import { onBeforeLeave } from './transitionUtils'

defineProps<{
  sections: string[]
}>()

const emit = defineEmits<{
  'click-section': [tabId: string, itemId?: string]
}>()

const forwardClick = (sectionId: string, itemId?: string) => emit('click-section', sectionId, itemId)
</script>
