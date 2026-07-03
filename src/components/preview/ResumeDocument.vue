<template>
  <component
    :is="templateComponent"
    :resume="resume"
    @click-section="(s: string, i?: string) => emit('click-section', s, i)"
  />
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, defineComponent, h, type Component } from 'vue'
import type { Resume } from '@/types/resume'

/** 模板组件异步加载时的占位 — 简单白色矩形 + 居中「加载中...」跳动文字，避免预览区空白 */
const TemplateLoadingPlaceholder = defineComponent({
  render() {
    return h('div', {
      style: {
        width: '100%',
        minHeight: '800px',
        background: 'var(--bg-glass)',
        borderRadius: '4px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }
    }, [
      h('span', {
        class: 'loading-text',
        style: { color: 'rgba(0, 0, 0, 0.45)' }
      }, '加载中...')
    ])
  }
})

const TEMPLATE_MAP: Record<string, Component> = {
  classic: defineAsyncComponent({
    loader: () => import('./templates/classic/ClassicTemplate.vue'),
    loadingComponent: TemplateLoadingPlaceholder,
    delay: 0,
  }),
  modern: defineAsyncComponent({
    loader: () => import('./templates/modern/ModernTemplate.vue'),
    loadingComponent: TemplateLoadingPlaceholder,
    delay: 0,
  }),
  minimal: defineAsyncComponent({
    loader: () => import('./templates/minimal/MinimalTemplate.vue'),
    loadingComponent: TemplateLoadingPlaceholder,
    delay: 0,
  }),
  timeline: defineAsyncComponent({
    loader: () => import('./templates/timeline/TimelineTemplate.vue'),
    loadingComponent: TemplateLoadingPlaceholder,
    delay: 0,
  }),
  elegant: defineAsyncComponent({
    loader: () => import('./templates/elegant/ElegantTemplate.vue'),
    loadingComponent: TemplateLoadingPlaceholder,
    delay: 0,
  }),
  twocolumn: defineAsyncComponent({
    loader: () => import('./templates/twocolumn/TwoColumnTemplate.vue'),
    loadingComponent: TemplateLoadingPlaceholder,
    delay: 0,
  }),
  sidebar: defineAsyncComponent({
    loader: () => import('./templates/sidebar/SidebarTemplate.vue'),
    loadingComponent: TemplateLoadingPlaceholder,
    delay: 0,
  }),
  professional: defineAsyncComponent({
    loader: () => import('./templates/professional/ProfessionalTemplate.vue'),
    loadingComponent: TemplateLoadingPlaceholder,
    delay: 0,
  }),
}

const props = defineProps<{ resume: Resume; templateId: string }>()
const emit = defineEmits<{ 'click-section': [tabId: string, itemId?: string] }>()

const templateComponent = computed(() => TEMPLATE_MAP[props.templateId] || TEMPLATE_MAP.classic)
</script>
