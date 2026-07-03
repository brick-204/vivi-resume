<template>
  <div
    class="template-showcase-card"
    role="button"
    tabindex="0"
    :aria-label="`使用${template.name}模板`"
    @click="$emit('use', template.id)"
    @keydown.enter="$emit('use', template.id)"
    @keydown.space.prevent="$emit('use', template.id)"
  >
    <!-- 预览区 -->
    <div ref="previewContainer" class="template-showcase-card__preview">
      <!-- ponytail: 视口外只显示 shimmer 占位（固定高度撑住布局），进入视口后才渲染 ResumeDocument -->
      <div v-if="!inView" class="template-showcase-card__placeholder" />
      <template v-else>
        <!-- 空白模板：纯视觉占位，不渲染任何模板样式 -->
        <div v-if="template.id === 'blank'" class="template-showcase-card__blank-placeholder">
          <Icon icon="mdi:file-document-plus-outline" :width="48" />
          <span>空白简历</span>
        </div>
        <div v-else class="template-showcase-card__scale" :style="scaleStyle">
          <ResumeDocument :resume="displayResume" :template-id="template.id" />
        </div>
      </template>
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
import { computed, onMounted } from 'vue'
import type { TemplateConfig } from '@/config/templates'
import type { Resume } from '@/types/resume'
import { getSampleResume } from '@/config/sampleData'
import { useScaledPreview } from '@/composables/useScaledPreview'
import { useInView } from '@/composables/useInView'
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

// ponytail: 视口懒渲染 — 卡片滚入视口前不挂载 ResumeDocument，避免 8 卡片同时渲染阻塞主线程
// previewContainer 同时服务于 useScaledPreview（ResizeObserver）和 useInView（IntersectionObserver）
const { isVisible: inView, setupObserver } = useInView({ rootMargin: '200px' })

onMounted(() => {
  if (previewContainer.value) setupObserver(previewContainer.value)
})
</script>

<style lang="scss" scoped>
// Apple 风格：卡片极细边框，18px 圆角，无阴影
.template-showcase-card {
  position: relative;
  border-radius: $radius-lg;      // 18px
  overflow: hidden;
  cursor: pointer;
  transition: border-color 0.15s ease;
  border: 1px solid var(--border-color);
  background: var(--bg-primary);
  display: flex;
  flex-direction: column;

  &:hover {
    border-color: $primary-color;

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

  // ponytail: 视口外占位 — shimmer 动画撑住卡片高度，避免进入视口时布局跳动
  &__placeholder {
    width: 100%;
    height: 100%;
    background: linear-gradient(
      90deg,
      var(--bg-glass) 25%,
      var(--bg-glass-hover) 50%,
      var(--bg-glass) 75%
    );
    animation: template-card-shimmer 1.5s ease-in-out infinite;
  }

  @keyframes template-card-shimmer {
    0%, 100% { opacity: 0.5; }
    50% { opacity: 0.85; }
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

  // Apple 风格：pill 形状按钮，无阴影
  &__use-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: $spacing-xs;
    padding: 11px 22px;
    background: $primary-color;     // Action Blue
    color: $text-white;
    border: none;
    border-radius: $radius-full;    // Pill 形状
    font-size: $font-size-sm;
    font-weight: $font-weight-semibold;
    cursor: pointer;
    transition: background 0.15s ease, transform 0.15s ease, opacity 0.15s ease;
    font-family: $font-family;
    opacity: 0;
    transform: translateY(4px);
    margin-top: auto;
    width: 100%;

    &:hover {
      background: $primary-light;
    }

    &:active {
      transform: scale(0.95);
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