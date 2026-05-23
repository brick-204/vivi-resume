<template>
  <div class="section-editor">
    <!-- 内容区 -->
    <div class="editor__content" ref="editorContentRef">
      <BasicInfo v-if="activeSectionId === 'basic'" />
      <Summary v-else-if="activeSectionId === 'summary'" />
      <WorkExperience v-else-if="activeSectionId === 'work'" ref="workRef" @click-entry="(itemId) => emit('click-entry', itemId)" />
      <Education v-else-if="activeSectionId === 'education'" ref="educationRef" @click-entry="(itemId) => emit('click-entry', itemId)" />
      <Projects v-else-if="activeSectionId === 'projects'" ref="projectsRef" @click-entry="(itemId) => emit('click-entry', itemId)" />
      <Skills v-else-if="activeSectionId === 'skills'" />
      <SelfEvaluation v-else-if="activeSectionId === 'evaluation'" />
      <CustomText v-else-if="isCustomText" :section-id="activeSectionId" />
      <CustomCard v-else-if="isCustomCard" :section-id="activeSectionId" ref="customCardRef" @click-entry="(itemId) => emit('click-entry', itemId)" />

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
import { computed, nextTick, provide, ref } from 'vue'
import { useEditorLayoutStore } from '@/stores/editorLayoutStore'
import { getCustomSectionType } from '@/types/resume'
import { PLUS_ICON, COLLAPSE_EDITOR_ICON } from '@/components/icons/SectionIcons'
import { Icon } from '@iconify/vue'
import { ScrollContainerKey } from './scrollContainerKey'
import BasicInfo from './sections/BasicInfo.vue'
import Summary from './sections/Summary.vue'
import WorkExperience from './sections/WorkExperience.vue'
import Education from './sections/Education.vue'
import Projects from './sections/Projects.vue'
import Skills from './sections/Skills.vue'
import SelfEvaluation from './sections/SelfEvaluation.vue'
import CustomText from './sections/CustomText.vue'
import CustomCard from './sections/CustomCard.vue'

const layoutStore = useEditorLayoutStore()

const editorContentRef = ref<HTMLElement>()
provide(ScrollContainerKey, editorContentRef)

const emit = defineEmits<{ 'click-entry': [itemId: string] }>()

const workRef = ref<InstanceType<typeof WorkExperience>>()
const educationRef = ref<InstanceType<typeof Education>>()
const projectsRef = ref<InstanceType<typeof Projects>>()
const customCardRef = ref<InstanceType<typeof CustomCard>>()

// 当前选中模块
const activeSectionId = computed(() => layoutStore.activeSectionId)

const isCustomText = computed(() => getCustomSectionType(activeSectionId.value) === 'customText')
const isCustomCard = computed(() => getCustomSectionType(activeSectionId.value) === 'customCard')

// 是否可添加条目
const canAdd = computed(() =>
  ['work', 'education', 'projects'].includes(activeSectionId.value) || isCustomCard.value
)

// 添加条目
const handleAdd = async () => {
  await nextTick()
  const sectionId = activeSectionId.value
  if (sectionId === 'work') workRef.value?.addItem()
  else if (sectionId === 'education') educationRef.value?.addItem()
  else if (sectionId === 'projects') projectsRef.value?.addItem()
  else if (isCustomCard.value) customCardRef.value?.addItem()
}

// 收缩编辑区
const handleCollapse = () => {
  layoutStore.toggleEditorCollapse()
}

const scrollToCard = (itemId: string) => {
  const cardEl = editorContentRef.value?.querySelector(`[data-item-id="${itemId}"]`)
  if (cardEl) {
    cardEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }
}

defineExpose({ scrollToCard })
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
