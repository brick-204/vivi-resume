<template>
  <div class="ai-demo ai-demo--write">
    <div class="write-demo__editor">
      <div class="write-demo__toolbar">
        <Icon icon="mdi:pencil-plus" :width="14" />
        AI 帮写
      </div>
      <div class="write-demo__content">
        <template v-if="!displayedText">
          <span class="write-demo__cursor-blink">▌</span>
        </template>
        <template v-else>
          <p v-for="(line, idx) in displayedLines" :key="idx" class="write-demo__line">
            {{ line }}<span v-if="idx === displayedLines.length - 1 && isTyping" class="write-demo__cursor-inline">▌</span>
          </p>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Icon } from '@iconify/vue'

const FULL_TEXT = '主导微前端架构改造，将 5 个独立子应用整合为统一平台，开发效率提升 30%。搭建前端监控体系，覆盖异常捕获与性能追踪，页面崩溃率降低至 0.1%。'

const displayedText = ref('')
const isTyping = ref(false)
let timer: ReturnType<typeof setInterval> | null = null
let charIndex = 0
let isDisposed = false

const displayedLines = computed(() => {
  return displayedText.value.split(/(?<=[。！？])\s*/).filter(Boolean)
})

const startAnimation = () => {
  if (isDisposed) return
  // 先显示空白 + 光标闪烁 1秒
  displayedText.value = ''
  charIndex = 0
  isTyping.value = false

  setTimeout(() => {
    if (isDisposed) return
    isTyping.value = true

    timer = setInterval(() => {
      if (charIndex < FULL_TEXT.length) {
        displayedText.value += FULL_TEXT[charIndex]
        charIndex++
      } else {
        isTyping.value = false
        if (timer) clearInterval(timer)
        // 2秒后重新开始
        timer = setTimeout(startAnimation, 2000) as unknown as ReturnType<typeof setInterval>
      }
    }, 50)
  }, 1000)
}

onMounted(() => startAnimation())
onUnmounted(() => {
  isDisposed = true
  if (timer) clearTimeout(timer)
})
</script>

<style lang="scss" scoped>
.ai-demo--write {
  display: flex;
  justify-content: center;
}

.write-demo__editor {
  @include glass-card;
  max-width: 500px;
  width: 100%;
  overflow: hidden;
}

.write-demo__toolbar {
  display: flex;
  align-items: center;
  gap: $spacing-xs;
  padding: $spacing-sm $spacing-md;
  background: rgba($primary-color, 0.06);
  border-bottom: 1px solid $border-glass;
  font-size: $font-size-xs;
  font-weight: 600;
  color: $primary-light;
}

.write-demo__content {
  padding: $spacing-md;
  min-height: 100px;
}

.write-demo__line {
  font-size: $font-size-sm;
  line-height: 1.7;
  color: $primary-light;
  margin: 0 0 0.5em;

  &:last-child {
    margin-bottom: 0;
  }
}

.write-demo__cursor-blink {
  color: $primary-light;
  animation: blink 1s step-end infinite;
  font-size: $font-size-md;
}

.write-demo__cursor-inline {
  color: $primary-light;
  animation: blink 1s step-end infinite;
}

@keyframes blink {
  50% { opacity: 0; }
}
</style>
