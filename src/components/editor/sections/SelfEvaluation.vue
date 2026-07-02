<template>
  <div class="section self-evaluation">
    <h3 class="section__title">
      <span class="title__icon">
        <Icon :icon="STAR_ICON" :width="18" :height="18" />
      </span>
      <span class="section__title-text" contenteditable @keydown.enter.prevent @blur="saveTitle($event, 'evaluation')" v-text="getSectionTitle(store.currentResume, 'evaluation')"></span>
    </h3>
    <div class="section__form">
      <RichTextEditor
        v-model="selfEvaluation"
        placeholder="简要介绍自己的优势、职业目标和个人特质..."
        :rows="8"
      />
      <div class="section__tip">
        <Icon :icon="INFO_ICON" :width="16" :height="16" />
        <span>提示：写 3-5 点核心优势，突出与目标岗位的匹配度</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useResumeStore } from '@/stores/resumeStore'
import { STAR_ICON, INFO_ICON } from '@/components/icons/SectionIcons'
import { useSectionTitle } from '@/composables/useSectionTitle'
import { Icon } from '@iconify/vue'
import RichTextEditor from '@/components/common/RichTextEditor.vue'

const store = useResumeStore()
const { saveTitle, getSectionTitle } = useSectionTitle()

const selfEvaluation = computed({
  get: () => store.currentResume?.selfEvaluation || '',
  set: (value) => store.updateCurrentResume({ selfEvaluation: value })
})
</script>

<style lang="scss" scoped>
.section {
  &__title {
    display: flex;
    align-items: center;
    gap: $spacing-sm;
    font-size: $font-size-lg;
    font-weight: 700;
    color: $text-primary;
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

  &__form {
    max-width: 100%;
  }

  &__tip {
    display: flex;
    align-items: center;
    gap: $spacing-sm;
    margin-top: $spacing-md;
    padding: $spacing-md;
    background: rgba($yellow-color, 0.08);
    border: 1px solid rgba($yellow-color, 0.15);
    border-radius: $radius-lg;
    font-size: $font-size-sm;
    color: $text-secondary;

    svg {
      flex-shrink: 0;
      color: $yellow-color;
    }
  }
}

.title__icon {
  display: flex;
  color: $accent-light;
}

@include editable-title;
</style>