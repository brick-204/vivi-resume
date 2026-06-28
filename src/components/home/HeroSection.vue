<template>
  <section class="hero">
    <div class="hero__bg" />
    <div class="hero__inner">
      <div class="hero__content">
        <div class="hero__label">
          <span class="hero__label-icon">
            <Icon icon="mdi:star-four-points" :width="16" />
          </span>
          AI 驱动的智能简历编辑器
        </div>
        <h1 class="hero__title">
          <span class="hero__title-line">让每一次</span>
          <span class="hero__title-line">
            <span class="hero__title-highlight">机会</span>触手可及
          </span>
        </h1>
        <p class="hero__desc">
          8 款精美模板 · AI 智能润色 · 智能导入 · 实时预览<br />
          帮你打造令人印象深刻的中文简历
        </p>
        <div class="hero__actions">
          <button class="hero__btn hero__btn--primary" @click="goToDashboard">
            <Icon icon="mdi:arrow-right" :width="20" />
            现在开始
          </button>
          <button class="hero__btn hero__btn--secondary" @click="scrollToFeatures">
            <Icon icon="mdi:information-outline" :width="18" />
            了解更多
          </button>
        </div>
      </div>
      <div class="hero__visual">
        <div class="hero__card hero__card--1">
          <div class="hero__preview-card">
            <div class="hero__preview-card__header">
              <img class="hero__preview-card__avatar" src="@/assets/images/Ez.png" alt="" />
              <div class="hero__preview-card__info">
                <span class="hero__preview-card__name">张三</span>
                <span class="hero__preview-card__title">前端工程师</span>
              </div>
            </div>
            <div class="hero__preview-card__skills">
              <span class="hero__skill-tag">Vue</span>
              <span class="hero__skill-tag">React</span>
              <span class="hero__skill-tag">TypeScript</span>
            </div>
          </div>
        </div>
        <div class="hero__card hero__card--2">
          <div class="hero__preview-card hero__preview-card--accent">
            <div class="hero__preview-card__header">
              <img class="hero__preview-card__avatar" src="@/assets/images/Timo.png" alt="" />
              <div class="hero__preview-card__info">
                <span class="hero__preview-card__name">李四</span>
                <span class="hero__preview-card__title">产品经理</span>
              </div>
            </div>
            <div class="hero__preview-card__skills">
              <span class="hero__skill-tag">需求分析</span>
              <span class="hero__skill-tag">项目管理</span>
            </div>
          </div>
        </div>
        <div class="hero__card hero__card--3">
          <div class="hero__preview-card hero__preview-card--secondary">
            <div class="hero__preview-card__header">
              <img class="hero__preview-card__avatar" src="@/assets/images/ElementalMaster.png" alt="" />
              <div class="hero__preview-card__info">
                <span class="hero__preview-card__name">王五</span>
                <span class="hero__preview-card__title">UX 设计师</span>
              </div>
            </div>
            <div class="hero__preview-card__skills">
              <span class="hero__skill-tag">Figma</span>
              <span class="hero__skill-tag">用户研究</span>
              <span class="hero__skill-tag">交互设计</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="hero__scroll-hint" @click="scrollToFeatures">
      <Icon icon="mdi:chevron-down" :width="24" />
    </div>
  </section>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const goToDashboard = () => {
  router.push({ name: 'dashboard' })
}

const scrollToFeatures = () => {
  // 滚动到下一个 section（模板轮播区）
  const el = document.querySelector('.template-carousel')
  if (el) {
    el.scrollIntoView({ behavior: 'smooth' })
  }
}
</script>

<style lang="scss" scoped>
.hero {
  position: relative;
  min-height: calc(100vh - #{$header-height});
  overflow: hidden;
  background: $bg-secondary;

  @include tablet {
    min-height: auto;
  }
}

// 内容居中容器（与 home__content 的 max-width 对齐）
.hero__inner {
  max-width: 1400px;
  margin: 0 auto;
  padding: $spacing-3xl $spacing-2xl;
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  gap: $spacing-3xl;
  align-items: center;

  @include tablet {
    grid-template-columns: 1fr;
    text-align: center;
    padding: $spacing-2xl $spacing-lg;
  }

  @include mobile {
    padding: $spacing-xl $spacing-md;
  }
}

// 动态渐变背景
.hero__bg {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, transparent 0%, rgba($primary-color, 0.04) 40%, rgba($accent-color, 0.03) 70%, transparent 100%);
  background-size: 200% 200%;
  animation: gradient-shift 10s ease infinite;
  pointer-events: none;
  z-index: 0;
}

@keyframes gradient-shift {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}

.hero__content {
  position: relative;
  z-index: 1;

  @include tablet {
    order: 1;
  }
}

