<template>
  <div class="carousel-item">
    <div class="carousel-item__preview" ref="previewContainer">
      <div class="carousel-item__scale" :style="scaleStyle">
        <ResumeDocument :resume="sampleResume as any" :template-id="template.id" />
      </div>
    </div>
    <div class="carousel-item__name">{{ template.name }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { TemplateConfig } from '@/config/templates'
import { getSampleResume } from '@/config/sampleData'
import { stripStyleOverrides } from '@/utils/resumeStyle'
import { useScaledPreview } from '@/composables/useScaledPreview'
import ResumeDocument from '@/components/preview/ResumeDocument.vue'

defineProps<{
  template: TemplateConfig
}>()

const sampleResume = computed(() => stripStyleOverrides(getSampleResume()))

const { previewContainer, scaleStyle } = useScaledPreview(() => 48)
</script>

<style lang="scss" scoped>
.carousel-item {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-shrink: 0;
}

.carousel-item__preview {
  width: 100%;
  height: 360px;
  overflow: hidden;
  position: relative;
  background: #ffffff;
  border-radius: $radius-sm;
  box-shadow: $shadow-md;

  @include mobile {
    height: 300px;
  }
}

.carousel-item__scale {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;

  :deep(.resume-document) {
    box-shadow: none;
  }
}

.carousel-item__name {
  margin-top: $spacing-md;
  font-size: $font-size-md;
  font-weight: 600;
  color: $text-primary;
  text-align: center;
}
</style>
