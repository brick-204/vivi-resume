<template>
  <div class="section languages">
    <div class="section__header">
      <h3 class="section__title">
        <span class="title__icon">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <circle cx="9" cy="9" r="7" stroke="currentColor" stroke-width="1.5"/>
            <path d="M2 9H16M9 2C6.5 4.5 6.5 13.5 9 16M9 2C11.5 4.5 11.5 13.5 9 16" stroke="currentColor" stroke-width="1.5"/>
          </svg>
        </span>
        语言能力
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
        <circle cx="16" cy="16" r="12" stroke="currentColor" stroke-width="1.5" stroke-dasharray="3 3"/>
        <path d="M10 16H22M16 10V22" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
      <span>暂无语言，点击上方按钮添加</span>
    </div>

    <div v-else class="languages-list">
      <div v-for="item in items" :key="item.id" class="language-card">
        <div class="language__content">
          <span class="language__name">{{ item.name || '未填写' }}</span>
          <span class="language__level">{{ item.level || '未设置' }}</span>
        </div>
        <div class="language__actions">
          <button class="language__edit" @click="showEdit(item)">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M8.5 2L9.5 3L3.5 9H2.5V8L8.5 2Z" stroke="currentColor" stroke-width="1" stroke-linejoin="round"/>
            </svg>
          </button>
          <button class="language__delete" @click="deleteItem(item.id)">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 3H10M4.5 3V2C4.5 1.72386 4.72386 1.5 5 1.5H7C7.27614 1.5 7.5 1.72386 7.5 2V3M5 5.5V8M7 5.5V8M3.5 3L4 10H8L8.5 3" stroke="currentColor" stroke-width="0.8" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- 编辑弹窗 -->
    <div v-if="editingItem" class="edit-overlay" @click.self="editingItem = null">
      <div class="edit-card">
        <h4 class="edit__title">编辑语言</h4>
        <BaseInput v-model="editingItem.name" label="语言名称" placeholder="如：英语" />
        <div class="edit__field">
          <label class="edit__label">熟练程度</label>
          <div class="level-select">
            <button
              v-for="lvl in LEVELS"
              :key="lvl"
              class="level-btn"
              :class="{ 'level-btn--active': editingItem.level === lvl }"
              @click="editingItem.level = lvl"
            >
              {{ lvl }}
            </button>
          </div>
        </div>
        <div class="edit__actions">
          <button class="edit-btn edit-btn--save" @click="saveEdit">保存</button>
          <button class="edit-btn edit-btn--cancel" @click="editingItem = null">取消</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useResumeStore } from '@/stores/resumeStore'
import { generateId } from '@/types/resume'
import type { LanguageItem } from '@/types/resume'
import BaseInput from '@/components/common/BaseInput.vue'

const LEVELS = ['母语', '流利', '熟练', '基础']

const store = useResumeStore()
const editingItem = ref<LanguageItem | null>(null)

const items = computed({
  get: () => store.currentResume?.languages || [],
  set: (value) => store.updateCurrentResume({ languages: value })
})

const addItem = () => {
  const newItem: LanguageItem = {
    id: generateId(),
    name: '',
    level: '熟练'
  }
  store.updateCurrentResume({
    languages: [...items.value, newItem]
  })
  editingItem.value = newItem
}

const deleteItem = (id: string) => {
  store.updateCurrentResume({
    languages: items.value.filter(item => item.id !== id)
  })
}

const showEdit = (item: LanguageItem) => {
  editingItem.value = { ...item }
}

const saveEdit = () => {
  if (editingItem.value) {
    const index = items.value.findIndex(i => i.id === editingItem.value!.id)
    if (index !== -1) {
      items.value[index] = editingItem.value
    }
    editingItem.value = null
  }
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
}

.title__icon {
  display: flex;
  color: $secondary-light;
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

.languages-list {
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;
}

.language-card {
  @include glass;
  padding: $spacing-md;
  display: flex;
  align-items: center;
  justify-content: space-between;
  transition: all $transition-fast;

  &:hover {
    background: $bg-glass-hover;
    transform: translateX(4px);
  }
}

.language__content {
  display: flex;
  align-items: center;
  gap: $spacing-md;
}

.language__name {
  font-size: $font-size-md;
  font-weight: 600;
  color: $text-primary;
}

.language__level {
  font-size: $font-size-xs;
  color: $secondary-light;
  padding: 2px 10px;
  background: rgba($secondary-color, 0.15);
  border-radius: $radius-full;
  border: 1px solid rgba($secondary-color, 0.25);
}

.language__actions {
  display: flex;
  gap: $spacing-xs;
}

.language__edit,
.language__delete {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: $radius-md;
  cursor: pointer;
  transition: all $transition-fast;
  color: $text-light;
}

.language__edit {
  &:hover {
    background: rgba($secondary-color, 0.15);
    border-color: rgba($secondary-color, 0.3);
    color: $secondary-light;
  }
}

.language__delete {
  &:hover {
    background: rgba($error-color, 0.15);
    border-color: rgba($error-color, 0.3);
    color: $error-color;
  }
}

// 编辑弹窗
.edit-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.edit-card {
  @include glass;
  padding: $spacing-xl;
  width: 340px;
  border-radius: $radius-2xl;
  box-shadow: $shadow-xl, $shadow-glow-secondary;
}

.edit__title {
  font-size: $font-size-lg;
  font-weight: 700;
  color: $text-primary;
  margin-bottom: $spacing-lg;
}

.edit__field {
  margin-bottom: $spacing-md;
}

.edit__label {
  display: block;
  font-size: $font-size-sm;
  font-weight: 600;
  color: $text-secondary;
  margin-bottom: $spacing-xs;
}

.level-select {
  display: flex;
  flex-wrap: wrap;
  gap: $spacing-xs;
}

.level-btn {
  padding: $spacing-xs $spacing-md;
  background: $bg-glass;
  border: 1px solid $border-glass;
  border-radius: $radius-md;
  color: $text-secondary;
  font-size: $font-size-sm;
  cursor: pointer;
  transition: all $transition-fast;
  font-family: $font-family;

  &:hover {
    background: rgba($secondary-color, 0.15);
    border-color: rgba($secondary-color, 0.3);
  }

  &--active {
    background: rgba($secondary-color, 0.25);
    border-color: $secondary-color;
    color: $secondary-light;
  }
}

.edit__actions {
  display: flex;
  gap: $spacing-sm;
  margin-top: $spacing-lg;
}

.edit-btn {
  flex: 1;
  padding: $spacing-sm;
  border: none;
  border-radius: $radius-lg;
  font-size: $font-size-sm;
  font-weight: 600;
  cursor: pointer;
  font-family: $font-family;
  transition: all $transition-fast;

  &--save {
    background: linear-gradient(135deg, $secondary-color, $secondary-light);
    color: $text-white;
    box-shadow: $shadow-secondary;

    &:hover {
      transform: translateY(-1px);
    }
  }

  &--cancel {
    background: $bg-glass;
    color: $text-secondary;
    border: 1px solid $border-glass;

    &:hover {
      background: $bg-glass-hover;
    }
  }
}
</style>
