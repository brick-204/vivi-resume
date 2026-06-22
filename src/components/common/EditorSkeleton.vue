<template>
  <div class="editor-skeleton">
    <!-- Header 骨架 -->
    <header class="editor-skeleton__header">
      <div class="sk-header__left">
        <div class="skeleton-circle" style="width: 28px; height: 28px;" />
        <div class="skeleton-bar" style="width: 100px; height: 20px;" />
        <div class="sk-header__nav-pills">
          <div class="skeleton-pill" style="width: 56px; height: 26px;" />
          <div class="skeleton-pill" style="width: 56px; height: 26px;" />
        </div>
      </div>
      <div class="sk-header__center">
        <div class="skeleton-bar" style="width: 180px; height: 28px; border-radius: 8px;" />
        <div class="skeleton-pill" style="width: 48px; height: 18px;" />
      </div>
      <div class="sk-header__right">
        <div class="skeleton-pill sk-btn" style="width: 72px; height: 28px;" />
        <div class="skeleton-pill sk-btn" style="width: 64px; height: 28px;" />
        <div class="skeleton-pill sk-btn" style="width: 64px; height: 28px;" />
        <div class="skeleton-pill sk-btn" style="width: 64px; height: 28px;" />
        <div class="skeleton-pill sk-btn--accent" style="width: 56px; height: 28px;" />
        <div class="skeleton-circle sk-theme-btn" style="width: 36px; height: 36px;" />
      </div>
    </header>

    <!-- 主体三列骨架 -->
    <main class="editor-skeleton__body">
      <!-- 导航列 -->
      <aside
        class="editor-skeleton__nav"
        :style="{ width: layoutStore.navCollapsed ? '48px' : layoutStore.navWidth + 'px' }"
      >
        <div
          v-for="(item, i) in navItems"
          :key="i"
          class="sk-nav-item"
          :class="{ 'sk-nav-item--active': i === 0 }"
          :style="{ animationDelay: `${i * 0.06}s` }"
        >
          <div class="skeleton-circle" style="width: 16px; height: 16px;" />
          <div v-if="!layoutStore.navCollapsed" class="skeleton-bar" :style="{ width: item.barWidth }" />
        </div>
      </aside>

      <!-- 编辑列 -->
      <aside
        class="editor-skeleton__editor"
        :style="{ width: layoutStore.editorWidth + 'px' }"
      >
        <!-- 头像 + 基本信息 -->
        <div class="sk-card" style="animation-delay: 0.1s;">
          <div class="sk-card__header">
            <div class="skeleton-bar" style="width: 35%; height: 16px;" />
          </div>
          <div class="sk-card__body">
            <div class="sk-photo-row">
              <div class="skeleton-circle" style="width: 56px; height: 56px;" />
              <div class="sk-photo-actions">
                <div class="skeleton-circle" style="width: 20px; height: 20px;" />
                <div class="skeleton-circle" style="width: 20px; height: 20px;" />
              </div>
            </div>
            <div class="sk-field-grid">
              <div class="sk-field" v-for="i in 4" :key="i">
                <div class="skeleton-bar" style="width: 40px; height: 12px;" />
                <div class="skeleton-bar" :style="{ width: fieldWidths[i - 1], height: '28px', borderRadius: '6px' }" />
              </div>
            </div>
          </div>
        </div>

        <!-- 工作经历卡片 -->
        <div class="sk-card" style="animation-delay: 0.2s;">
          <div class="sk-card__header">
            <div class="skeleton-bar" style="width: 45%; height: 16px;" />
          </div>
          <div class="sk-card__body">
            <div class="sk-entry" v-for="i in 2" :key="i">
              <div class="skeleton-bar" style="width: 60%; height: 14px;" />
              <div class="skeleton-bar" style="width: 80%; height: 12px; margin-top: 6px;" />
              <div class="skeleton-bar" style="width: 50%; height: 12px; margin-top: 4px;" />
            </div>
          </div>
        </div>

        <!-- 教育背景卡片 -->
        <div class="sk-card" style="animation-delay: 0.3s;">
          <div class="sk-card__header">
            <div class="skeleton-bar" style="width: 40%; height: 16px;" />
          </div>
          <div class="sk-card__body">
            <div class="sk-entry">
              <div class="skeleton-bar" style="width: 55%; height: 14px;" />
              <div class="skeleton-bar" style="width: 70%; height: 12px; margin-top: 6px;" />
            </div>
          </div>
        </div>
      </aside>

      <!-- 预览列 -->
      <section class="editor-skeleton__preview">
        <div class="sk-page">
          <!-- 页面头部 -->
          <div class="sk-page__header">
            <div class="skeleton-circle" style="width: 48px; height: 48px;" />
            <div class="sk-page__header-text">
              <div class="skeleton-bar" style="width: 120px; height: 16px;" />
              <div class="skeleton-bar" style="width: 80px; height: 10px; margin-top: 6px;" />
              <div class="sk-page__contact-row">
                <div class="skeleton-bar" style="width: 60px; height: 8px;" />
                <div class="skeleton-bar" style="width: 70px; height: 8px;" />
                <div class="skeleton-bar" style="width: 50px; height: 8px;" />
              </div>
            </div>
          </div>
          <!-- 分隔线 -->
          <div class="sk-page__divider" />
          <!-- Section 块 -->
          <div class="sk-page__section" v-for="i in 3" :key="i">
            <div class="skeleton-bar" style="width: 30%; height: 12px;" />
            <div class="sk-page__section-content">
              <div class="skeleton-bar" style="width: 90%; height: 8px;" />
              <div class="skeleton-bar" style="width: 75%; height: 8px; margin-top: 4px;" />
              <div class="skeleton-bar" style="width: 60%; height: 8px; margin-top: 4px;" />
            </div>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { useEditorLayoutStore } from '@/stores/editorLayoutStore'

