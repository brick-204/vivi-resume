<template>
  <div
    class="resize-handle"
    :class="{
      'resize-handle--hover': isHover,
      'resize-handle--active': isDragging,
      'resize-handle--at-min': atMin,
      'resize-handle--at-max': atMax
    }"
    tabindex="0"
    role="separator"
    aria-orientation="vertical"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
    @mousedown="handleMouseDown"
    @dblclick="handleDoubleClick"
    @keydown="handleKeyDown"
  ></div>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'

const props = withDefaults(defineProps<{
  atMin?: boolean
  atMax?: boolean
}>(), {
  atMin: false,
  atMax: false
})

const emit = defineEmits<{
  resize: [delta: number]
  resizeEnd: []
  reset: []
}>()

const isDragging = ref(false)
const isHover = ref(false)
const isMounted = ref(true)
let startX = 0
let rafId: number | null = null
let pendingDelta = 0
let hoverTimer: ReturnType<typeof setTimeout> | null = null
let cursorStyle: HTMLStyleElement | null = null

// 边界状态感知光标
const cursorClass = computed(() => {
  if (props.atMin) return 'e-resize'
  if (props.atMax) return 'w-resize'
  return 'col-resize'
})

// Hover 延迟 300ms（VSCode sash 行为）
const handleMouseEnter = () => {
  if (isDragging.value) {
    isHover.value = true
    return
  }
  hoverTimer = setTimeout(() => {
    isHover.value = true
  }, 300)
}

const handleMouseLeave = () => {
  if (hoverTimer) {
    clearTimeout(hoverTimer)
    hoverTimer = null
  }
  if (!isDragging.value) {
    isHover.value = false
  }
}

// 注入全局光标样式（VSCode 做法）
const injectCursorStyle = (cursor: string) => {
  if (cursorStyle) return
  cursorStyle = document.createElement('style')
  cursorStyle.textContent = `* { cursor: ${cursor} !important; }`
  document.head.appendChild(cursorStyle)
}

const removeCursorStyle = () => {
  if (cursorStyle) {
    cursorStyle.remove()
    cursorStyle = null
  }
}

// 禁用 iframe 指针事件
const disableIframePointerEvents = () => {
  const iframes = document.getElementsByTagName('iframe')
  for (const iframe of iframes) {
    iframe.style.pointerEvents = 'none'
  }
}

const restoreIframePointerEvents = () => {
  const iframes = document.getElementsByTagName('iframe')
  for (const iframe of iframes) {
    iframe.style.pointerEvents = ''
  }
}

const flushDelta = () => {
  if (!isMounted.value) return
  if (pendingDelta !== 0) {
    emit('resize', pendingDelta)
    pendingDelta = 0
  }
  rafId = null
}

const handleMouseDown = (e: MouseEvent) => {
  e.preventDefault()
  isDragging.value = true
  isHover.value = true
  startX = e.clientX

  injectCursorStyle(cursorClass.value)
  disableIframePointerEvents()

  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
}

const handleMouseMove = (e: MouseEvent) => {
  if (!isDragging.value || !isMounted.value) return

  const delta = e.clientX - startX
  startX = e.clientX
  pendingDelta += delta

  if (rafId === null) {
    rafId = requestAnimationFrame(flushDelta)
  }

  // 动态更新光标（边界状态可能变化）
  if (cursorStyle) {
    const newCursor = `* { cursor: ${cursorClass.value} !important; }`
    if (cursorStyle.textContent !== newCursor) {
      cursorStyle.textContent = newCursor
    }
  }
}

const handleMouseUp = () => {
  if (!isDragging.value || !isMounted.value) return

  if (rafId !== null) {
    cancelAnimationFrame(rafId)
    rafId = null
  }
  flushDelta()

  isDragging.value = false
  emit('resizeEnd')

  removeCursorStyle()
  restoreIframePointerEvents()

  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', handleMouseUp)
}

// 双击重置到默认宽度
const handleDoubleClick = () => {
  emit('reset')
}

// 键盘支持
const handleKeyDown = (e: KeyboardEvent) => {
  const step = e.shiftKey ? 20 : 10

  if (e.key === 'ArrowLeft') {
    e.preventDefault()
    emit('resize', -step)
    emit('resizeEnd')
  } else if (e.key === 'ArrowRight') {
    e.preventDefault()
    emit('resize', step)
    emit('resizeEnd')
  }
}

onUnmounted(() => {
  isMounted.value = false
  if (hoverTimer) clearTimeout(hoverTimer)
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', handleMouseUp)
  removeCursorStyle()
  restoreIframePointerEvents()
  if (rafId !== null) cancelAnimationFrame(rafId)
})
</script>

<style lang="scss" scoped>
.resize-handle {
  width: 4px;
  height: 100%;
  flex-shrink: 0;
  position: relative;
  z-index: 10;
  outline: none;
  cursor: v-bind(cursorClass);

  // 高亮层 — 默认透明，hover/active 时显示
  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: transparent;
    transition: background-color 0.1s ease-out;
    pointer-events: none;
  }

  &--hover::before,
  &--active::before {
    background: $primary-color;
    box-shadow: 0 0 8px rgba($primary-color, 0.5);
  }

  &:focus-visible {
    outline: 2px solid $primary-color;
    outline-offset: -2px;
  }
}
</style>
