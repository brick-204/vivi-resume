<template>
  <div class="section">
    <div class="section__header">
      <h3 class="section__title">
        <span class="title__icon">
          <Icon :icon="ROCKET_ICON" :width="18" :height="18" />
        </span>
        <span class="section__title-text" contenteditable v-text="getSectionTitle(store.currentResume, 'projects')" @keydown.enter.prevent @blur="saveTitle($event, 'projects')"></span>
      </h3>
    </div>

    <div v-if="items.length === 0" class="section__empty">
      <span>暂无项目经历，点击下方按钮添加</span>
    </div>

    <draggable v-else v-model="items" item-key="id" handle=".card__drag-handle" :animation="200" ghost-class="card--ghost" chosen-class="card--chosen" drag-class="card--drag" class="section__list" :scroll="scrollContainer" :scroll-sensitivity="80" :scroll-speed="10" @start="flipCards.recordPositions" @end="flipCards.animateFlip">
      <template #item="{ element: item }">
        <div class="card" :class="{ 'card--hidden': item.hidden }" :data-item-id="item.id" :data-flip-id="item.id" @click="emit('click-entry', item.id)">
          <span class="card__drag-handle">
            <Icon :icon="DRAG_HANDLE_ICON" :width="20" :height="20" />
          </span>
          <div class="card__header">
            <span class="card__name">{{ item.name || "未填写项目名称" }}</span>
            <div class="card__actions">
              <button class="card__toggle-visibility" :aria-label="item.hidden ? '显示' : '隐藏'" @click.stop="updateItemField(item.id, 'hidden', !item.hidden)">
                <Icon :icon="item.hidden ? EYE_OFF_ICON : EYE_ICON" :width="18" :height="18" />
              </button>
              <button class="card__duplicate" aria-label="复制" @click.stop="duplicateItem(item.id)">
                <Icon icon="mdi:content-copy" :width="18" :height="18" />
              </button>
              <n-popconfirm negative-text="取消" positive-text="删除" @positive-click="deleteItem(item.id)">
                <template #trigger>
                  <button class="card__delete" aria-label="删除" @click.stop>
                    <Icon :icon="TRASH_ICON" :width="20" :height="20" />
                  </button>
                </template>
                确定要删除这条项目经历吗？
              </n-popconfirm>
              <button class="card__toggle-collapse" :aria-label="collapsedIds.has(item.id) ? '展开' : '收缩'" @click.stop="toggleCollapse(item.id)">
                <Icon :icon="collapsedIds.has(item.id) ? CHEVRON_DOWN_ICON : CHEVRON_UP_ICON" :width="20" :height="20" />
              </button>
            </div>
          </div>
          <div v-show="!collapsedIds.has(item.id)" class="card__form">
            <div class="form__row">
              <div class="form-field">
                <span class="form-field__label">项目名称</span>
                <n-input :value="item.name" @update:value="(val: string) => updateItemField(item.id, 'name', val)" placeholder="请输入项目名称" size="small" />
              </div>
              <div class="form-field">
                <span class="form-field__label">担任角色</span>
                <n-input :value="item.role" @update:value="(val: string) => updateItemField(item.id, 'role', val)" placeholder="如：前端负责人" size="small" />
              </div>
            </div>
            <div class="form__row">
              <div class="form-field">
                <span class="form-field__label">开始时间</span>
                <MonthDatePicker
                  :value="item.startDate"
                  @update:value="(val: string) => updateItemField(item.id, 'startDate', val)"
                />
              </div>
              <div class="date-field">
                <div class="form-field">
                  <span class="form-field__label">结束时间</span>
                  <MonthDatePicker
                    :value="item.endDate === '至今' ? '' : item.endDate"
                    :disabled="item.endDate === '至今'"
                    @update:value="(val: string) => updateItemField(item.id, 'endDate', val)"
                  />
                </div>
                <div class="date-field__present">
                  <n-checkbox :checked="item.endDate === '至今'" @update:checked="(val: boolean) => updateItemField(item.id, 'endDate', val ? '至今' : '')">至今</n-checkbox>
                </div>
              </div>
            </div>
            <RichTextEditor
              :model-value="item.description"
              @update:model-value="(val: string) => updateItemField(item.id, 'description', val)"
              label="项目描述"
              placeholder="描述项目背景、你的职责和成果..."
              :rows="3"
              :ai-context="`${item.name || '项目'}`"
            />
            <div class="tech-section">
              <label class="tech__label">技术栈</label>
                <n-input v-model:value="newTech" placeholder="输入技术后按回车添加" size="small" @keydown.enter.prevent="addTech(item.id)" />
              <div class="tech__list">
                <span
                  v-for="(tech, index) in item.technologies"
                  :key="index"
                  class="tech__tag"
                >
                  {{ tech }}
                  <button class="tech__remove" @click="removeTech(item.id, index)">
                    ×
                  </button>
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
import { computed, inject, ref, toRaw } from "vue";
import { useResumeStore } from "@/stores/resumeStore";
import { generateId } from "@/types/resume";
import { useSectionTitle } from "@/composables/useSectionTitle";
import draggable from 'vuedraggable'
import type { ProjectItem } from "@/types/resume";
import { TRASH_ICON, ROCKET_ICON, EYE_ICON, EYE_OFF_ICON, DRAG_HANDLE_ICON, CHEVRON_UP_ICON, CHEVRON_DOWN_ICON } from "@/components/icons/SectionIcons";
import { Icon } from "@iconify/vue";
import { NInput, NPopconfirm, NCheckbox } from 'naive-ui';
import RichTextEditor from "@/components/common/RichTextEditor.vue";
import MonthDatePicker from "@/components/common/MonthDatePicker.vue";
import { ScrollContainerKey } from '../scrollContainerKey'
import { useFlipAnimation } from '@/composables/useFlipAnimation'