const layoutStore = useEditorLayoutStore()

// 导航条目配置
const navItems = [
  { barWidth: '65%' },
  { barWidth: '80%' },
  { barWidth: '55%' },
  { barWidth: '70%' },
  { barWidth: '45%' },
  { barWidth: '75%' },
  { barWidth: '60%' },
]

// 编辑区字段宽度
const fieldWidths = ['85%', '70%', '90%', '60%']
</script>

<style lang="scss" scoped>
@keyframes skeleton-shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

.editor-skeleton {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: $bg-secondary;

  // ========== Header ==========
  &__header {
    height: $header-height;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 $spacing-lg;
    background: var(--header-bg);
    border-bottom: 1px solid $border-glass;
    flex-shrink: 0;
  }

  &__body {
    flex: 1;
    display: flex;
    overflow: hidden;
  }

  // ========== 导航列 ==========
  &__nav {
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    gap: $spacing-xs;
    padding: $spacing-md $spacing-sm;
    background: var(--editor-panel-bg);
    border-right: 1px solid $border-glass;
    overflow: hidden;
  }

  // ========== 编辑列 ==========
  &__editor {
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    gap: $spacing-md;
    padding: $spacing-md;
    background: var(--editor-panel-bg);
    border-right: 1px solid $border-glass;
    overflow: hidden;
  }

  // ========== 预览列 ==========
  &__preview {
    flex: 1;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding: $spacing-xl;
    overflow: hidden;
  }
}

// ========== Header 子元素 ==========
.sk-header__left {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
}

.sk-header__nav-pills {
  display: flex;
  gap: 4px;
  margin-left: $spacing-sm;
}

.sk-header__center {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
}

.sk-header__right {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
}

// ========== 导航项 ==========
.sk-nav-item {
  display: flex;
  align-items: center;
  gap: $spacing-xs;
  padding: $spacing-xs $spacing-sm;
  border-radius: $radius-md;
  border-left: 2px solid transparent;

  &--active {
    background: rgba($primary-color, 0.08);
    border-left-color: $primary-color;

    .skeleton-circle,
    .skeleton-bar {
      opacity: 1;
    }
  }
}

