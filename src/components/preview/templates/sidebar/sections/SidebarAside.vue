<template>
  <aside class="sidebar__left" data-section="basic" @click="emit('click-section', 'basic')">
    <div class="sidebar__photo-wrapper">
      <div class="sidebar__photo">
        <img
          v-if="ctx.resume.basicInfo.photo"
          :src="ctx.resume.basicInfo.photo"
          :alt="ctx.resume.basicInfo.name"
          class="sidebar__photo-img"
        />
        <div v-else class="sidebar__photo-placeholder">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="8" r="4" stroke="currentColor" stroke-width="1.5"/>
            <path d="M4 20c0-4 4-6 8-6s8 2 8 6" stroke="currentColor" stroke-width="1.5"/>
          </svg>
        </div>
      </div>
    </div>

    <div class="sidebar__identity">
      <h1 class="sidebar__name">{{ ctx.resume.basicInfo.name || '你的姓名' }}</h1>
      <p class="sidebar__title">{{ ctx.resume.basicInfo.title || '你的职位' }}</p>
    </div>

    <div v-if="ctx.orderedTagFields.value.length" class="sidebar__tags">
      <span v-for="fieldKey in ctx.orderedTagFields.value" :key="fieldKey" class="sidebar__tag">
        <Icon v-if="ctx.showIcon(fieldKey)" :icon="ctx.getFieldIcon(fieldKey)" :width="10" :height="10" class="sidebar__tag-icon" />
        <span v-if="ctx.showLabel(fieldKey)" class="sidebar__tag-label">{{ ctx.getFieldLabel(fieldKey) }}</span>
        {{ ctx.getFieldValue(fieldKey) }}
      </span>
    </div>

    <div v-if="ctx.orderedSidebarContactFields.value.length" class="sidebar__contact">
      <div class="sidebar__section-title">
        <span class="sidebar__section-line"></span>
        联系方式
      </div>
      <div v-for="fieldKey in ctx.orderedSidebarContactFields.value" :key="fieldKey" class="sidebar__contact-item">
        <span v-if="ctx.showIcon(fieldKey)" class="sidebar__contact-icon">
          <Icon :icon="ctx.getFieldIcon(fieldKey)" :width="14" :height="14" />
        </span>
        <span v-if="ctx.showLabel(fieldKey) && !ctx.getCustomFieldByKey(fieldKey)" class="sidebar__contact-label">{{ ctx.getFieldLabel(fieldKey) }}:</span>
        <span v-if="ctx.showLabel(fieldKey) && ctx.getCustomFieldByKey(fieldKey)" class="sidebar__contact-label">{{ ctx.getCustomFieldByKey(fieldKey)?.label }}:</span>
        <span>{{ ctx.getCustomFieldByKey(fieldKey) ? ctx.getCustomFieldByKey(fieldKey)?.value : ctx.getFieldValue(fieldKey) }}</span>
      </div>
    </div>

    <div v-if="ctx.isSectionVisible('skills')" class="sidebar__skills">
      <div class="sidebar__section-title">
        <span class="sidebar__section-line"></span>
        {{ ctx.getSectionTitle(ctx.resume, 'skills') }}
      </div>
      <div v-if="ctx.getSkillsContent.value" class="sidebar__skill-text" v-html="ctx.renderHtml(ctx.getSkillsContent.value)"></div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { inject } from 'vue'
import { Icon } from '@iconify/vue'
import { ResumeDocumentKey } from '../../shared/ResumeDocumentKey'

const emit = defineEmits<{ 'click-section': [tabId: string] }>()
const ctx = inject(ResumeDocumentKey)!
</script>