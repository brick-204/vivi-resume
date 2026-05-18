<template>
  <div class="section">
    <div class="section__header">
      <h3 class="section__title">
        <span class="title__icon">
          <Icon :icon="EDUCATION_ICON" :width="18" :height="18" />
        </span>
        教育经历
      </h3>
    </div>

    <div v-if="items.length === 0" class="section__empty">
      <span>暂无教育经历，点击下方按钮添加</span>
    </div>

    <div v-else class="section__list">
      <div v-for="item in items" :key="item.id" class="card">
        <div class="card__header">
          <span class="card__school">{{ item.school || '未填写学校' }}</span>
          <button class="card__delete" aria-label="删除" @click="deleteItem(item.id)">
            <Icon :icon="TRASH_ICON" :width="20" :height="20" />
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
import { TRASH_ICON, EDUCATION_ICON } from '@/components/icons/SectionIcons'
import { Icon } from '@iconify/vue'
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

defineExpose({ addItem })
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

.card {
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
    color: $error-color;
    border: none;
    border-radius: $radius-md;
    cursor: pointer;
    transition: all $transition-fast;
    flex-shrink: 0;

    &:hover {
      background: rgba($error-color, 0.15);
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