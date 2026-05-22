<template>
  <section class="resume__section" data-section="work" @click="emit('click-section', 'work')">
    <h2 class="section__title">
      <span class="section__icon section__icon--work"></span>
      {{ ctx.getSectionTitle(ctx.resume, 'work') }}
    </h2>
    <div v-for="item in ctx.getVisibleWorkItems.value" :key="item.id" class="entry">
      <div class="entry__timeline">
        <span class="timeline__dot"></span>
        <span class="timeline__line"></span>
      </div>
      <div class="entry__content">
        <div class="entry__header">
          <div class="entry__info">
            <h3 class="entry__title">{{ item.position }}</h3>
            <p class="entry__subtitle">{{ item.company }}</p>
          </div>
          <span v-if="item.startDate || item.endDate" class="entry__date">{{ ctx.formatDateRange(item.startDate, item.endDate) }}</span>
        </div>
        <div v-if="item.description" class="entry__desc" v-html="ctx.renderHtml(item.description)"></div>
        <ul v-if="item.highlights?.length" class="entry__highlights">
          <li v-for="(hl, idx) in item.highlights" :key="idx">{{ hl }}</li>
        </ul>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { inject } from 'vue'
import { ResumeDocumentKey } from '../ResumeDocumentKey'

const emit = defineEmits<{ 'click-section': [tabId: string] }>()
const ctx = inject(ResumeDocumentKey)!
</script>
