<template>
  <div class="editor-view">
    <!-- 公共头部 -->
    <AppHeader
      show-editor-center
      show-editor-right
      @export-json="exportJSON"
      @export-pdf="exportPDF"
      @ai-eval="showEvalModal = true"
      @change-template="goToTemplates"
      @save-title="saveTitle"
    />

    <!-- 主体 - 三列布局 -->
    <main class="editor-body">
      <!-- 第一列：模块导航栏 -->
      <aside
        class="editor-body__nav"
        :class="{ 'editor-body__nav--collapsed': layoutStore.navCollapsed }"
        :style="{ width: layoutStore.navCollapsed ? '48px' : layoutStore.navWidth + 'px' }"
      >
        <SectionNavigator @click-section="handleClickSection" />
      </aside>

      <!-- 第一列拖拽手柄 -->
      <ResizeHandle
        v-if="!layoutStore.navCollapsed"
        :current-width="layoutStore.navWidth"
        :at-min="layoutStore.navAtMin"
        :at-max="layoutStore.navAtMax"
        @resize="handleNavResize"
        @resize-end="layoutStore.saveLayout"
        @reset="layoutStore.resetNavWidth"
      />

      <!-- 第二列：模块编辑区 -->
      <Transition name="slide-left">
        <aside
          v-if="!layoutStore.editorCollapsed"
          class="editor-body__editor"
          :style="{ width: layoutStore.editorWidth + 'px' }"
        >
          <SectionEditor ref="sectionEditorRef" @click-entry="handleClickEntry" />
        </aside>
      </Transition>

      <!-- 第二列拖拽手柄 -->
      <ResizeHandle
        v-if="!layoutStore.editorCollapsed"
        :current-width="layoutStore.editorWidth"
        :at-min="layoutStore.editorAtMin"
        :at-max="layoutStore.editorAtMax"
        @resize="handleEditorResize"
        @resize-end="layoutStore.saveLayout"
        @reset="layoutStore.resetEditorWidth"
      />

      <!-- 第三列：简历预览区 -->
      <section class="editor-body__preview">
        <div class="preview-wrapper">
          <ResumePreview ref="previewRef" @click-section="handleClickSection" />
        </div>
      </section>
    </main>

    <!-- AI 简历评估弹窗 -->
    <ResumeEvaluationModal
      :show="showEvalModal"
      @close="showEvalModal = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useResumeStore } from '@/stores/resumeStore'
import { useAIConfigStore } from '@/stores/aiConfigStore'
import { useEditorLayoutStore } from '@/stores/editorLayoutStore'
import { downloadJSON } from '@/utils/export'
import { printViaIframe } from '@/utils/print'
import { DEFAULT_PAGE_PADDING } from '@/types/resume'
import AppHeader from '@/components/common/AppHeader.vue'
import SectionNavigator from '@/components/editor/SectionNavigator.vue'
import SectionEditor from '@/components/editor/SectionEditor.vue'
import ResizeHandle from '@/components/common/ResizeHandle.vue'
import ResumePreview from '@/components/preview/ResumePreview.vue'
import ResumeEvaluationModal from '@/components/ai/ResumeEvaluationModal.vue'

const route = useRoute()
const router = useRouter()
const store = useResumeStore()
const aiConfigStore = useAIConfigStore()
const layoutStore = useEditorLayoutStore()
const previewRef = ref<InstanceType<typeof ResumePreview>>()
const sectionEditorRef = ref<InstanceType<typeof SectionEditor>>()
const showEvalModal = ref(false)

const saveTitle = () => {
  store.saveCurrentResume()
}

// 编辑区滑入动画时长（与 CSS .slide-left-enter-active 的 0.25s 对齐，加缓冲）
const EDITOR_SLIDE_DURATION = 300

