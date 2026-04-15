<template>
  <div class="section work-experience">
    <div class="section__header">
      <h3 class="section__title">
        <span class="title__icon">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <rect x="2" y="6" width="14" height="10" rx="2" stroke="currentColor" stroke-width="1.5"/>
            <path d="M6 6V4C6 3.44772 6.44772 3 7 3H11C11.5523 3 12 3.44772 12 4V6" stroke="currentColor" stroke-width="1.5"/>
            <path d="M9 10H9.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </span>
        工作经历
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
      <span>暂无工作经历，点击上方按钮添加</span>
    </div>

    <div v-else class="section__list">
      <div v-for="item in items" :key="item.id" class="experience-card">
        <div class="card__header">
          <div class="card__info">
            <span class="card__position">{{ item.position || '未填写职位' }}</span>
            <span class="card__company">@ {{ item.company || '未填写公司' }}</span>
          </div>
          <button class="card__delete" @click="deleteItem(item.id)">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M3 4H11M5 4V3C5 2.44772 5.44772 2 6 2H8C8.55228 2 9 2.44772 9 3V4M6 6V10M8 6V10M4 4L5 11H9L10 4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>
        <div class="card__form">
          <div class="form__row">
            <BaseInput v-model="item.company" label="公司名称" placeholder="请输入公司名称" />
            <BaseInput v-model="item.position" label="职位" placeholder="请输入职位" />
          </div>
          <div class="form__row">
            <BaseInput v-model="item.startDate" label="开始时间" type="date" />
            <BaseInput v-model="item.endDate" label="结束时间" type="date" />
          </div>
          <BaseTextarea v-model="item.description" label="工作描述" placeholder="描述你的主要职责和成就..." :rows="3" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useResumeStore } from '@/stores/resumeStore'
import { generateId } from '@/types/resume'
import type { WorkItem } from '@/types/resume'
import BaseInput from '@/components/common/BaseInput.vue'
import BaseTextarea from '@/components/common/BaseTextarea.vue'

const store = useResumeStore()

const items = computed({
  get: () => store.currentResume?.workExperience || [],
  set: (value) => store.updateCurrentResume({ workExperience: value })
})

const addItem = () => {
  const newItem: WorkItem = {
    id: generateId(),
    company: '',
    position: '',
    startDate: '',
    endDate: '',
    description: '',
    highlights: []
  }
  store.updateCurrentResume({
    workExperience: [...items.value, newItem]
  })
}

const deleteItem = (id: string) => {
  store.updateCurrentResume({
    workExperience: items.value.filter(item => item.id !== id)
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
      background: linear-gradient(90deg, $primary-color, transparent);
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
  color: $primary-light;
}

.add-btn {
  display: flex;
  align-items: center;
  gap: $spacing-xs;
  padding: $spacing-sm $spacing-md;
  background: $bg-glass;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  color: $secondary-light;
  border: 1px solid rgba($secondary-color, 0.3);
  border-radius: $radius-lg;
  font-size: $font-size-sm;
  font-weight: 600;
  cursor: pointer;
  transition: all $transition-fast;
  font-family: $font-family;

  &:hover {
    background: rgba($secondary-color, 0.2);
    border-color: $secondary-color;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba($secondary-color, 0.2);
  }
}

.experience-card {
  @include glass;
  padding: $spacing-lg;
  border-left: 3px solid $primary-color;
  border-radius: $radius-xl;

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: $spacing-md;
  }

  &__info {
    display: flex;
    align-items: baseline;
    gap: $spacing-xs;
  }

  &__position {
    font-size: $font-size-md;
    font-weight: 700;
    color: $text-primary;
  }

  &__company {
    font-size: $font-size-sm;
    color: $text-secondary;
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