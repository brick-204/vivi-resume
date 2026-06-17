<template>
  <section class="resume__section" :data-section="sectionId" @click="emit('click-section', sectionId)">
    <h2 class="section__title">
      <span class="section__icon section__icon--custom-card"></span>
      {{ ctx.getSectionTitle(ctx.resume, sectionId) }}
    </h2>
    <div v-for="item in ctx.getCustomCardItems.value(sectionId)" :key="item.id" class="entry" :data-item-id="item.id" @click.stop="emit('click-section', sectionId, item.id)">
      <div class="entry__timeline">
        <span class="timeline__dot"></span>
        <span class="timeline__line"></span>
      </div>
      <div class="entry__content">
        <div class="entry__header">
          <div class="entry__info">
            <h3 class="entry__title">{{ item.name }}</h3>
            <p class="entry__subtitle">{{ item.role }}</p>
          </div>
          <span v-if="item.startDate || item.endDate" class="entry__date">{{ ctx.formatDateRange(item.startDate, item.endDate) }}</span>
        </div>
        <div v-if="item.description" class="entry__desc" v-html="ctx.renderHtml(item.description)"></div>
        <div v-if="item.keywords?.length" class="entry__tags">
          <span v-for="(kw, idx) in item.keywords" :key="idx" class="tech-tag">{{ kw }}</span>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { inject } from 'vue'
import { ResumeDocumentKey } from '../ResumeDocumentKey'

defineProps<{ sectionId: string }>()
const emit = defineEmits<{ 'click-section': [tabId: string, itemId?: string] }>()
const ctx = inject(ResumeDocumentKey)!
</script>
