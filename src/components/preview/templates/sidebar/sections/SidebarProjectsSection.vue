<template>
  <section class="sidebar__section" :data-section="sectionId" @click="emit('click-section', sectionId)">
    <h2 class="main__section-title">
      <span class="main__section-icon"></span>
      {{ ctx.getSectionTitle(ctx.resume, sectionId) }}
    </h2>
    <div v-for="item in ctx.getVisibleProjectItems.value" :key="item.id" class="main__entry" :data-item-id="item.id" @click.stop="emit('click-section', sectionId, item.id)">
      <div class="main__entry-header">
        <div class="main__entry-info">
          <h3 class="main__entry-title">{{ item.name }}</h3>
          <p class="main__entry-subtitle">{{ item.role }}</p>
        </div>
        <span v-if="item.startDate || item.endDate" class="main__entry-date">{{ ctx.formatDateRange(item.startDate, item.endDate) }}</span>
      </div>
      <div v-if="item.description" class="main__entry-desc" v-html="ctx.renderHtml(item.description)"></div>
      <ul v-if="item.highlights?.length" class="main__entry-highlights">
        <li v-for="(hl, idx) in item.highlights" :key="idx">{{ hl }}</li>
      </ul>
      <div v-if="item.technologies?.length" class="main__entry-tags">
        <span v-for="(tech, idx) in item.technologies" :key="idx" class="main__tech-tag">{{ tech }}</span>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { inject } from 'vue'
import { ResumeDocumentKey } from '../../shared/ResumeDocumentKey'

defineProps<{ sectionId: string }>()
const emit = defineEmits<{ 'click-section': [tabId: string, itemId?: string] }>()
const ctx = inject(ResumeDocumentKey)!
</script>
