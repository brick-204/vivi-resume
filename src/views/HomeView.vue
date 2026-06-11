<template>
  <div class="home">
    <!-- 流动光球背景 -->
    <div class="home__bg">
      <div class="orb orb--purple"></div>
      <div class="orb orb--cyan"></div>
      <div class="orb orb--pink"></div>
      <div class="orb orb--amber"></div>
      <!-- 网格线装饰 -->
      <div class="grid-overlay"></div>
    </div>

    <!-- 公共头部 -->
    <AppHeader />

    <!-- 主区域 -->
    <main class="home__main">
      <!-- Hero区域 -->
      <section class="hero">
        <div class="hero__content">
          <div class="hero__label">
            <span class="label__icon">
              <Icon icon="mdi:star" :width="16" />
            </span>
            打造令人印象深刻的个人简历
          </div>
          <h1 class="hero__title">
            <span class="hero__title-line">让每一次</span>
            <span class="hero__title-line">
              <span class="hero__title-highlight">机会</span>
              <span class="hero__title-line">触手可及</span>
            </span>
          </h1>
          <p class="hero__desc">
            简洁优雅的在线简历编辑器，帮助你展现最好的自己
          </p>
          <div class="hero__actions">
            <button class="action-btn action-btn--primary" @click="goToDashboard">
              <Icon icon="mdi:arrow-right" :width="20" />
              现在开始
            </button>
          </div>
        </div>
        <div class="hero__visual">
          <div class="hero__card hero__card--1">
            <div class="preview-card">
              <div class="preview-card__header">
                <div class="preview-card__avatar"></div>
                <div class="preview-card__info">
                  <span class="preview-card__name">张三</span>
                  <span class="preview-card__title">前端工程师</span>
                </div>
              </div>
              <div class="preview-card__skills">
                <span class="skill-tag">Vue</span>
                <span class="skill-tag">React</span>
                <span class="skill-tag">TypeScript</span>
              </div>
            </div>
          </div>
          <div class="hero__card hero__card--2">
            <div class="preview-card preview-card--accent">
              <div class="preview-card__header">
                <div class="preview-card__avatar"></div>
                <div class="preview-card__info">
                  <span class="preview-card__name">李四</span>
                  <span class="preview-card__title">产品经理</span>
                </div>
              </div>
              <div class="preview-card__skills">
                <span class="skill-tag">需求分析</span>
                <span class="skill-tag">项目管理</span>
              </div>
            </div>
          </div>
          <div class="hero__card hero__card--3">
            <div class="preview-card preview-card--secondary">
              <div class="preview-card__header">
                <div class="preview-card__avatar"></div>
                <div class="preview-card__info">
                  <span class="preview-card__name">王五</span>
                  <span class="preview-card__title">UX 设计师</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { Icon } from '@iconify/vue'
import AppHeader from '@/components/common/AppHeader.vue'

const router = useRouter()

const goToDashboard = () => {
  router.push({ name: 'dashboard' })
}
</script>

<style lang="scss" scoped>
.home {
  min-height: 100vh;
  background: $bg-secondary;
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

// 背景装饰
.home__bg {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}

.orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  animation: float 12s ease-in-out infinite;

  &--purple {
    width: 500px;
    height: 500px;
    background: radial-gradient(circle, rgba(124, 92, 252, 0.4) 0%, transparent 70%);
    top: -150px;
    right: -100px;
    animation-delay: 0s;
  }

  &--cyan {
    width: 400px;
    height: 400px;
    background: radial-gradient(circle, rgba(6, 182, 212, 0.35) 0%, transparent 70%);
    bottom: 10%;
    left: -100px;
    animation-delay: -3s;
  }

  &--pink {
    width: 300px;
    height: 300px;
    background: radial-gradient(circle, rgba(244, 114, 182, 0.25) 0%, transparent 70%);
    top: 40%;
    right: 5%;
    animation-delay: -6s;
  }

  &--amber {
    width: 250px;
    height: 250px;
    background: radial-gradient(circle, rgba(251, 191, 36, 0.2) 0%, transparent 70%);
    bottom: 30%;
    right: 30%;
    animation-delay: -9s;
  }
}

