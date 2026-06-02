<template>
  <section class="resume__section" data-section="summary" @click="emit('click-section', 'summary')">
    <ProfessionalSectionHeader :title="ctx.getSectionTitle(ctx.resume, 'summary')" />
    <div v-if="ctx.resume.basicInfo.summary" class="section__text" v-html="ctx.renderHtml(ctx.resume.basicInfo.summary)"></div>
  </section>
</template>

<script setup lang="ts">
import { inject } from 'vue'
import { ResumeDocumentKey } from '../shared/ResumeDocumentKey'
import ProfessionalSectionHeader from './ProfessionalSectionHeader.vue'

const emit = defineEmits<{ 'click-section': [tabId: string, itemId?: string] }>()
const ctx = inject(ResumeDocumentKey)!
</script>