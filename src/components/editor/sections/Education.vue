<template>
  <div class="section">
    <div class="section__header">
      <h3 class="section__title">
        <span class="title__icon">
          <Icon :icon="EDUCATION_ICON" :width="18" :height="18" />
        </span>
        <span class="section__title-text" contenteditable v-text="getSectionTitle(store.currentResume, 'education')" @keydown.enter.prevent @blur="saveTitle($event, 'education')"></span>
      </h3>
    </div>

    <div v-if="items.length === 0" class="section__empty">
      <span>暂无教育经历，点击下方按钮添加</span>
    </div>

    <draggable v-else v-model="items" item-key="id" handle=".card__drag-handle" :animation="200" ghost-class="card--ghost" chosen-class="card--chosen" drag-class="card--drag" class="section__list" :scroll="scrollContainer" :scroll-sensitivity="80" :scroll-speed="10" @start="flipCards.recordPositions" @end="flipCards.animateFlip">
      <template #item="{ element: item }">
        <div class="card" :class="{ 'card--hidden': item.hidden }" :data-item-id="item.id" :data-flip-id="item.id" @click="emit('click-entry', item.id)">
          <span class="card__drag-handle">
            <Icon :icon="DRAG_HANDLE_ICON" :width="20" :height="20" />
          </span>
          <div class="card__header">
            <span class="card__school">{{ item.school || '未填写学校' }}</span>
            <div class="card__actions">
              <button class="card__toggle-visibility" :aria-label="item.hidden ? '显示' : '隐藏'" @click.stop="item.hidden = !item.hidden">
                <Icon :icon="item.hidden ? EYE_OFF_ICON : EYE_ICON" :width="18" :height="18" />
              </button>
              <n-popconfirm negative-text="取消" positive-text="删除" @positive-click="deleteItem(item.id)">
                <template #trigger>
                  <button class="card__delete" aria-label="删除" @click.stop>
                    <Icon :icon="TRASH_ICON" :width="20" :height="20" />
                  </button>
                </template>
                确定要删除这条教育经历吗？
              </n-popconfirm>
              <button class="card__toggle-collapse" :aria-label="collapsedIds.has(item.id) ? '展开' : '收缩'" @click.stop="toggleCollapse(item.id)">
                <Icon :icon="collapsedIds.has(item.id) ? CHEVRON_DOWN_ICON : CHEVRON_UP_ICON" :width="20" :height="20" />
              </button>
            </div>
          </div>
          <div v-show="!collapsedIds.has(item.id)" class="card__form">
            <div class="form-field">
              <span class="form-field__label">学校名称</span>
              <n-input v-model:value="item.school" placeholder="请输入学校名称" size="small" />
            </div>
            <div class="form__row">
              <div class="form-field">
                <span class="form-field__label">学历</span>
                <n-input v-model:value="item.degree" placeholder="如：本科" size="small" />
              </div>
              <div class="form-field">
                <span class="form-field__label">专业</span>
                <n-input v-model:value="item.major" placeholder="请输入专业" size="small" />
              </div>
            </div>
            <div class="form__row">
              <div class="form-field">
                <span class="form-field__label">开始时间</span>
                <n-input v-model:value="item.startDate" placeholder="YYYY-MM" size="small" />
              </div>
              <div class="date-field">
                <div class="form-field">
                  <span class="form-field__label">结束时间</span>
                  <n-input :value="item.endDate === '至今' ? '' : item.endDate" @update:value="item.endDate = $event" placeholder="YYYY-MM" size="small" :disabled="item.endDate === '至今'" />
                </div>
                <div class="date-field__present">
                  <n-checkbox :checked="item.endDate === '至今'" @update:checked="item.endDate = $event ? '至今' : ''">至今</n-checkbox>
                </div>
              </div>
            </div>
            <RichTextEditor v-model="item.description" label="补充说明" placeholder="如：GPA、获奖情况等..." :rows="2" :ai-context="`${item.school || '学校'}`" />
          </div>
        </div>
      </template>
    </draggable>

  </div>
</template>

<script setup lang="ts">
import { computed, inject, ref } from 'vue'
import { useResumeStore } from '@/stores/resumeStore'
import { generateId } from '@/types/resume'
import { useSectionTitle } from '@/composables/useSectionTitle'
import draggable from 'vuedraggable'
import type { EducationItem } from '@/types/resume'
import { TRASH_ICON, EDUCATION_ICON, EYE_ICON, EYE_OFF_ICON, DRAG_HANDLE_ICON, CHEVRON_UP_ICON, CHEVRON_DOWN_ICON } from '@/components/icons/SectionIcons'
import { Icon } from '@iconify/vue'
import { NInput, NPopconfirm, NCheckbox } from 'naive-ui'
import RichTextEditor from '@/components/common/RichTextEditor.vue'
import { ScrollContainerKey } from '../scrollContainerKey'
import { useFlipAnimation } from '@/composables/useFlipAnimation'

const store = useResumeStore()
const scrollContainer = inject(ScrollContainerKey)
const flipCards = useFlipAnimation(() => scrollContainer?.value, '.card')
const { saveTitle, getSectionTitle } = useSectionTitle()
const emit = defineEmits<{ 'click-entry': [itemId: string] }>()
const collapsedIds = ref<Set<string>>(new Set())

const toggleCollapse = (id: string) => {
  const next = new Set(collapsedIds.value)
  if (next.has(id)) next.delete(id); else next.add(id)
  collapsedIds.value = next
}

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
  padding: $card-padding;
  border-left: 3px solid $accent-color;
  border-radius: $radius-xl;

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: $spacing-md;
  }

  &__school {
    flex: 1;
    font-size: $font-size-md;
    font-weight: 700;
    color: $text-primary;
    min-width: 0;
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
@include card-actions;
@include card-drag;
@include editable-title;

.form-field {
  display: flex;
  flex-direction: column;
  gap: $spacing-xs;

  &__label {
    font-size: $font-size-sm;
    font-weight: 600;
    color: $text-primary;
  }
}
</style>