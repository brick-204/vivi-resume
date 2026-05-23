<template>
  <section class="resume__section" data-section="skills" @click="emit('click-section', 'skills')">
    <h2 class="section__title">
      <span class="section__icon section__icon--skill"></span>
      {{ ctx.getSectionTitle(ctx.resume, 'skills') }}
    </h2>
    <div v-if="ctx.getSkillsContent.value" class="section__text" v-html="ctx.renderHtml(ctx.getSkillsContent.value)"></div>
  </section>
</template>

<script setup lang="ts">
import { inject } from 'vue'
import { ResumeDocumentKey } from '../ResumeDocumentKey'

const emit = defineEmits<{ 'click-section': [tabId: string, itemId?: string] }>()
const ctx = inject(ResumeDocumentKey)!
</script>
