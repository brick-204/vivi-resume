<template>
  <div class="section-navigator" :class="{ 'section-navigator--collapsed': isCollapsed }">
    <!-- 导航项列表 -->
    <div class="navigator__list">
      <div
        v-for="(item, index) in visibleSections"
        :key="item.id"
        class="nav-item"
        :class="{
          'nav-item--active': activeSectionId === item.id,
          'nav-item--dragging': draggingIndex === index,
          'nav-item--basic': item.id === 'basic'
        }"
        :draggable="item.id !== 'basic'"
        @click="handleSelect(item.id)"
        @dragstart="handleDragStart(index, $event)"
        @dragover="handleDragOver(index, $event)"
        @drop="handleDrop(index, $event)"
        @dragend="handleDragEnd"
      >
        <span class="nav-item__icon">
          <component :is="item.iconComponent" />
        </span>
        <span v-if="!isCollapsed" class="nav-item__label">{{ item.label }}</span>
        <!-- 拖拽手柄 -->
        <span
          v-if="!isCollapsed && item.id !== 'basic'"
          class="nav-item__drag-handle"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
            <circle cx="2" cy="2" r="1"/>
            <circle cx="8" cy="2" r="1"/>
            <circle cx="2" cy="5" r="1"/>
            <circle cx="8" cy="5" r="1"/>
            <circle cx="2" cy="8" r="1"/>
            <circle cx="8" cy="8" r="1"/>
          </svg>
        </span>
        <!-- 删除按钮 -->
        <button
          v-if="!isCollapsed && item.id !== 'basic'"
          class="nav-item__remove"
          @click.stop="removeSection(item.id)"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 3H10M4.5 3V2C4.5 1.72386 4.72386 1.5 5 1.5H7C7.27614 1.5 7.5 1.72386 7.5 2V3M5 5.5V8M7 5.5V8M3.5 3L4 10H8L8.5 3" stroke="currentColor" stroke-width="0.8" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- 添加模块按钮 -->
    <button class="navigator__add" @click="showAddModal = true">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M7 2V12M2 7H12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
      <span v-if="!isCollapsed">添加模块</span>
    </button>

    <!-- 收缩/展开按钮 -->
    <button class="navigator__collapse" @click="toggleCollapse">
      <svg v-if="isCollapsed" width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M5 3L9 7L5 11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <svg v-else width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M9 3L5 7L9 11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>

    <!-- 添加模块弹窗 -->
    <AddSectionModal
      v-if="showAddModal"
      :hidden-sections="hiddenSections"
      @close="showAddModal = false"
      @add="handleAddSection"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useResumeStore } from '@/stores/resumeStore'
import { useEditorLayoutStore } from '@/stores/editorLayoutStore'
import { SECTION_CONFIG } from '@/types/resume'
import { iconMap } from '@/components/icons/SectionIcons'
import AddSectionModal from './AddSectionModal.vue'

const resumeStore = useResumeStore()
const layoutStore = useEditorLayoutStore()

const emit = defineEmits<{
  'click-section': [sectionId: string]
}>()

// 可见模块列表
const visibleSections = computed(() => {
  const order = resumeStore.getSectionOrder()
  return order.map(id => ({
    id,
    label: SECTION_CONFIG[id]?.label || id,
    iconComponent: iconMap[id]
  }))
})

// 隐藏的模块列表（用于添加模块弹窗）
const hiddenSections = computed(() => {
  const visibleIds = resumeStore.getSectionOrder()
  return Object.keys(SECTION_CONFIG).filter(id => !visibleIds.includes(id))
})

// 当前选中模块
const activeSectionId = computed(() => layoutStore.activeSectionId)

// 收缩状态
const isCollapsed = computed(() => layoutStore.navCollapsed)

// 弹窗状态
const showAddModal = ref(false)

// 拖拽状态
const draggingIndex = ref<number | null>(null)

// 确保选中的模块始终可见
watch(visibleSections, (sections) => {
  if (!sections.find(s => s.id === activeSectionId.value)) {
    layoutStore.setActiveSection(sections[0]?.id || 'basic')
  }
}, { immediate: true })

// 选择模块
const handleSelect = (sectionId: string) => {
  layoutStore.setActiveSection(sectionId)
  // 如果编辑区收缩，自动展开
  layoutStore.expandEditor()
  emit('click-section', sectionId)
}

// 切换收缩状态
const toggleCollapse = () => {
  layoutStore.toggleNavCollapse()
}

