<template>
  <aside class="sidebar-nav" :class="{ 'sidebar-nav--mobile': mobile }">
    <!-- Logo -->
    <div class="sidebar-nav__logo">
      <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
        <rect x="2" y="2" width="28" height="28" rx="8" stroke="url(#sidebar-logo-gradient)" stroke-width="2" />
        <path d="M10 12H22M10 16H18M10 20H22" stroke="url(#sidebar-logo-gradient)" stroke-width="2" stroke-linecap="round" />
        <defs>
          <linearGradient id="sidebar-logo-gradient" x1="2" y1="2" x2="30" y2="30">
            <stop stop-color="#7c5cfc" />
            <stop offset="1" stop-color="#06b6d4" />
          </linearGradient>
        </defs>
      </svg>
      <span class="sidebar-nav__logo-text">Vivi Resume</span>
    </div>

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

    <!-- 底部 -->
    <div class="sidebar-nav__footer">
      <button class="sidebar-nav__back" @click="goHome">
        <Icon icon="mdi:home-outline" :width="18" />
        <span class="sidebar-nav__back-label">返回主界面</span>
      </button>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { Icon } from '@iconify/vue'

defineProps<{
  activeTab: 'resumes' | 'templates' | 'ai' | 'settings'
  /** 是否为移动端抽屉模式（始终完整显示，不受 mobile 媒体查询隐藏） */
  mobile?: boolean
}>()

defineEmits<{
  'update:activeTab': [value: 'resumes' | 'templates' | 'ai' | 'settings']
}>()

const router = useRouter()

const goHome = () => {
  router.push({ name: 'home' })
}
</script>

<style lang="scss" scoped>
.sidebar-nav {
  flex-shrink: 0;
  width: 240px;
  height: 100%;
  background: rgba($bg-primary, 0.6);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
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

  &__logo {
    display: flex;
    align-items: center;
    gap: $spacing-md;
    padding: $spacing-sm $spacing-md;
    margin-bottom: $spacing-xl;
  }

  &__logo-text {
    font-size: $font-size-lg;
    font-weight: 700;
    @include gradient-text;
    letter-spacing: -0.02em;
    white-space: nowrap;
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
      background: $primary-gradient;
      color: $text-white;
      box-shadow: $shadow-primary;

      &:hover {
        background: $primary-gradient;
        color: $text-white;
      }
    }
  }

  &__item-label {
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__footer {
    padding: $spacing-sm $spacing-md;
    border-top: 1px solid rgba(255, 255, 255, 0.06);
    margin-top: auto;
  }

  &__back {
    display: flex;
    align-items: center;
    gap: $spacing-sm;
    padding: $spacing-sm $spacing-md;
    border-radius: $radius-md;
    border: 1px solid rgba(255, 255, 255, 0.1);
    background: none;
    color: $text-secondary;
    cursor: pointer;
    font-size: $font-size-sm;
    font-family: $font-family;
    transition: all $transition-base;
    width: 100%;
    white-space: nowrap;

    &:hover {
      color: $text-primary;
      border-color: rgba(255, 255, 255, 0.2);
      background: rgba(255, 255, 255, 0.05);
    }
  }

  &__back-label {
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

    &__logo {
      padding: $spacing-xs;
      margin-bottom: $spacing-lg;
    }

    &__logo-text {
      display: none;
    }

    &__item {
      justify-content: center;
      padding: $spacing-sm;
    }

    &__item-label {
      display: none;
    }

    &__back {
      justify-content: center;
      padding: $spacing-sm;
    }

    &__back-label {
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