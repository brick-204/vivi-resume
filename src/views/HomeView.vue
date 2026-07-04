<template>
  <div class="home">
    <AppHeader />

    <HeroSection />

    <main id="main-content" class="home__content">
      <!-- ponytail: 轮播区最重（8 份简历），改异步加载 + 骨架屏，避免回首页卡顿 -->
      <AsyncTemplateCarousel />
      <AIDemoSection />
      <FeatureGrid />
      <CTASection />
    </main>
  </div>
</template>

<script setup lang="ts">
import { defineAsyncComponent } from 'vue'
import AppHeader from '@/components/common/AppHeader.vue'
import HeroSection from '@/components/home/HeroSection.vue'
import AIDemoSection from '@/components/home/AIDemoSection.vue'
import FeatureGrid from '@/components/home/FeatureGrid.vue'
import CTASection from '@/components/home/CTASection.vue'
import HomeSkeleton from '@/components/home/HomeSkeleton.vue'

// ponytail: TemplateCarousel 首屏渲染 8 份完整简历，最重；异步加载期间显示品牌色骨架屏
const AsyncTemplateCarousel = defineAsyncComponent({
  loader: () => import('@/components/home/TemplateCarousel.vue'),
  loadingComponent: HomeSkeleton,
  delay: 0,
})
</script>

<style lang="scss" scoped>
.home {
  min-height: 100vh;
  background: $bg-secondary;
  position: relative;
  display: flex;
  flex-direction: column;
}

.home__content {
  position: relative;
  z-index: 10;
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 $spacing-2xl;
  flex: 1;
  background: $bg-secondary;

  @include tablet {
    padding: 0 $spacing-lg;
  }

  @include mobile {
    padding: 0 $spacing-md;
  }
}
</style>
