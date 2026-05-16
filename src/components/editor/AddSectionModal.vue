<template>
  <BaseModal
    :visible="visible"
    title="添加模块"
    size="sm"
    @close="$emit('close')"
  >
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
          <Icon :icon="iconMap[sectionId]" :width="16" :height="16" />
        </span>
        <span class="section-item__label">{{ SECTION_CONFIG[sectionId]?.label || sectionId }}</span>
        <Icon class="section-item__add" :icon="PLUS_SIMPLE_ICON" :width="16" :height="16" />
      </button>
    </div>
  </BaseModal>
</template>

<script setup lang="ts">
import { SECTION_CONFIG } from '@/types/resume'
import { iconMap, PLUS_SIMPLE_ICON } from '@/components/icons/SectionIcons'
import { Icon } from '@iconify/vue'
import BaseModal from '@/components/common/BaseModal.vue'

defineProps<{
  visible: boolean
  hiddenSections: string[]
}>()

defineEmits<{
  close: []
  add: [sectionId: string]
}>()
</script>

<style lang="scss" scoped>

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