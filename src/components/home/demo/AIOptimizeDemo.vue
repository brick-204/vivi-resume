<template>
  <div class="ai-demo ai-demo--optimize">
    <div class="opt-demo__before">
      <div class="opt-demo__section-header">
        <Icon icon="mdi:file-document-outline" :width="14" />
        优化前
      </div>
      <div class="opt-demo__items">
        <div
          v-for="(item, idx) in beforeItems"
          :key="idx"
          class="opt-demo__item"
          :class="{ 'opt-demo__item--visible': idx < visibleBefore }"
          :style="{ transitionDelay: `${idx * 0.3}s` }"
        >
          <span class="opt-demo__item-label">{{ item.label }}</span>
          <span class="opt-demo__item-status opt-demo__item-status--warn">
            <Icon icon="mdi:alert-circle-outline" :width="14" />
            {{ item.status }}
          </span>
        </div>
      </div>
    </div>
    <div class="opt-demo__arrow">
      <Icon icon="mdi:arrow-right" :width="20" />
    </div>
    <div class="opt-demo__after">
      <div class="opt-demo__section-header opt-demo__section-header--accent">
        <Icon icon="mdi:creation" :width="14" />
        一键优化后
      </div>
      <div class="opt-demo__items">
        <div
          v-for="(item, idx) in afterItems"
          :key="idx"
          class="opt-demo__item"
          :class="{ 'opt-demo__item--visible': idx < visibleAfter }"
          :style="{ transitionDelay: `${idx * 0.3}s` }"
        >
          <span class="opt-demo__item-label">{{ item.label }}</span>
          <span class="opt-demo__item-status opt-demo__item-status--good">
            <Icon icon="mdi:check-circle-outline" :width="14" />
            {{ item.status }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { Icon } from '@iconify/vue'

const beforeItems = [
  { label: '个人简介', status: '表述笼统' },
  { label: '工作经历', status: '缺少量化' },
  { label: '项目经历', status: '不够结构化' },
  { label: '技能模块', status: '关键词少' },
]

const afterItems = [
  { label: '个人简介', status: '核心能力突出' },
  { label: '工作经历', status: '量化成果明确' },
  { label: '项目经历', status: 'STAR 法则重构' },
  { label: '技能模块', status: '关键词丰富' },
]

const visibleBefore = ref(0)
const visibleAfter = ref(0)
let timer: ReturnType<typeof setInterval> | null = null
let isDisposed = false

const startAnimation = () => {
  if (isDisposed) return
  visibleBefore.value = 0
  visibleAfter.value = 0

  let step = 0
  const totalSteps = beforeItems.length + afterItems.length
  timer = setInterval(() => {
    step++
    if (step <= beforeItems.length) {
      visibleBefore.value = step
    } else {
      visibleAfter.value = step - beforeItems.length
    }
    if (step >= totalSteps) {
      if (timer) clearInterval(timer)
      setTimeout(startAnimation, 2500)
    }
  }, 400)
}

onMounted(() => startAnimation())
onUnmounted(() => {
  isDisposed = true
  if (timer) clearInterval(timer)
})
</script>

<style lang="scss" scoped>
.ai-demo--optimize {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: $spacing-md;
  align-items: stretch;
  padding: $spacing-lg;

  @include mobile {
    grid-template-columns: 1fr;
  }
}

.opt-demo__before,
.opt-demo__after {
  @include glass;
  border-radius: $radius-md;
  overflow: hidden;
}

.opt-demo__section-header {
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

.opt-demo__items {
  padding: $spacing-sm $spacing-md;
  display: flex;
  flex-direction: column;
  gap: $spacing-xs;
}

.opt-demo__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: $spacing-xs $spacing-sm;
  border-radius: $radius-sm;
  opacity: 0;
  transform: translateX(-8px);
  transition: all 0.4s ease;

  &--visible {
    opacity: 1;
    transform: translateX(0);
  }
}

.opt-demo__item-label {
  font-size: $font-size-sm;
  color: $text-primary;
  font-weight: 500;
}

.opt-demo__item-status {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  font-size: $font-size-xs;
  font-weight: 500;

  &--warn {
    color: $warning-color;
  }

  &--good {
    color: $success-color;
  }
}

.opt-demo__arrow {
  display: flex;
  align-items: center;
  color: $primary-light;

  @include mobile {
    justify-content: center;
    transform: rotate(90deg);
  }
}
</style>
