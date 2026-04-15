<template>
  <BaseModal
    :visible="visible"
    title="选择简历模板"
    size="lg"
    @close="$emit('close')"
  >
    <div class="template-grid">
      <div
        v-for="template in templates"
        :key="template.id"
        class="template-card"
        :class="{ 'template-card--selected': selectedId === template.id }"
        @click="selectTemplate(template.id)"
      >
        <div class="template-card__preview">
          <div class="template-card__scale" :style="scaleStyle">
            <ResumeDocument :resume="sampleResume" :template-id="template.id" />
          </div>
        </div>
        <div class="template-card__info">
          <h4 class="template-card__name">{{ template.name }}</h4>
          <p class="template-card__desc">{{ template.description }}</p>
        </div>
        <div v-if="selectedId === template.id" class="template-card__check">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="10" r="10" fill="#7c5cfc"/>
            <path d="M6 10L9 13L14 7" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
      </div>
    </div>
  </BaseModal>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { TEMPLATES } from '@/config/templates'
import { getSampleResume } from '@/config/sampleData'
import { useResumeStore } from '@/stores/resumeStore'
import BaseModal from '@/components/common/BaseModal.vue'
import ResumeDocument from '@/components/preview/ResumeDocument.vue'

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  close: []
  select: [templateId: string]
}>()

const store = useResumeStore()
const templates = TEMPLATES
const selectedId = ref(store.currentResume?.templateId || 'classic')
const sampleResume = getSampleResume()

const scaleStyle = computed(() => ({
  width: '720px',
  minHeight: '1000px',
  transform: 'scale(0.32)',
  transformOrigin: 'top left'
}))

watch(() => props.visible, (newVal) => {
  if (newVal) {
    selectedId.value = store.currentResume?.templateId || 'classic'
  }
})

const selectTemplate = (id: string) => {
  selectedId.value = id
  store.updateCurrentResume({ templateId: id })
  emit('select', id)
  emit('close')
}
</script>

<style lang="scss" scoped>
.template-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: $spacing-lg;

  @include mobile {
    grid-template-columns: 1fr;
  }
}

.template-card {
  position: relative;
  border-radius: $radius-lg;
  overflow: hidden;
  cursor: pointer;
  transition: all $transition-base;
  border: 2px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.03);

  &:hover {
    transform: translateY(-4px);
    border-color: rgba(124, 92, 252, 0.4);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), 0 0 20px rgba(124, 92, 252, 0.15);
  }

  &--selected {
    border-color: $primary-color;
    box-shadow: 0 0 20px rgba(124, 92, 252, 0.3);
  }

  &__preview {
    height: 200px;
    overflow: hidden;
    position: relative;
    background: #ffffff;
  }

  &__scale {
    position: absolute;
    top: 0;
    left: 0;
    pointer-events: none;
  }

  &__info {
    padding: $spacing-md;
    background: rgba($bg-primary, 0.5);
    backdrop-filter: blur(10px);
  }

  &__name {
    font-size: $font-size-sm;
    font-weight: 600;
    color: $text-primary;
    margin-bottom: $spacing-xs;
  }

  &__desc {
    font-size: $font-size-xs;
    color: $text-secondary;
    line-height: 1.5;
  }

  &__check {
    position: absolute;
    top: $spacing-sm;
    right: $spacing-sm;
    animation: popIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
}

@keyframes popIn {
  from {
    opacity: 0;
    transform: scale(0);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
</style>