<template>
  <!--
    ponytail: Templates 路由级整页骨架。
    - 盖在 App.vue 顶层 RouteSkeletonOverlay 上（z-index 9998）
    - 布局对齐 TemplatesView 的 templates-view__header + templates-view__grid
    - shimmer 用 opacity 动画（composite-only），与现有骨架屏一致
  -->
  <div class="templates-route-skeleton">
    <!-- 顶部导航 -->
    <header class="trs-header">
      <div class="trs-pill trs-back-btn" style="width: 80px; height: 32px;" />
      <div class="trs-bar trs-title" style="width: 100px; height: 21px;" />
      <div class="trs-pill trs-apply-btn" style="width: 96px; height: 34px;" />
    </header>

    <!-- 模板网格 -->
    <main class="trs-grid">
      <div v-for="i in 6" :key="i" class="trs-card">
        <div class="trs-card__preview" />
        <div class="trs-card__info">
          <div class="trs-bar" style="width: 60%; height: 16px;" />
          <div class="trs-bar" style="width: 40%; height: 12px; margin-top: 6px;" />
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
// 纯展示骨架，无逻辑
</script>

<style lang="scss" scoped>
// ponytail: opacity 动画（composite-only），省去 background-position repaint
@keyframes templates-route-shimmer {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 0.85; }
}

.templates-route-skeleton {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: $bg-primary;
  overflow: hidden;
}

// ========== Header ==========
.trs-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: $spacing-md $spacing-xl;
  background: var(--header-bg);
  border-bottom: 1px solid var(--border-light);
  flex-shrink: 0;
  z-index: 10;

  @include mobile {
    padding: $spacing-sm $spacing-md;
  }
}

.trs-title {
  flex-shrink: 0;
}

.trs-back-btn {
  border: 1px solid var(--border-glass);
  opacity: 0.5;
}

.trs-apply-btn {
  background: linear-gradient(90deg,
    rgba($primary-color, 0.4) 25%,
    rgba($primary-color, 0.6) 50%,
    rgba($primary-color, 0.4) 75%
  ) !important;
}

// ========== 模板网格 ==========
.trs-grid {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  grid-auto-rows: min-content;
  gap: $spacing-xl;
  padding: $spacing-xl;
  padding-bottom: $spacing-3xl;
  overflow-y: auto;
  align-content: start;
  @include scrollbar;

  @include tablet {
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: $spacing-md;
    padding: $spacing-lg;
  }

  @include mobile {
    grid-template-columns: 1fr;
    padding: $spacing-md;
    gap: $spacing-md;
  }
}

.trs-card {
  border: 1px solid var(--border-color);
  border-radius: $radius-lg;
  overflow: hidden;
  background: var(--bg-primary);
}

.trs-card__preview {
  width: 100%;
  height: 280px;
  background: var(--bg-glass);
  animation: templates-route-shimmer 1.5s ease-in-out infinite;
}

.trs-card__info {
  padding: $spacing-md;
  display: flex;
  flex-direction: column;
}

// ========== 基础骨架元素 ==========
.trs-bar {
  border-radius: $radius-sm;
  background: linear-gradient(90deg,
    var(--bg-glass) 25%,
    var(--bg-glass-hover) 50%,
    var(--bg-glass) 75%
  );
  animation: templates-route-shimmer 1.5s ease-in-out infinite;
}

.trs-pill {
  border-radius: 100px;
  background: linear-gradient(90deg,
    var(--bg-glass) 25%,
    var(--bg-glass-hover) 50%,
    var(--bg-glass) 75%
  );
  animation: templates-route-shimmer 1.5s ease-in-out infinite;
}
</style>
