<template>
  <div class="section">
    <div class="section__header">
      <h3 class="section__title">
        <span class="title__icon">
          <Icon :icon="BRIEFCASE_ICON" :width="18" :height="18" />
        </span>
        工作经历
      </h3>
    </div>

    <div v-if="items.length === 0" class="section__empty">
      <span>暂无工作经历，点击下方按钮添加</span>
    </div>

    <div v-else class="section__list">
      <div v-for="item in items" :key="item.id" class="card">
        <div class="card__header">
          <div class="card__info">
            <span class="card__position">{{
              item.position || "未填写职位"
            }}</span>
            <span class="card__company"
              >@ {{ item.company || "未填写公司" }}</span
            >
          </div>
          <button class="card__delete" aria-label="删除" @click="deleteItem(item.id)">
            <Icon :icon="TRASH_ICON" :width="20" :height="20" />
          </button>
        </div>
        <div class="card__form">
          <div class="form__row">
            <BaseInput
              v-model="item.company"
              label="公司名称"
              placeholder="请输入公司名称"
            />
            <BaseInput
              v-model="item.position"
              label="职位"
              placeholder="请输入职位"
            />
          </div>
          <div class="form__row">
            <BaseInput v-model="item.startDate" label="开始时间" type="month" />
            <div class="date-field">
              <BaseInput :model-value="item.endDate === '至今' ? '' : item.endDate" @update:model-value="item.endDate = $event" label="结束时间" type="month" :disabled="item.endDate === '至今'" />
              <div class="date-field__present">
                <input type="checkbox" :checked="item.endDate === '至今'" @change="item.endDate = ($event.target as HTMLInputElement).checked ? '至今' : ''" />
                至今
              </div>
            </div>
          </div>
          <BaseTextarea
            v-model="item.description"
            label="工作描述"
            placeholder="描述你的主要职责和成就..."
            :rows="3"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useResumeStore } from "@/stores/resumeStore";
import { generateId } from "@/types/resume";
import type { WorkItem } from "@/types/resume";
import { TRASH_ICON, BRIEFCASE_ICON } from "@/components/icons/SectionIcons";
import { Icon } from "@iconify/vue";
import BaseInput from "@/components/common/BaseInput.vue";
import BaseTextarea from "@/components/common/BaseTextarea.vue";

const store = useResumeStore();

const items = computed({
  get: () => store.currentResume?.workExperience || [],
  set: (value) => store.updateCurrentResume({ workExperience: value }),
});

const addItem = () => {
  const newItem: WorkItem = {
    id: generateId(),
    company: "",
    position: "",
    startDate: "",
    endDate: "",
    description: "",
    highlights: [],
  };
  store.updateCurrentResume({
    workExperience: [...items.value, newItem],
  });
};

const deleteItem = (id: string) => {
  store.updateCurrentResume({
    workExperience: items.value.filter((item) => item.id !== id),
  });
};

defineExpose({ addItem });
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
      content: "";
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

.card {
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

@include date-field;
</style>
