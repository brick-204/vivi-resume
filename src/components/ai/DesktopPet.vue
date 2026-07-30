<template>
  <div
    class="desktop-pet-wrap"
    :class="{ 'is-left': placement === 'left', 'is-dragging': dragging }"
    :style="dragStyle"
  >
    <!-- ponytail: 气泡朝屏幕内侧：右侧吸附→气泡在左，左侧吸附→气泡在右 -->
    <transition name="pet-bubble">
      <div
        v-if="petStore.currentQuote"
        class="desktop-pet__bubble"
        :class="{ 'is-left': placement === 'left' }"
        @click="petStore.clear()"
      >
        {{ petStore.currentQuote }}
      </div>
    </transition>
    <button
      class="desktop-pet"
      :class="{ 'is-dragging': dragging }"
      :aria-label="'AI 咨询'"
      title="AI 咨询"
      @mousedown="onDown"
      @mouseup="onUp"
      @touchstart="onDown"
      @touchend="onUp"
      @mouseenter="onHover"
    >
      <div ref="containerRef" class="desktop-pet__anim" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import lottie from 'lottie-web'
import { usePetStore } from '@/stores/petStore'
import { getDesktopPetById, DEFAULT_PET_ID } from '@/config/desktopPets'

const props = defineProps<{
  placement: 'left' | 'right'
  /** 抽屉是否打开：打开时暂停说话并清气泡（桌宠已 v-show 隐藏） */
  drawerOpen?: boolean
  /** 当前桌宠 id */
  petId?: string
}>()
const emit = defineEmits<{
  open: []
  'update:placement': [v: 'left' | 'right']
}>()

const petStore = usePetStore()

// 抽屉开→暂停说话 + 暂停 Lottie 省电；关→恢复。fire-and-forget，不影响业务
watch(
  () => props.drawerOpen,
  (open) => {
    petStore.setPaused(Boolean(open))
    if (open) anim?.pause()
    else anim?.play()
  },
)

// ========== Lottie ==========
const containerRef = ref<HTMLElement | null>(null)
let anim: ReturnType<typeof lottie.loadAnimation> | null = null

const loadAnim = (petId: string) => {
  if (!containerRef.value) return
  anim?.destroy()
  anim = lottie.loadAnimation({
    container: containerRef.value,
    renderer: 'svg',
    loop: true,
    autoplay: true,
    animationData: getDesktopPetById(petId).lottie,
  })
}

onMounted(() => {
  loadAnim(props.petId ?? DEFAULT_PET_ID)
  // 启动定时随机冒泡 + 进页面招呼
  if (!props.drawerOpen) {
    petStore.start()
    petStore.sayCategory('greet')
  }
})

// ponytail: 切换桌宠时重建动画 + 打招呼（进页面走 onMounted 的 greet，这里只处理后续切换）
watch(() => props.petId, (id) => {
  if (!id) return
  loadAnim(id)
  if (!props.drawerOpen) petStore.sayCategory('greet')
})

// ponytail: 悬停节流，避免边缘抖动高频触发 + 覆盖 export 等业务反馈气泡
let lastHoverAt = 0
const HOVER_THROTTLE = 4000

/** 悬停说一句；拖拽中/抽屉开时/节流期内不打扰 */
const onHover = () => {
  if (dragging.value || props.drawerOpen) return
  const now = Date.now()
  if (now - lastHoverAt < HOVER_THROTTLE) return
  lastHoverAt = now
  petStore.sayCategory('hover')
}

// ========== 长按拖拽吸附（从 App.vue 迁入，保持原行为） ==========
// 短按打开抽屉；长按 300ms 进入拖拽（fixed 跟手），松手按 x 吸附左/右下角并切换抽屉方向
const dragging = ref(false)
const pos = ref<{ left: number; top: number } | null>(null)
let pressTimer: ReturnType<typeof setTimeout> | null = null
let pointerX = 0
let pointerY = 0
let downX = 0
let downY = 0
let moveRaf: number | null = null
const DRAG_DELAY = 300
const DRAG_THRESHOLD = 5
const HALF = 32 // 按钮宽高 64 的一半，定位时光标居中

const dragStyle = computed(() =>
  pos.value
    ? { left: pos.value.left + 'px', top: pos.value.top + 'px', right: 'auto', bottom: 'auto' }
    : {},
)

const enterDragging = () => {
  if (pressTimer) {
    clearTimeout(pressTimer)
    pressTimer = null
  }
  dragging.value = true
  pos.value = { left: pointerX - HALF, top: pointerY - HALF }
}

