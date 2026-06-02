<template>
  <div class="pro-section-header">
    <div class="pro-section-header__accent"></div>
    <div class="pro-section-header__bar">
      <h2 class="pro-section-header__title">{{ title }}</h2>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{ title: string }>()
</script>

<style lang="scss" scoped>
.pro-section-header {
  display: flex;
  margin-top: 16px;

  &__accent {
    width: 2.25pt;
    background: var(--t-accent, #000000);
    flex-shrink: 0;
  }

  &__bar {
    flex: 1;
    background: var(--t-pro-bar-bg, var(--t-accent, #000000));
    padding: 6px 14px;
    display: flex;
    align-items: center;
    min-height: 32px;
  }

  &__title {
    font-size: 13.5pt;
    font-weight: 700;
    color: var(--t-accent, #000000);
    margin: 0;
    letter-spacing: 0.02em;
    line-height: 1.4;
  }
}
</style>