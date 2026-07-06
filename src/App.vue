<template>
  <a href="#main-content" class="skip-to-content">跳到主要内容</a>
  <n-config-provider :theme="naiveTheme" :theme-overrides="naiveThemeOverrides" :locale="zhCN">
    <n-message-provider>
      <router-view />
      <!-- ponytail: 路由级骨架覆盖层 — 切换路由时立即显示目标页骨架，不顿在原页面 -->
      <RouteSkeletonOverlay :visible="routeLoading" :name="skeletonName" />
      <div id="aria-live-status" aria-live="polite" aria-atomic="true" class="sr-only"></div>
    </n-message-provider>
  </n-config-provider>
</template>

<script setup lang="ts">
import { computed, ref, nextTick } from 'vue'
import { NConfigProvider, NMessageProvider } from 'naive-ui'
import { zhCN } from 'naive-ui'
import { getNaiveTheme, getNaiveThemeOverrides } from '@/plugins/naive-ui'
import { useTheme } from '@/composables/useTheme'
import router from '@/router'
import RouteSkeletonOverlay from '@/components/common/RouteSkeletonOverlay.vue'

const { resolvedTheme } = useTheme()

const naiveTheme = computed(() => getNaiveTheme(resolvedTheme.value))
const naiveThemeOverrides = computed(() => getNaiveThemeOverrides(resolvedTheme.value))

// ponytail: 路由级骨架状态
// beforeEach 同步置 true，覆盖层下一帧出现；afterEach + nextTick 撤掉，让 router-view 先渲染
const routeLoading = ref(false)
const skeletonName = ref('')

router.beforeEach((to, from) => {
  // 同路由不触发（参数变化由内部骨架处理）；目标路由无 skeleton meta 也不触发
  if (to.name !== from.name && to.meta?.skeleton) {
    skeletonName.value = to.meta.skeleton as string
    routeLoading.value = true
  }
})

router.afterEach(() => {
  // ponytail: 等下一帧，让 router-view 渲染新组件（或其内部骨架）再撤覆盖层
  nextTick(() => { routeLoading.value = false })
})

// ponytail: chunk 加载失败兜底，避免覆盖层卡死
router.onError(() => { routeLoading.value = false })
</script>

<style>
#app {
  width: 100%;
  height: 100vh;
}

.skip-to-content {
  position: absolute;
  top: -40px;
  left: 0;
  padding: 8px 16px;
  background: #4f6df5;
  color: white;
  z-index: 9999;
  transition: top 0.2s;
  font-weight: 600;
  text-decoration: none;
  border-radius: 0 0 8px 0;
  font-size: 14px;
}

.skip-to-content:focus {
  top: 0;
}
</style>
