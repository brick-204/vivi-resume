<template>
  <div class="home">
    <AppHeader />

    <HeroSection />

    <main class="home__content">
      <TemplateCarousel />
      <AIDemoSection />
      <FeatureGrid />
      <CTASection />
    </main>
  </div>
</template>

<script setup lang="ts">
import AppHeader from '@/components/common/AppHeader.vue'
import HeroSection from '@/components/home/HeroSection.vue'
import TemplateCarousel from '@/components/home/TemplateCarousel.vue'
import AIDemoSection from '@/components/home/AIDemoSection.vue'
import FeatureGrid from '@/components/home/FeatureGrid.vue'
import CTASection from '@/components/home/CTASection.vue'
</script>

<style lang="scss" scoped>
.home {
  min-height: 100vh;
  background: $bg-secondary;
  position: relative;
  overflow-x: hidden;
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
