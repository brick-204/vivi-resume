<template>
  <div class="section">
    <div class="section__header">
      <h3 class="section__title">
        <span class="title__icon">
          <Icon :icon="LIST_BOX_ICON" :width="18" :height="18" />
        </span>
        <span class="section__title-text" contenteditable v-text="getSectionTitle(store.currentResume, sectionId)" @keydown.enter.prevent @blur="saveTitle($event, sectionId)"></span>
      </h3>
    </div>

    <div v-if="items.length === 0" class="section__empty">
      <span>暂无内容，点击下方按钮添加</span>
    </div>

    <draggable v-else v-model="items" item-key="id" handle=".card__drag-handle" :animation="200" ghost-class="card--ghost" chosen-class="card--chosen" drag-class="card--drag" class="section__list" :scroll="scrollContainer" :scroll-sensitivity="80" :scroll-speed="10" @start="flipCards.recordPositions" @end="flipCards.animateFlip">
      <template #item="{ element: item }">
        <div class="card" :class="{ 'card--hidden': item.hidden }" :data-item-id="item.id" :data-flip-id="item.id" @click="emit('click-entry', item.id)">
          <span class="card__drag-handle">
            <Icon :icon="DRAG_HANDLE_ICON" :width="20" :height="20" />
          </span>
          <div class="card__header">
            <span class="card__name">{{ item.name || '未填写名称' }}</span>
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
                确定要删除这条记录吗？
              </n-popconfirm>
              <button class="card__toggle-collapse" :aria-label="collapsedIds.has(item.id) ? '展开' : '收缩'" @click.stop="toggleCollapse(item.id)">
                <Icon :icon="collapsedIds.has(item.id) ? CHEVRON_DOWN_ICON : CHEVRON_UP_ICON" :width="20" :height="20" />
              </button>
            </div>
          </div>
          <div v-show="!collapsedIds.has(item.id)" class="card__form">
            <div class="form__row">
              <div class="form-field">
                <span class="form-field__label">名称</span>
                <n-input v-model:value="item.name" placeholder="请输入名称" size="small" />
              </div>
              <div class="form-field">
                <span class="form-field__label">角色</span>
                <n-input v-model:value="item.role" placeholder="如：负责人" size="small" />
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
            <RichTextEditor v-model="item.description" label="描述" placeholder="描述内容..." :rows="3" />
            <div class="keyword-section">
              <label class="keyword__label">关键词</label>
                <n-input v-model:value="newKeyword" placeholder="输入关键词后按回车添加" size="small" @keydown.enter.prevent="addKeyword(item)" />
              <div class="keyword__list">
                <span v-for="(kw, index) in item.keywords" :key="index" class="keyword__tag">
                  {{ kw }}
                  <button class="keyword__remove" @click="removeKeyword(item, index)">×</button>
                </span>
              </div>
            </div>
          </div>
        </div>
      </template>
    </draggable>

  </div>
</template>

<script setup lang="ts">
import { computed, inject, ref } from 'vue'
import { useResumeStore } from '@/stores/resumeStore'
import { useSectionTitle } from '@/composables/useSectionTitle'
import draggable from 'vuedraggable'
import { generateId } from '@/types/resume'
import type { CustomCardItem } from '@/types/resume'
import { TRASH_ICON, LIST_BOX_ICON, EYE_ICON, EYE_OFF_ICON, DRAG_HANDLE_ICON, CHEVRON_UP_ICON, CHEVRON_DOWN_ICON } from '@/components/icons/SectionIcons'
import { Icon } from '@iconify/vue'
import { NInput, NPopconfirm, NCheckbox } from 'naive-ui'
import RichTextEditor from '@/components/common/RichTextEditor.vue'
import { ScrollContainerKey } from '../scrollContainerKey'
import { useFlipAnimation } from '@/composables/useFlipAnimation'

const props = defineProps<{
  sectionId: string
}>()

const store = useResumeStore()
const scrollContainer = inject(ScrollContainerKey)
const flipCards = useFlipAnimation(() => scrollContainer?.value, '.card')
const emit = defineEmits<{ 'click-entry': [itemId: string] }>()
const { saveTitle, getSectionTitle } = useSectionTitle()
const newKeyword = ref('')
const collapsedIds = ref<Set<string>>(new Set())

const toggleCollapse = (id: string) => {
  const next = new Set(collapsedIds.value)
  if (next.has(id)) next.delete(id); else next.add(id)
  collapsedIds.value = next
}

const sectionIndex = computed(() => {
  const match = props.sectionId.match(/^customCard_(\d+)$/)
  return match ? parseInt(match[1]) : -1
})

const items = computed({
  get: () => store.currentResume?.customCards[sectionIndex.value]?.items || [],
  set: (value) => {
    if (sectionIndex.value < 0 || !store.currentResume) return
    const cards = [...store.currentResume.customCards]
    cards[sectionIndex.value] = { ...cards[sectionIndex.value], items: value }
    store.updateCurrentResume({ customCards: cards })
  }
})

const addItem = () => {
  if (sectionIndex.value < 0 || !store.currentResume) return
  const newItem: CustomCardItem = {
    id: generateId(),
    name: '',
    role: '',
    startDate: '',
    endDate: '',
    description: '',
    keywords: [],
  }
  const cards = [...store.currentResume.customCards]
  cards[sectionIndex.value] = {
    ...cards[sectionIndex.value],
    items: [...cards[sectionIndex.value].items, newItem]
  }
  store.updateCurrentResume({ customCards: cards })
}

const deleteItem = (id: string) => {
  if (!store.currentResume) return
  const cards = [...store.currentResume.customCards]
  cards[sectionIndex.value] = {
    ...cards[sectionIndex.value],
    items: cards[sectionIndex.value].items.filter(item => item.id !== id)
  }
  store.updateCurrentResume({ customCards: cards })
}

const addKeyword = (item: CustomCardItem) => {
  if (newKeyword.value.trim()) {
    item.keywords.push(newKeyword.value.trim())
    newKeyword.value = ''
  }
}

const removeKeyword = (item: CustomCardItem, index: number) => {
  item.keywords.splice(index, 1)
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

  &__name {
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

.keyword-section {
  margin-top: $spacing-sm;
}

.keyword__label {
  display: block;
  font-size: $font-size-sm;
  font-weight: 600;
  color: $text-primary;
  margin-bottom: $spacing-sm;
}

.keyword__list {
  display: flex;
  flex-wrap: wrap;
  gap: $spacing-xs;
}

.keyword__tag {
  display: inline-flex;
  align-items: center;
  gap: $spacing-xs;
  padding: $spacing-xs $spacing-md;
  background: rgba($accent-color, 0.2);
  color: $accent-light;
  border: 1px solid rgba($accent-color, 0.3);
  border-radius: $radius-full;
  font-size: $font-size-xs;
  font-weight: 500;
}

.keyword__remove {
  background: transparent;
  border: none;
  color: $accent-light;
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
  opacity: 0.7;

  &:hover {
    opacity: 1;
  }
}
</style>