const store = useResumeStore();
const scrollContainer = inject(ScrollContainerKey)
const flipCards = useFlipAnimation(() => scrollContainer?.value, '.card')
const { saveTitle, getSectionTitle } = useSectionTitle();
const emit = defineEmits<{ 'click-entry': [itemId: string] }>()
const newTech = ref("");
const collapsedIds = ref<Set<string>>(new Set());

const toggleCollapse = (id: string) => {
  const next = new Set(collapsedIds.value);
  if (next.has(id)) next.delete(id); else next.add(id);
  collapsedIds.value = next;
};

const items = computed({
  get: () => store.currentResume?.projects || [],
  set: (value) => store.updateCurrentResume({ projects: value }),
});

const updateItemField = (id: string, field: string, value: any) => {
  const updated = items.value.map(item =>
    item.id === id ? { ...item, [field]: value } : item
  )
  store.updateCurrentResume({ projects: updated })
}

const addItem = () => {
  const newItem: ProjectItem = {
    id: generateId(),
    name: "",
    role: "",
    startDate: "",
    endDate: "",
    description: "",
    technologies: [],
  };
  store.updateCurrentResume({
    projects: [...items.value, newItem],
  });
};

const deleteItem = (id: string) => {
  const item = items.value.find(i => i.id === id);
  if (!item) return;
  store.trashCard('projects', item);
  store.updateCurrentResume({
    projects: items.value.filter((item) => item.id !== id),
  });
};

const duplicateItem = (id: string) => {
  const index = items.value.findIndex((item) => item.id === id);
  if (index === -1) return;
  const copy: ProjectItem = { ...structuredClone(toRaw(items.value[index])), id: generateId() };
  const updated = [...items.value];
  updated.splice(index + 1, 0, copy);
  store.updateCurrentResume({ projects: updated });
};

const addTech = (itemId: string) => {
  if (newTech.value.trim()) {
    const item = items.value.find(i => i.id === itemId)
    if (item) {
      updateItemField(itemId, 'technologies', [...item.technologies, newTech.value.trim()])
    }
    newTech.value = "";
  }
};

const removeTech = (itemId: string, index: number) => {
  const item = items.value.find(i => i.id === itemId)
  if (item) {
    const updated = [...item.technologies]
    updated.splice(index, 1)
    updateItemField(itemId, 'technologies', updated)
  }
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
      background: linear-gradient(90deg, $secondary-color, transparent);
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
  color: $secondary-light;
}

.card {
  @include glass;
  padding: $card-padding;
  border-left: 3px solid $secondary-color;
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

.tech-section {
  margin-top: $spacing-sm;
}

.tech__label {
  display: block;
  font-size: $font-size-sm;
  font-weight: 600;
  color: $text-primary;
  margin-bottom: $spacing-sm;
}

.tech__list {
  display: flex;
  flex-wrap: wrap;
  gap: $spacing-xs;
}

.tech__tag {
  display: inline-flex;
  align-items: center;
  gap: $spacing-xs;
  padding: $spacing-xs $spacing-md;
  background: rgba($secondary-color, 0.2);
  color: $secondary-light;
  border: 1px solid rgba($secondary-color, 0.3);
  border-radius: $radius-full;
  font-size: $font-size-xs;
  font-weight: 500;
}

.tech__remove {
  background: transparent;
  border: none;
  color: $secondary-light;
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
  opacity: 0.7;

  &:hover {
    opacity: 1;
  }
}
</style>
