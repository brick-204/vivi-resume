<template>
  <div class="section-editor">
    <!-- 内容区 -->
    <div class="editor__content">
      <BasicInfo v-if="activeSectionId === 'basic'" />
      <Summary v-else-if="activeSectionId === 'summary'" />
      <WorkExperience v-else-if="activeSectionId === 'work'" ref="workRef" />
      <Education v-else-if="activeSectionId === 'education'" ref="educationRef" />
      <Projects v-else-if="activeSectionId === 'projects'" ref="projectsRef" />
      <Skills v-else-if="activeSectionId === 'skills'" />
      <SelfEvaluation v-else-if="activeSectionId === 'evaluation'" />

      <!-- 添加按钮，随内容滚动 -->
      <button v-if="canAdd" class="editor__add-btn" @click="handleAdd">
        <Icon :icon="PLUS_ICON" :width="14" :height="14" />
        <span>添加</span>
      </button>
    </div>

    <!-- 底部收缩按钮 -->
    <div class="editor__footer">
      <button class="editor__collapse-btn" @click="handleCollapse">
        <Icon :icon="COLLAPSE_EDITOR_ICON" :width="14" :height="14" />
        <span>收起编辑区</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { useEditorLayoutStore } from '@/stores/editorLayoutStore'
import { PLUS_ICON, COLLAPSE_EDITOR_ICON } from '@/components/icons/SectionIcons'
import { Icon } from '@iconify/vue'
import BasicInfo from './sections/BasicInfo.vue'
import Summary from './sections/Summary.vue'
import WorkExperience from './sections/WorkExperience.vue'
import Education from './sections/Education.vue'
import Projects from './sections/Projects.vue'
import Skills from './sections/Skills.vue'
import SelfEvaluation from './sections/SelfEvaluation.vue'

const layoutStore = useEditorLayoutStore()

const workRef = ref<InstanceType<typeof WorkExperience>>()
const educationRef = ref<InstanceType<typeof Education>>()
const projectsRef = ref<InstanceType<typeof Projects>>()

// 当前选中模块
const activeSectionId = computed(() => layoutStore.activeSectionId)

// 是否可添加条目
const canAdd = computed(() => ['work', 'education', 'projects'].includes(activeSectionId.value))

// 添加条目
const handleAdd = async () => {
  await nextTick()
  const sectionId = activeSectionId.value
  if (sectionId === 'work') workRef.value?.addItem()
  else if (sectionId === 'education') educationRef.value?.addItem()
  else if (sectionId === 'projects') projectsRef.value?.addItem()
}

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

.editor__content {
  flex: 1;
  overflow-y: auto;
  padding: $spacing-lg;
  display: flex;
  flex-direction: column;
  @include scrollbar;
}

.editor__add-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: $spacing-xs;
  margin-top: $spacing-lg;
  padding: $spacing-sm $spacing-md;
  background: $bg-glass;
  border: 1px dashed $border-glass;
  border-radius: $radius-lg;
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

.editor__footer {
  flex-shrink: 0;
  padding: $spacing-sm $spacing-lg;
  border-top: 1px solid $border-glass;
}

.editor__collapse-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: $spacing-xs;
  width: 100%;
  padding: $spacing-sm;
  background: $bg-glass;
  border: 1px solid $border-glass;
  border-radius: $radius-md;
  color: $text-secondary;
  cursor: pointer;
  transition: all 0.15s;
  font-size: $font-size-sm;
  font-family: $font-family;

  &:hover {
    background: $bg-glass-hover;
    color: $text-primary;
    border-color: $primary-color;
  }
}
</style>
