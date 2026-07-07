<template>
  <!--
    ponytail: Home 路由级整页骨架。
    - 盖在 App.vue 顶层 RouteSkeletonOverlay 上（z-index 9998）
    - 覆盖所有内容区（Hero + 轮播 + AIDemo + FeatureGrid + CTA）
    - 布局对齐 HomeView 的 HeroSection + home__content，确保撤掉覆盖层后无明显跳动
    - shimmer 用 opacity 动画（composite-only），与现有骨架屏一致，避免 background-position repaint
  -->
  <div class="home-route-skeleton">
    <!-- Header 条（复用 AppHeader 的 3 部分结构） -->
    <header class="hrs-header">
      <div class="hrs-header__left">
        <div class="hrs-favicon" />
        <div class="hrs-logo-text" />
        <div class="hrs-nav-pills">
          <div class="hrs-pill" style="width: 56px; height: 26px;" />
          <div class="hrs-pill" style="width: 56px; height: 26px;" />
        </div>
      </div>
      <div class="hrs-header__center">
        <span class="loading-text">加载中...</span>
      </div>
      <div class="hrs-header__right">
        <div class="hrs-pill hrs-theme-btn" style="width: 36px; height: 36px;" />
      </div>
    </header>

    <!-- Hero 区骨架 -->
    <section class="hrs-hero">
      <div class="hrs-hero__bg" />
      <div class="hrs-hero__inner">
        <div class="hrs-hero__content">
          <div class="hrs-bar hrs-hero__label" style="width: 180px; height: 16px;" />
          <div class="hrs-bar hrs-hero__title" style="width: 240px; height: 28px;" />
          <div class="hrs-bar hrs-hero__title" style="width: 200px; height: 24px;" />
          <div class="hrs-bar hrs-hero__desc" style="width: 80%; height: 16px;" />
          <div class="hrs-hero__actions">
            <div class="hrs-pill hrs-hero__btn hrs-hero__btn--primary" style="width: 120px; height: 40px;" />
            <div class="hrs-pill hrs-hero__btn hrs-hero__btn--secondary" style="width: 120px; height: 40px;" />
          </div>
        </div>
        <div class="hrs-hero__visual">
          <div class="hrs-hero__card" />
        </div>
      </div>
    </section>

    <!-- 内容区 -->
    <main class="hrs-content">
      <!-- 轮播区 -->
      <div class="hrs-carousel">
        <div class="hrs-carousel__header">
          <div class="hrs-bar" style="width: 160px; height: 28px; margin: 0 auto;" />
          <div class="hrs-bar" style="width: 140px; height: 14px; margin: 8px auto 0;" />
        </div>
        <div v-for="i in 3" :key="i" class="hrs-carousel__slide">
          <div class="hrs-carousel__preview" />
          <div class="hrs-bar hrs-carousel__name" style="width: 80px; height: 14px;" />
        </div>
        <div class="hrs-carousel__dots">
          <div class="hrs-dot" />
          <div class="hrs-dot hrs-dot--active" />
          <div class="hrs-dot" />
        </div>
      </div>

      <!-- AI Demo 区 -->
      <div class="hrs-ai-demo">
        <div class="hrs-ai-demo__header">
          <div class="hrs-bar" style="width: 120px; height: 24px;" />
          <div class="hrs-bar" style="width: 80px; height: 14px;" />
        </div>
        <div class="hrs-ai-demo__tabs">
          <div v-for="i in 7" :key="i" class="hrs-pill" :style="{ width: tabWidths[i - 1], height: '28px' }" />
        </div>
        <div class="hrs-ai-demo__content">
          <div class="hrs-bar" style="width: 60%; height: 14px;" />
          <div class="hrs-bar" style="width: 80%; height: 14px; margin-top: 12px;" />
          <div class="hrs-bar" style="width: 45%; height: 14px; margin-top: 12px;" />
        </div>
      </div>

      <!-- Feature Grid 区 -->
      <div class="hrs-features">
        <div class="hrs-features__header">
          <div class="hrs-bar" style="width: 100px; height: 24px;" />
          <div class="hrs-bar" style="width: 160px; height: 14px;" />
        </div>
        <div class="hrs-features__grid">
          <div v-for="i in 8" :key="i" class="hrs-feature-card">
            <div class="hrs-feature-card__icon" />
            <div class="hrs-bar" style="width: 60%; height: 12px;" />
            <div class="hrs-bar" style="width: 80%; height: 10px; margin-top: 4px;" />
          </div>
        </div>
      </div>

      <!-- CTA 区 -->
      <div class="hrs-cta">
        <div class="hrs-bar" style="width: 200px; height: 24px;" />
        <div class="hrs-bar" style="width: 160px; height: 14px;" />
        <div class="hrs-pill hrs-pill--primary" style="width: 120px; height: 40px;" />
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
// ponytail: 7 个 AI Demo tab 宽度，模拟真实标签长度
const tabWidths = ['72px', '80px', '72px', '72px', '72px', '72px', '88px']
</script>

