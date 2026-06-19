<template>
  <section class="template-carousel">
    <div class="template-carousel__header">
      <h2 class="template-carousel__title">
        <span class="template-carousel__title-highlight">8 款</span>精美模板
      </h2>
      <p class="template-carousel__subtitle">从经典到现代，总有一款适合你</p>
    </div>

    <div
      class="template-carousel__viewport"
      @mouseenter="pauseAutoplay"
      @mouseleave="resumeAutoplay"
    >
      <!-- 左箭头 -->
      <button class="carousel-arrow carousel-arrow--left" @click="prev">
        <Icon icon="mdi:chevron-left" :width="24" />
      </button>

      <!-- 轮播容器 -->
      <div class="carousel-track-wrapper">
        <div class="carousel-track" :style="trackStyle">
          <div
            v-for="template in templates"
            :key="template.id"
            class="carousel-slide"
          >
            <CarouselPreviewItem :template="template" />
          </div>
        </div>
      </div>

      <!-- 右箭头 -->
      <button class="carousel-arrow carousel-arrow--right" @click="next">
        <Icon icon="mdi:chevron-right" :width="24" />
      </button>
    </div>

    <!-- 导航圆点 -->
    <div class="carousel-dots">
      <button
        v-for="(_, idx) in templates"
        :key="idx"
        class="carousel-dot"
        :class="{ 'carousel-dot--active': idx === currentIndex }"
        @click="goTo(idx)"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Icon } from '@iconify/vue'
import { TEMPLATES } from '@/config/templates'
import CarouselPreviewItem from '@/components/home/CarouselPreviewItem.vue'

const templates = TEMPLATES
const currentIndex = ref(0)
let autoplayTimer: ReturnType<typeof setInterval> | null = null
let resizeHandler: (() => void) | null = null

/** 可见数量：桌面3，平板2，手机1 */
const visibleCount = ref(3)

/** 根据窗口宽度更新可见数量 */
const updateVisibleCount = () => {
  if (window.innerWidth < 768) visibleCount.value = 1
  else if (window.innerWidth < 1024) visibleCount.value = 2
  else visibleCount.value = 3
  // 确保当前索引不超出范围
  const maxIdx = Math.max(0, templates.length - visibleCount.value)
  if (currentIndex.value > maxIdx) currentIndex.value = maxIdx
}

/** 轨道偏移量 */
const trackStyle = computed(() => {
  const slideWidthPercent = 100 / visibleCount.value
  const offset = currentIndex.value * slideWidthPercent
  return {
    transform: `translateX(-${offset}%)`,
    transition: 'transform 0.5s cubic-bezier(0.22, 1, 0.36, 1)',
  }
})

const next = () => {
  const maxIndex = Math.max(0, templates.length - visibleCount.value)
  currentIndex.value = currentIndex.value >= maxIndex ? 0 : currentIndex.value + 1
}

const prev = () => {
  const maxIndex = Math.max(0, templates.length - visibleCount.value)
  currentIndex.value = currentIndex.value <= 0 ? maxIndex : currentIndex.value - 1
}

const goTo = (idx: number) => {
  const maxIndex = Math.max(0, templates.length - visibleCount.value)
  currentIndex.value = Math.min(idx, maxIndex)
}

const startAutoplay = () => {
  stopAutoplay()
  autoplayTimer = setInterval(next, 4000)
}

const stopAutoplay = () => {
  if (autoplayTimer) {
    clearInterval(autoplayTimer)
    autoplayTimer = null
  }
}

const pauseAutoplay = () => stopAutoplay()
const resumeAutoplay = () => startAutoplay()

onMounted(() => {
  updateVisibleCount()
  resizeHandler = updateVisibleCount
  window.addEventListener('resize', resizeHandler)
  startAutoplay()
})
onUnmounted(() => {
  stopAutoplay()
  if (resizeHandler) window.removeEventListener('resize', resizeHandler)
})
</script>

<style lang="scss" scoped>
.template-carousel {
  padding: $spacing-3xl 0;
}

.template-carousel__header {
  text-align: center;
  margin-bottom: $spacing-2xl;
}

.template-carousel__title {
  font-size: $font-size-3xl;
  font-weight: 700;
  color: $text-primary;
  margin-bottom: $spacing-sm;

  @include mobile {
    font-size: $font-size-2xl;
  }
}

.template-carousel__title-highlight {
  @include gradient-text;
}

.template-carousel__subtitle {
  font-size: $font-size-lg;
  color: $text-secondary;
}

.template-carousel__viewport {
  position: relative;
  display: flex;
  align-items: center;
  gap: $spacing-sm;
}

.carousel-track-wrapper {
  flex: 1;
  overflow: hidden;
  min-width: 0;
}

.carousel-track {
  display: flex;
  width: 100%;
}

.carousel-slide {
  flex: 0 0 auto;
  // 宽度由 visibleCount 动态控制，用 CSS 变量
  width: calc(100% / v-bind(visibleCount));
  padding: 0 $spacing-xs;
  box-sizing: border-box;
  min-height: 320px;
  display: flex;
  justify-content: center;
  overflow: hidden;

  @include mobile {
    min-height: 280px;
  }
}

// 箭头按钮
.carousel-arrow {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 1px solid $border-glass;
  background: $bg-glass;
  color: $text-secondary;
  cursor: pointer;
  transition: all $transition-fast;
  flex-shrink: 0;
  z-index: 2;

  &:hover {
    background: $bg-glass-hover;
    color: $primary-light;
    border-color: $primary-color;
  }

  @include mobile {
    width: 32px;
    height: 32px;
  }
}

// 导航圆点
.carousel-dots {
  display: flex;
  justify-content: center;
  gap: $spacing-xs;
  margin-top: $spacing-lg;
}

.carousel-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  border: none;
  background: $border-glass;
  cursor: pointer;
  transition: all $transition-fast;

  &--active {
    background: $primary-color;
    width: 24px;
    border-radius: $radius-full;
  }

  &:hover:not(&--active) {
    background: $text-light;
  }
}
</style>
