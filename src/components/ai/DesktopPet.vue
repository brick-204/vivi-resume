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
    <!-- ponytail: action 列随方向镜像：靠右→桌宠左上外围，靠左→右上外围 -->
    <transition name="pet-actions">
      <div
        v-if="actionsOpen"
        class="desktop-pet__actions"
        :class="{ 'is-left': placement === 'left' }"
      >
        <button
          v-for="a in actions"
          :key="a.key"
          class="desktop-pet__action"
          type="button"
          :title="a.label"
          :aria-label="a.label"
          @click.stop="onAction(a)"
        >
          <Icon :icon="a.icon" :width="20" />
        </button>
      </div>
    </transition>
    <button
      class="desktop-pet"
      :class="{ 'is-dragging': dragging }"
      aria-label="v仔菜单"
      @mousedown="onDown"
      @mouseup="onUp"
      @touchstart="onDown"
      @touchend="onUp"
      @mouseenter="onHover"
    >
      <img v-if="isImg" :src="imgSrc" class="desktop-pet__img" alt="" draggable="false" />
      <div v-else ref="containerRef" class="desktop-pet__anim" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { Icon } from '@iconify/vue'
import { usePetStore } from '@/stores/petStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { getDesktopPetById, DEFAULT_PET_ID } from '@/config/desktopPets'
import { usePetRenderer } from '@/composables/usePetRenderer'
import { triggerRandomEasterEgg } from '@/services/easterEggRegistry'

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
const settingsStore = useSettingsStore()
// ponytail: 防止 settingsStore.ready 的异步回调在组件卸载后仍触发 greet
let unmounted = false

// ========== 桌宠 action 列（单击弹出，留扩展位） ==========
const actionsOpen = ref(false)

/** action 列：v-for 渲染，后续加项往数组里加即可 */
const actions = [
  { key: 'consult', icon: 'mdi:comment-question-outline', label: 'AI 咨询', run: () => emit('open') },
  { key: 'surprise', icon: 'mdi:dice-multiple', label: '洗洗屏幕', run: () => {
    const egg = triggerRandomEasterEgg()
    if (egg) petStore.sayCategory(egg.quoteCategory)
  } },
] as const

const onAction = (a: (typeof actions)[number]) => {
  actionsOpen.value = false
  a.run()
}

/** 点桌宠外的空白处收起 action 列 */
const onDocClick = (e: MouseEvent) => {
  const wrap = document.querySelector('.desktop-pet-wrap')
  if (wrap && !wrap.contains(e.target as Node)) {
    actionsOpen.value = false
  }
}
watch(actionsOpen, (open) => {
  if (open) {
    // ponytail: capture 阶段判定，避免被按钮 stopPropagation 干扰
    nextTick(() => document.addEventListener('click', onDocClick, true))
  } else {
    document.removeEventListener('click', onDocClick, true)
  }
})
onBeforeUnmount(() => document.removeEventListener('click', onDocClick, true))

// 抽屉开→暂停说话 + 暂停 Lottie 省电；关→恢复。fire-and-forget，不影响业务
watch(
  () => props.drawerOpen,
  (open) => {
    petStore.setPaused(Boolean(open))
    if (open) pauseLottie()
    else playLottie()
  },
)

// ========== 桌宠渲染（img / lottie 分发，失败回退默认桌宠） ==========
const {
  containerRef,
  petData,
  isImg,
  imgSrc,
  mountLottie,
  pauseLottie,
  playLottie,
  destroyLottie,
} = usePetRenderer()

// ponytail: petName 由 petData 派生同步——无论正常切换还是畸形回退，petData 变即同步名字，
//   消除"渲染的桌宠"与"话术用的名字"两条路径脱节（曾出现回退默认桌宠后 petName 仍是旧名）。
watch(petData, (d) => {
  petStore.petName = d?.name
}, { immediate: true })

const loadAnim = (petId: string) => {
  destroyLottie()
  petData.value = getDesktopPetById(petId)
  // petName 由上方 watch(petData) 自动同步，无需在此手动赋值
  // img 类型直接渲染 <img>，无需挂载 lottie
  if (isImg.value) return
  // lottie 类型：容器 ready 后挂载；数据畸形回退默认桌宠，保证 action 列始终可用
  requestAnimationFrame(() => {
    if (!containerRef.value) return
    if (!mountLottie(containerRef.value)) {
      petData.value = getDesktopPetById(DEFAULT_PET_ID)
      mountLottie(containerRef.value)
    }
  })
}

onMounted(() => {
  loadAnim(props.petId ?? DEFAULT_PET_ID)
  // 启动定时随机冒泡 + 进页面时段招呼
  if (!props.drawerOpen) {
    petStore.start()
    // ponytail: 等 settingsStore ready 后再 greet，确保 AI 开关已注入；
    //   否则已开启 AI 的用户刷新页面后首次招呼恒为静态（开关默认 false 未被覆盖）
    void settingsStore.ready.then(() => {
      if (!unmounted) petStore.sayTimeGreet()
    })
  }
})

// ponytail: 切换桌宠时重建动画 + 打招呼（进页面走 onMounted 的 greet，这里只处理后续切换）
watch(() => props.petId, (id) => {
  if (!id) return
  loadAnim(id)
  if (!props.drawerOpen) petStore.sayTimeGreet()
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
  actionsOpen.value = false // 拖拽中收起 action 列
  dragging.value = true
  pos.value = { left: pointerX - HALF, top: pointerY - HALF }
  // ponytail: 进入拖拽说一句（开关开则 AI 现编，否则静态）
  petStore.sayCategory('dragStart')
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
    // ponytail: 拖拽松手吸附后说一句（开关开则 AI 现编，否则静态）
    petStore.sayCategory('dragEnd')
  } else {
    // 短按：toggle action 列（不直接开抽屉）；从关→开时说一句
    const willOpen = !actionsOpen.value
    actionsOpen.value = willOpen
    if (willOpen) petStore.sayCategory('click')
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
  unmounted = true
  cleanupDrag() // 拖拽中途卸载也要移除 document 监听，避免泄漏
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
.desktop-pet__img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  pointer-events: none;
  user-select: none;
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

/* action 列：absolute 相对 wrap，桌宠正上方；靠右→右缘对齐桌宠右缘(列向左展开=左上)，靠左镜像 */
.desktop-pet__actions {
  position: absolute;
  bottom: 100%;
  right: 0;
  margin-bottom: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  z-index: 1;
}
.desktop-pet__actions.is-left {
  right: auto;
  left: 0;
}
.desktop-pet__action {
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-secondary, #2a2a2e);
  color: var(--text-primary, #eee);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
  transition: transform 0.15s, background 0.15s, color 0.15s;
  &:hover {
    transform: scale(1.1);
    background: var(--primary-color, #4f6df5);
    color: #fff;
  }
}

.pet-actions-enter-active,
.pet-actions-leave-active {
  transition: opacity 0.18s, transform 0.18s;
}
.pet-actions-enter-from,
.pet-actions-leave-to {
  opacity: 0;
  transform: translateY(6px) scale(0.92);
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
