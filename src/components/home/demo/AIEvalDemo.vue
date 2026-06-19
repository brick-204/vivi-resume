<template>
  <div class="ai-demo ai-demo--eval">
    <div class="eval-demo__score">
      <div class="eval-demo__ring" :style="ringStyle">
        <span class="eval-demo__ring-value">{{ displayScore }}</span>
        <span class="eval-demo__ring-label">/100</span>
      </div>
      <div class="eval-demo__score-text">{{ scoreLabel }}</div>
    </div>
    <div class="eval-demo__items">
      <div
        v-for="(item, idx) in evalItems"
        :key="idx"
        class="eval-demo__item"
        :class="{ 'eval-demo__item--visible': idx < visibleItemCount }"
        :style="{ transitionDelay: `${idx * 0.3}s` }"
      >
        <Icon :icon="item.icon" :width="16" :class="`eval-demo__item-icon--${item.type}`" />
        <span>{{ item.text }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Icon } from '@iconify/vue'

const TARGET_SCORE = 78
const displayScore = ref(0)
const visibleItemCount = ref(0)
let animFrame: number | null = null
let itemTimer: ReturnType<typeof setInterval> | null = null
let isDisposed = false

const scoreLabel = computed(() => {
  const s = displayScore.value
  if (s >= 90) return '优秀'
  if (s >= 80) return '良好'
  if (s >= 70) return '中等偏上'
  if (s >= 60) return '及格'
  return '需要改进'
})

const ringStyle = computed(() => {
  const score = displayScore.value
  const percentage = score / 100
  // 颜色从红到黄到绿
  let color = '#ef4444'
  if (score >= 80) color = '#22c55e'
  else if (score >= 60) color = '#eab308'
  return {
    '--ring-color': color,
    '--ring-percentage': `${percentage}`,
  }
})

const evalItems = [
  { icon: 'mdi:check-circle-outline', text: '个人简介表述专业，核心能力突出', type: 'good' },
  { icon: 'mdi:alert-circle-outline', text: '工作经历缺少量化成果，建议补充数据', type: 'warn' },
  { icon: 'mdi:check-circle-outline', text: '技能模块关键词丰富，匹配度高', type: 'good' },
  { icon: 'mdi:alert-circle-outline', text: '项目描述建议使用 STAR 法则重构', type: 'warn' },
]

const startAnimation = () => {
  if (isDisposed) return
  displayScore.value = 0
  visibleItemCount.value = 0
  const startTime = performance.now()
  const duration = 1500

  const animate = (now: number) => {
    const elapsed = now - startTime
    const progress = Math.min(elapsed / duration, 1)
    // easeOutCubic
    const eased = 1 - Math.pow(1 - progress, 3)
    displayScore.value = Math.round(eased * TARGET_SCORE)

    if (progress < 1) {
      animFrame = requestAnimationFrame(animate)
    }
  }
  animFrame = requestAnimationFrame(animate)

  // 逐条显示评估条目
  let itemCount = 0
  itemTimer = setInterval(() => {
    itemCount++
    visibleItemCount.value = itemCount
    if (itemCount >= evalItems.length) {
      if (itemTimer) clearInterval(itemTimer)
      // 2秒后重新开始
      setTimeout(startAnimation, 2000)
    }
  }, 600)
}

onMounted(() => startAnimation())
onUnmounted(() => {
  isDisposed = true
  if (animFrame) cancelAnimationFrame(animFrame)
  if (itemTimer) clearInterval(itemTimer)
})
</script>

<style lang="scss" scoped>
.ai-demo--eval {
  display: flex;
  align-items: center;
  gap: $spacing-2xl;
  padding: $spacing-lg;

  @include mobile {
    flex-direction: column;
    gap: $spacing-lg;
  }
}

.eval-demo__score {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: $spacing-xs;
  flex-shrink: 0;
}

.eval-demo__ring {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background: conic-gradient(
    var(--ring-color) calc(var(--ring-percentage) * 360deg),
    rgba($text-light, 0.15) calc(var(--ring-percentage) * 360deg)
  );
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;

  &::before {
    content: '';
    width: 78px;
    height: 78px;
    border-radius: 50%;
    background: $bg-glass;
    position: absolute;
  }
}

.eval-demo__ring-value {
  position: relative;
  z-index: 1;
  font-size: 28px;
  font-weight: 700;
  color: $text-primary;
  line-height: 1;
}

.eval-demo__ring-label {
  position: relative;
  z-index: 1;
  font-size: 11px;
  color: $text-light;
}

.eval-demo__score-text {
  font-size: $font-size-sm;
  color: $text-secondary;
  font-weight: 600;
}

.eval-demo__items {
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;
  flex: 1;
}

.eval-demo__item {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  font-size: $font-size-sm;
  color: $text-primary;
  padding: $spacing-sm $spacing-md;
  background: $bg-glass;
  border-radius: $radius-md;
  border: 1px solid $border-glass;
  opacity: 0;
  transform: translateY(8px);
  transition: all 0.4s ease;

  &--visible {
    opacity: 1;
    transform: translateY(0);
  }
}

.eval-demo__item-icon--good {
  color: $success-color;
}

.eval-demo__item-icon--warn {
  color: $warning-color;
}
</style>
