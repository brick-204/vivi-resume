<template>
  <!--
    ponytail: Dashboard 内容区骨架屏。
    - 首屏 store 未就绪时由 DashboardView 直接渲染（整体等待）
    - 各面板 defineAsyncComponent 的 loadingComponent 复用本组件（tab 首次加载）
    shimmer 用 opacity 动画（composite-only），与 EditorSkeleton 一致，避免 background-position repaint
  -->
  <div class="dashboard-skeleton">
    <!-- 顶部标题 + 操作按钮 -->
    <div class="dashboard-skeleton__header">
      <div class="sk-bar sk-bar--lg" style="width: 160px; height: 28px;" />
      <div class="dashboard-skeleton__actions">
        <div class="sk-pill sk-pill--accent" style="width: 96px; height: 34px;" />
        <div class="sk-pill" style="width: 96px; height: 34px;" />
      </div>
    </div>

    <!-- 工具栏（搜索 + 排序） -->
    <div class="dashboard-skeleton__toolbar">
      <div class="sk-bar" style="width: 220px; height: 30px; border-radius: 6px;" />
      <div class="sk-bar" style="width: 120px; height: 30px; border-radius: 6px;" />
      <div class="sk-square" style="width: 30px; height: 30px;" />
    </div>

    <!-- 卡片网格 -->
    <div class="dashboard-skeleton__grid">
      <div v-for="i in 6" :key="i" class="dashboard-skeleton__card">
        <div class="dashboard-skeleton__card-preview" />
        <div class="dashboard-skeleton__card-info">
          <div class="sk-bar" style="width: 55%; height: 16px;" />
          <div class="sk-bar" style="width: 40%; height: 12px; margin-top: 8px;" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// 纯展示骨架，无逻辑
</script>

<style lang="scss" scoped>
// ponytail: opacity 动画（composite-only），省去 background-position repaint（K）
@keyframes dashboard-shimmer {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 0.85; }
}

.dashboard-skeleton {
  display: flex;
  flex-direction: column;
  gap: $spacing-xl;

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: $spacing-md;
  }

  &__actions {
    display: flex;
    gap: $spacing-sm;
  }

  &__toolbar {
    display: flex;
    align-items: center;
    gap: $spacing-sm;
  }

  &__grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: $spacing-lg;
  }

  &__card {
    border: 1px solid var(--border-color);
    border-radius: $radius-lg;
    overflow: hidden;
    background: var(--bg-primary);
  }

  &__card-preview {
    width: 100%;
    height: 220px;
    background: var(--bg-glass);
  }

  &__card-info {
    padding: $spacing-md;
    display: flex;
    flex-direction: column;
  }
}

// ========== 基础骨架块 ==========
.sk-bar {
  background: linear-gradient(
    90deg,
    var(--bg-glass) 25%,
    var(--bg-glass-hover) 50%,
    var(--bg-glass) 75%
  );
  border-radius: $radius-sm;
  animation: dashboard-shimmer 1.5s ease-in-out infinite;
}

.sk-pill {
  border-radius: 100px;
  background: linear-gradient(
    90deg,
    var(--bg-glass) 25%,
    var(--bg-glass-hover) 50%,
    var(--bg-glass) 75%
  );
  animation: dashboard-shimmer 1.5s ease-in-out infinite;
}

.sk-pill--accent {
  background: linear-gradient(
    90deg,
    rgba($primary-color, 0.15) 25%,
    rgba($primary-color, 0.25) 50%,
    rgba($primary-color, 0.15) 75%
  );
}

.sk-square {
  border-radius: $radius-sm;
  background: linear-gradient(
    90deg,
    var(--bg-glass) 25%,
    var(--bg-glass-hover) 50%,
    var(--bg-glass) 75%
  );
  animation: dashboard-shimmer 1.5s ease-in-out infinite;
}

// 响应式
@include tablet {
  .dashboard-skeleton__grid {
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: $spacing-md;
  }
}

@include mobile {
  .dashboard-skeleton__grid {
    grid-template-columns: 1fr;
    gap: $spacing-md;
  }

  .dashboard-skeleton__card-preview {
    height: 180px;
  }
}
</style>
