<template>
  <aside class="sidebar-nav" :class="{ 'sidebar-nav--mobile': mobile }">
    <!-- 导航项 -->
    <nav class="sidebar-nav__items">
      <button
        class="sidebar-nav__item"
        :class="{ 'sidebar-nav__item--active': activeTab === 'resumes' }"
        @click="$emit('update:activeTab', 'resumes')"
      >
        <Icon icon="mdi:file-document-outline" :width="20" />
        <span class="sidebar-nav__item-label">我的简历</span>
      </button>
      <button
        class="sidebar-nav__item"
        :class="{ 'sidebar-nav__item--active': activeTab === 'templates' }"
        @click="$emit('update:activeTab', 'templates')"
      >
        <Icon icon="mdi:view-grid-outline" :width="20" />
        <span class="sidebar-nav__item-label">模版市场</span>
      </button>
      <button
        class="sidebar-nav__item"
        :class="{ 'sidebar-nav__item--active': activeTab === 'ai' }"
        @click="$emit('update:activeTab', 'ai')"
      >
        <Icon icon="mdi:robot-outline" :width="20" />
        <span class="sidebar-nav__item-label">AI 服务</span>
      </button>
      <button
        class="sidebar-nav__item"
        :class="{ 'sidebar-nav__item--active': activeTab === 'settings' }"
        @click="$emit('update:activeTab', 'settings')"
      >
        <Icon icon="mdi:cog-outline" :width="20" />
        <span class="sidebar-nav__item-label">设置</span>
      </button>
    </nav>
  </aside>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'

defineProps<{
  activeTab: 'resumes' | 'templates' | 'ai' | 'settings'
  /** 是否为移动端抽屉模式（始终完整显示，不受 mobile 媒体查询隐藏） */
  mobile?: boolean
}>()

defineEmits<{
  'update:activeTab': [value: 'resumes' | 'templates' | 'ai' | 'settings']
}>()
</script>

<style lang="scss" scoped>
.sidebar-nav {
  flex-shrink: 0;
  width: 240px;
  height: 100%;
  background: var(--sidebar-bg);
  border-right: 1px solid $border-glass;
  display: flex;
  flex-direction: column;
  padding: $spacing-lg $spacing-md;
  transition: width $transition-base;
  overflow: hidden;

  // 移动端抽屉模式：覆盖 mobile 媒体查询的 display:none
  &--mobile {
    width: 240px;
  }

  &__items {
    display: flex;
    flex-direction: column;
    gap: $spacing-xs;
    flex: 1;
  }

  &__item {
    display: flex;
    align-items: center;
    gap: $spacing-sm;
    padding: $spacing-sm $spacing-md;
    border-radius: $radius-lg;
    cursor: pointer;
    transition: all 0.15s ease;
    color: $text-secondary;
    background: transparent;
    border: none;
    width: 100%;
    font-family: $font-family;
    font-size: $font-size-md;
    white-space: nowrap;

    &:hover {
      background: $bg-glass;
      color: $text-primary;
    }

    &--active {
      background: $primary-bg-active;
      color: $text-white;
      box-shadow: $shadow-primary;

      &:hover {
        background: $primary-bg-active;
        color: $text-white;
      }
    }
  }

  &__item-label {
    overflow: hidden;
    text-overflow: ellipsis;
  }
}

// 响应式：平板缩至图标模式
@include tablet {
  .sidebar-nav {
    width: 64px;
    padding: $spacing-md $spacing-xs;
    align-items: center;

    &__item {
      justify-content: center;
      padding: $spacing-sm;
    }

    &__item-label {
      display: none;
    }
  }
}

// 移动端：桌面侧边栏隐藏（抽屉模式的由 DashboardView 通过 v-if 控制）
@include mobile {
  .sidebar-nav:not(.sidebar-nav--mobile) {
    display: none;
  }
}
</style>