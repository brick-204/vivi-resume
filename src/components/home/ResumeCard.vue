<template>
  <div class="resume-card" @click="$emit('edit')">
    <div class="resume-card__preview" ref="previewContainer">
      <div class="resume-card__scale" :style="scaleStyle">
        <ResumeDocument :resume="resume" :template-id="resume.templateId || 'classic'" />
      </div>
    </div>
    <div class="resume-card__info">
      <h4 class="resume-card__title">{{ resume.title || '未命名简历' }}</h4>
      <span class="resume-card__meta">{{ templateName }}</span>
    </div>
    <div class="resume-card__actions">
      <button class="resume-card__btn resume-card__btn--edit" @click.stop="$emit('edit')" title="编辑">
        <Icon icon="mdi:pencil-outline" :width="16" />
      </button>
      <button class="resume-card__btn resume-card__btn--copy" :disabled="isCopying" @click.stop="onCopy" title="复制">
        <Icon :icon="isCopying ? 'mdi:loading' : 'mdi:content-copy'" :width="16" :class="{ 'spin': isCopying }" />
      </button>
      <button class="resume-card__btn resume-card__btn--delete" @click.stop="$emit('delete')" title="删除">
        <Icon icon="mdi:trash-can-outline" :width="16" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Resume } from '@/types/resume'
import { getTemplate } from '@/config/templates'
import { useScaledPreview } from '@/composables/useScaledPreview'
import ResumeDocument from '@/components/preview/ResumeDocument.vue'
import { Icon } from '@iconify/vue'

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

const { previewContainer, scaleStyle } = useScaledPreview(() => props.resume.pagePadding)
</script>

<style lang="scss" scoped>
.resume-card {
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

  &__title {
    font-size: $font-size-md;
    font-weight: 600;
    color: $text-primary;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;
  }

  &__meta {
    font-size: $font-size-xs;
    color: $text-secondary;
    flex-shrink: 0;
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
    border-radius: $radius-md;
    border: none;
    cursor: pointer;
    transition: all 0.15s ease;

    &--edit {
      background: $primary-color;
      color: #ffffff;

      &:hover {
        background: $primary-light;
        transform: scale(1.1);
      }
    }

    &--copy {
      background: rgba(59, 130, 246, 0.8);
      color: #ffffff;

      &:hover:not(:disabled) {
        background: rgba(59, 130, 246, 1);
        transform: scale(1.1);
      }

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }

    &--delete {
      background: rgba(239, 68, 68, 0.8);
      color: #ffffff;

      &:hover {
        background: rgba(239, 68, 68, 1);
        transform: scale(1.1);
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