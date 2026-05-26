<template>
  <aside class="sidebar__left" data-section="basic" @click="emit('click-section', 'basic')">
    <div class="sidebar__photo-wrapper">
      <div class="sidebar__photo" :class="{ 'sidebar__photo--rectangle': ctx.resume.basicInfo.photoShape === 'rectangle' }">
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

    <!-- 统一字段列表 -->
    <TransitionGroup v-if="ctx.orderedAllFields.value.length" name="field-reorder" tag="div" class="sidebar__fields">
      <template v-for="(field, index) in ctx.orderedAllFields.value" :key="field.key">
        <div v-if="field.isContact && !ctx.orderedAllFields.value.slice(0, index).some(f => f.isContact)" class="sidebar__section-title">
          <span class="sidebar__section-line"></span>
          联系方式
        </div>
        <div class="sidebar__field">
          <span v-if="field.showIcon" class="sidebar__field-icon">
            <Icon :icon="field.icon" :width="14" :height="14" />
          </span>
          <span v-if="field.showLabel" class="sidebar__field-label">{{ field.label }}</span>
          <span class="sidebar__field-value">{{ field.value }}</span>
        </div>
      </template>
    </TransitionGroup>

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

const emit = defineEmits<{ 'click-section': [tabId: string, itemId?: string] }>()
const ctx = inject(ResumeDocumentKey)!
</script>
