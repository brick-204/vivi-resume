<template>
  <section class="resume__section" data-section="education" @click="emit('click-section', 'education')">
    <ProfessionalSectionHeader :title="ctx.getSectionTitle(ctx.resume, 'education')" />
    <div
      v-for="item in ctx.getVisibleEducationItems.value"
      :key="item.id"
      class="entry"
      :data-item-id="item.id"
      @click.stop="emit('click-section', 'education', item.id)"
    >
      <div class="entry__content">
        <div class="entry__header">
          <div class="entry__info">
            <h3 class="entry__title">{{ item.school }}</h3>
            <p class="entry__subtitle">{{ [item.degree, item.major].filter(Boolean).join(' · ') }}</p>
          </div>
          <span v-if="item.startDate || item.endDate" class="entry__date">{{ ctx.formatDateRange(item.startDate, item.endDate) }}</span>
        </div>
        <div v-if="item.description" class="entry__desc" v-html="ctx.renderHtml(item.description)"></div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { inject } from 'vue'
import { ResumeDocumentKey } from '../shared/ResumeDocumentKey'
import ProfessionalSectionHeader from './ProfessionalSectionHeader.vue'

const emit = defineEmits<{ 'click-section': [tabId: string, itemId?: string] }>()
const ctx = inject(ResumeDocumentKey)!
</script>