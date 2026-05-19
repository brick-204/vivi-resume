<template>
  <BaseModal :visible="visible" title="添加模块" size="sm" @close="$emit('close')">
    <div class="add-section-list">
      <button
        v-for="section in sections"
        :key="section.id"
        class="add-section-item"
        @click="$emit('add', section.id)"
      >
        <Icon :icon="section.icon" :width="20" :height="20" />
        <span>{{ section.label }}</span>
      </button>
    </div>
  </BaseModal>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useResumeStore } from '@/stores/resumeStore'
import { SECTION_CONFIG, getSectionTitle } from '@/types/resume'
import { getSectionIcon } from '@/components/icons/SectionIcons'
import { Icon } from '@iconify/vue'
import BaseModal from '@/components/common/BaseModal.vue'

const props = defineProps<{
  visible: boolean
  hiddenSections: string[]
}>()

defineEmits<{
  close: []
  add: [sectionId: string]
}>()

const resumeStore = useResumeStore()

const sections = computed(() => {
  return props.hiddenSections.map(id => ({
    id,
    label: resumeStore.currentResume ? getSectionTitle(resumeStore.currentResume, id) : (SECTION_CONFIG[id]?.label || id),
    icon: getSectionIcon(id),
  }))
})
</script>

<style lang="scss" scoped>

.add-section-list {
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;
}

.add-section-item {
  display: flex;
  align-items: center;
  gap: $spacing-md;
  padding: $spacing-md;
  background: $bg-glass;
  border: 1px solid $border-glass;
  border-radius: $radius-lg;
  color: $text-primary;
  cursor: pointer;
  transition: all $transition-fast;
  font-size: $font-size-md;

  &:hover {
    background: $bg-glass-hover;
    border-color: $primary-color;
  }
}
</style>