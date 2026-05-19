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
      <span>暂无项目经验，点击下方按钮添加</span>
    </div>

    <div v-else class="section__list">
      <div v-for="(item, index) in items" :key="item.id" class="card" :class="{ 'card--hidden': item.hidden, 'card--dragging': draggingIndex === index }" draggable="true" @dragstart="handleDragStart(index, $event)" @dragover="handleDragOver(index, $event)" @drop="handleDrop(index, $event)" @dragend="handleDragEnd">
        <span class="card__drag-handle">
          <Icon :icon="DRAG_HANDLE_ICON" :width="20" :height="20" />
        </span>
        <div class="card__header">
          <span class="card__name">{{ item.name || "未填写项目名称" }}</span>
          <div class="card__actions">
            <button class="card__toggle-visibility" :aria-label="item.hidden ? '显示' : '隐藏'" @click="item.hidden = !item.hidden">
              <Icon :icon="item.hidden ? EYE_OFF_ICON : EYE_ICON" :width="18" :height="18" />
            </button>
            <button class="card__delete" aria-label="删除" @click="confirmDeleteId = item.id">
              <Icon :icon="TRASH_ICON" :width="20" :height="20" />
            </button>
          </div>
        </div>
        <div class="card__form">
          <div class="form__row">
            <BaseInput
              v-model="item.name"
              label="项目名称"
              placeholder="请输入项目名称"
            />
            <BaseInput
              v-model="item.role"
              label="担任角色"
              placeholder="如：前端负责人"
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
            label="项目描述"
            placeholder="描述项目背景、你的职责和成果..."
            :rows="3"
          />
          <div class="tech-section">
            <label class="tech__label">技术栈</label>
            <div class="tech__input-wrap">
              <input
                v-model="newTech"
                class="tech__input"
                placeholder="输入技术后按回车添加"
                @keydown.enter.prevent="addTech(item)"
              />
            </div>
            <div class="tech__list">
              <span
                v-for="(tech, index) in item.technologies"
                :key="index"
                class="tech__tag"
              >
                {{ tech }}
                <button class="tech__remove" @click="removeTech(item, index)">
                  ×
                </button>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <BaseModal :visible="confirmDeleteId !== null" title="确认删除" size="sm" @close="confirmDeleteId = null">
      <p>确定要删除这条项目经验吗？此操作不可撤销。</p>
      <template #footer>
        <button class="btn btn--cancel" @click="confirmDeleteId = null">取消</button>
        <button class="btn btn--danger" @click="deleteItem(confirmDeleteId!)">确认删除</button>
      </template>
    </BaseModal>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useResumeStore } from "@/stores/resumeStore";
import { generateId } from "@/types/resume";
import { useSectionTitle } from "@/composables/useSectionTitle";
import { useCardDrag } from "@/composables/useCardDrag";
import type { ProjectItem } from "@/types/resume";
import { TRASH_ICON, ROCKET_ICON, EYE_ICON, EYE_OFF_ICON, DRAG_HANDLE_ICON } from "@/components/icons/SectionIcons";
import { Icon } from "@iconify/vue";
import BaseInput from "@/components/common/BaseInput.vue";
import BaseTextarea from "@/components/common/BaseTextarea.vue";
import BaseModal from "@/components/common/BaseModal.vue";

const store = useResumeStore();
const { saveTitle, getSectionTitle } = useSectionTitle();
const newTech = ref("");
const confirmDeleteId = ref<string | null>(null);

const items = computed({
  get: () => store.currentResume?.projects || [],
  set: (value) => store.updateCurrentResume({ projects: value }),
});

const { draggingIndex, handleDragStart, handleDragOver, handleDrop, handleDragEnd } = useCardDrag(items);

const addItem = () => {
  const newItem: ProjectItem = {
    id: generateId(),
    name: "",
    role: "",
    startDate: "",
    endDate: "",
    description: "",
    highlights: [],
    technologies: [],
  };
  store.updateCurrentResume({
    projects: [...items.value, newItem],
  });
};

const deleteItem = (id: string) => {
  store.updateCurrentResume({
    projects: items.value.filter((item) => item.id !== id),
  });
  confirmDeleteId.value = null;
};

const addTech = (item: ProjectItem) => {
  if (newTech.value.trim()) {
    item.technologies.push(newTech.value.trim());
    newTech.value = "";
  }
};

const removeTech = (item: ProjectItem, index: number) => {
  item.technologies.splice(index, 1);
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
@include modal-btn;
@include editable-title;

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

.tech__input-wrap {
  margin-bottom: $spacing-sm;
}

.tech__input {
  @include input-base;
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
