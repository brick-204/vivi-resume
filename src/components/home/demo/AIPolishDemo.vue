<template>
  <div class="ai-demo ai-demo--polish">
    <div class="ai-demo__pane">
      <div class="ai-demo__pane-header">
        <Icon icon="mdi:file-document-outline" :width="14" />
        原文
      </div>
      <div class="ai-demo__pane-content">
        <p>负责前端开发工作，参与项目开发，做了很多页面的开发。和后端同事配合，完成了好几个功能模块。优化了一些页面的加载速度。</p>
      </div>
    </div>
    <div class="ai-demo__divider">
      <Icon icon="mdi:arrow-right" :width="20" />
    </div>
    <div class="ai-demo__pane">
      <div class="ai-demo__pane-header ai-demo__pane-header--accent">
        <Icon icon="mdi:auto-fix" :width="14" />
        润色后
      </div>
      <div class="ai-demo__pane-content">
        <span class="ai-demo__typing">{{ displayedText }}</span>
        <span v-if="isTyping" class="ai-demo__cursor" aria-hidden="true">▌</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { Icon } from '@iconify/vue'

const FULL_TEXT = '主导前端架构设计与核心模块开发，跨职能协作交付多个功能迭代。独立优化首屏加载性能，LCP 降低 40%，用户体验显著提升。'

const displayedText = ref('')
const isTyping = ref(false)
let timer: ReturnType<typeof setInterval> | null = null
let charIndex = 0
let isDisposed = false

const startAnimation = () => {
  if (isDisposed) return
  displayedText.value = ''
  charIndex = 0
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
  }, 60)
}

onMounted(() => startAnimation())
onUnmounted(() => {
  isDisposed = true
  if (timer) clearTimeout(timer)
})
</script>

<style lang="scss" scoped>
.ai-demo {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: $spacing-md;
  align-items: stretch;

  @include mobile {
    grid-template-columns: 1fr;
  }
}

.ai-demo__pane {
  @include glass;
  border-radius: $radius-md;
  overflow: hidden;
}

.ai-demo__pane-header {
  display: flex;
  align-items: center;
  gap: $spacing-xs;
  padding: $spacing-sm $spacing-md;
  font-size: $font-size-xs;
  font-weight: 600;
  color: $text-secondary;
  background: $bg-glass;
  border-bottom: 1px solid $border-glass;

  &--accent {
    color: $primary-light;
  }
}

.ai-demo__pane-content {
  padding: $spacing-md;
  font-size: $font-size-sm;
  line-height: 1.7;
  color: $text-primary;
  min-height: 80px;
}

.ai-demo__divider {
  display: flex;
  align-items: center;
  color: $primary-light;

  @include mobile {
    justify-content: center;
    transform: rotate(90deg);
  }
}

.ai-demo__typing {
  color: $primary-light;
}

.ai-demo__cursor {
  color: $primary-light;
  animation: blink 1s step-end infinite;
}

@keyframes blink {
  50% { opacity: 0; }
}
</style>