.hero__label {
  display: inline-flex;
  align-items: center;
  gap: $spacing-sm;
  padding: $spacing-sm $spacing-lg;
  background: $bg-glass;
  border: 1px solid $border-glass;
  border-radius: $radius-full;
  font-size: $font-size-sm;
  color: $text-secondary;
  margin-bottom: $spacing-xl;
  @include animate-slide-up(0.1s);

  @include tablet {
    margin-left: auto;
    margin-right: auto;
  }
}

.hero__label-icon {
  display: flex;
  color: $primary-light;
}

.hero__title {
  margin-bottom: $spacing-lg;
  @include animate-slide-up(0.2s);
}

.hero__title-line {
  display: block;
  font-size: $font-size-4xl;
  color: $text-primary;
  font-weight: 600;
  line-height: 1.2;
  letter-spacing: -0.02em;

  @include mobile {
    font-size: $font-size-2xl;
  }
}

.hero__title-highlight {
  @include gradient-text;
  font-weight: 800;
}

.hero__desc {
  font-size: $font-size-lg;
  color: $text-secondary;
  margin-bottom: $spacing-2xl;
  max-width: 480px;
  line-height: 1.7;

  @include tablet {
    max-width: 100%;
    margin-left: auto;
    margin-right: auto;
  }

  @include animate-slide-up(0.3s);
}

.hero__actions {
  display: flex;
  gap: $spacing-md;

  @include tablet {
    justify-content: center;
  }

  @include animate-slide-up(0.4s);
}

.hero__btn {
  display: inline-flex;
  align-items: center;
  gap: $spacing-sm;
  padding: $spacing-md $spacing-xl;
  border-radius: $radius-lg;
  font-size: $font-size-md;
  font-weight: 600;
  cursor: pointer;
  transition: all $transition-base;
  border: none;
  font-family: $font-family;

  &--primary {
    background: $primary-color;
    color: $text-white;
    box-shadow: $shadow-sm;

    &:hover {
      background: $primary-light;
      box-shadow: $shadow-md;
      transform: translateY(-1px);
    }
  }

  &--secondary {
    background: $bg-glass;
    color: $text-secondary;
    border: 1px solid $border-glass;

    &:hover {
      background: $bg-glass-hover;
      border-color: $primary-color;
      color: $primary-light;
    }
  }
}

// 视觉区域
.hero__visual {
  position: relative;
  height: 340px;
  z-index: 1;

  @include tablet {
    display: none;
  }
}

.hero__card {
  position: absolute;
  transition: all $transition-spring;

  &--1 {
    top: 0;
    left: 60px;
    transform: rotate(-4deg);
  }

  &--2 {
    top: 70px;
    right: 30px;
    transform: rotate(4deg);
  }

  &--3 {
    bottom: 30px;
    left: 20px;
    transform: rotate(2deg);
  }

  &:hover {
    transform: rotate(0deg) translateY(-8px);
    z-index: 10;
  }
}

.hero__preview-card {
  @include glass-card;
  width: 240px;

  &__header {
    display: flex;
    align-items: center;
    gap: $spacing-md;
    margin-bottom: $spacing-md;
  }

  &__avatar {
    width: 44px;
    height: 44px;
    border-radius: $radius-lg;
    object-fit: cover;
  }

  &__info {
    display: flex;
    flex-direction: column;
  }

  &__name {
    font-size: $font-size-md;
    font-weight: 700;
    color: $text-primary;
  }

  &__title {
    font-size: $font-size-xs;
    color: $text-secondary;
  }

  &__skills {
    display: flex;
    flex-wrap: wrap;
    gap: $spacing-xs;
  }

  &--accent {
    border-color: $accent-color;
    box-shadow: $shadow-md;
  }

  &--secondary {
    border-color: $secondary-color;
    box-shadow: $shadow-md;
  }
}

.hero__skill-tag {
  padding: $spacing-xs $spacing-sm;
  background: $bg-glass;
  color: $primary-color;
  border: 1px solid $border-glass;
  border-radius: $radius-full;
  font-size: $font-size-xs;
  font-weight: 500;
}

// 滚动提示
.hero__scroll-hint {
  position: absolute;
  bottom: $spacing-lg;
  left: 50%;
  transform: translateX(-50%);
  color: $text-light;
  cursor: pointer;
  animation: bounce-down 2s ease infinite;
  z-index: 1;

  @include tablet {
    position: relative;
    bottom: auto;
    left: auto;
    transform: none;
    margin-top: $spacing-xl;
  }
}

@keyframes bounce-down {
  0%, 20%, 50%, 80%, 100% { transform: translateX(-50%) translateY(0); }
  40% { transform: translateX(-50%) translateY(8px); }
  60% { transform: translateX(-50%) translateY(4px); }
}
</style>
