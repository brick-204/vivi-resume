<template>
  <div class="section custom-text">
    <div class="section__header">
      <h3 class="section__title">
        <span class="title__icon">
          <Icon :icon="TEXT_EDIT_ICON" :width="18" :height="18" />
        </span>
        <span class="section__title-text" contenteditable v-text="getSectionTitle(store.currentResume, sectionId)" @keydown.enter.prevent @blur="saveTitle($event, sectionId)"></span>
      </h3>
    </div>
    <div class="section__form">
      <BaseTextarea
        v-model="content"
        placeholder="输入自定义内容..."
        :rows="8"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useResumeStore } from '@/stores/resumeStore'
import { useSectionTitle } from '@/composables/useSectionTitle'
import { TEXT_EDIT_ICON } from '@/components/icons/SectionIcons'
import { Icon } from '@iconify/vue'
import BaseTextarea from '@/components/common/BaseTextarea.vue'

const props = defineProps<{
  sectionId: string
}>()

const store = useResumeStore()
const { saveTitle, getSectionTitle } = useSectionTitle()

const sectionIndex = computed(() => {
  const match = props.sectionId.match(/^customText_(\d+)$/)
  return match ? parseInt(match[1]) : -1
})

const content = computed({
  get: () => store.currentResume?.customTexts[sectionIndex.value]?.content || '',
  set: (value) => {
    if (sectionIndex.value < 0) return
    const texts = [...store.currentResume!.customTexts]
    texts[sectionIndex.value] = { ...texts[sectionIndex.value], content: value }
    store.updateCurrentResume({ customTexts: texts })
  }
})
</script>

<style lang="scss" scoped>
.section {
  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: $spacing-lg;
    padding-bottom: $spacing-md;
    position: relative;

    &::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 0;
      width: 100%;
      height: 1px;
      background: linear-gradient(90deg, $accent-color, transparent);
    }
  }

  &__title {
    display: flex;
    align-items: center;
    gap: $spacing-sm;
    font-size: $font-size-lg;
    font-weight: 700;
    color: $text-primary;
  }

  &__form {
    max-width: 100%;
  }
}

.title__icon {
  display: flex;
  color: $accent-light;
}

@include editable-title;
</style>
