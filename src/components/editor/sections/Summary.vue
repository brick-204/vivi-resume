<template>
  <div class="section summary">
    <h3 class="section__title">
      <span class="title__icon">
        <Icon :icon="MESSAGE_ICON" :width="18" :height="18" />
      </span>
      <span class="section__title-text" contenteditable v-text="getSectionTitle(store.currentResume, 'summary')" @keydown.enter.prevent @blur="saveTitle($event, 'summary')"></span>
    </h3>
    <div class="section__form">
      <RichTextEditor
        v-model="summary"
        label="简介内容"
        placeholder="简短介绍自己的职业背景和核心能力..."
        :rows="6"
      />
      <p class="section__hint">
        建议：突出你的核心竞争力、工作经验年限、擅长领域等关键信息
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useResumeStore } from '@/stores/resumeStore'
import { useSectionTitle } from '@/composables/useSectionTitle'
import { MESSAGE_ICON } from '@/components/icons/SectionIcons'
import { Icon } from '@iconify/vue'
import RichTextEditor from '@/components/common/RichTextEditor.vue'

const store = useResumeStore()
const { saveTitle, getSectionTitle } = useSectionTitle()

const summary = computed({
  get: () => store.currentResume?.basicInfo?.summary || '',
  set: (value) => {
    if (store.currentResume) {
      store.updateCurrentResume({
        basicInfo: { ...store.currentResume.basicInfo, summary: value }
      })
    }
  }
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
      background: linear-gradient(90deg, $primary-color, transparent);
    }
  }

  &__form {
    max-width: 100%;
  }

  &__hint {
    font-size: $font-size-xs;
    color: $text-light;
    margin-top: $spacing-sm;
    opacity: 0.8;
  }
}

.title__icon {
  display: flex;
  color: $primary-light;
}

@include editable-title;
</style>