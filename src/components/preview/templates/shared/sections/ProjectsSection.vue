<template>
  <section class="resume__section" data-section="projects" @click="emit('click-section', 'projects')">
    <h2 class="section__title">
      <span class="section__icon section__icon--project"></span>
      {{ ctx.getSectionTitle(ctx.resume, 'projects') }}
    </h2>
    <div v-for="item in ctx.getVisibleProjectItems.value" :key="item.id" class="entry" :data-item-id="item.id" @click.stop="emit('click-section', 'projects', item.id)">
      <div class="entry__timeline">
        <span class="timeline__dot timeline__dot--project"></span>
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
        <ul v-if="item.highlights?.length" class="entry__highlights">
          <li v-for="(hl, idx) in item.highlights" :key="idx">{{ hl }}</li>
        </ul>
        <div v-if="item.technologies?.length" class="entry__tags">
          <span v-for="(tech, idx) in item.technologies" :key="idx" class="tech-tag">{{ tech }}</span>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { inject } from 'vue'
import { ResumeDocumentKey } from '../ResumeDocumentKey'

const emit = defineEmits<{ 'click-section': [tabId: string, itemId?: string] }>()
const ctx = inject(ResumeDocumentKey)!
</script>
