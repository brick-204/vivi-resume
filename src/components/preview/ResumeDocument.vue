<template>
  <component
    :is="templateComponent"
    :resume="resume"
    @click-section="$emit('click-section', $event)"
  />
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, type Component } from 'vue'
import type { Resume } from '@/types/resume'

const TEMPLATE_MAP: Record<string, Component> = {
  classic: defineAsyncComponent(() => import('./templates/classic/ClassicTemplate.vue')),
  modern: defineAsyncComponent(() => import('./templates/modern/ModernTemplate.vue')),
  minimal: defineAsyncComponent(() => import('./templates/minimal/MinimalTemplate.vue')),
  timeline: defineAsyncComponent(() => import('./templates/timeline/TimelineTemplate.vue')),
  elegant: defineAsyncComponent(() => import('./templates/elegant/ElegantTemplate.vue')),
  twocolumn: defineAsyncComponent(() => import('./templates/twocolumn/TwoColumnTemplate.vue')),
  sidebar: defineAsyncComponent(() => import('./templates/sidebar/SidebarTemplate.vue')),
}

const props = defineProps<{ resume: Resume; templateId: string }>()
defineEmits<{ 'click-section': [tabId: string] }>()

const templateComponent = computed(() => TEMPLATE_MAP[props.templateId] || TEMPLATE_MAP.classic)
</script>