const pointerMove = (e: MouseEvent | TouchEvent) => {
  const x = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX
  const y = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY
  pointerX = x
  pointerY = y
  if (!dragging.value && pressTimer) {
    if (Math.abs(x - downX) > DRAG_THRESHOLD || Math.abs(y - downY) > DRAG_THRESHOLD) {
      enterDragging()
    }
    return
  }
  if (dragging.value) {
    e.preventDefault()
    if (moveRaf === null) {
      moveRaf = requestAnimationFrame(() => {
        moveRaf = null
        pos.value = { left: pointerX - HALF, top: pointerY - HALF }
      })
    }
  }
}

/** 移除拖拽相关 document 监听 + 清定时器/RAF。pointerUp 和卸载时都调，避免泄漏 */
const cleanupDrag = () => {
  if (pressTimer) {
    clearTimeout(pressTimer)
    pressTimer = null
  }
  if (moveRaf !== null) {
    cancelAnimationFrame(moveRaf)
    moveRaf = null
  }
  document.removeEventListener('mousemove', pointerMove)
  document.removeEventListener('mouseup', pointerUp)
  document.removeEventListener('touchmove', pointerMove)
  document.removeEventListener('touchend', pointerUp)
  document.body.style.userSelect = ''
}

const pointerUp = () => {
  const wasDragging = dragging.value
  cleanupDrag()
  if (wasDragging) {
    // 松手按 x 吸附：左半屏→左下，右半屏→右下；吸附即切换抽屉方向
    emit('update:placement', pointerX < window.innerWidth / 2 ? 'left' : 'right')
    dragging.value = false
    pos.value = null
  } else {
    // 短按：打开抽屉
    emit('open')
  }
}

const onDown = (e: MouseEvent | TouchEvent) => {
  const x = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX
  const y = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY
  pointerX = x
  pointerY = y
  downX = x
  downY = y
  document.body.style.userSelect = 'none'
  document.addEventListener('mousemove', pointerMove)
  document.addEventListener('mouseup', pointerUp)
  document.addEventListener('touchmove', pointerMove, { passive: false })
  document.addEventListener('touchend', pointerUp)
  pressTimer = setTimeout(() => {
    enterDragging()
  }, DRAG_DELAY)
}

const onUp = (e: MouseEvent | TouchEvent) => {
  // 短按场景阻止默认 click，避免重复触发（pointerUp 已处理短按/长按分支）
  if (!dragging.value) {
    e.preventDefault()
  }
}

onBeforeUnmount(() => {
  cleanupDrag() // 拖拽中途卸载也要移除 document 监听，避免泄漏
  anim?.destroy()
  anim = null
  petStore.stop()
})
</script>

<style scoped>
/* 外层接管 fixed 定位与吸附，内层按钮纯展示 */
.desktop-pet-wrap {
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 2000;
  display: flex;
  align-items: center;
  /* 拖拽跟手时禁用 transition，否则 left/top 更新延迟跟不上鼠标 */
  transition: left 0.25s, right 0.25s, top 0.25s, bottom 0.25s;
}
.desktop-pet-wrap.is-left {
  left: 24px;
  right: auto;
  flex-direction: row-reverse; /* 气泡在右 */
}
.desktop-pet-wrap.is-dragging {
  transition: none;
}
.desktop-pet {
  position: relative;
  width: 64px;
  height: 64px;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  padding: 0;
  transition: transform 0.2s;
}
.desktop-pet.is-dragging {
  /* 跟手时由 wrap 禁用 transition，按钮自身 transform 仍可动 */
}
.desktop-pet:hover {
  transform: translateY(-2px) scale(1.05);
}
.desktop-pet:active {
  transform: translateY(0) scale(0.98);
}
.desktop-pet__anim {
  width: 100%;
  height: 100%;
  pointer-events: none; /* 不挡按钮点击/拖拽 */
}

/* 气泡 */
.desktop-pet__bubble {
  max-width: 180px;
  margin-right: 8px;
  padding: 8px 12px;
  border-radius: 12px;
  background: #fff;
  color: #333;
  font-size: 13px;
  line-height: 1.4;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  cursor: pointer;
  user-select: none;
  /* 小尾巴朝向桌宠（默认气泡在左，尾巴在右） */
  position: relative;
}
.desktop-pet__bubble.is-left {
  margin-right: 0;
  margin-left: 8px;
}
/* 深色（默认 :root）下气泡深底浅字 */
:root .desktop-pet__bubble {
  background: var(--bg-secondary, #2a2a2e);
  color: var(--text-primary, #eee);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
}

.pet-bubble-enter-active,
.pet-bubble-leave-active {
  transition: opacity 0.2s, transform 0.2s;
}
.pet-bubble-enter-from,
.pet-bubble-leave-to {
  opacity: 0;
  transform: translateY(4px) scale(0.95);
}
</style>
