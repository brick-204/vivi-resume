<template>
  <!--
    ponytail: 路由级骨架覆盖层。
    - 盖在 App.vue 顶层，z-index 9998（低于 index.html 静态 app-shell 的 9999，高于一切页面内容）
    - router.beforeEach 命中 to.meta.skeleton 时显示，afterEach + nextTick 隐藏
    - 按 name 映射到各路由专属整页骨架；editor 复用现有 EditorSkeleton
    - 同路由参数变化（to.name === from.name）不触发，避免闪烁
  -->
  <Transition name="route-skeleton-fade">
    <div v-if="visible" class="route-skeleton-overlay" aria-hidden="true">
      <component :is="skeletonComponent" />
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed, type Component } from 'vue'
import HomeRouteSkeleton from '@/components/home/HomeRouteSkeleton.vue'
import DashboardRouteSkeleton from '@/components/dashboard/DashboardRouteSkeleton.vue'
import EditorSkeleton from '@/components/common/EditorSkeleton.vue'
import TemplatesRouteSkeleton from '@/components/templates/TemplatesRouteSkeleton.vue'

const props = defineProps<{
  visible: boolean
  name: string
}>()

// ponytail: 静态映射表，无运行时分支
const skeletonMap: Record<string, Component> = {
  home: HomeRouteSkeleton,
  dashboard: DashboardRouteSkeleton,
  editor: EditorSkeleton,
  templates: TemplatesRouteSkeleton,
}

const skeletonComponent = computed(() => skeletonMap[props.name] ?? HomeRouteSkeleton)
</script>

<style lang="scss" scoped>
.route-skeleton-overlay {
  position: fixed;
  inset: 0;
  z-index: 9998;
  background: $bg-secondary;
  overflow: hidden;
}

// 淡入淡出，与 EditorView editor-fade 一致
.route-skeleton-fade-enter-active,
.route-skeleton-fade-leave-active {
  transition: opacity 0.2s ease;
}
.route-skeleton-fade-enter-from,
.route-skeleton-fade-leave-to {
  opacity: 0;
}
</style>