<style lang="scss" scoped>
// ponytail: opacity 动画（composite-only），省去 background-position repaint
@keyframes home-route-shimmer {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 0.85; }
}

.home-route-skeleton {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: $bg-secondary;
}

// ========== Header ==========
.hrs-header {
  height: $header-height;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 $spacing-lg;
  background: var(--header-bg);
  border-bottom: 1px solid $border-glass;
  flex-shrink: 0;

  &__left,
  &__center,
  &__right {
    display: flex;
    align-items: center;
  }

  &__left {
    gap: $spacing-md;
  }

  &__nav-pills {
    display: flex;
    gap: 4px;
    margin-left: $spacing-sm;
  }

  &__center {
    gap: $spacing-sm;
  }

  &__right {
    gap: $spacing-sm;
  }
}

.hrs-favicon {
  width: 28px;
  height: 28px;
  border-radius: $radius-sm;
  flex-shrink: 0;
}

.hrs-logo-text {
  width: 100px;
  height: 20px;
  border-radius: $radius-sm;
}

.hrs-theme-btn {
  border: 1px solid var(--border-color);
  opacity: 0.5;
}

// ========== Hero 区 ==========
.hrs-hero {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: calc(100vh - #{$header-height});
  position: relative;
  overflow: hidden;
  background: $bg-secondary;

  @include tablet {
    min-height: auto;
  }

  &__bg {
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, rgba($primary-color, 0.04) 0%, rgba($primary-color, 0.02) 100%);
    pointer-events: none;
    z-index: 0;
  }

  &__inner {
    max-width: 1400px;
    width: 100%;
    margin: 0 auto;
    padding: $spacing-3xl $spacing-2xl;
    display: grid;
    grid-template-columns: 1.2fr 1fr;
    gap: $spacing-3xl;
    align-items: center;
    position: relative;
    z-index: 1;

    @include tablet {
      grid-template-columns: 1fr;
      text-align: center;
      padding: $spacing-2xl $spacing-lg;
    }

    @include mobile {
      padding: $spacing-xl $spacing-md;
    }
  }

  &__content {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: $spacing-md;

    @include tablet {
      order: 1;
      align-items: center;
    }
  }

  &__visual {
    display: flex;
    justify-content: center;

    @include tablet {
      order: 0;
    }
  }

  &__card {
    width: 280px;
    height: 200px;
    border-radius: $radius-lg;
    background: linear-gradient(90deg,
      rgba($primary-color, 0.10) 25%,
      rgba($primary-color, 0.20) 50%,
      rgba($primary-color, 0.10) 75%
    );
    animation: home-route-shimmer 1.5s ease-in-out infinite;
  }

  &__actions {
    display: flex;
    gap: $spacing-sm;
    margin-top: $spacing-sm;
  }
}

.hrs-hero__btn {
  border: none;

  &--primary {
    background: linear-gradient(90deg,
      rgba($primary-color, 0.4) 25%,
      rgba($primary-color, 0.6) 50%,
      rgba($primary-color, 0.4) 75%
    ) !important;
  }

  &--secondary {
    background: transparent;
    border: 1px solid var(--border-color);
    opacity: 0.5;
  }
}

// ========== 内容区 ==========
.hrs-content {
  max-width: 1400px;
  width: 100%;
  margin: 0 auto;
  padding: 0 $spacing-2xl $spacing-3xl;
  display: flex;
  flex-direction: column;
  gap: $spacing-3xl;

  @include tablet {
    padding: 0 $spacing-lg $spacing-2xl;
  }

  @include mobile {
    padding: 0 $spacing-md $spacing-xl;
  }
}

