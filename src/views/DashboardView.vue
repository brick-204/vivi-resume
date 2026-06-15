<template>
  <div class="dashboard">
    <!-- 公共头部 -->
    <AppHeader>
      <template #left-extra>
        <button class="dashboard__mobile-menu-btn" @click="mobileMenuOpen = true">
          <Icon icon="mdi:menu" :width="24" />
        </button>
      </template>
    </AppHeader>

    <!-- 主体区域 -->
    <div class="dashboard__body">
      <!-- 移动端遮罩 -->
      <Transition name="fade">
        <div v-if="mobileMenuOpen" class="dashboard__mobile-overlay" @click="mobileMenuOpen = false" />
      </Transition>

      <!-- 移动端侧边栏抽屉 -->
      <Transition name="slide">
        <div v-if="mobileMenuOpen" class="dashboard__mobile-sidebar">
          <SidebarNav :active-tab="activeTab" mobile @update:active-tab="onMobileNavChange" />
        </div>
      </Transition>

      <!-- 桌面端侧边栏 -->
      <SidebarNav :active-tab="activeTab" @update:active-tab="activeTab = $event" class="dashboard__sidebar" />

      <!-- 内容区 -->
      <div class="dashboard__content">
        <div class="dashboard__content-inner">
          <ResumeListPanel v-if="activeTab === 'resumes'" />
          <TemplateMarketPanel v-else-if="activeTab === 'templates'" />
          <AISettingsPanel v-else-if="activeTab === 'ai'" />
          <SettingsPanel v-else-if="activeTab === 'settings'" />
        </div>
      </div>
    </div>

    <!-- 同步遮罩 -->
    <SyncOverlay />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useResumeStore } from '@/stores/resumeStore'
import { useAIConfigStore } from '@/stores/aiConfigStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { Icon } from '@iconify/vue'
import AppHeader from '@/components/common/AppHeader.vue'
import SidebarNav from '@/components/dashboard/SidebarNav.vue'
import ResumeListPanel from '@/components/dashboard/ResumeListPanel.vue'
import TemplateMarketPanel from '@/components/dashboard/TemplateMarketPanel.vue'
import AISettingsPanel from '@/components/dashboard/AISettingsPanel.vue'
import SettingsPanel from '@/components/dashboard/SettingsPanel.vue'
import SyncOverlay from '@/components/dashboard/SyncOverlay.vue'

const store = useResumeStore()
const aiConfigStore = useAIConfigStore()
const settingsStore = useSettingsStore()
const route = useRoute()

const activeTab = ref<'resumes' | 'templates' | 'ai' | 'settings'>('resumes')
const mobileMenuOpen = ref(false)
const storesReady = ref(false)

// 根据 URL query 参数切换 tab
watch(() => route.query.tab, (tab) => {
  if (['ai', 'settings', 'templates', 'resumes'].includes(tab as string)) {
    activeTab.value = tab as typeof activeTab.value
  }
}, { immediate: true })

const onMobileNavChange = (tab: 'resumes' | 'templates' | 'ai' | 'settings') => {
  activeTab.value = tab
  mobileMenuOpen.value = false
}

onMounted(async () => {
  await settingsStore.ready
  await store.ready
  await aiConfigStore.ready
  storesReady.value = true
  // 无简历且无 query tab 时默认显示模版市场
  if (!route.query.tab && store.resumeCount === 0) {
    activeTab.value = 'templates'
  }
})
</script>

<style lang="scss" scoped>
.dashboard {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: $bg-secondary;
  overflow: hidden;
  position: relative;
}

// 主体区域（头部下方的侧边栏 + 内容）
.dashboard__body {
  flex: 1;
  display: flex;
  overflow: hidden;
}

// 移动端汉堡菜单按钮（默认隐藏，移动端显示）
.dashboard__mobile-menu-btn {
  display: none;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: none;
  background: $bg-glass;
  border-radius: $radius-md;
  color: $text-primary;
  cursor: pointer;
  transition: all $transition-base;
  flex-shrink: 0;

  &:hover {
    background: $bg-glass-hover;
  }

  @include mobile {
    display: flex;
  }
}

// 桌面端侧边栏
.dashboard__sidebar {
  // SidebarNav 自带样式，此处仅做定位
}

// 内容区
.dashboard__content {
  flex: 1;
  min-width: 0;
  overflow-y: auto;
  position: relative;
  @include scrollbar;
}

.dashboard__content-inner {
  position: relative;
  z-index: 1;
  padding: $spacing-2xl;
  max-width: 1400px;
  margin: 0 auto;
}

// 移动端遮罩
.dashboard__mobile-overlay {
  position: fixed;
  inset: 0;
  background: var(--overlay-bg);
  z-index: 90;
}

// 移动端侧边栏抽屉
.dashboard__mobile-sidebar {
  position: fixed;
  left: 0;
  top: 0;
  bottom: 0;
  width: 240px;
  z-index: 100;
}

// 过渡动画
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-enter-active,
.slide-leave-active {
  transition: transform 0.25s cubic-bezier(0.22, 1, 0.36, 1);
}
.slide-enter-from,
.slide-leave-to {
  transform: translateX(-100%);
}

// 响应式
@include tablet {
  .dashboard__content-inner {
    padding: $spacing-lg;
  }
}

@include mobile {
  .dashboard__sidebar {
    display: none;
  }

  .dashboard__content-inner {
    padding: $spacing-md;
  }
}
</style>