// ========== 编辑区卡片 ==========
.sk-card {
  background: var(--bg-glass);
  border: 1px solid $border-glass;
  border-radius: $radius-md;
  overflow: hidden;

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: $spacing-sm $spacing-md;
    border-bottom: 1px solid $border-glass;
  }

  &__body {
    padding: $spacing-md;
    display: flex;
    flex-direction: column;
    gap: $spacing-sm;
  }
}

.sk-photo-row {
  display: flex;
  align-items: flex-start;
  gap: $spacing-sm;
}

.sk-photo-actions {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.sk-field-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: $spacing-sm;
}

.sk-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.sk-entry {
  display: flex;
  flex-direction: column;
  padding: $spacing-sm 0;
  border-bottom: 1px solid $border-glass;

  &:last-child {
    border-bottom: none;
    padding-bottom: 0;
  }

  &:first-child {
    padding-top: 0;
  }
}

// ========== 预览页面 ==========
.sk-page {
  width: 100%;
  max-width: 820px;
  min-height: 800px;
  background: #ffffff;
  border-radius: $radius-lg;
  box-shadow: $shadow-md;
  padding: 32px;
  display: flex;
  flex-direction: column;
  gap: $spacing-md;

  &__header {
    display: flex;
    align-items: center;
    gap: $spacing-md;
  }

  &__header-text {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  &__contact-row {
    display: flex;
    gap: $spacing-sm;
    margin-top: 4px;
  }

  &__divider {
    height: 1px;
    background: var(--bg-glass);
    margin: $spacing-xs 0;
  }

  &__section {
    display: flex;
    flex-direction: column;
    gap: $spacing-xs;
  }

  &__section-content {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding-left: $spacing-sm;
  }
}

// ========== 基础骨架元素 ==========
.skeleton-bar {
  background: linear-gradient(
    90deg,
    var(--bg-glass) 25%,
    var(--bg-glass-hover) 50%,
    var(--bg-glass) 75%
  );
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.5s ease-in-out infinite;
  border-radius: $radius-sm;
  opacity: 0.7;
}

.skeleton-circle {
  border-radius: 50%;
  flex-shrink: 0;
  background: linear-gradient(
    90deg,
    var(--bg-glass) 25%,
    var(--bg-glass-hover) 50%,
    var(--bg-glass) 75%
  );
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.5s ease-in-out infinite;
  opacity: 0.7;
}

.skeleton-pill {
  border-radius: 100px;
  background: linear-gradient(
    90deg,
    var(--bg-glass) 25%,
    var(--bg-glass-hover) 50%,
    var(--bg-glass) 75%
  );
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.5s ease-in-out infinite;
  opacity: 0.7;
}

// Header 按钮样式
.sk-btn {
  border: 1px solid $border-glass;
  opacity: 0.5;
}

.sk-btn--accent {
  opacity: 0.6;
  background: linear-gradient(
    90deg,
    rgba($primary-color, 0.15) 25%,
    rgba($primary-color, 0.25) 50%,
    rgba($primary-color, 0.15) 75%
  ) !important;
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.5s ease-in-out infinite;
}

.sk-theme-btn {
  border: 1px solid $border-glass;
  opacity: 0.5;
}

// ========== 响应式 ==========
@include tablet {
  .sk-header__nav-pills {
    display: none;
  }

  .sk-btn,
  .sk-btn--accent {
    width: 28px !important;
  }
}

@include mobile {
  .sk-header__nav-pills {
    display: none;
  }

  .sk-header__left {
    .skeleton-bar {
      display: none;
    }
  }

  .sk-btn,
  .sk-btn--accent {
    width: 28px !important;
  }

  .sk-field-grid {
    grid-template-columns: 1fr;
  }
}
</style>
