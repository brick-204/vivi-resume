<template>
  <div class="editor-skeleton">
    <!-- Header 骨架 -->
    <header class="editor-skeleton__header">
      <div class="skeleton-bar" style="width: 140px; height: 24px;" />
      <div class="skeleton-bar" style="width: 200px; height: 28px;" />
      <div class="skeleton-bar" style="width: 80px; height: 28px;" />
    </header>

    <!-- 主体三列骨架 -->
    <main class="editor-skeleton__body">
      <!-- 导航列 -->
      <aside
        class="editor-skeleton__nav"
        :style="{ width: layoutStore.navCollapsed ? '48px' : layoutStore.navWidth + 'px' }"
      >
        <div v-for="i in 7" :key="i" class="editor-skeleton__nav-item">
          <div class="skeleton-circle" />
          <div v-if="!layoutStore.navCollapsed" class="skeleton-bar" :style="{ width: navBarWidths[i - 1] }" />
        </div>
      </aside>

      <!-- 编辑列 -->
      <aside
        class="editor-skeleton__editor"
        :style="{ width: layoutStore.editorWidth + 'px' }"
      >
        <div class="skeleton-card">
          <div class="skeleton-bar" style="width: 40%; height: 18px;" />
          <div class="skeleton-bar" style="width: 70%; height: 14px; margin-top: 12px;" />
          <div class="skeleton-bar" style="width: 90%; height: 14px; margin-top: 8px;" />
          <div class="skeleton-bar" style="width: 55%; height: 14px; margin-top: 8px;" />
        </div>
        <div class="skeleton-card">
          <div class="skeleton-bar" style="width: 50%; height: 18px;" />
          <div class="skeleton-bar" style="width: 80%; height: 14px; margin-top: 12px;" />
          <div class="skeleton-bar" style="width: 65%; height: 14px; margin-top: 8px;" />
        </div>
      </aside>

      <!-- 预览列 -->
      <section class="editor-skeleton__preview">
        <div class="skeleton-page" />
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { useEditorLayoutStore } from '@/stores/editorLayoutStore'

const layoutStore = useEditorLayoutStore()

// 导航条目宽度随机感
const navBarWidths = ['65%', '80%', '55%', '70%', '45%', '75%', '60%']
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

  &__header {
    height: $header-height;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 $spacing-lg;
    background: var(--header-bg);
    border-bottom: 1px solid $border-glass;
  }

  &__body {
    flex: 1;
    display: flex;
    overflow: hidden;
  }

  &__nav {
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    gap: $spacing-sm;
    padding: $spacing-md $spacing-sm;
    background: var(--editor-panel-bg);
    border-right: 1px solid $border-glass;
    overflow: hidden;
  }

  &__nav-item {
    display: flex;
    align-items: center;
    gap: $spacing-xs;
    padding: $spacing-xs;
  }

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

  &__preview {
    flex: 1;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding: $spacing-xl;
    overflow: hidden;
  }
}

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
}

.skeleton-circle {
  width: 16px;
  height: 16px;
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
}

.skeleton-card {
  background: var(--bg-glass);
  border: 1px solid $border-glass;
  border-radius: $radius-md;
  padding: $spacing-md;
}

.skeleton-page {
  width: 100%;
  max-width: 820px;
  min-height: 800px;
  background: linear-gradient(
    90deg,
    var(--bg-glass) 25%,
    var(--bg-glass-hover) 50%,
    var(--bg-glass) 75%
  );
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.5s ease-in-out infinite;
  border-radius: $radius-lg;
}
</style>