.hrs-carousel {
  &__header {
    text-align: center;
    margin-bottom: $spacing-2xl;
  }

  display: flex;
  gap: $spacing-xs;
  align-items: stretch;

  @include tablet {
    .hrs-carousel__slide:nth-child(3) {
      display: none;
    }
    .hrs-carousel__slide {
      flex-basis: calc(100% / 2);
    }
  }

  @include mobile {
    .hrs-carousel__slide:nth-child(2),
    .hrs-carousel__slide:nth-child(3) {
      display: none;
    }
    .hrs-carousel__slide {
      flex-basis: 100%;
    }
  }
}

.hrs-carousel__slide {
  flex: 0 0 calc(100% / 3);
  padding: 0 $spacing-xs;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.hrs-carousel__preview {
  width: 100%;
  height: 360px;
  border-radius: $radius-sm;
  background: linear-gradient(90deg,
    rgba($primary-color, 0.10) 25%,
    rgba($primary-color, 0.20) 50%,
    rgba($primary-color, 0.10) 75%
  );
  animation: home-route-shimmer 1.5s ease-in-out infinite;

  @include mobile {
    height: 300px;
  }
}

.hrs-carousel__name {
  margin-top: $spacing-md;
}

.hrs-carousel__dots {
  display: flex;
  justify-content: center;
  gap: $spacing-xs;
  margin-top: $spacing-lg;
  width: 100%;
}

.hrs-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--bg-glass);
  animation: home-route-shimmer 1.5s ease-in-out infinite;

  &--active {
    width: 24px;
    border-radius: $radius-full;
    background: linear-gradient(90deg,
      rgba($primary-color, 0.4) 25%,
      rgba($primary-color, 0.6) 50%,
      rgba($primary-color, 0.4) 75%
    );
  }
}

// ========== AI Demo 区 ==========
.hrs-ai-demo {
  display: flex;
  flex-direction: column;
  gap: $spacing-lg;

  &__header {
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: $spacing-xs;
  }

  &__tabs {
    display: flex;
    justify-content: center;
    flex-wrap: wrap;
    gap: $spacing-xs;
  }

  &__content {
    padding: $spacing-lg;
    background: var(--bg-glass);
    border: 1px solid $border-glass;
    border-radius: $radius-lg;
  }
}

// ========== Feature Grid 区 ==========
.hrs-features {
  display: flex;
  flex-direction: column;
  gap: $spacing-xl;

  &__header {
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: $spacing-xs;
  }

  &__grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: $spacing-md;

    @include tablet {
      grid-template-columns: repeat(2, 1fr);
    }

    @include mobile {
      grid-template-columns: 1fr;
    }
  }
}

.hrs-feature-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: $spacing-md;
  background: var(--bg-glass);
  border: 1px solid $border-glass;
  border-radius: $radius-lg;
  gap: $spacing-xs;

  &__icon {
    width: 56px;
    height: 56px;
    border-radius: $radius-md;
    background: linear-gradient(90deg,
      rgba($primary-color, 0.10) 25%,
      rgba($primary-color, 0.20) 50%,
      rgba($primary-color, 0.10) 75%
    );
    animation: home-route-shimmer 1.5s ease-in-out infinite;
  }
}

// ========== CTA 区 ==========
.hrs-cta {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: $spacing-md;
  padding: $spacing-3xl 0;
}

// ========== 基础骨架元素 ==========
.hrs-bar {
  border-radius: $radius-sm;
  background: linear-gradient(90deg,
    var(--bg-glass) 25%,
    var(--bg-glass-hover) 50%,
    var(--bg-glass) 75%
  );
  animation: home-route-shimmer 1.5s ease-in-out infinite;
}

.hrs-pill {
  border-radius: 100px;
  background: linear-gradient(90deg,
    var(--bg-glass) 25%,
    var(--bg-glass-hover) 50%,
    var(--bg-glass) 75%
  );
  animation: home-route-shimmer 1.5s ease-in-out infinite;

  &--primary {
    background: linear-gradient(90deg,
      rgba($primary-color, 0.4) 25%,
      rgba($primary-color, 0.6) 50%,
      rgba($primary-color, 0.4) 75%
    ) !important;
  }
}

// favicon / logo 文字也走 shimmer
.hrs-favicon,
.hrs-logo-text {
  background: linear-gradient(90deg,
    var(--bg-glass) 25%,
    var(--bg-glass-hover) 50%,
    var(--bg-glass) 75%
  );
  animation: home-route-shimmer 1.5s ease-in-out infinite;
}
</style>
