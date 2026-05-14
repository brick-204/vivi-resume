<template>
  <div class="editor-panel">
    <div class="editor-panel__tabs">
      <!-- 动态渲染 tabs，支持拖拽 -->
      <div
        v-for="(tab, index) in visibleTabs"
        :key="tab.id"
        class="editor-panel__tab"
        :class="{
          'editor-panel__tab--active': activeTab === tab.id,
          'editor-panel__tab--dragging': draggingIndex === index
        }"
        :draggable="tab.id !== 'basic'"
        @click="handleTabClick(tab.id)"
        @dragstart="handleDragStart(index, $event)"
        @dragover="handleDragOver(index, $event)"
        @drop="handleDrop(index, $event)"
        @dragend="handleDragEnd"
      >
        <!-- 拖拽手柄（basic 除外） -->
        <span v-if="tab.id !== 'basic'" class="tab__drag-handle">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <circle cx="3" cy="3" r="1" fill="currentColor"/>
            <circle cx="9" cy="3" r="1" fill="currentColor"/>
            <circle cx="3" cy="6" r="1" fill="currentColor"/>
            <circle cx="9" cy="6" r="1" fill="currentColor"/>
            <circle cx="3" cy="9" r="1" fill="currentColor"/>
            <circle cx="9" cy="9" r="1" fill="currentColor"/>
          </svg>
        </span>
        <span class="tab__icon">
          <component :is="tab.iconComponent" />
        </span>
        <span class="tab__label">{{ tab.label }}</span>
        <!-- 删除按钮（basic 除外） -->
        <button
          v-if="tab.id !== 'basic'"
          class="tab__remove"
          @click.stop="removeTab(tab.id)"
          title="删除模块"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M3 3L11 11M11 3L3 11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        </button>
      </div>

      <!-- 添加模块按钮 -->
      <button class="editor-panel__add" @click="showAddModal = true" title="添加模块">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M8 3V13M3 8H13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </button>
    </div>

    <!-- 添加模块弹窗 -->
    <AddSectionModal
      v-if="showAddModal"
      :hidden-sections="store.getHiddenSections()"
      @close="showAddModal = false"
      @add="handleAddSection"
    />

    <!-- 动态渲染内容 -->
    <div class="editor-panel__content">
      <BasicInfo v-if="activeTab === 'basic'" />
      <Summary v-else-if="activeTab === 'summary'" />
      <WorkExperience v-else-if="activeTab === 'work'" />
      <Education v-else-if="activeTab === 'education'" />
      <Projects v-else-if="activeTab === 'projects'" />
      <Skills v-else-if="activeTab === 'skills'" />
      <SelfEvaluation v-else-if="activeTab === 'evaluation'" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useResumeStore } from '@/stores/resumeStore'
import { SECTION_CONFIG } from '@/types/resume'
import BasicInfo from './sections/BasicInfo.vue'
import Summary from './sections/Summary.vue'
import WorkExperience from './sections/WorkExperience.vue'
import Education from './sections/Education.vue'
import Projects from './sections/Projects.vue'
import Skills from './sections/Skills.vue'
import SelfEvaluation from './sections/SelfEvaluation.vue'
import AddSectionModal from './AddSectionModal.vue'

const store = useResumeStore()

// SVG icon components
const UserIcon = {
  template: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="5" r="3" stroke="currentColor" stroke-width="1.5"/>
    <path d="M3 14C3 11.5 5.5 9 8 9C10.5 9 13 11.5 13 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
  </svg>`
}

const MessageIcon = {
  template: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M3 4H13C13.5523 4 14 4.44772 14 5V10C14 10.5523 13.5523 11 13 11H5L2 13V5C2 4.44772 2.44772 4 3 4Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
    <path d="M5 7H11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
  </svg>`
}

const BriefcaseIcon = {
  template: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <rect x="2" y="5" width="12" height="8" rx="2" stroke="currentColor" stroke-width="1.5"/>
    <path d="M5 5V3C5 2.44772 5.44772 2 6 2H10C10.5523 2 11 2.44772 11 3V5" stroke="currentColor" stroke-width="1.5"/>
    <path d="M8 9H8.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
  </svg>`
}

const EducationIcon = {
  template: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M2 6L8 3L14 6" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
    <path d="M2 6V10L8 13L14 10V6" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
    <path d="M8 13V9" stroke="currentColor" stroke-width="1.5"/>
    <circle cx="8" cy="7.5" r="1.5" stroke="currentColor" stroke-width="1"/>
  </svg>`
}

const RocketIcon = {
  template: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M8 2L11 5L11.5 10L8 13L4.5 10L5 5L8 2Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
    <path d="M8 6V6.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    <path d="M4 13L3 14M12 13L13 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
  </svg>`
}

const ZapIcon = {
  template: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M9 2L4 9H7L6 14L12 7H9L9 2Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
  </svg>`
}

const GlobeIcon = {
  template: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.5"/>
    <path d="M2 8H14M8 2C5.5 4.5 5.5 11.5 8 14M8 2C10.5 4.5 10.5 11.5 8 14" stroke="currentColor" stroke-width="1.5"/>
  </svg>`
}

const StarIcon = {
  template: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M8 1L10 5.5L15 6L11.5 9.5L12.5 15L8 12L3.5 15L4.5 9.5L1 6L6 5.5L8 1Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
  </svg>`
}

