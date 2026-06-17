<template>
  <section class="resume__section" data-section="evaluation" @click="emit('click-section', 'evaluation')">
    <h2 class="section__title">
      <span class="section__icon section__icon--eval"></span>
      {{ ctx.getSectionTitle(ctx.resume, 'evaluation') }}
    </h2>
    <div v-if="ctx.getEvaluationContent.value" class="section__text" v-html="ctx.renderHtml(ctx.getEvaluationContent.value)"></div>
  </section>
</template>

<script setup lang="ts">
import { inject } from 'vue'
import { ResumeDocumentKey } from '../ResumeDocumentKey'

const emit = defineEmits<{ 'click-section': [tabId: string, itemId?: string] }>()
const ctx = inject(ResumeDocumentKey)!
</script>
