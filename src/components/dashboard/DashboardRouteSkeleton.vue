<template>
  <!--
    ponytail: Dashboard 路由级整页骨架。
    - 盖在 App.vue 顶层 RouteSkeletonOverlay 上（z-index 9998）
    - 布局对齐 DashboardView 的 SidebarNav + dashboard__content
    - 撤掉覆盖层后 DashboardView 的 storesReady DashboardSkeleton 接力，无需完全一致
    - shimmer 用 opacity 动画（composite-only），与 DashboardSkeleton 一致
  -->
  <div class="dashboard-route-skeleton">
    <!-- Header 条 -->
    <header class="drs-header">
      <div class="drs-header__left">
        <div class="drs-favicon" />
        <div class="drs-logo-text" />
        <div class="drs-nav-pills">
          <div class="drs-pill" style="width: 56px; height: 26px;" />
          <div class="drs-pill" style="width: 56px; height: 26px;" />
        </div>
      </div>
      <div class="drs-header__right">
        <div class="drs-pill drs-theme-btn" style="width: 36px; height: 36px;" />
      </div>
    </header>

    <!-- 主体：侧边栏 + 内容区 -->
    <div class="drs-body">
      <!-- 桌面端侧边栏 -->
      <aside class="drs-sidebar">
        <div
          v-for="i in 5"
          :key="i"
          class="drs-nav-item"
          :class="{ 'drs-nav-item--active': i === 1 }"
        >
          <div class="drs-icon" />
          <div class="drs-bar" :style="{ width: navWidths[i - 1] }" />
        </div>
      </aside>

      <!-- 内容区 -->
      <div class="drs-content">
        <div class="drs-content-inner">
          <!-- 标题 + 操作按钮 -->
          <div class="drs-toolbar">
            <div class="drs-bar drs-title" style="width: 160px; height: 28px;" />
            <span class="loading-text">加载中...</span>
            <div class="drs-actions">
              <div class="drs-pill drs-pill--accent" style="width: 96px; height: 34px;" />
              <div class="drs-pill" style="width: 96px; height: 34px;" />
            </div>
          </div>

          <!-- 搜索 + 排序工具栏 -->
          <div class="drs-filter-bar">
            <div class="drs-bar" style="width: 220px; height: 30px; border-radius: 6px;" />
            <div class="drs-bar" style="width: 120px; height: 30px; border-radius: 6px;" />
            <div class="drs-square" style="width: 30px; height: 30px;" />
          </div>

          <!-- 卡片网格 -->
          <div class="drs-grid">
            <div v-for="i in 6" :key="i" class="drs-card">
              <div class="drs-card__preview" />
              <div class="drs-card__info">
                <div class="drs-bar" style="width: 55%; height: 16px;" />
                <div class="drs-bar" style="width: 40%; height: 12px; margin-top: 8px;" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// ponytail: 侧边栏 nav 文字宽度，模拟真实标签长度
const navWidths = ['65%', '80%', '55%', '70%', '45%']
</script>

<style lang="scss" scoped>
// ponytail: opacity 动画（composite-only），省去 background-position repaint
@keyframes dashboard-route-shimmer {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 0.85; }
}

.dashboard-route-skeleton {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: $bg-secondary;
  overflow: hidden;
}

// ========== Header ==========
.drs-header {
  height: $header-height;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 $spacing-lg;
  background: var(--header-bg);
  border-bottom: 1px solid $border-glass;
  flex-shrink: 0;

  &__left,
  &__right {
    display: flex;
    align-items: center;
  }

  &__left {
    gap: $spacing-md;
  }

  &__right {
    gap: $spacing-sm;
  }
}

.drs-favicon {
  width: 28px;
  height: 28px;
  border-radius: $radius-sm;
  flex-shrink: 0;
}

.drs-logo-text {
  width: 100px;
  height: 20px;
  border-radius: $radius-sm;
}

.drs-nav-pills {
  display: flex;
  gap: 4px;
  margin-left: $spacing-sm;
}

.drs-theme-btn {
  border: 1px solid var(--border-color);
  opacity: 0.5;
}

// ========== 主体 ==========
.drs-body {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.drs-sidebar {
  flex-shrink: 0;
  width: 240px;
  background: var(--sidebar-bg);
  border-right: 1px solid $border-glass;
  display: flex;
  flex-direction: column;
  gap: $spacing-xs;
  padding: $spacing-lg $spacing-md;
  overflow: hidden;

  @include mobile {
    display: none;
  }
}

.drs-nav-item {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  padding: $spacing-sm $spacing-md;
  border-radius: $radius-md;
  border-left: 2px solid transparent;

  &--active {
    background: rgba($primary-color, 0.08);
    border-left-color: $primary-color;
  }
}

.drs-icon {
  width: 20px;
  height: 20px;
  border-radius: $radius-sm;
  flex-shrink: 0;
}

// ========== 内容区 ==========
.drs-content {
  flex: 1;
  min-width: 0;
  overflow-y: auto;
  position: relative;
  @include scrollbar;
}

.drs-content-inner {
  position: relative;
  z-index: 1;
  padding: $spacing-2xl;
  max-width: 1400px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: $spacing-xl;

  @include tablet {
    padding: $spacing-lg;
  }

  @include mobile {
    padding: $spacing-md;
  }
}

.drs-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: $spacing-md;
}

.drs-title {
  flex-shrink: 0;
}

.drs-actions {
  display: flex;
  gap: $spacing-sm;
}

.drs-filter-bar {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
}

.drs-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: $spacing-lg;

  @include tablet {
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: $spacing-md;
  }

  @include mobile {
    grid-template-columns: 1fr;
    gap: $spacing-md;
  }
}

.drs-card {
  border: 1px solid var(--border-color);
  border-radius: $radius-lg;
  overflow: hidden;
  background: var(--bg-primary);
}

.drs-card__preview {
  width: 100%;
  height: 220px;
  background: var(--bg-glass);

  @include mobile {
    height: 180px;
  }
}

.drs-card__info {
  padding: $spacing-md;
  display: flex;
  flex-direction: column;
}

// ========== 基础骨架元素 ==========
.drs-bar,
.drs-icon,
.drs-favicon,
.drs-logo-text {
  border-radius: $radius-sm;
  background: linear-gradient(90deg,
    var(--bg-glass) 25%,
    var(--bg-glass-hover) 50%,
    var(--bg-glass) 75%
  );
  animation: dashboard-route-shimmer 1.5s ease-in-out infinite;
}

.drs-pill {
  border-radius: 100px;
  background: linear-gradient(90deg,
    var(--bg-glass) 25%,
    var(--bg-glass-hover) 50%,
    var(--bg-glass) 75%
  );
  animation: dashboard-route-shimmer 1.5s ease-in-out infinite;
}

.drs-pill--accent {
  background: linear-gradient(90deg,
    rgba($primary-color, 0.15) 25%,
    rgba($primary-color, 0.25) 50%,
    rgba($primary-color, 0.15) 75%
  );
}

.drs-square {
  border-radius: $radius-sm;
  background: linear-gradient(90deg,
    var(--bg-glass) 25%,
    var(--bg-glass-hover) 50%,
    var(--bg-glass) 75%
  );
  animation: dashboard-route-shimmer 1.5s ease-in-out infinite;
}

.drs-card__preview {
  animation: dashboard-route-shimmer 1.5s ease-in-out infinite;
}
</style>
