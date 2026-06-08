<template>
  <div
    class="template-card"
    :class="{ 'template-card--selected': selected }"
    @click="$emit('select', template.id)"
  >
    <div class="template-card__preview" ref="previewContainer">
      <div class="template-card__scale" :style="scaleStyle">
        <ResumeDocument :resume="previewResume" :template-id="template.id" />
      </div>
    </div>
    <div class="template-card__info">
      <h4 class="template-card__name">{{ template.name }}</h4>
      <p class="template-card__desc">{{ template.description }}</p>
    </div>
    <div v-if="selected" class="template-card__check">
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="10" fill="#7c5cfc"/>
        <path d="M6 10L9 13L14 7" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { TemplateConfig } from '@/config/templates'
import type { HeaderTextColor, HeaderIconColor } from '@/types/resume'
import { getSampleResume } from '@/config/sampleData'
import { useScaledPreview } from '@/composables/useScaledPreview'
import ResumeDocument from '@/components/preview/ResumeDocument.vue'

interface StyleOverrides {
  themeAccentColor?: string
  headerTextColor?: HeaderTextColor
  headerIconColor?: HeaderIconColor
  fontFamily?: string
  bodyFontSize?: number
  sectionTitleFontSize?: number
  entryTitleFontSize?: number
  lineHeight?: number
  pagePadding?: number
}

const props = defineProps<{
  template: TemplateConfig
  selected: boolean
  styleOverrides?: StyleOverrides
}>()

defineEmits<{
  select: [id: string]
}>()

const sampleResume = getSampleResume()

// 合并样式覆盖：更换模板时预览使用当前简历的样式配置
const previewResume = computed(() => {
  if (!props.styleOverrides) return sampleResume
  return { ...sampleResume, ...props.styleOverrides }
})

const { previewContainer, scaleStyle } = useScaledPreview(() => previewResume.value.pagePadding)
</script>

<style lang="scss" scoped>
.template-card {
  position: relative;
  border-radius: $radius-lg;
  overflow: hidden;
  cursor: pointer;
  transition: all $transition-base;
  border: 2px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.03);
  display: flex;
  flex-direction: column;

  &:hover {
    transform: translateY(-4px);
    border-color: rgba(124, 92, 252, 0.4);
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.3), 0 0 20px rgba(124, 92, 252, 0.1);
  }

  &--selected {
    border-color: $primary-color;
    box-shadow: 0 0 24px rgba(124, 92, 252, 0.25);

    &:hover {
      border-color: $primary-color;
    }
  }

  &__preview {
    width: 100%;
    height: 360px;
    flex-shrink: 0;
    overflow: hidden;
    position: relative;
    background: #ffffff;
  }

  &__scale {
    position: absolute;
    top: 0;
    left: 0;
    pointer-events: none;

    :deep(.resume-document) {
      box-shadow: none;
    }
  }

  &__info {
    padding: $spacing-md $spacing-lg;
    background: rgba($bg-primary, 0.6);
    backdrop-filter: blur(10px);
    border-top: 1px solid rgba(255, 255, 255, 0.06);
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }

  &__name {
    font-size: $font-size-md;
    font-weight: 600;
    color: $text-primary;
    margin-bottom: $spacing-xs;
  }

  &__desc {
    font-size: $font-size-sm;
    color: $text-secondary;
    line-height: 1.6;
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

// 响应式适配
@include tablet {
  .template-card {
    &__preview {
      height: 300px;
    }

    &__info {
      padding: $spacing-sm $spacing-md;
    }

    &__name {
      font-size: $font-size-sm;
    }

    &__desc {
      font-size: $font-size-xs;
    }
  }
}

@include mobile {
  .template-card {
    &__preview {
      height: 280px;
    }

    &__info {
      padding: $spacing-sm $spacing-md;
    }

    &__name {
      font-size: $font-size-sm;
    }

    &__desc {
      font-size: $font-size-xs;
    }

    &__check {
      top: $spacing-xs;
      right: $spacing-xs;

      svg {
        width: 16px;
        height: 16px;
      }
    }
  }
}
</style>