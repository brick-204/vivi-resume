<template>
  <div class="section-navigator" :class="{ 'section-navigator--collapsed': isCollapsed }">
    <!-- 导航项列表 -->
    <div class="navigator__list" ref="navigatorListRef">
      <draggable
        v-model="sortableSections"
        item-key="id"
        handle=".nav-item__drag-handle"
        :animation="200"
        ghost-class="nav-item--ghost"
        chosen-class="nav-item--chosen"
        drag-class="nav-item--drag"
        :scroll="navigatorListRef"
        :scroll-sensitivity="80"
        :scroll-speed="10"
      >
        <template #item="{ element: item }">
          <div
            class="nav-item"
            :class="{
              'nav-item--active': activeSectionId === item.id,
              'nav-item--basic': item.id === 'basic',
              'nav-item--hidden': !item.visible
            }"
            @click="handleSelect(item.id)"
          >
            <!-- 拖拽手柄 -->
            <span
              v-if="!isCollapsed && item.id !== 'basic'"
              class="nav-item__drag-handle"
            >
              <Icon :icon="DRAG_HANDLE_ICON" :width="20" :height="20" />
            </span>
            <span class="nav-item__icon">
              <Icon :icon="item.icon" :width="16" :height="16" />
            </span>
            <span v-if="!isCollapsed" class="nav-item__label">{{ item.label }}</span>
            <button
              v-if="!isCollapsed && item.id !== 'basic'"
              class="nav-item__hide"
              @click.stop="handleToggleVisible(item.id)"
            >
              <Icon :icon="item.visible ? EYE_ICON : EYE_OFF_ICON" :width="20" :height="20" />
            </button>
            <button
              v-if="!isCollapsed && item.id !== 'basic'"
              class="nav-item__remove"
              @click.stop="confirmRemove(item.id)"
            >
              <Icon :icon="TRASH_ICON" :width="20" :height="20" />
            </button>
          </div>
        </template>
      </draggable>
    </div>

    <!-- 添加模块按钮（常驻） -->
    <button class="navigator__add" @click="showAddModal = true">
      <Icon :icon="PLUS_ICON" :width="14" :height="14" />
      <span v-if="!isCollapsed">添加模块</span>
    </button>

    <!-- 收缩/展开按钮 -->
    <button class="navigator__collapse" @click="toggleCollapse">
      <Icon :icon="isCollapsed ? COLLAPSE_RIGHT_ICON : COLLAPSE_LEFT_ICON" :width="14" :height="14" />
    </button>

    <!-- 添加模块弹窗 -->
    <AddSectionModal
      :visible="showAddModal"
      :hidden-sections="hiddenSections"
      @close="showAddModal = false"
      @add="handleAddSection"
    />

    <!-- 删除确认弹窗 -->
    <BaseModal
      v-if="removeConfirmId"
      :visible="true"
      title="删除模块"
      size="sm"
      @close="removeConfirmId = null"
    >
      <p class="confirm-text">确定要删除「{{ removeConfirmId && resumeStore.currentResume ? getSectionTitle(resumeStore.currentResume, removeConfirmId) : '' }}」模块吗？删除后可通过「添加模块」恢复。</p>
      <template #footer>
        <BaseButton variant="secondary" size="sm" @click="removeConfirmId = null">取消</BaseButton>
        <BaseButton variant="danger" size="sm" @click="removeSection(removeConfirmId!)">删除</BaseButton>
      </template>
    </BaseModal>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useResumeStore } from '@/stores/resumeStore'
import { useEditorLayoutStore } from '@/stores/editorLayoutStore'
import { SECTION_CONFIG, getSectionTitle, isCustomSection } from '@/types/resume'
import { getSectionIcon, PLUS_ICON, COLLAPSE_LEFT_ICON, COLLAPSE_RIGHT_ICON, TRASH_ICON, DRAG_HANDLE_ICON, EYE_ICON, EYE_OFF_ICON } from '@/components/icons/SectionIcons'
import { Icon } from '@iconify/vue'
import draggable from 'vuedraggable'
import AddSectionModal from './AddSectionModal.vue'
import BaseModal from '@/components/common/BaseModal.vue'
import BaseButton from '@/components/common/BaseButton.vue'

const resumeStore = useResumeStore()
const layoutStore = useEditorLayoutStore()

const navigatorListRef = ref<HTMLElement>()

const emit = defineEmits<{
  'click-section': [sectionId: string, itemId?: string]
}>()

