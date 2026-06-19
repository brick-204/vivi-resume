<template>
  <div class="ai-demo ai-demo--scan">
    <div class="scan-demo__score">
      <div class="scan-demo__ring" :style="ringStyle">
        <span class="scan-demo__ring-value">{{ displayScore }}%</span>
      </div>
      <div class="scan-demo__score-label">JD 匹配度</div>
    </div>
    <div class="scan-demo__keywords">
      <div class="scan-demo__kw-group">
        <div class="scan-demo__kw-title">
          <Icon icon="mdi:check-circle-outline" :width="16" />
          已匹配关键词
        </div>
        <div class="scan-demo__kw-tags">
          <span
            v-for="(kw, idx) in matchedKeywords"
            :key="kw"
            class="scan-demo__tag scan-demo__tag--matched"
            :class="{ 'scan-demo__tag--visible': idx < visibleMatched }"
            :style="{ transitionDelay: `${idx * 0.1}s` }"
          >{{ kw }}</span>
        </div>
      </div>
      <div class="scan-demo__kw-group">
        <div class="scan-demo__kw-title">
          <Icon icon="mdi:close-circle-outline" :width="16" />
          缺失关键词
        </div>
        <div class="scan-demo__kw-tags">
          <span
            v-for="(kw, idx) in missingKeywords"
            :key="kw"
            class="scan-demo__tag scan-demo__tag--missing"
            :class="{ 'scan-demo__tag--visible': idx < visibleMissing }"
            :style="{ transitionDelay: `${(visibleMatched + idx) * 0.1}s` }"
          >{{ kw }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Icon } from '@iconify/vue'

const TARGET_SCORE = 72
const displayScore = ref(0)
const visibleMatched = ref(0)
const visibleMissing = ref(0)

const matchedKeywords = ['Vue.js', 'TypeScript', '前端架构', '性能优化', '组件化']
const missingKeywords = ['微前端', 'CI/CD', 'Node.js']

const ringStyle = computed(() => {
  const score = displayScore.value
  const percentage = score / 100
  let color = '#ef4444'
  if (score >= 80) color = '#22c55e'
  else if (score >= 60) color = '#eab308'
  return {
    '--ring-color': color,
    '--ring-percentage': `${percentage}`,
  }
})

let animFrame: number | null = null
let kwTimer: ReturnType<typeof setInterval> | null = null
let isDisposed = false

const startAnimation = () => {
  if (isDisposed) return
  displayScore.value = 0
  visibleMatched.value = 0
  visibleMissing.value = 0

  // 分数动画
  const startTime = performance.now()
  const duration = 1500
  const animate = (now: number) => {
    const elapsed = now - startTime
    const progress = Math.min(elapsed / duration, 1)
    const eased = 1 - Math.pow(1 - progress, 3)
    displayScore.value = Math.round(eased * TARGET_SCORE)
    if (progress < 1) {
      animFrame = requestAnimationFrame(animate)
    }
  }
  animFrame = requestAnimationFrame(animate)

  // 关键词逐个出现
  let step = 0
  kwTimer = setInterval(() => {
    step++
    if (step <= matchedKeywords.length) {
      visibleMatched.value = step
    } else if (step <= matchedKeywords.length + missingKeywords.length) {
      visibleMissing.value = step - matchedKeywords.length
    } else {
      if (kwTimer) clearInterval(kwTimer)
      // 2秒后重新开始
      setTimeout(startAnimation, 2000)
    }
  }, 300)
}

onMounted(() => startAnimation())
onUnmounted(() => {
  isDisposed = true
  if (animFrame) cancelAnimationFrame(animFrame)
  if (kwTimer) clearInterval(kwTimer)
})
</script>

<style lang="scss" scoped>
.ai-demo--scan {
  display: flex;
  align-items: center;
  gap: $spacing-2xl;
  padding: $spacing-lg;

  @include mobile {
    flex-direction: column;
    gap: $spacing-lg;
  }
}

.scan-demo__score {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: $spacing-xs;
  flex-shrink: 0;
}

.scan-demo__ring {
  width: 90px;
  height: 90px;
  border-radius: 50%;
  background: conic-gradient(
    var(--ring-color) calc(var(--ring-percentage) * 360deg),
    rgba($text-light, 0.15) calc(var(--ring-percentage) * 360deg)
  );
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;

  &::before {
    content: '';
    width: 70px;
    height: 70px;
    border-radius: 50%;
    background: $bg-glass;
    position: absolute;
  }
}

.scan-demo__ring-value {
  position: relative;
  z-index: 1;
  font-size: 20px;
  font-weight: 700;
  color: $text-primary;
}

.scan-demo__score-label {
  font-size: $font-size-xs;
  color: $text-secondary;
}

.scan-demo__keywords {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: $spacing-md;
}

.scan-demo__kw-group {
  display: flex;
  flex-direction: column;
  gap: $spacing-xs;
}

.scan-demo__kw-title {
  display: flex;
  align-items: center;
  gap: $spacing-xs;
  font-size: $font-size-xs;
  font-weight: 600;
  color: $text-secondary;
}

.scan-demo__kw-tags {
  display: flex;
  flex-wrap: wrap;
  gap: $spacing-xs;
}

.scan-demo__tag {
  padding: 4px 10px;
  border-radius: $radius-full;
  font-size: $font-size-xs;
  font-weight: 500;
  opacity: 0;
  transform: scale(0.8);
  transition: all 0.3s ease;

  &--visible {
    opacity: 1;
    transform: scale(1);
  }

  &--matched {
    background: rgba($success-color, 0.12);
    color: $success-color;
    border: 1px solid rgba($success-color, 0.25);
  }

  &--missing {
    background: rgba($error-color, 0.08);
    color: $error-color;
    border: 1px solid rgba($error-color, 0.2);
  }
}
</style>
