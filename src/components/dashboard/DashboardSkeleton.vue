<template>
  <!--
    ponytail: Dashboard 内容区骨架屏。
    - 首屏 store 未就绪时由 DashboardView 直接渲染（整体等待，默认 resumes variant）
    - 各面板 defineAsyncComponent 的 loadingComponent 复用本组件（通过 variant prop 区分布局）
    - shimmer 用 opacity 动画（composite-only），与 EditorSkeleton 一致，避免 background-position repaint
  -->
  <div class="dashboard-skeleton">
    <!-- ========== resumes: header + toolbar + 卡片网格 ========== -->
    <template v-if="variant === 'resumes'">
      <div class="dashboard-skeleton__header">
        <div class="dashboard-skeleton__title-wrap">
          <div class="sk-bar sk-bar--lg" style="width: 160px; height: 28px;" />
          <span class="loading-text">加载中...</span>
        </div>
        <div class="dashboard-skeleton__actions">
          <div class="sk-pill sk-pill--accent" style="width: 96px; height: 34px;" />
          <div class="sk-pill" style="width: 96px; height: 34px;" />
        </div>
      </div>
      <div class="dashboard-skeleton__toolbar">
        <div class="sk-bar" style="width: 220px; height: 30px; border-radius: 6px;" />
        <div class="sk-bar" style="width: 120px; height: 30px; border-radius: 6px;" />
        <div class="sk-square" style="width: 30px; height: 30px;" />
      </div>
      <div class="dashboard-skeleton__grid">
        <div v-for="i in 6" :key="i" class="dashboard-skeleton__card">
          <div class="dashboard-skeleton__card-preview" />
          <div class="dashboard-skeleton__card-info">
            <div class="sk-bar" style="width: 55%; height: 16px;" />
            <div class="sk-bar" style="width: 40%; height: 12px; margin-top: 8px;" />
          </div>
        </div>
      </div>
    </template>

    <!-- ========== templates: header + 更高的卡片网格 ========== -->
    <template v-else-if="variant === 'templates'">
      <div class="dashboard-skeleton__header">
        <div class="dashboard-skeleton__title-wrap">
          <div class="sk-bar sk-bar--lg" style="width: 120px; height: 28px;" />
          <div class="sk-bar" style="width: 200px; height: 14px; margin-top: 4px;" />
        </div>
      </div>
      <div class="dashboard-skeleton__grid dashboard-skeleton__grid--templates">
        <div v-for="i in 6" :key="i" class="dashboard-skeleton__card">
          <div class="dashboard-skeleton__card-preview dashboard-skeleton__card-preview--tall" />
          <div class="dashboard-skeleton__card-info dashboard-skeleton__card-info--rich">
            <div class="sk-bar" style="width: 60%; height: 16px;" />
            <div class="sk-bar" style="width: 80%; height: 12px; margin-top: 6px;" />
            <div class="dashboard-skeleton__card-tags">
              <div class="sk-pill" style="width: 48px; height: 20px;" />
              <div class="sk-pill" style="width: 56px; height: 20px;" />
              <div class="sk-pill" style="width: 40px; height: 20px;" />
            </div>
            <div class="sk-pill sk-pill--accent" style="width: 80px; height: 28px; margin-top: 4px;" />
          </div>
        </div>
      </div>
    </template>

    <!-- ========== ai: 竖向横条列表 ========== -->
    <template v-else-if="variant === 'ai'">
      <div class="dashboard-skeleton__header">
        <div class="dashboard-skeleton__title-wrap">
          <div class="sk-bar sk-bar--lg" style="width: 120px; height: 28px;" />
          <div class="sk-pill sk-pill--accent" style="width: 24px; height: 20px;" />
        </div>
        <div class="dashboard-skeleton__actions">
          <div class="sk-pill sk-pill--accent" style="width: 120px; height: 34px;" />
          <div class="sk-pill" style="width: 96px; height: 34px;" />
        </div>
      </div>
      <div class="dashboard-skeleton__list">
        <div v-for="i in 3" :key="i" class="dashboard-skeleton__list-item dashboard-skeleton__list-item--ai">
          <div class="dashboard-skeleton__list-item-info">
            <div class="dashboard-skeleton__list-item-row">
              <div class="sk-bar" style="width: 100px; height: 16px;" />
              <div class="sk-pill" style="width: 56px; height: 20px;" />
            </div>
            <div class="dashboard-skeleton__list-item-details">
              <div class="sk-bar" style="width: 120px; height: 12px;" />
              <div class="sk-bar" style="width: 140px; height: 12px;" />
              <div class="sk-bar" style="width: 80px; height: 12px;" />
            </div>
          </div>
          <div class="dashboard-skeleton__list-item-actions">
            <div class="sk-pill" style="width: 56px; height: 26px;" />
            <div class="sk-pill" style="width: 56px; height: 26px;" />
            <div class="sk-pill" style="width: 56px; height: 26px;" />
          </div>
        </div>
      </div>
      <div class="dashboard-skeleton__notice">
        <div class="sk-square" style="width: 14px; height: 14px;" />
        <div class="sk-bar" style="width: 280px; height: 12px;" />
      </div>
    </template>

    <!-- ========== trash: 竖向横条列表（更简单） ========== -->
    <template v-else-if="variant === 'trash'">
      <div class="dashboard-skeleton__header dashboard-skeleton__header--glass">
        <div class="dashboard-skeleton__title-wrap">
          <div class="sk-bar sk-bar--lg" style="width: 80px; height: 24px;" />
          <div class="sk-pill sk-pill--accent" style="width: 24px; height: 20px;" />
        </div>
        <div class="dashboard-skeleton__actions">
          <div class="sk-pill sk-pill--danger" style="width: 100px; height: 28px;" />
        </div>
      </div>
      <div class="dashboard-skeleton__list dashboard-skeleton__list--trash">
        <div v-for="i in 3" :key="i" class="dashboard-skeleton__list-item dashboard-skeleton__list-item--trash">
          <div class="dashboard-skeleton__list-item-info">
            <div class="sk-bar" style="width: 60%; height: 16px;" />
            <div class="dashboard-skeleton__list-item-meta">
              <div class="sk-bar" style="width: 40%; height: 12px;" />
              <div class="sk-pill" style="width: 48px; height: 18px;" />
            </div>
          </div>
          <div class="dashboard-skeleton__list-item-actions">
            <div class="sk-pill sk-pill--success" style="width: 56px; height: 26px;" />
            <div class="sk-pill sk-pill--danger" style="width: 72px; height: 26px;" />
          </div>
        </div>
      </div>
    </template>

    <!-- ========== settings: 竖向堆叠分区 ========== -->
    <template v-else-if="variant === 'settings'">
      <div class="dashboard-skeleton__header">
        <div class="dashboard-skeleton__title-wrap">
          <div class="sk-bar sk-bar--lg" style="width: 80px; height: 28px;" />
        </div>
      </div>
      <div class="dashboard-skeleton__sections">
        <div v-for="i in 3" :key="i" class="dashboard-skeleton__section">
          <div class="dashboard-skeleton__section-title">
            <div class="sk-square" style="width: 20px; height: 20px;" />
            <div class="sk-bar" style="width: 100px; height: 16px;" />
          </div>
          <div class="sk-bar" style="width: 80%; height: 12px;" />
          <div class="sk-bar" style="width: 60%; height: 12px; margin-top: 4px;" />
          <div class="dashboard-skeleton__section-content">
            <div class="dashboard-skeleton__section-row">
              <div class="sk-bar" style="width: 60px; height: 12px;" />
              <div class="sk-square" style="width: 80px; height: 28px; border-radius: 6px;" />
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
// ponytail: variant prop 区分 5 种面板布局，默认 resumes
withDefaults(defineProps<{
  variant?: 'resumes' | 'templates' | 'ai' | 'trash' | 'settings'
}>(), {
  variant: 'resumes'
})
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

  // ========== Header ==========
  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: $spacing-md;

    &--glass {
      padding: $spacing-md $spacing-lg;
      background: var(--bg-glass);
      border-radius: $radius-lg;
      border: 1px solid $border-glass;
    }
  }

  &__title-wrap {
    display: flex;
    align-items: center;
    gap: $spacing-md;
  }

  &__actions {
    display: flex;
    gap: $spacing-sm;
  }

  // ========== Toolbar (resumes only) ==========
  &__toolbar {
    display: flex;
    align-items: center;
    gap: $spacing-sm;
  }

  // ========== Card Grid (resumes / templates) ==========
  &__grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: $spacing-lg;

    &--templates {
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    }
  }

  &__card {
    border: 1px solid var(--border-color);
    border-radius: $radius-lg;
    overflow: hidden;
    background: var(--bg-primary);

    &-preview {
      width: 100%;
      height: 220px;
      background: var(--bg-glass);

      &--tall {
        height: 400px;
      }
    }

    &-info {
      padding: $spacing-md;
      display: flex;
      flex-direction: column;

      &--rich {
        gap: $spacing-xs;
      }
    }

    &-tags {
      display: flex;
      gap: $spacing-xs;
      margin-top: $spacing-sm;
    }
  }

  // ========== List (ai / trash) ==========
  &__list {
    display: flex;
    flex-direction: column;
    gap: $spacing-sm;

    &--trash {
      flex: 1;
      overflow-y: auto;
      padding: $spacing-sm;
    }
  }

  &__list-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: $spacing-md $spacing-lg;
    background: var(--bg-glass);
    border-radius: $radius-md;
    border: 1px solid $border-glass;

    &--ai {
      flex-wrap: wrap;
      gap: $spacing-sm;
    }

    &-info {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: $spacing-xs;
    }

    &-row {
      display: flex;
      align-items: center;
      gap: $spacing-sm;
    }

    &-details {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    &-meta {
      display: flex;
      align-items: center;
      gap: $spacing-sm;
    }

    &-actions {
      display: flex;
      gap: $spacing-sm;
      flex-shrink: 0;
    }
  }

  // ========== Notice bar (ai) ==========
  &__notice {
    display: flex;
    align-items: center;
    gap: 4px;
    margin-top: $spacing-sm;
  }

  // ========== Sections (settings) ==========
  &__sections {
    max-width: 640px;
    display: flex;
    flex-direction: column;
    gap: $spacing-xl;
  }

  &__section {
    background: var(--bg-glass);
    border: 1px solid $border-glass;
    border-radius: $radius-lg;
    padding: $spacing-lg;
    display: flex;
    flex-direction: column;
    gap: $spacing-sm;

    &-title {
      display: flex;
      align-items: center;
      gap: $spacing-sm;
    }

    &-content {
      margin-top: $spacing-sm;
    }

    &-row {
      display: flex;
      align-items: center;
      gap: $spacing-md;
    }
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

  // ponytail: 语义色变体统一生成，避免重复 linear-gradient
  @each $name, $color in (
    'accent': $primary-color,
    'danger': $error-color,
    'success': $success-color,
  ) {
    &--#{$name} {
      background: linear-gradient(
        90deg,
        rgba($color, 0.12) 25%,
        rgba($color, 0.22) 50%,
        rgba($color, 0.12) 75%
      );
    }
  }
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

    &--templates {
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    }
  }
}

@include mobile {
  .dashboard-skeleton__grid {
    grid-template-columns: 1fr;
    gap: $spacing-md;

    &--templates {
      grid-template-columns: 1fr;
    }
  }

  .dashboard-skeleton__card-preview {
    height: 180px;

    &--tall {
      height: 280px;
    }
  }

  .dashboard-skeleton__list-item {
    flex-direction: column;
    align-items: flex-start;
    gap: $spacing-sm;

    &-actions {
      width: 100%;
      justify-content: flex-end;
    }
  }
}
</style>