// 可见模块列表（vuedraggable 双向绑定）
const sortableSections = computed({
  get: () => {
    const order = resumeStore.getSectionOrder()
    const hidden = resumeStore.currentResume?.hiddenSections || []
    const resume = resumeStore.currentResume
    return order.map(id => ({
      id,
      label: resume ? getSectionTitle(resume, id) : (SECTION_CONFIG[id]?.label || id),
      icon: getSectionIcon(id),
      visible: !hidden.includes(id)
    }))
  },
  set: (newList) => {
    // 不允许 basic 被移到非首位
    const basicIndex = newList.findIndex(item => item.id === 'basic')
    if (basicIndex > 0) {
      const [basic] = newList.splice(basicIndex, 1)
      newList.unshift(basic)
    }
    resumeStore.updateSectionOrder(newList.map(item => item.id))
  }
})

// 隐藏的模块列表（用于添加模块弹窗）
const hiddenSections = computed(() => {
  const visibleIds = resumeStore.getSectionOrder()
  const result: string[] = []
  // 内置模块（排除自定义模块模板类型，它们单独处理）
  for (const id of Object.keys(SECTION_CONFIG)) {
    if (!visibleIds.includes(id) && id !== 'basic' && id !== 'customText' && id !== 'customCard') {
      result.push(id)
    }
  }
  // 自定义模块类型（始终可添加）
  result.push('customText', 'customCard')
  return result
})

// 当前选中模块
const activeSectionId = computed(() => layoutStore.activeSectionId)

// 收缩状态
const isCollapsed = computed(() => layoutStore.navCollapsed)

// 弹窗状态
const showAddModal = ref(false)

// 所有模块都添加完后自动关闭弹窗
watch(hiddenSections, (val) => {
  if (val.length === 0) showAddModal.value = false
})

// 删除确认状态
const removeConfirmId = ref<string | null>(null)

// 确保选中的模块始终可见
watch(sortableSections, (sections) => {
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
  let newSectionId = sectionId
  if (sectionId === 'customText') {
    newSectionId = resumeStore.addCustomTextSection()
  } else if (sectionId === 'customCard') {
    newSectionId = resumeStore.addCustomCardSection()
  } else {
    resumeStore.addSection(sectionId)
  }
  layoutStore.setActiveSection(newSectionId)
  layoutStore.expandEditor()
}

// 确认删除
const confirmRemove = (sectionId: string) => {
  if (sectionId === 'basic') return
  removeConfirmId.value = sectionId
}

// 切换模块可见性
const handleToggleVisible = (sectionId: string) => {
  if (sectionId === 'basic') return
  const hidden = resumeStore.currentResume?.hiddenSections || []
  if (hidden.includes(sectionId)) {
    resumeStore.showSection(sectionId)
  } else {
    resumeStore.hideSection(sectionId)
  }
}

// 删除模块
const removeSection = (sectionId: string) => {
  if (sectionId === 'basic') return
  if (isCustomSection(sectionId)) {
    resumeStore.removeCustomSection(sectionId)
  } else {
    resumeStore.removeSection(sectionId)
  }
  removeConfirmId.value = null
  // 如果删除的是当前选中的，切换到第一个
  if (activeSectionId.value === sectionId) {
    layoutStore.setActiveSection(sortableSections.value[0]?.id || 'basic')
  }
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
    cursor: grab;

    &:active {
      cursor: grabbing;
    }
  }

  &__hide {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    background: transparent;
    border: none;
    border-radius: $radius-sm;
    color: $text-light;
    cursor: pointer;
    opacity: 0;
    transition: all 0.15s;

    &:hover {
      background: $bg-glass-hover;
      color: $primary-light;
    }
  }

  &__remove {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    background: transparent;
    border: none;
    border-radius: $radius-sm;
    color: $error-color;
    cursor: pointer;
    opacity: 0;
    transition: all 0.15s;

    &:hover {
      background: rgba($error-color, 0.15);
    }
  }

  &:hover {
    background: $bg-glass;

    .nav-item__hide,
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
      color: rgba(255, 255, 255, 0.7);

      &:hover {
        background: rgba(255, 255, 255, 0.2);
        color: #ff6b6b;
      }
    }
  }

  &--chosen {
    box-shadow: $shadow-md;
    transform: scale(1.02);
    z-index: 10;
    transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1),
                box-shadow 0.2s ease;
  }

  &--drag {
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5),
                0 0 20px rgba($primary-color, 0.3);
    transform: scale(1.05);
    z-index: 100;
    opacity: 0.95;
    transition: transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1),
                box-shadow 0.15s ease;
  }

  &--ghost {
    opacity: 0.3;
    border: 1px dashed $primary-color;
    background: rgba($primary-color, 0.05);
  }

  &--basic {
    .nav-item__drag-handle {
      display: none;
    }
  }

  &--hidden {
    .nav-item__icon,
    .nav-item__label {
      opacity: 0.4;
      text-decoration: line-through;
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

.confirm-text {
  color: $text-secondary;
  font-size: $font-size-sm;
  line-height: 1.6;
  margin: 0;
}
</style>
