<template>
  <section class="resume__section" data-section="summary" @click="emit('click-section', 'summary')">
    <h2 class="section__title">
      <span class="section__icon section__icon--intro"></span>
      {{ ctx.getSectionTitle(ctx.resume, 'summary') }}
    </h2>
    <div v-if="ctx.getSummaryContent.value" class="section__text" v-html="ctx.renderHtml(ctx.getSummaryContent.value)"></div>
  </section>
</template>

<script setup lang="ts">
import { inject } from 'vue'
import { ResumeDocumentKey } from '../ResumeDocumentKey'

const emit = defineEmits<{ 'click-section': [tabId: string, itemId?: string] }>()
const ctx = inject(ResumeDocumentKey)!
</script>
