<template>
  <div
    class="resize-handle"
    :class="{ 'resize-handle--active': isDragging }"
    tabindex="0"
    role="separator"
    aria-orientation="vertical"
    @mousedown="handleMouseDown"
    @keydown="handleKeyDown"
  >
    <div class="resize-handle__line"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onUnmounted } from 'vue'

const emit = defineEmits<{
  resize: [delta: number]
  resizeEnd: []
}>()

const isDragging = ref(false)
const isMounted = ref(true)
let startX = 0
let rafId: number | null = null
let pendingDelta = 0

const handleMouseDown = (e: MouseEvent) => {
  e.preventDefault()
  isDragging.value = true
  startX = e.clientX

  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
}

const flushDelta = () => {
  if (!isMounted.value) return
  if (pendingDelta !== 0) {
    emit('resize', pendingDelta)
    pendingDelta = 0
  }
  rafId = null
}

const handleMouseMove = (e: MouseEvent) => {
  if (!isDragging.value || !isMounted.value) return

  const delta = e.clientX - startX
  startX = e.clientX
  pendingDelta += delta

  // 使用 requestAnimationFrame 合并多次更新
  if (rafId === null) {
    rafId = requestAnimationFrame(flushDelta)
  }
}

const handleMouseUp = () => {
  if (!isDragging.value || !isMounted.value) return

  // 确保最后的 delta 被处理
  if (rafId !== null) {
    cancelAnimationFrame(rafId)
    rafId = null
  }
  flushDelta()

  isDragging.value = false
  emit('resizeEnd')

  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', handleMouseUp)
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
}

// 键盘支持
const handleKeyDown = (e: KeyboardEvent) => {
  const step = e.shiftKey ? 20 : 10 // Shift 加速

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
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', handleMouseUp)
  if (rafId !== null) {
    cancelAnimationFrame(rafId)
  }
})
</script>

<style lang="scss" scoped>
.resize-handle {
  width: 8px;
  height: 100%;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: col-resize;
  z-index: 10;
  transition: background 0.15s;
  outline: none;

  &:hover,
  &--active,
  &:focus-visible {
    .resize-handle__line {
      background: $primary-color;
      box-shadow: 0 0 8px rgba($primary-color, 0.5);
    }
  }

  &:focus-visible {
    outline: 2px solid $primary-color;
    outline-offset: -2px;
  }

  &__line {
    width: 2px;
    height: 40px;
    border-radius: 1px;
    background: $border-glass;
    transition: all 0.15s;
  }
}
</style>
