<template>
  <header
    ref="headerRef"
    class="resume__header"
    :class="headerLayoutClass"
    data-section="basic"
    @click="emit('click-section', 'basic')"
  >
    <div v-if="hasPhoto" data-flip-id="photo" class="header__photo" :class="{ 'header__photo--rectangle': ctx.resume.basicInfo.photoShape === 'rectangle' }">
      <img :src="ctx.resume.basicInfo.photo" :alt="ctx.resume.basicInfo.name" class="header__photo-img" />
    </div>
    <div class="header__main">
      <h1 v-if="ctx.resume.basicInfo.name && ctx.isFieldVisible('name')" data-flip-id="name" class="header__name">{{ ctx.resume.basicInfo.name }}</h1>
      <p v-if="ctx.resume.basicInfo.title && ctx.isFieldVisible('title')" data-flip-id="title" class="header__title">{{ ctx.resume.basicInfo.title }}</p>
    </div>
    <TransitionGroup v-if="ctx.orderedAllFields.value.length" name="field-reorder" tag="div" class="header__fields">
      <span v-for="field in ctx.orderedAllFields.value" :key="field.key" :data-flip-id="`field-${field.key}`" class="header__field">
        <Icon v-if="field.showIcon" :icon="field.icon" class="header__field-icon" />
        <span v-if="field.showLabel" class="header__field-label">{{ field.label }}</span>
        <span class="header__field-value">{{ field.value }}</span>
      </span>
    </TransitionGroup>
  </header>
</template>

<script setup lang="ts">
import { inject, computed, ref, watch, nextTick } from 'vue'
import { ResumeDocumentKey } from '../ResumeDocumentKey'
import { Icon } from '@iconify/vue'
import { useFlipAnimation } from '@/composables/useFlipAnimation'
import type { HeaderLayout } from '@/types/resume'

const emit = defineEmits<{ 'click-section': [tabId: string, itemId?: string] }>()
const ctx = inject(ResumeDocumentKey)!

const headerRef = ref<HTMLElement>()
const headerLayout = computed<HeaderLayout>(() => ctx.resume.basicInfo.headerLayout || 'centered')
const hasPhoto = computed(() => ctx.resume.basicInfo.photo && ctx.isFieldVisible('photo'))

const headerLayoutClass = computed(() => ({
  'resume__header--photo-left': headerLayout.value === 'photo-left',
  'resume__header--photo-right': headerLayout.value === 'photo-right',
}))

const { recordPositions, animateLayoutChange } = useFlipAnimation(
  () => headerRef.value,
  '[data-flip-id]'
)

watch(headerLayout, () => {
  recordPositions()
  nextTick(() => animateLayoutChange())
}, { flush: 'pre' })
</script>
