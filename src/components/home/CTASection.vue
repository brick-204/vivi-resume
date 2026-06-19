<template>
  <section class="cta-section">
    <div class="cta-section__bg" />
    <div class="cta-section__content">
      <h2 class="cta-section__title">
        开始打造你的<span class="cta-section__highlight">完美简历</span>
      </h2>
      <p class="cta-section__desc">
        免费使用，无需注册，数据安全存储在本地
      </p>
      <button class="cta-section__btn" @click="goToDashboard">
        <Icon icon="mdi:arrow-right" :width="20" />
        现在开始
      </button>
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
</script>

<style lang="scss" scoped>
.cta-section {
  position: relative;
  padding: $spacing-3xl 0;
  text-align: center;
  overflow: hidden;
}

.cta-section__bg {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba($primary-color, 0.06) 0%, rgba($accent-color, 0.04) 50%, rgba($primary-color, 0.06) 100%);
  border-radius: $radius-lg;
  pointer-events: none;
}

.cta-section__content {
  position: relative;
  z-index: 1;
  padding: $spacing-3xl $spacing-xl;
}

.cta-section__title {
  font-size: $font-size-3xl;
  font-weight: 700;
  color: $text-primary;
  margin-bottom: $spacing-md;

  @include mobile {
    font-size: $font-size-2xl;
  }
}

.cta-section__highlight {
  @include gradient-text;
}

.cta-section__desc {
  font-size: $font-size-lg;
  color: $text-secondary;
  margin-bottom: $spacing-2xl;
}

.cta-section__btn {
  display: inline-flex;
  align-items: center;
  gap: $spacing-sm;
  padding: $spacing-md $spacing-2xl;
  border-radius: $radius-lg;
  font-size: $font-size-lg;
  font-weight: 600;
  cursor: pointer;
  transition: all $transition-base;
  border: none;
  font-family: $font-family;
  background: $primary-color;
  color: $text-white;
  box-shadow: $shadow-md;
  animation: pulse-glow 2s ease infinite;

  &:hover {
    background: $primary-light;
    box-shadow: $shadow-xl;
    transform: translateY(-2px);
  }
}
</style>
