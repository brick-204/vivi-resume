<template>
  <aside ref="asideRef" class="sidebar__left" :class="layoutClass" data-section="basic" @click="emit('click-section', 'basic')">
    <!-- v-if/v-else 互斥渲染，同一 flip-id 不会同时出现在 DOM 中 -->
    <div v-if="isRowLayout" class="sidebar__header-row">
      <div data-flip-id="photo" class="sidebar__photo-wrapper" :class="{ 'sidebar__photo-wrapper--row': true }">
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
        <h1 data-flip-id="name" class="sidebar__name">{{ ctx.resume.basicInfo.name || '你的姓名' }}</h1>
        <p data-flip-id="title" class="sidebar__title">{{ ctx.resume.basicInfo.title || '你的职位' }}</p>
      </div>
    </div>

    <template v-else>
      <div data-flip-id="photo" class="sidebar__photo-wrapper">
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
        <h1 data-flip-id="name" class="sidebar__name">{{ ctx.resume.basicInfo.name || '你的姓名' }}</h1>
        <p data-flip-id="title" class="sidebar__title">{{ ctx.resume.basicInfo.title || '你的职位' }}</p>
      </div>
    </template>

    <TransitionGroup v-if="ctx.orderedAllFields.value.length" name="field-reorder" tag="div" class="sidebar__fields">
      <div v-for="field in ctx.orderedAllFields.value" :key="field.key" :data-flip-id="`field-${field.key}`" class="sidebar__field">
        <span v-if="field.showIcon" class="sidebar__field-icon">
          <Icon :icon="field.icon" :width="14" :height="14" />
        </span>
        <span v-if="field.showLabel" class="sidebar__field-label">{{ field.label }}</span>
        <span class="sidebar__field-value">{{ field.value }}</span>
      </div>
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
import { inject, computed, ref, watch, nextTick } from 'vue'
import { Icon } from '@iconify/vue'
import { ResumeDocumentKey } from '../../shared/ResumeDocumentKey'
import { useFlipAnimation } from '@/composables/useFlipAnimation'
import type { HeaderLayout } from '@/types/resume'

const emit = defineEmits<{ 'click-section': [tabId: string, itemId?: string] }>()
const ctx = inject(ResumeDocumentKey)!

const asideRef = ref<HTMLElement>()
const headerLayout = computed<HeaderLayout>(() => ctx.resume.basicInfo.headerLayout || 'centered')
const isRowLayout = computed(() => headerLayout.value === 'photo-left' || headerLayout.value === 'photo-right')

const layoutClass = computed(() => ({
  'sidebar__left--photo-left': headerLayout.value === 'photo-left',
  'sidebar__left--photo-right': headerLayout.value === 'photo-right',
}))

const { recordPositions, animateLayoutChange } = useFlipAnimation(
  () => asideRef.value,
  '[data-flip-id]'
)

watch(headerLayout, () => {
  recordPositions()
  nextTick(() => animateLayoutChange())
}, { flush: 'pre' })
</script>