.grid-overlay {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px);
  background-size: 60px 60px;
}

// 主区域
.home__main {
  position: relative;
  z-index: 10;
  padding: $spacing-xl $spacing-2xl 20px;
  max-width: 1400px;
  margin: 0 auto;
  flex: 1;
}

// Hero区域
.hero {
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  gap: $spacing-3xl;
  align-items: center;
  padding: $spacing-2xl 0;

  @include tablet {
    grid-template-columns: 1fr;
    text-align: center;
  }
}

.hero__content {
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
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  border: 1px solid $border-glass;
  border-radius: $radius-full;
  font-size: $font-size-sm;
  color: $text-secondary;
  margin-bottom: $spacing-xl;
  @include animate-slide-up(0.1s);
}

.label__icon {
  display: flex;
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
}

.hero__title-highlight {
  @include gradient-text;
  font-weight: 800;
  position: relative;

  &::after {
    content: "";
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    height: 8px;
    background: linear-gradient(90deg, rgba(124, 92, 252, 0.3), rgba(6, 182, 212, 0.3));
    border-radius: $radius-full;
    z-index: -1;
  }
}

.hero__desc {
  font-size: $font-size-lg;
  color: $text-secondary;
  margin-bottom: $spacing-xl;
  max-width: 480px;
  line-height: 1.7;

  @include tablet {
    max-width: 100%;
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

.action-btn {
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
    background: $primary-gradient;
    color: $text-white;
    box-shadow: $shadow-primary, 0 0 40px rgba(124, 92, 252, 0.2);

    &:hover {
      transform: translateY(-3px) scale(1.02);
      box-shadow: 0 8px 32px rgba(124, 92, 252, 0.4), 0 0 60px rgba(124, 92, 252, 0.25);
    }
  }
}

// Hero视觉区域
.hero__visual {
  position: relative;
  height: 320px;

  @include tablet {
    display: none;
  }
}

.hero__card {
  position: absolute;
  transition: all $transition-spring;

  &--1 {
    top: 20px;
    left: 60px;
    transform: rotate(-6deg);
    animation: float 8s ease-in-out infinite;
  }

  &--2 {
    top: 70px;
    right: 30px;
    transform: rotate(4deg);
    animation: float 10s ease-in-out infinite;
    animation-delay: -2s;
  }

  &--3 {
    bottom: 30px;
    left: 20px;
    transform: rotate(2deg);
    animation: float 9s ease-in-out infinite;
    animation-delay: -4s;
  }

  &:hover {
    transform: rotate(0deg) translateY(-12px) scale(1.03);
    z-index: 10;
  }
}

.preview-card {
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
    background: linear-gradient(135deg, $primary-color, $secondary-color);
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
    border-color: rgba(244, 114, 182, 0.3);
    box-shadow: $shadow-md, 0 0 30px rgba(244, 114, 182, 0.1);

    .preview-card__avatar {
      background: linear-gradient(135deg, $accent-color, $accent-light);
    }
  }

  &--secondary {
    border-color: rgba(6, 182, 212, 0.3);
    box-shadow: $shadow-md, 0 0 30px rgba(6, 182, 212, 0.1);

    .preview-card__avatar {
      background: linear-gradient(135deg, $secondary-color, $secondary-light);
    }
  }
}

.skill-tag {
  padding: $spacing-xs $spacing-sm;
  background: rgba(124, 92, 252, 0.15);
  color: $primary-light;
  border: 1px solid rgba(124, 92, 252, 0.2);
  border-radius: $radius-full;
  font-size: $font-size-xs;
  font-weight: 500;
}
</style>
