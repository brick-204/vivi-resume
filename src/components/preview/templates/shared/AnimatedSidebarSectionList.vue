<template>
  <TransitionGroup name="section-reorder" tag="div" class="animated-sections">
    <template v-for="sectionId in sections" :key="sectionId">
      <SidebarSummarySection v-if="sectionId === 'summary'" :section-id="sectionId" @click-section="$emit('click-section', $event)" />
      <SidebarWorkSection v-else-if="sectionId === 'work'" :section-id="sectionId" @click-section="$emit('click-section', $event)" />
      <SidebarEducationSection v-else-if="sectionId === 'education'" :section-id="sectionId" @click-section="$emit('click-section', $event)" />
      <SidebarProjectsSection v-else-if="sectionId === 'projects'" :section-id="sectionId" @click-section="$emit('click-section', $event)" />
      <SidebarEvaluationSection v-else-if="sectionId === 'evaluation'" :section-id="sectionId" @click-section="$emit('click-section', $event)" />
      <SidebarCustomTextSection v-else-if="sectionId.startsWith('customText_')" :section-id="sectionId" @click-section="$emit('click-section', $event)" />
      <SidebarCustomCardSection v-else-if="sectionId.startsWith('customCard_')" :section-id="sectionId" @click-section="$emit('click-section', $event)" />
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

defineProps<{
  sections: string[]
}>()

defineEmits<{
  'click-section': [tabId: string]
}>()
</script>

