<template>
  <div class="template-showcase-card" @click="$emit('use', template.id)">
    <!-- 预览区 -->
    <div class="template-showcase-card__preview" ref="previewContainer">
      <!-- 空白模板：纯视觉占位，不渲染任何模板样式 -->
      <div v-if="template.id === 'blank'" class="template-showcase-card__blank-placeholder">
        <Icon icon="mdi:file-document-plus-outline" :width="48" />
        <span>空白简历</span>
      </div>
      <div v-else class="template-showcase-card__scale" :style="scaleStyle">
        <ResumeDocument :resume="displayResume" :template-id="template.id" />
      </div>
    </div>

    <!-- 信息区 -->
    <div class="template-showcase-card__info">
      <h4 class="template-showcase-card__name">{{ template.name }}</h4>
      <p class="template-showcase-card__desc">{{ template.description }}</p>

      <!-- 样式标签 -->
      <div class="template-showcase-card__tags">
        <span v-if="template.id === 'blank'" class="style-tag">自由创作</span>
        <template v-else>
          <span class="style-tag">{{ layoutLabel }}</span>
          <span class="style-tag style-tag--color">
            主题色
            <span class="style-tag__dot" :style="{ background: template.style.accentColor }" />
          </span>
          <span v-if="template.style.showTimeline" class="style-tag">时间线</span>
          <span v-if="template.style.sectionBorderRadius !== '0'" class="style-tag">圆角卡片</span>
        </template>
      </div>

      <!-- 使用按钮 -->
      <button class="template-showcase-card__use-btn" @click.stop="$emit('use', template.id)">
        <Icon icon="mdi:plus" :width="16" />
        {{ template.id === 'blank' ? '从空白开始' : '使用此模板' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { TemplateConfig } from '@/config/templates'
import type { Resume } from '@/types/resume'
import { getSampleResume } from '@/config/sampleData'
import { useScaledPreview } from '@/composables/useScaledPreview'
import { stripStyleOverrides } from '@/utils/resumeStyle'
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
  previewResumeData?: Resume
}>()

defineEmits<{
  use: [id: string]
}>()

const sampleResume = getSampleResume()

// 有用户真实数据时使用用户内容数据，但剥离样式覆盖字段，让每个模板展示自己的主题色
const displayResume = computed(() => {
  const base = props.previewResumeData || sampleResume
  return { ...stripStyleOverrides(base), templateId: props.template.id } as Resume
})

const layoutLabel = computed(() => LAYOUT_LABELS[props.template.style.headerLayout] || '自定义布局')

const { previewContainer, scaleStyle } = useScaledPreview(() => displayResume.value.pagePadding)
</script>

<style lang="scss" scoped>
.template-showcase-card {
  position: relative;
  border-radius: $radius-lg;
  overflow: hidden;
  cursor: pointer;
  transition: all $transition-base;
  border: 2px solid var(--border-glass);
  background: var(--bg-glass);
  display: flex;
  flex-direction: column;

  &:hover {
    transform: translateY(-4px);
    border-color: $primary-color;
    box-shadow: $shadow-md;

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

  &__blank-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: $spacing-sm;
    color: $text-secondary;
    font-size: $font-size-sm;
    background: linear-gradient(135deg, #f8fafc, #f1f5f9);

    .iconify {
      opacity: 0.4;
    }
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
    background: var(--card-info-bg);
    border-top: 1px solid var(--border-light);
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
    background: $primary-bg-active;
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
  background: $bg-glass;
  border: 1px solid $border-glass;
  border-radius: $radius-full;
  font-size: $font-size-xs;
  color: $primary-color;
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