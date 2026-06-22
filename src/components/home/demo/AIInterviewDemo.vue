<template>
  <div class="ai-demo ai-demo--interview">
    <div class="interview-demo__questions">
      <div class="interview-demo__header">
        <Icon icon="mdi:account-tie" :width="14" />
        面试题
      </div>
      <div class="interview-demo__list">
        <div
          v-for="(q, idx) in questions"
          :key="idx"
          class="interview-demo__question"
          :class="{ 'interview-demo__question--visible': idx < visibleCount }"
          :style="{ transitionDelay: `${idx * 0.35}s` }"
        >
          <span class="interview-demo__q-badge">{{ q.type }}</span>
          <span class="interview-demo__q-text">{{ q.text }}</span>
        </div>
      </div>
    </div>
    <div class="interview-demo__tips">
      <div class="interview-demo__header interview-demo__header--accent">
        <Icon icon="mdi:lightbulb-outline" :width="14" />
        复习要点
      </div>
      <div class="interview-demo__tip-list">
        <div
          v-for="(tip, idx) in tips"
          :key="idx"
          class="interview-demo__tip"
          :class="{ 'interview-demo__tip--visible': idx < visibleTipCount }"
          :style="{ transitionDelay: `${(questions.length * 0.35 + idx * 0.3)}s` }"
        >
          <Icon icon="mdi:chevron-right" :width="14" class="interview-demo__tip-icon" />
          <span>{{ tip }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { Icon } from '@iconify/vue'

const questions = [
  { type: '行为', text: '描述一次你主导前端架构优化的经历' },
  { type: '技术', text: '如何设计高性能长列表渲染方案？' },
  { type: '行为', text: '跨团队协作中如何推动技术方案落地？' },
]

const tips = [
  '复习前端性能优化核心指标与方案',
  '准备 STAR 法则描述架构经验',
  '梳理跨团队协作的关键案例',
]

const visibleCount = ref(0)
const visibleTipCount = ref(0)
let timer: ReturnType<typeof setInterval> | null = null
let isDisposed = false

const startAnimation = () => {
  if (isDisposed) return
  visibleCount.value = 0
  visibleTipCount.value = 0

  let step = 0
  const totalSteps = questions.length + tips.length
  timer = setInterval(() => {
    step++
    if (step <= questions.length) {
      visibleCount.value = step
    } else {
      visibleTipCount.value = step - questions.length
    }
    if (step >= totalSteps) {
      if (timer) clearInterval(timer)
      setTimeout(startAnimation, 2500)
    }
  }, 350)
}

onMounted(() => startAnimation())
onUnmounted(() => {
  isDisposed = true
  if (timer) clearInterval(timer)
})
</script>

<style lang="scss" scoped>
.ai-demo--interview {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: $spacing-md;
  align-items: stretch;
  padding: $spacing-lg;

  @include mobile {
    grid-template-columns: 1fr;
  }
}

.interview-demo__questions,
.interview-demo__tips {
  @include glass;
  border-radius: $radius-md;
  overflow: hidden;
}

.interview-demo__header {
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

.interview-demo__list,
.interview-demo__tip-list {
  padding: $spacing-sm $spacing-md;
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;
}

.interview-demo__question {
  display: flex;
  align-items: flex-start;
  gap: $spacing-sm;
  padding: $spacing-sm;
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

.interview-demo__q-badge {
  flex-shrink: 0;
  padding: 2px 8px;
  border-radius: $radius-full;
  font-size: 10px;
  font-weight: 600;
  background: rgba($primary-color, 0.1);
  color: $primary-light;
  border: 1px solid rgba($primary-color, 0.2);
  margin-top: 1px;
}

.interview-demo__q-text {
  font-size: $font-size-sm;
  color: $text-primary;
  line-height: 1.5;
}

.interview-demo__tip {
  display: flex;
  align-items: center;
  gap: $spacing-xs;
  font-size: $font-size-sm;
  color: $text-primary;
  padding: $spacing-xs 0;
  opacity: 0;
  transform: translateX(-8px);
  transition: all 0.35s ease;

  &--visible {
    opacity: 1;
    transform: translateX(0);
  }
}

.interview-demo__tip-icon {
  color: $primary-light;
  flex-shrink: 0;
}
</style>
