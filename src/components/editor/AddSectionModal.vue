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
import { iconMap } from '@/components/icons/SectionIcons'

defineProps<{
  hiddenSections: string[]
}>()

defineEmits<{
  close: []
  add: [sectionId: string]
}>()
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