// 点击导航或预览区模块时，同步激活状态并滚动
const handleClickSection = (sectionId: string, itemId?: string) => {
  const wasCollapsed = layoutStore.editorCollapsed
  layoutStore.setActiveSection(sectionId)
  layoutStore.expandEditor()
  if (itemId) {
    previewRef.value?.scrollToEntry(sectionId, itemId)
    if (wasCollapsed) {
      setTimeout(() => {
        nextTick(() => sectionEditorRef.value?.scrollToCard(itemId))
      }, EDITOR_SLIDE_DURATION)
    } else {
      nextTick(() => sectionEditorRef.value?.scrollToCard(itemId))
    }
  } else {
    previewRef.value?.scrollToSection(sectionId)
  }
}

// 编辑器 card 点击 → 滚动预览到对应 entry
const handleClickEntry = (itemId: string) => {
  const sectionId = layoutStore.activeSectionId
  previewRef.value?.scrollToEntry(sectionId, itemId)
}

// 拖拽调节导航栏宽度
const handleNavResize = (newWidth: number) => {
  layoutStore.setNavWidth(newWidth)
}

// 拖拽调节编辑区宽度
const handleEditorResize = (newWidth: number) => {
  layoutStore.setEditorWidth(newWidth)
}

const goToTemplates = () => {
  const id = route.params.id as string
  if (id) {
    router.push(`/templates/${id}`)
  }
}

const exportJSON = () => {
  const json = store.exportToJSON()
  if (json) {
    downloadJSON(json, `${store.currentResume?.title || 'resume'}.json`)
  }
}

const exportPDF = async () => {
  const el = previewRef.value?.getElement()
  if (!el) {
    console.warn('[exportPDF] 预览元素未就绪')
    return
  }
  await printViaIframe({
    target: el,
    margin: store.currentResume?.pagePadding ?? DEFAULT_PAGE_PADDING,
  })
}

let saveTimer: ReturnType<typeof setTimeout> | null = null
watch(
  () => store.isDirty,
  (dirty) => {
    if (dirty) {
      if (saveTimer) clearTimeout(saveTimer)
      saveTimer = setTimeout(() => {
        store.saveCurrentResume()
      }, 1000)
    }
  }
)

onMounted(async () => {
  // 等待 store 初始化完成（Worker 异步加载 IndexedDB 数据）
  await store.ready
  await aiConfigStore.ready
  const id = route.params.id as string
  if (id) {
    if (!(await store.loadResume(id))) {
      router.push('/')
    }
  } else {
    router.push('/')
  }
})
</script>

<style lang="scss" scoped>

.editor-view {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: $bg-secondary;
}

// 主体 - 三列布局
.editor-body {
  flex: 1;
  display: flex;
  overflow: hidden;

  &__nav {
    flex-shrink: 0;
    min-width: 200px;
    background: var(--editor-panel-bg);
    border-right: 1px solid $border-glass;
    overflow-x: hidden;
    overflow-y: auto;
    position: relative;
    will-change: width;

    &--collapsed {
      min-width: 48px;
    }
  }

  &__editor {
    flex-shrink: 0;
    background: var(--editor-panel-bg);
    border-right: 1px solid $border-glass;
    overflow: hidden;
    will-change: width;
  }

  &__preview {
    flex: 1;
    min-width: 400px;
    background: $bg-secondary;
    padding: $spacing-xl;
    overflow-y: auto;
    position: relative;
    @include scrollbar;
  }
}

// 编辑区滑入滑出动画
.slide-left-enter-active,
.slide-left-leave-active {
  transition: all 0.25s ease;
}

.slide-left-enter-from,
.slide-left-leave-to {
  width: 0 !important;
  opacity: 0;
  margin-left: 0;
  padding: 0;
  overflow: hidden;
}

// 预览背景光晕
.preview-wrapper {
  position: relative;
  max-width: 820px;
  margin: 0 auto;
  @include glass;
  padding: 0;
  min-height: 100%;
  border-radius: $radius-lg;
}
</style>
