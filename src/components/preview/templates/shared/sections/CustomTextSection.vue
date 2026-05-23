<template>
  <section class="resume__section" :data-section="sectionId" @click="emit('click-section', sectionId)">
    <h2 class="section__title">
      <span class="section__icon section__icon--custom-text"></span>
      {{ ctx.getSectionTitle(ctx.resume, sectionId) }}
    </h2>
    <div v-if="ctx.getCustomTextContent(sectionId)" class="section__text" v-html="ctx.renderHtml(ctx.getCustomTextContent(sectionId))"></div>
  </section>
</template>

<script setup lang="ts">
import { inject } from 'vue'
import { ResumeDocumentKey } from '../ResumeDocumentKey'

defineProps<{ sectionId: string }>()
const emit = defineEmits<{ 'click-section': [tabId: string, itemId?: string] }>()
const ctx = inject(ResumeDocumentKey)!
</script>
