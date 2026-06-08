<template>
  <div class="template-showcase-card" @click="$emit('use', template.id)">
    <!-- 预览区 -->
    <div class="template-showcase-card__preview" ref="previewContainer">
      <div class="template-showcase-card__scale" :style="scaleStyle">
        <ResumeDocument :resume="sampleResume" :template-id="template.id" />
      </div>
    </div>

    <!-- 信息区 -->
    <div class="template-showcase-card__info">
      <h4 class="template-showcase-card__name">{{ template.name }}</h4>
      <p class="template-showcase-card__desc">{{ template.description }}</p>

      <!-- 样式标签 -->
      <div class="template-showcase-card__tags">
        <span class="style-tag">{{ layoutLabel }}</span>
        <span class="style-tag style-tag--color">
          主题色
          <span class="style-tag__dot" :style="{ background: template.style.accentColor }" />
        </span>
        <span v-if="template.style.showTimeline" class="style-tag">时间线</span>
        <span v-if="template.style.sectionBorderRadius !== '0'" class="style-tag">圆角卡片</span>
      </div>

      <!-- 使用按钮 -->
      <button class="template-showcase-card__use-btn" @click.stop="$emit('use', template.id)">
        <Icon icon="mdi:plus" :width="16" />
        使用此模板
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { TemplateConfig } from '@/config/templates'
import { getSampleResume } from '@/config/sampleData'
import { useScaledPreview } from '@/composables/useScaledPreview'
import ResumeDocument from '@/components/preview/ResumeDocument.vue'
import { Icon } from '@iconify/vue'

const LAYOUT_LABELS: Record<string, string> = {
  centered: '居中布局',
  left: '左对齐布局',
  'two-column': '双栏布局',
  sidebar: '侧边栏布局',
}

const props = defineProps<{
  template: TemplateConfig
}>()

defineEmits<{
  use: [id: string]
}>()

const sampleResume = getSampleResume()

const layoutLabel = computed(() => LAYOUT_LABELS[props.template.style.headerLayout] || '自定义布局')

const { previewContainer, scaleStyle } = useScaledPreview(() => sampleResume.pagePadding)
</script>

<style lang="scss" scoped>
.template-showcase-card {
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

    .template-showcase-card__use-btn {
      opacity: 1;
      transform: translateY(0);
    }
  }

  &__preview {
    width: 100%;
    height: 400px;
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
    padding: $spacing-lg;
    background: rgba($bg-primary, 0.6);
    backdrop-filter: blur(10px);
    border-top: 1px solid rgba(255, 255, 255, 0.06);
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  &__name {
    font-size: $font-size-md;
    font-weight: 600;
    color: $text-primary;
    margin: 0 0 $spacing-xs;
  }

  &__desc {
    font-size: $font-size-sm;
    color: $text-secondary;
    line-height: 1.6;
    margin: 0 0 $spacing-sm;
  }

  &__tags {
    display: flex;
    flex-wrap: wrap;
    gap: $spacing-xs;
    margin-bottom: $spacing-md;
  }

  &__use-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: $spacing-xs;
    padding: $spacing-sm $spacing-lg;
    background: $primary-gradient;
    color: $text-white;
    border: none;
    border-radius: $radius-md;
    font-size: $font-size-sm;
    font-weight: 600;
    cursor: pointer;
    transition: all $transition-base;
    font-family: $font-family;
    opacity: 0;
    transform: translateY(4px);
    margin-top: auto;
    width: 100%;

    &:hover {
      transform: translateY(-1px);
      box-shadow: $shadow-primary;
    }
  }
}

.style-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 10px;
  background: rgba(124, 92, 252, 0.1);
  border: 1px solid rgba(124, 92, 252, 0.2);
  border-radius: $radius-full;
  font-size: $font-size-xs;
  color: $primary-light;
  white-space: nowrap;

  &--color {
    // 主题色标签保持默认样式
  }

  &__dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
  }
}

// 响应式适配
@include tablet {
  .template-showcase-card {
    &__preview {
      height: 320px;
    }

    &__info {
      padding: $spacing-md;
    }

    &__use-btn {
      opacity: 1;
      transform: translateY(0);
    }
  }
}

@include mobile {
  .template-showcase-card {
    &__preview {
      height: 280px;
    }

    &__info {
      padding: $spacing-md;
    }

    &__use-btn {
      opacity: 1;
      transform: translateY(0);
    }
  }
}
</style>