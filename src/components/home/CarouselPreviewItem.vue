<template>
  <div class="carousel-item">
    <div ref="previewContainer" class="carousel-item__preview">
      <!-- ponytail: 非活跃 slide 只显示 shimmer 占位（固定高度撑住布局），避免 8 份简历同时渲染 -->
      <div v-if="!active" class="carousel-item__placeholder" />
      <div v-else class="carousel-item__scale" :style="scaleStyle">
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
  /** 当前是否处于可见窗口内（含预加载），非活跃时只渲染占位 */
  active: boolean
}>()

// ponytail: computed 无响应式依赖，仅首次访问执行一次深拷贝；后续 stripStyleOverrides 走缓存
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

// ponytail: 非活跃 slide 占位，固定高度撑住布局；与首页 HomeSkeleton 同款品牌色 shimmer
.carousel-item__placeholder {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    rgba(0, 102, 204, 0.08) 25%,
    rgba(0, 102, 204, 0.16) 50%,
    rgba(0, 102, 204, 0.08) 75%
  );
  animation: carousel-placeholder-shimmer 1.5s ease-in-out infinite;
}

@keyframes carousel-placeholder-shimmer {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
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
