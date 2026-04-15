<template>
  <div class="section education">
    <div class="section__header">
      <h3 class="section__title">
        <span class="title__icon">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M2 7L9 3L16 7" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
            <path d="M2 7V11L9 15L16 11V7" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
            <path d="M9 15V11" stroke="currentColor" stroke-width="1.5"/>
          </svg>
        </span>
        教育经历
      </h3>
      <button class="add-btn" @click="addItem">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M7 2V12M2 7H12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
        添加
      </button>
    </div>

    <div v-if="items.length === 0" class="section__empty">
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        <rect x="4" y="4" width="24" height="24" rx="6" stroke="currentColor" stroke-width="1.5" stroke-dasharray="3 3"/>
        <path d="M10 13H22M10 18H18" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
      <span>暂无教育经历，点击上方按钮添加</span>
    </div>

    <div v-else class="section__list">
      <div v-for="item in items" :key="item.id" class="education-card">
        <div class="card__header">
          <span class="card__school">{{ item.school || '未填写学校' }}</span>
          <button class="card__delete" @click="deleteItem(item.id)">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M3 4H11M5 4V3C5 2.44772 5.44772 2 6 2H8C8.55228 2 9 2.44772 9 3V4M6 6V10M8 6V10M4 4L5 11H9L10 4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>
        <div class="card__form">
          <BaseInput v-model="item.school" label="学校名称" placeholder="请输入学校名称" />
          <div class="form__row">
            <BaseInput v-model="item.degree" label="学历" placeholder="如：本科" />
            <BaseInput v-model="item.major" label="专业" placeholder="请输入专业" />
          </div>
          <div class="form__row">
            <BaseInput v-model="item.startDate" label="开始时间" type="date" />
            <BaseInput v-model="item.endDate" label="结束时间" type="date" />
          </div>
          <BaseTextarea v-model="item.description" label="补充说明" placeholder="如：GPA、获奖情况等..." :rows="2" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useResumeStore } from '@/stores/resumeStore'
import { generateId } from '@/types/resume'
import type { EducationItem } from '@/types/resume'
import BaseInput from '@/components/common/BaseInput.vue'
import BaseTextarea from '@/components/common/BaseTextarea.vue'

const store = useResumeStore()

const items = computed({
  get: () => store.currentResume?.education || [],
  set: (value) => store.updateCurrentResume({ education: value })
})

const addItem = () => {
  const newItem: EducationItem = {
    id: generateId(),
    school: '',
    degree: '',
    major: '',
    startDate: '',
    endDate: '',
    description: ''
  }
  store.updateCurrentResume({
    education: [...items.value, newItem]
  })
}

const deleteItem = (id: string) => {
  store.updateCurrentResume({
    education: items.value.filter(item => item.id !== id)
  })
}
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

  &__empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: $spacing-md;
    text-align: center;
    padding: $spacing-xl;
    color: $text-light;
    background: $bg-glass;
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px dashed $border-glass;
    border-radius: $radius-xl;
  }

  &__list {
    display: flex;
    flex-direction: column;
    gap: $spacing-lg;
  }
}

.title__icon {
  display: flex;
  color: $accent-light;
}

.add-btn {
  display: flex;
  align-items: center;
  gap: $spacing-xs;
  padding: $spacing-sm $spacing-md;
  background: $bg-glass;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  color: $accent-light;
  border: 1px solid rgba($accent-color, 0.3);
  border-radius: $radius-lg;
  font-size: $font-size-sm;
  font-weight: 600;
  cursor: pointer;
  transition: all $transition-fast;
  font-family: $font-family;

  &:hover {
    background: rgba($accent-color, 0.2);
    border-color: $accent-color;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba($accent-color, 0.2);
  }
}

.education-card {
  @include glass;
  padding: $spacing-lg;
  border-left: 3px solid $accent-color;
  border-radius: $radius-xl;

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: $spacing-md;
  }

  &__school {
    font-size: $font-size-md;
    font-weight: 700;
    color: $text-primary;
  }

  &__delete {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    background: transparent;
    color: $text-light;
    border: 1px solid transparent;
    border-radius: $radius-md;
    cursor: pointer;
    transition: all $transition-fast;

    &:hover {
      background: rgba($error-color, 0.15);
      border-color: rgba($error-color, 0.3);
      color: $error-color;
    }
  }

  &__form {
    display: flex;
    flex-direction: column;
    gap: $spacing-sm;
  }
}

.form__row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: $spacing-md;

  @include mobile {
    grid-template-columns: 1fr;
  }
}
</style>