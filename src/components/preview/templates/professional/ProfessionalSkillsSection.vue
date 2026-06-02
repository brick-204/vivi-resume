<template>
  <section class="resume__section" data-section="skills" @click="emit('click-section', 'skills')">
    <ProfessionalSectionHeader :title="ctx.getSectionTitle(ctx.resume, 'skills')" />
    <div v-if="ctx.getSkillsContent.value" class="section__text" v-html="ctx.renderHtml(ctx.getSkillsContent.value)"></div>
  </section>
</template>

<script setup lang="ts">
import { inject } from 'vue'
import { ResumeDocumentKey } from '../shared/ResumeDocumentKey'
import ProfessionalSectionHeader from './ProfessionalSectionHeader.vue'

const emit = defineEmits<{ 'click-section': [tabId: string, itemId?: string] }>()
const ctx = inject(ResumeDocumentKey)!
</script>