// Icon 映射
const iconMap: Record<string, any> = {
  basic: UserIcon,
  summary: MessageIcon,
  work: BriefcaseIcon,
  education: EducationIcon,
  projects: RocketIcon,
  skills: ZapIcon,
  languages: GlobeIcon,
  evaluation: StarIcon
}

// 根据 sectionOrder 动态生成可见的 tabs
const visibleTabs = computed(() => {
  const order = store.getSectionOrder()
  return order.map(id => ({
    id,
    label: SECTION_CONFIG[id]?.label || id,
    iconComponent: iconMap[id]
  }))
})

const activeTab = ref('basic')

// 确保 activeTab 始终是可见的
watch(visibleTabs, (tabs) => {
  if (!tabs.find(t => t.id === activeTab.value)) {
    activeTab.value = tabs[0]?.id || 'basic'
  }
}, { immediate: true })

const showAddModal = ref(false)

// 拖拽相关状态
const draggingIndex = ref<number | null>(null)

const switchTab = (tabId: string) => {
  activeTab.value = tabId
}

// 点击 tab 时发射事件，通知父组件滚动预览区
const handleTabClick = (tabId: string) => {
  activeTab.value = tabId
  emit('click-tab', tabId)
}

// 删除模块
const removeTab = (sectionId: string) => {
  if (sectionId === 'basic') return
  store.removeSection(sectionId)
  // 如果删除的是当前激活的 tab，切换到第一个
  if (activeTab.value === sectionId) {
    activeTab.value = visibleTabs.value[0]?.id || 'basic'
  }
}

// 添加模块
const handleAddSection = (sectionId: string) => {
  store.addSection(sectionId)
  showAddModal.value = false
  activeTab.value = sectionId
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
    const newOrder = [...store.getSectionOrder()]
    const draggedItem = newOrder[sourceIndex]

    // 不允许拖动 basic
    if (draggedItem === 'basic') return

    // 不允许拖到 basic 前面（targetIndex === 0）
    if (targetIndex === 0) return

    // 执行移动
    newOrder.splice(sourceIndex, 1)
    newOrder.splice(targetIndex, 0, draggedItem)

    store.updateSectionOrder(newOrder)
  }
}

// 拖拽结束
const handleDragEnd = () => {
  draggingIndex.value = null
}

const emit = defineEmits<{
  'click-tab': [tabId: string]
}>()

defineExpose({ switchTab })
</script>

<style lang="scss" scoped>

.editor-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: transparent;

  &__tabs {
    display: flex;
    flex-wrap: wrap;
    gap: $spacing-xs;
    padding: $spacing-md $spacing-lg;
    background: $bg-glass;
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border-bottom: 1px solid $border-glass;
  }

  &__tab {
    display: flex;
    align-items: center;
    gap: $spacing-xs;
    padding: $spacing-sm $spacing-md;
    border: none;
    background: transparent;
    color: $text-secondary;
    font-size: $font-size-sm;
    font-weight: 500;
    cursor: pointer;
    border-radius: $radius-lg;
    transition: all $transition-fast;
    font-family: $font-family;
    user-select: none;

    &:hover {
      color: $text-primary;
      background: $bg-glass;

      .tab__drag-handle {
        opacity: 1;
      }

      .tab__remove {
        opacity: 1;
      }
    }

    &--active {
      background: $primary-gradient;
      color: $text-white;
      box-shadow: $shadow-primary, 0 0 20px rgba(124, 92, 252, 0.2);

      &:hover {
        transform: translateY(-1px);
        box-shadow: 0 6px 24px rgba(124, 92, 252, 0.3);
      }

      .tab__drag-handle,
      .tab__remove {
        color: $text-white;
      }
    }

    &--dragging {
      opacity: 0.5;
      background: rgba(124, 92, 252, 0.2);
      border: 1px dashed $primary-color;
    }
  }

  &__add {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: $spacing-sm;
    border: 1px dashed $border-glass;
    background: transparent;
    color: $text-light;
    border-radius: $radius-lg;
    cursor: pointer;
    transition: all $transition-fast;
    font-family: $font-family;

    &:hover {
      color: $primary-light;
      border-color: $primary-color;
      background: rgba(124, 92, 252, 0.1);
    }
  }

  &__content {
    flex: 1;
    overflow-y: auto;
    padding: $spacing-lg;
    @include scrollbar;
  }
}

.tab__drag-handle {
  display: flex;
  align-items: center;
  opacity: 0.5;
  cursor: grab;
  color: $text-secondary;

  &:active {
    cursor: grabbing;
  }
}

.tab__icon {
  display: flex;
  align-items: center;
  justify-content: center;
}

.tab__label {
  letter-spacing: 0.02em;
}

.tab__remove {
  display: flex;
  align-items: center;
  padding: 2px;
  background: transparent;
  border: none;
  color: $text-secondary;
  cursor: pointer;
  opacity: 0.5;
  border-radius: $radius-sm;
  transition: all $transition-fast;

  &:hover {
    color: $error-color;
    background: rgba($error-color, 0.1);
    opacity: 1;
  }
}
</style>