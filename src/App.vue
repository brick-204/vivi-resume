<template>
  <a href="#main-content" class="skip-to-content">跳到主要内容</a>
  <n-config-provider :theme="naiveTheme" :theme-overrides="naiveThemeOverrides" :locale="zhCN">
    <n-message-provider>
      <router-view />
      <!-- ponytail: 路由级骨架覆盖层 — 切换路由时立即显示目标页骨架，不顿在原页面 -->
      <RouteSkeletonOverlay :visible="routeLoading" :name="skeletonName" />
      <div id="aria-live-status" aria-live="polite" aria-atomic="true" class="sr-only"></div>

      <!-- AI 咨询悬浮按钮 + 抽屉 -->
      <button
        v-show="!consultVisible"
        class="consult-fab"
        :class="{ 'is-left': consultPlacement === 'left', 'is-dragging': fabDragging }"
        :style="fabDragStyle"
        :aria-label="'AI 咨询'"
        title="AI 咨询"
        @mousedown="onFabDown"
        @mouseup="onFabUp"
        @touchstart="onFabDown"
        @touchend="onFabUp"
      >
        <Icon icon="mdi:comment-question-outline" :width="24" />
      </button>
      <ConsultDrawer
        v-model:show="consultVisible"
        v-model:placement="consultPlacement"
      />
    </n-message-provider>
  </n-config-provider>
</template>

<script setup lang="ts">
import { computed, ref, watch, nextTick } from 'vue'
import { NConfigProvider, NMessageProvider } from 'naive-ui'
import { zhCN } from 'naive-ui'
import { Icon } from '@iconify/vue'
import { getNaiveTheme, getNaiveThemeOverrides } from '@/plugins/naive-ui'
import { useTheme } from '@/composables/useTheme'
import router from '@/router'
import RouteSkeletonOverlay from '@/components/common/RouteSkeletonOverlay.vue'
import ConsultDrawer from '@/components/ai/ConsultDrawer.vue'

const { resolvedTheme } = useTheme()

const naiveTheme = computed(() => getNaiveTheme(resolvedTheme.value))
const naiveThemeOverrides = computed(() => getNaiveThemeOverrides(resolvedTheme.value))

const consultVisible = ref(false)

// AI 咨询抽屉方向：靠左/靠右，所有态都生效，FAB 吸附侧即此值。localStorage 单一写入点。
const consultPlacement = ref<'left' | 'right'>(
  (localStorage.getItem('consult-placement') as 'left' | 'right') || 'right',
)
watch(consultPlacement, (v) => {
  localStorage.setItem('consult-placement', v)
})

// ========== FAB 长按拖拽吸附 ==========
// 短按打开抽屉；长按 300ms 进入拖拽（fixed 跟手），松手按 x 吸附左/右下角并切换抽屉方向
const fabDragging = ref(false)
const fabPos = ref<{ left: number; top: number } | null>(null)
let fabPressTimer: ReturnType<typeof setTimeout> | null = null
let fabPointerX = 0
let fabPointerY = 0
let fabDownX = 0
let fabDownY = 0
let fabMoveRaf: number | null = null
const DRAG_DELAY = 300
const DRAG_THRESHOLD = 5 // 按下后移动超过此距离立即进拖拽态，不等 300ms

const fabDragStyle = computed(() =>
  fabPos.value
    ? { left: fabPos.value.left + 'px', top: fabPos.value.top + 'px', right: 'auto', bottom: 'auto' }
    : {},
)

/** 进入拖拽态：清掉短按定时器，置 dragging，立即定位到当前光标 */
const enterDragging = () => {
  if (fabPressTimer) {
    clearTimeout(fabPressTimer)
    fabPressTimer = null
  }
  fabDragging.value = true
  fabPos.value = { left: fabPointerX - 26, top: fabPointerY - 26 }
}

const fabPointerMove = (e: MouseEvent | TouchEvent) => {
  const x = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX
  const y = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY
  fabPointerX = x
  fabPointerY = y
  // 定时器未触发时：移动超阈值立即进拖拽态，消除开头 300ms 停顿
  if (!fabDragging.value && fabPressTimer) {
    if (Math.abs(x - fabDownX) > DRAG_THRESHOLD || Math.abs(y - fabDownY) > DRAG_THRESHOLD) {
      enterDragging()
    }
    return
  }
  if (fabDragging.value) {
    e.preventDefault()
    // raf 合并高频 mousemove，避免每帧多次响应式更新 + DOM patch 叠加卡顿
    if (fabMoveRaf === null) {
      fabMoveRaf = requestAnimationFrame(() => {
        fabMoveRaf = null
        fabPos.value = { left: fabPointerX - 26, top: fabPointerY - 26 }
      })
    }
  }
}

const fabPointerUp = () => {
  if (fabPressTimer) {
    clearTimeout(fabPressTimer)
    fabPressTimer = null
  }
  if (fabMoveRaf !== null) {
    cancelAnimationFrame(fabMoveRaf)
    fabMoveRaf = null
  }
  document.removeEventListener('mousemove', fabPointerMove)
  document.removeEventListener('mouseup', fabPointerUp)
  document.removeEventListener('touchmove', fabPointerMove)
  document.removeEventListener('touchend', fabPointerUp)
  document.body.style.userSelect = ''
  if (fabDragging.value) {
    // 松手按 x 吸附：左半屏→左下，右半屏→右下；吸附即切换抽屉方向
    consultPlacement.value = fabPointerX < window.innerWidth / 2 ? 'left' : 'right'
    fabDragging.value = false
    fabPos.value = null
  } else {
    // 短按：打开抽屉
    consultVisible.value = true
  }
}

const onFabDown = (e: MouseEvent | TouchEvent) => {
  const x = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX
  const y = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY
  fabPointerX = x
  fabPointerY = y
  fabDownX = x
  fabDownY = y
  document.body.style.userSelect = 'none'
  document.addEventListener('mousemove', fabPointerMove)
  document.addEventListener('mouseup', fabPointerUp)
  document.addEventListener('touchmove', fabPointerMove, { passive: false })
  document.addEventListener('touchend', fabPointerUp)
  fabPressTimer = setTimeout(() => {
    // 按住不动满 300ms 也进拖拽态（移动超阈值会提前进，见 fabPointerMove）
    enterDragging()
  }, DRAG_DELAY)
}
const onFabUp = (e: MouseEvent | TouchEvent) => {
  // mouseup/touchend 在按钮上时也走统一吸附逻辑（fabPointerUp 已处理短按/长按分支）
  // 这里仅阻止默认 click，避免短按场景重复触发
  if (!fabDragging.value) {
    e.preventDefault()
  }
}

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

/* AI 咨询悬浮按钮 */
.consult-fab {
  position: fixed;
  right: 24px;
  bottom: 24px;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  background: linear-gradient(135deg, #4f6df5, #7b5cff);
  box-shadow: 0 4px 16px rgba(79, 109, 245, 0.4);
  z-index: 2000;
  transition: transform 0.2s, box-shadow 0.2s, left 0.25s, right 0.25s, top 0.25s, bottom 0.25s;
}
/* 拖拽跟手时禁用 transition，否则每次 left/top 更新都延迟 0.25s 平滑过渡 → 跟不上鼠标 */
.consult-fab.is-dragging {
  transition: none;
}
.consult-fab.is-left {
  left: 24px;
  right: auto;
}
.consult-fab:hover {
  transform: translateY(-2px) scale(1.05);
  box-shadow: 0 6px 20px rgba(79, 109, 245, 0.5);
}
.consult-fab:active {
  transform: translateY(0) scale(0.98);
}
</style>
