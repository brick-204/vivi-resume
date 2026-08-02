<template>
  <a href="#main-content" class="skip-to-content">跳到主要内容</a>
  <n-config-provider :theme="naiveTheme" :theme-overrides="naiveThemeOverrides" :locale="zhCN" :date-locale="dateZhCN">
    <n-message-provider>
      <router-view />
      <!-- ponytail: 路由级骨架覆盖层 — 切换路由时立即显示目标页骨架，不顿在原页面 -->
      <RouteSkeletonOverlay :visible="routeLoading" :name="skeletonName" />
      <div id="aria-live-status" aria-live="polite" aria-atomic="true" class="sr-only"></div>

      <!-- AI 咨询桌宠 + 抽屉：抽屉打开时隐藏桌宠；petReady 等桌宠偏好加载完再挂载，避免启动闪烁 -->
      <DesktopPet
        v-if="petReady"
        v-show="!consultVisible"
        v-model:placement="consultPlacement"
        :drawer-open="consultVisible"
        :pet-id="settingsStore.currentPetId"
        @open="consultVisible = true"
      />
      <ConsultDrawer
        v-model:show="consultVisible"
        v-model:placement="consultPlacement"
      />
      <!-- ponytail: 落盘兜底遮罩 — beforeunload/flush 期间显示，引导用户等待落盘完成 -->
      <SaveGuardOverlay :visible="isFlushing" />
    </n-message-provider>
  </n-config-provider>
</template>

<script setup lang="ts">
import { computed, ref, watch, nextTick } from 'vue'
import { NConfigProvider, NMessageProvider } from 'naive-ui'
import { zhCN, dateZhCN } from 'naive-ui'
import { getNaiveTheme, getNaiveThemeOverrides } from '@/plugins/naive-ui'
import { useTheme } from '@/composables/useTheme'
import { useSettingsStore } from '@/stores/settingsStore'
import router from '@/router'
import RouteSkeletonOverlay from '@/components/common/RouteSkeletonOverlay.vue'
import SaveGuardOverlay from '@/components/common/SaveGuardOverlay.vue'
import { useFlushGuard } from '@/composables/useFlushGuard'
import ConsultDrawer from '@/components/ai/ConsultDrawer.vue'
import DesktopPet from '@/components/ai/DesktopPet.vue'

const { resolvedTheme } = useTheme()
const settingsStore = useSettingsStore()

// ponytail: 落盘兜底守卫 — 绑定单例生命周期（注册 visibilitychange/pagehide/beforeunload），
//           isFlushing 驱动下方保存遮罩。各 store 内调 registerFlush 注册各自 flush 逻辑。
const flushGuard = useFlushGuard()
const isFlushing = computed(() => flushGuard.isFlushing.value)

// ponytail: 等 settingsStore ready（currentPetId/customPets 已从存储读入）再挂载桌宠，
//           避免启动瞬间用默认桌宠渲染、ready 后再切换造成的闪烁
const petReady = ref(false)
settingsStore.ready.then(() => { petReady.value = true })

const naiveTheme = computed(() => getNaiveTheme(resolvedTheme.value))
const naiveThemeOverrides = computed(() => getNaiveThemeOverrides(resolvedTheme.value))

const consultVisible = ref(false)

// AI 咨询抽屉方向：靠左/靠右，所有态都生效，桌宠吸附侧即此值。localStorage 单一写入点。
const consultPlacement = ref<'left' | 'right'>(
  (localStorage.getItem('consult-placement') as 'left' | 'right') || 'right',
)
watch(consultPlacement, (v) => {
  localStorage.setItem('consult-placement', v)
})

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
