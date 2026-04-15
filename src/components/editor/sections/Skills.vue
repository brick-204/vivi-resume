<template>
  <div class="section skills">
    <div class="section__header">
      <h3 class="section__title">
        <span class="title__icon">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M10 2L5 9H8L7 16L14 8H10L10 2Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
          </svg>
        </span>
        技能
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
      <span>暂无技能，点击上方按钮添加</span>
    </div>

    <div v-else class="skills-grid">
      <div v-for="item in items" :key="item.id" class="skill-card">
        <div class="skill__content">
          <span class="skill__name">{{ item.name || '未填写' }}</span>
          <span class="skill__category">{{ item.category || '未分类' }}</span>
        </div>
        <div class="skill__level">
          <button
            v-for="star in 5"
            :key="star"
            class="level__star"
            :class="{ 'level__star--active': star <= item.level }"
            @click="item.level = star"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
              <path d="M6 1L7.5 4.5L11 5L8.5 7.5L9 11L6 9.5L3 11L3.5 7.5L1 5L4.5 4.5L6 1Z"/>
            </svg>
          </button>
        </div>
        <div class="skill__actions">
          <button class="skill__edit" @click="showEdit(item)">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M8.5 2L9.5 3L3.5 9H2.5V8L8.5 2Z" stroke="currentColor" stroke-width="1" stroke-linejoin="round"/>
            </svg>
          </button>
          <button class="skill__delete" @click="deleteItem(item.id)">
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
        <h4 class="edit__title">编辑技能</h4>
        <BaseInput v-model="editingItem.name" label="技能名称" placeholder="如：Vue.js" />
        <BaseInput v-model="editingItem.category" label="分类" placeholder="如：前端框架" />
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
import type { SkillItem } from '@/types/resume'
import BaseInput from '@/components/common/BaseInput.vue'

const store = useResumeStore()
const editingItem = ref<SkillItem | null>(null)

const items = computed({
  get: () => store.currentResume?.skills || [],
  set: (value) => store.updateCurrentResume({ skills: value })
})

const addItem = () => {
  const newItem: SkillItem = {
    id: generateId(),
    name: '',
    level: 3,
    category: ''
  }
  store.updateCurrentResume({
    skills: [...items.value, newItem]
  })
  editingItem.value = newItem
}

const deleteItem = (id: string) => {
  store.updateCurrentResume({
    skills: items.value.filter(item => item.id !== id)
  })
}

const showEdit = (item: SkillItem) => {
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
      background: linear-gradient(90deg, $yellow-color, transparent);
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
  color: $yellow-color;
}

.add-btn {
  display: flex;
  align-items: center;
  gap: $spacing-xs;
  padding: $spacing-sm $spacing-md;
  background: $bg-glass;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  color: $yellow-color;
  border: 1px solid rgba($yellow-color, 0.3);
  border-radius: $radius-lg;
  font-size: $font-size-sm;
  font-weight: 600;
  cursor: pointer;
  transition: all $transition-fast;
  font-family: $font-family;

  &:hover {
    background: rgba($yellow-color, 0.2);
    border-color: $yellow-color;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba($yellow-color, 0.2);
  }
}

.skills-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: $spacing-md;
}

.skill-card {
  @include glass;
  padding: $spacing-md;
  text-align: center;
  transition: all $transition-fast;

  &:hover {
    background: $bg-glass-hover;
    transform: translateY(-3px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
  }
}

.skill__content {
  margin-bottom: $spacing-sm;
}

.skill__name {
  display: block;
  font-size: $font-size-md;
  font-weight: 700;
  color: $text-primary;
}

.skill__category {
  display: block;
  font-size: $font-size-xs;
  color: $text-light;
}

.skill__level {
  display: flex;
  justify-content: center;
  gap: 2px;
  margin-bottom: $spacing-sm;
}

.level__star {
  width: 24px;
  height: 24px;
  background: $bg-glass;
  border: 1px solid $border-glass;
  border-radius: $radius-sm;
  color: $text-light;
  cursor: pointer;
  transition: all $transition-fast;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    transform: scale(1.15);
  }

  &--active {
    background: rgba($yellow-color, 0.2);
    border-color: rgba($yellow-color, 0.4);
    color: $yellow-color;
  }
}

.skill__actions {
  display: flex;
  justify-content: center;
  gap: $spacing-xs;
}

.skill__edit,
.skill__delete {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: 1px solid transparent;
  border-radius: $radius-md;
  cursor: pointer;
  transition: all $transition-fast;
}

.skill__edit {
  background: transparent;
  color: $text-light;

  &:hover {
    background: rgba($secondary-color, 0.15);
    border-color: rgba($secondary-color, 0.3);
    color: $secondary-light;
  }
}

.skill__delete {
  background: transparent;
  color: $text-light;

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
  box-shadow: $shadow-xl, $shadow-glow-primary;
}

.edit__title {
  font-size: $font-size-lg;
  font-weight: 700;
  color: $text-primary;
  margin-bottom: $spacing-lg;
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
    background: $primary-gradient;
    color: $text-white;
    box-shadow: $shadow-primary;

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