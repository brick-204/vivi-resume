<template>
  <section class="resume__section" :data-section="sectionId" @click="emit('click-section', sectionId)">
    <ProfessionalSectionHeader :title="ctx.getSectionTitle(ctx.resume, sectionId)" />
    <div v-if="ctx.getCustomTextContent(sectionId)" class="section__text" v-html="ctx.renderHtml(ctx.getCustomTextContent(sectionId))"></div>
  </section>
</template>

<script setup lang="ts">
import { inject } from 'vue'
import { ResumeDocumentKey } from '../shared/ResumeDocumentKey'
import ProfessionalSectionHeader from './ProfessionalSectionHeader.vue'

defineProps<{ sectionId: string }>()
const emit = defineEmits<{ 'click-section': [tabId: string, itemId?: string] }>()
const ctx = inject(ResumeDocumentKey)!
</script>