<template>
  <div class="resume-card" @click="$emit('edit')">
    <div ref="previewContainer" class="resume-card__preview">
      <!-- ponytail: 视口外 shimmer 占位（固定高度撑住布局），进入视口后渲染 ResumeDocument -->
      <div v-if="!inView" class="resume-card__placeholder">
        <span class="loading-text" style="color: rgba(0, 0, 0, 0.45);">加载中...</span>
      </div>
      <div v-else class="resume-card__scale" :style="scaleStyle">
        <ResumeDocument :resume="resume" :template-id="resume.templateId || 'classic'" />
      </div>
    </div>
    <div class="resume-card__info">
      <div class="resume-card__title-wrap">
        <h4 class="resume-card__title">{{ resume.title || '未命名简历' }}</h4>
        <span class="resume-card__time">
          <Icon icon="mdi:clock-outline" :width="12" />
          {{ formattedTime }}
        </span>
      </div>
      <div class="resume-card__meta">
        <span
          v-if="evaluationScore !== null"
          class="resume-card__score-badge"
          :style="{ background: scoreColor }"
        >
          {{ evaluationScore }}分
        </span>
        <span>{{ templateName }}</span>
      </div>
    </div>
    <div class="resume-card__actions">
      <button class="resume-card__btn resume-card__btn--edit" title="编辑" @click.stop="$emit('edit')">
        <Icon icon="mdi:pencil-outline" :width="16" />
      </button>
      <button class="resume-card__btn resume-card__btn--copy" :disabled="isCopying" title="复制" @click.stop="onCopy">
        <Icon :icon="isCopying ? 'mdi:loading' : 'mdi:content-copy'" :width="16" :class="{ 'spin': isCopying }" />
      </button>
      <button class="resume-card__btn resume-card__btn--delete" title="删除" @click.stop="$emit('delete')">
        <Icon icon="mdi:trash-can-outline" :width="16" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import type { Resume } from '@/types/resume'
import { getTemplate } from '@/config/templates'
import { useScaledPreview } from '@/composables/useScaledPreview'
import { useInView } from '@/composables/useInView'
import ResumeDocument from '@/components/preview/ResumeDocument.vue'
import { Icon } from '@iconify/vue'
import { getScoreColor } from '@/utils/evaluationScore'

const props = defineProps<{ resume: Resume }>()

const emit = defineEmits<{
  edit: []
  copy: []
  delete: []
}>()

const isCopying = ref(false)

const onCopy = () => {
  if (isCopying.value) return
  isCopying.value = true
  emit('copy')
  // 给 store 操作一个缓冲时间，避免快速重复点击
  setTimeout(() => { isCopying.value = false }, 500)
}

const templateName = computed(() => getTemplate(props.resume.templateId).name)

/** 格式化最后更新时间：7天内显示相对时间，更早显示绝对日期 */
const formattedTime = computed(() => {
  const updated = new Date(props.resume.updatedAt)
  const now = new Date()
  const diffMs = now.getTime() - updated.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHour = Math.floor(diffMs / 3600000)
  const diffDay = Math.floor(diffMs / 86400000)

  if (diffMin < 1) return '刚刚'
  if (diffMin < 60) return `${diffMin}分钟前`
  if (diffHour < 24) return `${diffHour}小时前`
  if (diffDay < 7) return `${diffDay}天前`

  // 超过7天显示绝对日期
  const month = updated.getMonth() + 1
  const day = updated.getDate()
  const isThisYear = updated.getFullYear() === now.getFullYear()
  if (isThisYear) return `${month}月${day}日`
  return `${updated.getFullYear()}年${month}月${day}日`
})

const evaluationScore = computed(() => props.resume.lastEvaluation?.score ?? null)

const scoreColor = computed(() => getScoreColor(evaluationScore.value))

const { previewContainer, scaleStyle } = useScaledPreview(() => props.resume.pagePadding)

// ponytail: 视口懒渲染 — 简历卡片滚入视口前不挂载 ResumeDocument
const { isVisible: inView, setupObserver } = useInView({ rootMargin: '200px' })

onMounted(() => {
  if (previewContainer.value) setupObserver(previewContainer.value)
})
</script>

<style lang="scss" scoped>
// Apple 风格：卡片极细边框，18px 圆角，无阴影
.resume-card {
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

    .resume-card__actions {
      opacity: 1;
      transform: translateY(0);
    }
  }

  &__preview {
    width: 100%;
    height: 360px;
    flex-shrink: 0;
    overflow: hidden;
    position: relative;
    background: #ffffff;

    // 长简历截断渐变提示
    &::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 40px;
      background: linear-gradient(transparent, rgba(255, 255, 255, 0.9));
      pointer-events: none;
    }
  }

  // ponytail: 视口外 shimmer 占位，撑住卡片高度避免布局跳动
  &__placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(
      90deg,
      var(--bg-glass) 25%,
      var(--bg-glass-hover) 50%,
      var(--bg-glass) 75%
    );
    animation: resume-card-shimmer 1.5s ease-in-out infinite;
  }

  @keyframes resume-card-shimmer {
    0%, 100% { opacity: 0.5; }
    50% { opacity: 0.85; }
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
    background: var(--card-info-bg);
    border-top: 1px solid var(--border-light);
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: $spacing-sm;
  }

  &__title-wrap {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  &__title {
    font-size: $font-size-md;
    font-weight: 600;
    color: $text-primary;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__time {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    font-size: $font-size-xs;
    color: $text-light;
  }

  &__meta {
    display: flex;
    align-items: center;
    gap: $spacing-xs;
    font-size: $font-size-xs;
    color: $text-secondary;
    flex-shrink: 0;
  }

  &__score-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 32px;
    height: 18px;
    padding: 0 5px;
    border-radius: $radius-sm;
    color: #ffffff;
    font-size: 11px;
    font-weight: 700;
    line-height: 1;
  }

  &__actions {
    position: absolute;
    top: $spacing-sm;
    right: $spacing-sm;
    display: flex;
    gap: $spacing-xs;
    opacity: 0;
    transform: translateY(-4px);
    transition: all 0.2s ease;
    z-index: 2;
  }

  &__btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: $radius-sm;      // 8px
    border: none;
    cursor: pointer;
    transition: background 0.15s ease, transform 0.15s ease;

    &--edit {
      background: $primary-color;
      color: #ffffff;

      &:hover:not(:disabled) {
        background: $primary-light;
      }

      &:active:not(:disabled) {
        transform: scale(0.95);
      }
    }

    &--copy {
      background: rgba($secondary-color, 0.8);
      color: #ffffff;

      &:hover:not(:disabled) {
        background: rgba($secondary-light, 1);
      }

      &:active:not(:disabled) {
        transform: scale(0.95);
      }

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }

    &--delete {
      background: rgba($error-color, 0.8);
      color: #ffffff;

      &:hover {
        background: rgba($error-color, 1);
      }

      &:active {
        transform: scale(0.95);
      }
    }
  }
}

// loading 旋转动画
.spin {
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

// 响应式适配
@include tablet {
  .resume-card {
    &__preview {
      height: 300px;
    }

    &__info {
      padding: $spacing-sm $spacing-md;
    }

    &__title {
      font-size: $font-size-sm;
    }
  }
}

@include mobile {
  .resume-card {
    &__preview {
      height: 280px;
    }

    &__info {
      padding: $spacing-sm $spacing-md;
    }

    &__title {
      font-size: $font-size-sm;
    }
  }
}
</style>