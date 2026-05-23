<template>
  <section class="sidebar__section" :data-section="sectionId" @click="emit('click-section', sectionId)">
    <h2 class="main__section-title">
      <span class="main__section-icon"></span>
      {{ ctx.getSectionTitle(ctx.resume, sectionId) }}
    </h2>
    <div v-if="ctx.getVisibleEducationItems.value.length">
      <div v-for="item in ctx.getVisibleEducationItems.value" :key="item.id" class="main__entry" :data-item-id="item.id" @click.stop="emit('click-section', sectionId, item.id)">
        <div class="main__entry-header">
          <div class="main__entry-info">
            <h3 class="main__entry-title">{{ item.school }}</h3>
            <p class="main__entry-subtitle">{{ item.degree }} · {{ item.major }}</p>
          </div>
          <span v-if="item.startDate || item.endDate" class="main__entry-date">{{ ctx.formatDateRange(item.startDate, item.endDate) }}</span>
        </div>
        <div v-if="item.description" class="main__entry-desc" v-html="ctx.renderHtml(item.description)"></div>
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
