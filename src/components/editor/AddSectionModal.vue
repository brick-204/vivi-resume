<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content">
      <div class="modal__header">
        <h3 class="modal__title">添加模块</h3>
        <button class="modal__close" @click="$emit('close')">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        </button>
      </div>
      <div class="modal__body">
        <p v-if="hiddenSections.length === 0" class="modal__empty">
          所有模块都已添加
        </p>
        <div v-else class="section-list">
          <button
            v-for="sectionId in hiddenSections"
            :key="sectionId"
            class="section-item"
            @click="$emit('add', sectionId)"
          >
            <span class="section-item__icon">
              <component :is="iconMap[sectionId]" />
            </span>
            <span class="section-item__label">{{ SECTION_CONFIG[sectionId]?.label || sectionId }}</span>
            <svg class="section-item__add" width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 3V13M3 8H13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { SECTION_CONFIG } from '@/types/resume'

defineProps<{
  hiddenSections: string[]
}>()

defineEmits<{
  close: []
  add: [sectionId: string]
}>()

// Icon components
const MessageIcon = {
  template: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M3 4H13C13.5523 4 14 4.44772 14 5V10C14 10.5523 13.5523 11 13 11H5L2 13V5C2 4.44772 2.44772 4 3 4Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
    <path d="M5 7H11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
  </svg>`
}

const BriefcaseIcon = {
  template: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <rect x="2" y="5" width="12" height="8" rx="2" stroke="currentColor" stroke-width="1.5"/>
    <path d="M5 5V3C5 2.44772 5.44772 2 6 2H10C10.5523 2 11 2.44772 11 3V5" stroke="currentColor" stroke-width="1.5"/>
    <path d="M8 9H8.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
  </svg>`
}

const EducationIcon = {
  template: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M2 6L8 3L14 6" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
    <path d="M2 6V10L8 13L14 10V6" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
    <path d="M8 13V9" stroke="currentColor" stroke-width="1.5"/>
    <circle cx="8" cy="7.5" r="1.5" stroke="currentColor" stroke-width="1"/>
  </svg>`
}

const RocketIcon = {
  template: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M8 2L11 5L11.5 10L8 13L4.5 10L5 5L8 2Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
    <path d="M8 6V6.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    <path d="M4 13L3 14M12 13L13 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
  </svg>`
}

const ZapIcon = {
  template: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M9 2L4 9H7L6 14L12 7H9L9 2Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
  </svg>`
}

const GlobeIcon = {
  template: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.5"/>
    <path d="M2 8H14M8 2C5.5 4.5 5.5 11.5 8 14M8 2C10.5 4.5 10.5 11.5 8 14" stroke="currentColor" stroke-width="1.5"/>
  </svg>`
}

const StarIcon = {
  template: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M8 1L10 5.5L15 6L11.5 9.5L12.5 15L8 12L3.5 15L4.5 9.5L1 6L6 5.5L8 1Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
  </svg>`
}

const iconMap: Record<string, any> = {
  summary: MessageIcon,
  work: BriefcaseIcon,
  education: EducationIcon,
  projects: RocketIcon,
  skills: ZapIcon,
  languages: GlobeIcon,
  evaluation: StarIcon
}
</script>

<style lang="scss" scoped>

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: $bg-primary;
  border: 1px solid $border-glass;
  border-radius: $radius-xl;
  width: 90%;
  max-width: 400px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.modal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: $spacing-lg;
  border-bottom: 1px solid $border-glass;
}

.modal__title {
  font-size: $font-size-lg;
  font-weight: 700;
  color: $text-primary;
}

.modal__close {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: $spacing-xs;
  background: transparent;
  border: none;
  color: $text-secondary;
  cursor: pointer;
  border-radius: $radius-md;
  transition: all $transition-fast;

  &:hover {
    color: $text-primary;
    background: $bg-glass;
  }
}

.modal__body {
  padding: $spacing-lg;
  max-height: 400px;
  overflow-y: auto;
  @include scrollbar;
}

.modal__empty {
  text-align: center;
  color: $text-secondary;
  padding: $spacing-xl 0;
}

.section-list {
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;
}

.section-item {
  display: flex;
  align-items: center;
  gap: $spacing-md;
  padding: $spacing-md $spacing-lg;
  background: $bg-glass;
  border: 1px solid $border-glass;
  border-radius: $radius-lg;
  cursor: pointer;
  transition: all $transition-fast;
  font-family: $font-family;

  &:hover {
    background: $bg-glass-hover;
    border-color: $primary-color;

    .section-item__add {
      color: $primary-light;
    }
  }

  &__icon {
    display: flex;
    align-items: center;
    color: $text-secondary;
  }

  &__label {
    flex: 1;
    text-align: left;
    font-size: $font-size-md;
    font-weight: 500;
    color: $text-primary;
  }

  &__add {
    display: flex;
    color: $text-light;
    transition: color $transition-fast;
  }
}
</style>