<template>
  <div class="section self-evaluation">
    <h3 class="section__title">
      <span class="title__icon">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M3 5H15C15.5523 5 16 5.44772 16 6V11C16 11.5523 15.5523 12 15 12H6L3 14V6C3 5.44772 3.44772 5 3 5Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
          <path d="M6 8H12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
      </span>
      自我评价
    </h3>
    <div class="section__form">
      <BaseTextarea
        v-model="selfEvaluation"
        placeholder="简要介绍自己的优势、职业目标和个人特质..."
        :rows="8"
      />
      <div class="section__tip">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.2"/>
          <path d="M8 5V8.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          <circle cx="8" cy="11" r="0.5" fill="currentColor"/>
        </svg>
        <span>提示：写 3-5 点核心优势，突出与目标岗位的匹配度</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useResumeStore } from '@/stores/resumeStore'
import BaseTextarea from '@/components/common/BaseTextarea.vue'

const store = useResumeStore()

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
</style>