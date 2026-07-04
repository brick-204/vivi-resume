<template>
  <!--
    ponytail: 首页轮播区异步加载时的骨架屏。
    - TemplateCarousel defineAsyncComponent 的 loadingComponent 复用本组件
    - shimmer 用 opacity 动画（composite-only），与 DashboardSkeleton 一致，避免 background-position repaint
    - 渐变用 rgba($primary-color, ...) 实现品牌色流光，浅/深主题下均可见
  -->
  <section class="home-skeleton" aria-hidden="true">
    <!-- 轮播区标题 -->
    <div class="home-skeleton__header">
      <div class="sk-bar sk-bar--xl" style="width: 200px; height: 32px;" />
      <div class="sk-bar" style="width: 220px; height: 18px; margin: 8px auto 0;" />
    </div>

    <!-- 轮播卡片 3 连排 -->
    <div class="home-skeleton__carousel">
      <div v-for="i in 3" :key="i" class="home-skeleton__slide">
        <div class="home-skeleton__slide-preview" />
        <div class="home-skeleton__slide-name" />
      </div>
    </div>

    <!-- 导航圆点 -->
    <div class="home-skeleton__dots">
      <div class="home-skeleton__dot" />
      <div class="home-skeleton__dot home-skeleton__dot--active" />
      <div class="home-skeleton__dot" />
    </div>
  </section>
</template>

<script setup lang="ts">
// 纯展示骨架，无逻辑
</script>

<style lang="scss" scoped>
// ponytail: opacity 动画（composite-only），省去 background-position repaint
@keyframes home-shimmer {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 0.85; }
}

.home-skeleton {
  padding: $spacing-3xl 0;
}

.home-skeleton__header {
  text-align: center;
  margin-bottom: $spacing-2xl;
}

.home-skeleton__carousel {
  display: flex;
  gap: $spacing-xs;
  align-items: stretch;
}

.home-skeleton__slide {
  flex: 0 0 calc(100% / 3);
  padding: 0 $spacing-xs;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.home-skeleton__slide-preview {
  width: 100%;
  height: 360px;
  border-radius: $radius-sm;
  background: linear-gradient(
    90deg,
    rgba($primary-color, 0.10) 25%,
    rgba($primary-color, 0.20) 50%,
    rgba($primary-color, 0.10) 75%
  );
  animation: home-shimmer 1.5s ease-in-out infinite;

  @include mobile {
    height: 300px;
  }
}

.home-skeleton__slide-name {
  width: 80px;
  height: 16px;
  margin-top: $spacing-md;
  border-radius: $radius-sm;
  background: linear-gradient(
    90deg,
    var(--bg-glass) 25%,
    var(--bg-glass-hover) 50%,
    var(--bg-glass) 75%
  );
  animation: home-shimmer 1.5s ease-in-out infinite;
}

.home-skeleton__dots {
  display: flex;
  justify-content: center;
  gap: $spacing-xs;
  margin-top: $spacing-lg;
}

.home-skeleton__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--bg-glass);
  animation: home-shimmer 1.5s ease-in-out infinite;

  &--active {
    width: 24px;
    border-radius: $radius-full;
    background: linear-gradient(
      90deg,
      rgba($primary-color, 0.4) 25%,
      rgba($primary-color, 0.6) 50%,
      rgba($primary-color, 0.4) 75%
    );
  }
}

// ========== 基础骨架块 ==========
.sk-bar {
  background: linear-gradient(
    90deg,
    rgba($primary-color, 0.10) 25%,
    rgba($primary-color, 0.20) 50%,
    rgba($primary-color, 0.10) 75%
  );
  border-radius: $radius-sm;
  animation: home-shimmer 1.5s ease-in-out infinite;
}

.sk-bar--xl {
  margin: 0 auto;
}

@include tablet {
  .home-skeleton__carousel {
    // 平板 2 列：隐藏第 3 个
    .home-skeleton__slide:nth-child(3) {
      display: none;
    }
    .home-skeleton__slide {
      flex-basis: calc(100% / 2);
    }
  }
}

@include mobile {
  .home-skeleton__carousel {
    .home-skeleton__slide:nth-child(2),
    .home-skeleton__slide:nth-child(3) {
      display: none;
    }
    .home-skeleton__slide {
      flex-basis: 100%;
    }
  }
}
</style>