// 添加模块
const handleAddSection = (sectionId: string) => {
  resumeStore.addSection(sectionId)
  layoutStore.setActiveSection(sectionId)
  layoutStore.expandEditor()
  showAddModal.value = false
}

// 删除模块
const removeSection = (sectionId: string) => {
  if (sectionId === 'basic') return
  resumeStore.removeSection(sectionId)
  // 如果删除的是当前选中的，切换到第一个
  if (activeSectionId.value === sectionId) {
    layoutStore.setActiveSection(visibleSections.value[0]?.id || 'basic')
  }
}

// 拖拽开始
const handleDragStart = (index: number, event: DragEvent) => {
  draggingIndex.value = index
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', index.toString())
  }
}

// 拖拽悬停
const handleDragOver = (_index: number, event: DragEvent) => {
  event.preventDefault()
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move'
  }
}

// 拖拽放置
const handleDrop = (targetIndex: number, event: DragEvent) => {
  event.preventDefault()
  const sourceIndex = draggingIndex.value

  if (sourceIndex !== null && sourceIndex !== targetIndex) {
    const newOrder = [...resumeStore.getSectionOrder()]
    const draggedItem = newOrder[sourceIndex]

    // 不允许拖动 basic
    if (draggedItem === 'basic') return

    // 不允许拖到 basic 前面（targetIndex === 0）
    if (targetIndex === 0) return

    // 执行移动
    newOrder.splice(sourceIndex, 1)
    newOrder.splice(targetIndex, 0, draggedItem)

    resumeStore.updateSectionOrder(newOrder)
  }
}

// 拖拽结束
const handleDragEnd = () => {
  draggingIndex.value = null
}
</script>

<style lang="scss" scoped>
.section-navigator {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: $spacing-md;
  gap: $spacing-sm;

  &--collapsed {
    padding: $spacing-sm;
    align-items: center;

    .nav-item {
      justify-content: center;
      padding: $spacing-sm;
    }

    .navigator__add {
      width: 36px;
      padding: $spacing-sm;
      justify-content: center;
    }
  }
}

.navigator__list {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: $spacing-xs;
  overflow-y: auto;
  @include scrollbar;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  padding: $spacing-sm $spacing-md;
  border-radius: $radius-lg;
  cursor: pointer;
  transition: all 0.15s;
  user-select: none;
  position: relative;

  &__icon {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    color: $text-secondary;
  }

  &__label {
    flex: 1;
    font-size: $font-size-sm;
    font-weight: 500;
    color: $text-secondary;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__drag-handle {
    flex-shrink: 0;
    display: flex;
    color: $text-light;
    opacity: 0;
    transition: opacity 0.15s;
    cursor: grab;

    &:active {
      cursor: grabbing;
    }
  }

  &__remove {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    background: transparent;
    border: none;
    border-radius: $radius-sm;
    color: $text-light;
    cursor: pointer;
    opacity: 0;
    transition: all 0.15s;

    &:hover {
      background: rgba($error-color, 0.15);
      color: $error-color;
    }
  }

  &:hover {
    background: $bg-glass;

    .nav-item__drag-handle,
    .nav-item__remove {
      opacity: 1;
    }
  }

  &--active {
    background: $primary-gradient;
    color: $text-white;
    box-shadow: $shadow-primary;

    .nav-item__icon,
    .nav-item__label {
      color: $text-white;
    }

    .nav-item__drag-handle {
      color: rgba(255, 255, 255, 0.6);
    }

    .nav-item__remove {
      color: rgba(255, 255, 255, 0.6);

      &:hover {
        background: rgba(255, 255, 255, 0.2);
        color: $text-white;
      }
    }
  }

  &--dragging {
    opacity: 0.5;
    border: 1px dashed $primary-color;
  }

  &--basic {
    .nav-item__drag-handle {
      display: none;
    }
  }
}

.navigator__add {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  width: 100%;
  padding: $spacing-sm $spacing-md;
  border: 1px dashed $border-glass;
  border-radius: $radius-lg;
  background: transparent;
  color: $text-light;
  cursor: pointer;
  transition: all 0.15s;
  font-size: $font-size-sm;
  font-family: $font-family;

  &:hover {
    border-color: $primary-color;
    color: $primary-light;
    background: rgba($primary-color, 0.1);
  }
}

.navigator__collapse {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: $spacing-sm;
  background: $bg-glass;
  border: none;
  border-radius: $radius-md;
  color: $text-secondary;
  cursor: pointer;
  transition: all 0.15s;
  font-family: $font-family;

  &:hover {
    background: $bg-glass-hover;
    color: $text-primary;
  }
}
</style>
