<template>
  <div class="section-editor">
    <!-- 头部 -->
    <div class="editor__header">
      <h3 class="editor__title">
        <span class="editor__icon">
          <component :is="currentIcon" />
        </span>
        {{ currentTitle }}
      </h3>
      <button class="editor__collapse-btn" @click="handleCollapse">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M11 3L7 7L11 11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
    </div>

    <!-- 内容区 -->
    <div class="editor__content">
      <BasicInfo v-if="activeSectionId === 'basic'" />
      <Summary v-else-if="activeSectionId === 'summary'" />
      <WorkExperience v-else-if="activeSectionId === 'work'" />
      <Education v-else-if="activeSectionId === 'education'" />
      <Projects v-else-if="activeSectionId === 'projects'" />
      <Skills v-else-if="activeSectionId === 'skills'" />
      <SelfEvaluation v-else-if="activeSectionId === 'evaluation'" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useEditorLayoutStore } from '@/stores/editorLayoutStore'
import { SECTION_CONFIG } from '@/types/resume'
import { iconMap, UserIcon } from '@/components/icons/SectionIcons'
import BasicInfo from './sections/BasicInfo.vue'
import Summary from './sections/Summary.vue'
import WorkExperience from './sections/WorkExperience.vue'
import Education from './sections/Education.vue'
import Projects from './sections/Projects.vue'
import Skills from './sections/Skills.vue'
import SelfEvaluation from './sections/SelfEvaluation.vue'

const layoutStore = useEditorLayoutStore()

// 当前选中模块
const activeSectionId = computed(() => layoutStore.activeSectionId)

// 当前标题
const currentTitle = computed(() => {
  return SECTION_CONFIG[activeSectionId.value]?.label || '编辑'
})

// 当前图标
const currentIcon = computed(() => {
  return iconMap[activeSectionId.value] || UserIcon
})

// 收缩编辑区
const handleCollapse = () => {
  layoutStore.toggleEditorCollapse()
}
</script>

<style lang="scss" scoped>
.section-editor {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: rgba($bg-primary, 0.6);
  backdrop-filter: blur(16px);
}

.editor__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: $spacing-md $spacing-lg;
  border-bottom: 1px solid $border-glass;
  flex-shrink: 0;
}

.editor__title {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  font-size: $font-size-lg;
  font-weight: 700;
  color: $text-primary;
  margin: 0;
}

.editor__icon {
  display: flex;
  color: $primary-light;
}

.editor__collapse-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  background: $bg-glass;
  border: 1px solid $border-glass;
  border-radius: $radius-md;
  color: $text-secondary;
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    background: $bg-glass-hover;
    color: $text-primary;
    border-color: $primary-color;
  }
}

.editor__content {
  flex: 1;
  overflow-y: auto;
  padding: $spacing-lg;
  @include scrollbar;
}
</style>
