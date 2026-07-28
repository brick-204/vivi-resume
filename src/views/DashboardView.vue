<template>
  <div class="dashboard">
    <AppHeader />
    <!-- 移动端导航条：仅 ≤768px 显示，桌面端 display:none -->
    <div class="dashboard__mobile-bar">
      <button
        class="dashboard__hamburger"
        type="button"
        aria-label="打开导航菜单"
        @click="mobileDrawerOpen = true"
      >
        <Icon icon="mdi:menu" :width="24" />
      </button>
    </div>

    <!-- 主体区域 -->
    <div id="main-content" class="dashboard__body">
      <!-- 侧边栏 -->
      <SidebarNav v-model:active-tab="activeTab" class="dashboard__sidebar" />

      <!-- 内容区 -->
      <div class="dashboard__content">
        <div class="dashboard__content-inner">
          <!-- ponytail: 首屏等待 store 就绪时显示整体骨架，避免空白 -->
          <DashboardSkeleton v-if="!storesReady" />
          <!-- ponytail: 面板懒加载（defineAsyncComponent），切换 tab 首次加载时显示骨架 -->
          <component :is="panelMap[activeTab]" v-else />
        </div>
      </div>
    </div>

    <!-- 移动端导航抽屉：SidebarNav 的 mobile prop 覆盖 mobile 媒体查询的 display:none -->
    <n-drawer v-model:show="mobileDrawerOpen" :width="240" placement="left" :auto-focus="false">
      <n-drawer-content closable title="导航">
        <SidebarNav
          mobile
          :active-tab="activeTab"
          @update:active-tab="handleMobileTabSelect"
        />
      </n-drawer-content>
    </n-drawer>

    <!-- 同步遮罩 -->
    <SyncOverlay />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, defineAsyncComponent, defineComponent, h, type Component } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { NDrawer, NDrawerContent } from 'naive-ui'
import { Icon } from '@iconify/vue'
import { useResumeStore } from '@/stores/resumeStore'
import { useAIConfigStore } from '@/stores/aiConfigStore'
import { useSettingsStore } from '@/stores/settingsStore'
import AppHeader from '@/components/common/AppHeader.vue'
import SidebarNav from '@/components/dashboard/SidebarNav.vue'
import DashboardSkeleton from '@/components/dashboard/DashboardSkeleton.vue'
import SyncOverlay from '@/components/dashboard/SyncOverlay.vue'

// ponytail: 面板懒加载，首屏只加载当前 tab 对应面板，切换时按需加载
// defineAsyncComponent 的 loadingComponent 在组件首次加载时显示
// ponytail: 每个面板用不同 variant 的骨架屏，与实际布局匹配
const skeletonFor = (variant: 'resumes' | 'templates' | 'ai' | 'trash' | 'settings') =>
  defineComponent({ render: () => h(DashboardSkeleton, { variant }) })

const ResumeListPanel = defineAsyncComponent({
  loader: () => import('@/components/dashboard/ResumeListPanel.vue'),
  loadingComponent: skeletonFor('resumes'),
  delay: 0,
})
const TemplateMarketPanel = defineAsyncComponent({
  loader: () => import('@/components/dashboard/TemplateMarketPanel.vue'),
  loadingComponent: skeletonFor('templates'),
  delay: 0,
})
const AISettingsPanel = defineAsyncComponent({
  loader: () => import('@/components/dashboard/AISettingsPanel.vue'),
  loadingComponent: skeletonFor('ai'),
  delay: 0,
})
const TrashPanel = defineAsyncComponent({
  loader: () => import('@/components/dashboard/TrashPanel.vue'),
  loadingComponent: skeletonFor('trash'),
  delay: 0,
})
const SettingsPanel = defineAsyncComponent({
  loader: () => import('@/components/dashboard/SettingsPanel.vue'),
  loadingComponent: skeletonFor('settings'),
  delay: 0,
})

// ponytail: 面板映射表，供 <component :is> 动态渲染
const panelMap: Record<string, Component> = {
  resumes: ResumeListPanel,
  templates: TemplateMarketPanel,
  ai: AISettingsPanel,
  trash: TrashPanel,
  settings: SettingsPanel,
}

const store = useResumeStore()
const aiConfigStore = useAIConfigStore()
const settingsStore = useSettingsStore()
const route = useRoute()
const router = useRouter()

const activeTab = ref<'resumes' | 'templates' | 'ai' | 'trash' | 'settings'>('resumes')
const storesReady = ref(false)
// ponytail: 移动端导航抽屉开关，仅 ≤768px 触发器可达
const mobileDrawerOpen = ref(false)

// ponytail: 抽屉内点击 tab 后更新 activeTab 并关闭抽屉
const handleMobileTabSelect = (tab: 'resumes' | 'templates' | 'ai' | 'trash' | 'settings') => {
  activeTab.value = tab
  mobileDrawerOpen.value = false
}

// ponytail: URL ↔ activeTab 双向同步，isRouteChange 防循环
const validTabs = ['resumes', 'templates', 'ai', 'trash', 'settings'] as const
let isRouteChange = false

// URL → activeTab（处理 router.push 从子组件来的导航）
watch(() => route.query.tab, (tab) => {
  if (validTabs.includes(tab as any)) {
    isRouteChange = true
    activeTab.value = tab as typeof activeTab.value
    isRouteChange = false
  }
}, { immediate: true })

// activeTab → URL（侧边栏/默认切换时同步 URL，replace 避免多余历史记录）
watch(activeTab, (tab) => {
  if (!isRouteChange && route.query.tab !== tab) {
    router.replace({ path: '/dashboard', query: { tab } })
  }
})

// ponytail: store 并行初始化，缩短首屏等待
onMounted(async () => {
  await Promise.all([
    settingsStore.ready,
    store.ready,
    aiConfigStore.ready,
  ])
  storesReady.value = true
  // 无简历且无 query tab 时默认显示模版市场
  if (!route.query.tab && store.resumeCount === 0) {
    activeTab.value = 'templates' // watch 会自动 replace URL
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

// 移动端导航条：桌面端隐藏，仅 ≤768px 显示
.dashboard__mobile-bar {
  display: none;
}

.dashboard__hamburger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border: none;
  background: transparent;
  color: $text-primary;
  cursor: pointer;
  border-radius: $radius-md;
  transition: background 0.15s ease;

  &:hover {
    background: $bg-glass-hover;
  }

  &:focus-visible {
    outline: 2px solid $primary-color;
    outline-offset: 2px;
  }
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

// 响应式
@include tablet {
  .dashboard__content-inner {
    padding: $spacing-lg;
  }
}

@include mobile {
  .dashboard__content-inner {
    padding: $spacing-md;
  }

  // 移动端：显示导航条 + 汉堡按钮
  .dashboard__mobile-bar {
    display: flex;
    align-items: center;
    padding: $spacing-xs $spacing-md;
    border-bottom: 1px solid $border-glass;
    flex-shrink: 0;
  }
}
</style>