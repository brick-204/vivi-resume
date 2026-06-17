<template>
  <section class="resume__section" data-section="evaluation" @click="emit('click-section', 'evaluation')">
    <ProfessionalSectionHeader :title="ctx.getSectionTitle(ctx.resume, 'evaluation')" />
    <div v-if="ctx.getEvaluationContent.value" class="section__text" v-html="ctx.renderHtml(ctx.getEvaluationContent.value)"></div>
  </section>
</template>

<script setup lang="ts">
import { inject } from 'vue'
import { ResumeDocumentKey } from '../shared/ResumeDocumentKey'
import ProfessionalSectionHeader from './ProfessionalSectionHeader.vue'

const emit = defineEmits<{ 'click-section': [tabId: string, itemId?: string] }>()
const ctx = inject(ResumeDocumentKey)!
</script>