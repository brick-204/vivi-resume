<template>
  <section ref="sectionRef" class="ai-demo-section">
    <div class="ai-demo-section__header">
      <h2 class="ai-demo-section__title">
        <span class="ai-demo-section__title-highlight">AI</span> 智能助手
      </h2>
      <p class="ai-demo-section__subtitle">让 AI 为你的简历增色</p>
    </div>

    <!-- Tab 切换 -->
    <div class="ai-demo-section__tabs">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        class="demo-tab"
        :class="{ 'demo-tab--active': activeTab === tab.id }"
        @click="activeTab = tab.id"
      >
        <Icon :icon="tab.icon" :width="16" />
        <span>{{ tab.label }}</span>
      </button>
    </div>

    <!-- Demo 内容 -->
    <div class="ai-demo-section__content">
      <AIPolishDemo v-if="activeTab === 'polish'" />
      <AIEvalDemo v-if="activeTab === 'eval'" />
      <AIScanDemo v-if="activeTab === 'scan'" />
      <AIOptimizeDemo v-if="activeTab === 'optimize'" />
      <AIInterviewDemo v-if="activeTab === 'interview'" />
      <AIWriteDemo v-if="activeTab === 'write'" />
      <AIImportDemo v-if="activeTab === 'import'" />
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, defineAsyncComponent, h } from 'vue'
import { Icon } from '@iconify/vue'

// ponytail: 7 个 demo 改异步加载，减小首页 chunk；切换 tab 首次加载时显示内联骨架
const DemoSkeleton = {
  render() {
    return h('div', { class: 'ai-demo-section__loading' }, [
      h('div', { class: 'ai-demo-section__loading-bar', style: 'width: 60%; height: 14px;' }),
      h('div', { class: 'ai-demo-section__loading-bar', style: 'width: 80%; height: 14px; margin-top: 12px;' }),
      h('div', { class: 'ai-demo-section__loading-bar', style: 'width: 45%; height: 14px; margin-top: 12px;' }),
    ])
  }
}

const AIPolishDemo = defineAsyncComponent({
  loader: () => import('@/components/home/demo/AIPolishDemo.vue'),
  loadingComponent: DemoSkeleton,
  delay: 0,
})
const AIEvalDemo = defineAsyncComponent({
  loader: () => import('@/components/home/demo/AIEvalDemo.vue'),
  loadingComponent: DemoSkeleton,
  delay: 0,
})
const AIScanDemo = defineAsyncComponent({
  loader: () => import('@/components/home/demo/AIScanDemo.vue'),
  loadingComponent: DemoSkeleton,
  delay: 0,
})
const AIOptimizeDemo = defineAsyncComponent({
  loader: () => import('@/components/home/demo/AIOptimizeDemo.vue'),
  loadingComponent: DemoSkeleton,
  delay: 0,
})
const AIInterviewDemo = defineAsyncComponent({
  loader: () => import('@/components/home/demo/AIInterviewDemo.vue'),
  loadingComponent: DemoSkeleton,
  delay: 0,
})
const AIWriteDemo = defineAsyncComponent({
  loader: () => import('@/components/home/demo/AIWriteDemo.vue'),
  loadingComponent: DemoSkeleton,
  delay: 0,
})
const AIImportDemo = defineAsyncComponent({
  loader: () => import('@/components/home/demo/AIImportDemo.vue'),
  loadingComponent: DemoSkeleton,
  delay: 0,
})

const sectionRef = ref<HTMLElement | null>(null)
const activeTab = ref<'polish' | 'eval' | 'scan' | 'optimize' | 'interview' | 'write' | 'import'>('polish')

const tabs = [
  { id: 'polish' as const, label: 'AI 润色', icon: 'mdi:auto-fix' },
  { id: 'eval' as const, label: '简历评估', icon: 'mdi:clipboard-check-outline' },
  { id: 'scan' as const, label: 'JD 扫描', icon: 'mdi:text-search' },
  { id: 'optimize' as const, label: '一键优化', icon: 'mdi:creation' },
  { id: 'interview' as const, label: '面试准备', icon: 'mdi:account-tie' },
  { id: 'write' as const, label: 'AI 帮写', icon: 'mdi:pencil-plus' },
  { id: 'import' as const, label: 'AI 智能导入', icon: 'mdi:file-import-outline' },
]
</script>

<style lang="scss" scoped>
.ai-demo-section {
  padding: $spacing-3xl 0;
}

.ai-demo-section__header {
  text-align: center;
  margin-bottom: $spacing-2xl;
}

.ai-demo-section__title {
  font-size: $font-size-3xl;
  font-weight: 700;
  color: $text-primary;
  margin-bottom: $spacing-sm;

  @include mobile {
    font-size: $font-size-2xl;
  }
}

.ai-demo-section__title-highlight {
  @include gradient-text;
}

.ai-demo-section__subtitle {
  font-size: $font-size-lg;
  color: $text-secondary;
}

// Tab 切换
.ai-demo-section__tabs {
  display: flex;
  justify-content: center;
  gap: $spacing-sm;
  margin-bottom: $spacing-2xl;
  flex-wrap: wrap;
}

.demo-tab {
  display: inline-flex;
  align-items: center;
  gap: $spacing-xs;
  padding: $spacing-sm $spacing-lg;
  border-radius: $radius-lg;
  font-size: $font-size-sm;
  font-weight: 600;
  cursor: pointer;
  transition: all $transition-base;
  border: 1px solid $border-glass;
  background: $bg-glass;
  color: $text-secondary;
  font-family: $font-family;

  &:hover {
    border-color: rgba($primary-color, 0.3);
    color: $primary-light;
  }

  &--active {
    background: rgba($primary-color, 0.12);
    border-color: $primary-color;
    color: $primary-light;

    &:hover {
      background: rgba($primary-color, 0.18);
    }
  }
}

.ai-demo-section__content {
  @include glass;
  border-radius: $radius-lg;
  padding: $spacing-lg;
  overflow: hidden;
}

// ponytail: demo 异步加载时的内联骨架占位
.ai-demo-section__loading {
  padding: $spacing-md;
  min-height: 80px;
}

.ai-demo-section__loading-bar {
  border-radius: $radius-sm;
  background: linear-gradient(
    90deg,
    rgba($primary-color, 0.10) 25%,
    rgba($primary-color, 0.20) 50%,
    rgba($primary-color, 0.10) 75%
  );
  animation: ai-demo-shimmer 1.5s ease-in-out infinite;
}

@keyframes ai-demo-shimmer {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 0.85; }
}
</style>
