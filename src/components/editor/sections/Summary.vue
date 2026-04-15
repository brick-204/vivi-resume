<template>
  <div class="section summary">
    <h3 class="section__title">
      <span class="title__icon">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M3 4H15C15.5523 4 16 4.44772 16 5V10C16 10.5523 15.5523 11 15 11H5L2 13V5C2 4.44772 2.44772 4 3 4Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
          <path d="M5 7H13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
      </span>
      个人简介
    </h3>
    <div class="section__form">
      <BaseTextarea
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
import BaseTextarea from '@/components/common/BaseTextarea.vue'

const store = useResumeStore()

const summary = computed({
  get: () => store.currentResume?.basicInfo.summary || '',
  set: (value) => {
    const currentBasicInfo = store.currentResume?.basicInfo || {}
    store.updateCurrentResume({
      basicInfo: { ...currentBasicInfo, summary: value }
    })
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
</style>