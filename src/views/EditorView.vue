<template>
  <div class="editor-view">
    <!-- 公共头部 -->
    <AppHeader
      show-editor-center
      show-editor-right
      @export-json="exportJSON"
      @export-pdf="exportPDF"
      @export-image="exportImage"
      @export-docx="exportDOCX"
      @ai-eval="showEvalModal = true"
      @jd-scan="showJDScanModal = true"
      @interview-prep="showInterviewModal = true"
      @full-optimize="showFullOptimizeModal = true"
      @change-template="goToTemplates"
      @save-title="saveTitle"
    />

    <!-- 加载中：骨架屏 → 加载完成：真实编辑器（淡入过渡） -->
    <Transition name="editor-fade">
      <EditorSkeleton v-if="!isReady" key="skeleton" />

      <main v-else id="main-content" key="editor" class="editor-body">
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

      <!-- 第三列：简历预览区 / 回收箱 -->
      <section class="editor-body__preview">
        <!-- Tab 切换 -->
        <div class="preview-tabs">
          <button
            class="preview-tab"
            :class="{ 'preview-tab--active': previewTab === 'preview' }"
            @click="previewTab = 'preview'"
          >
            <Icon icon="mdi:file-document-outline" :width="16" />
            预览
          </button>
          <button
            class="preview-tab"
            :class="{ 'preview-tab--active': previewTab === 'trash' }"
            @click="previewTab = 'trash'"
          >
            <Icon icon="mdi:delete-restore" :width="16" />
            回收箱
          </button>
        </div>
        <!-- 内容 -->
        <div class="preview-wrapper">
          <!-- ponytail: 分帧渲染 — 预览区延迟到下一帧，避免阻塞挂载帧（INP） -->
          <ResumePreview v-if="previewReady && previewTab === 'preview'" ref="previewRef" @click-section="handleClickSection" />
          <TrashBinPanel v-else-if="previewTab === 'trash'" />
        </div>
      </section>
    </main>
    </Transition>

    <!-- 弹窗只在首次打开时渲染（懒挂载，降低初始 load 成本） -->
    <!-- ponytail: AI 弹窗懒挂载 — 未打开时不渲染，零 setup 成本 -->
    <ResumeEvaluationModal
      v-if="showEvalModal"
      :show="showEvalModal"
      @close="showEvalModal = false"
    />

    <JDScanModal
      v-if="showJDScanModal"
      :visible="showJDScanModal"
      :config="aiConfigStore.activeConfig ?? null"
      @close="showJDScanModal = false"
    />

    <FullResumeOptimizeModal
      v-if="showFullOptimizeModal"
      :show="showFullOptimizeModal"
      @close="showFullOptimizeModal = false"
      @apply="handleFullOptimizeApply"
    />

    <InterviewPrepModal
      v-if="showInterviewModal"
      :visible="showInterviewModal"
      :config="aiConfigStore.activeConfig ?? null"
      @close="showInterviewModal = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, onMounted, defineAsyncComponent } from 'vue'
import { useRoute, useRouter, onBeforeRouteLeave } from 'vue-router'
import { useResumeStore } from '@/stores/resumeStore'
import { useAIConfigStore } from '@/stores/aiConfigStore'
import { useEditorLayoutStore } from '@/stores/editorLayoutStore'
import { downloadJSON } from '@/utils/export'
// ponytail: 导出工具动态导入 — docx/modern-screenshot 等重库移出 EditorView 静态依赖图，
// 让路由组件加载更快、编辑器骨架屏尽早显示；导出按钮点击时才拉取对应 chunk
import { DEFAULT_PAGE_PADDING } from '@/types/resume'
import { message as naiveMessage } from '@/plugins/naive-ui'
import { Icon } from '@iconify/vue'
import AppHeader from '@/components/common/AppHeader.vue'
import EditorSkeleton from '@/components/common/EditorSkeleton.vue'
import SectionNavigator from '@/components/editor/SectionNavigator.vue'
import SectionEditor from '@/components/editor/SectionEditor.vue'
import TrashBinPanel from '@/components/editor/TrashBinPanel.vue'
import ResizeHandle from '@/components/common/ResizeHandle.vue'
import ResumePreview from '@/components/preview/ResumePreview.vue'
// ponytail: AI 弹窗异步加载 — 它们静态拉入 turndown/markdownConverter/resumeSerializer（~90KB+），
// 移出 EditorView 主图，首次打开时才拉取，编辑器进入更快
const ResumeEvaluationModal = defineAsyncComponent(() => import('@/components/ai/ResumeEvaluationModal.vue'))
const JDScanModal = defineAsyncComponent(() => import('@/components/ai/JDScanModal.vue'))
const FullResumeOptimizeModal = defineAsyncComponent(() => import('@/components/ai/FullResumeOptimizeModal.vue'))
const InterviewPrepModal = defineAsyncComponent(() => import('@/components/ai/InterviewPrepModal.vue'))

const route = useRoute()
const router = useRouter()
const store = useResumeStore()
const aiConfigStore = useAIConfigStore()
const layoutStore = useEditorLayoutStore()
const previewRef = ref<InstanceType<typeof ResumePreview>>()
const sectionEditorRef = ref<InstanceType<typeof SectionEditor>>()
const previewTab = ref<'preview' | 'trash'>('preview')
const showEvalModal = ref(false)
const showJDScanModal = ref(false)
const showFullOptimizeModal = ref(false)
const showInterviewModal = ref(false)
const isReady = ref(false)
// ponytail: 预览区延迟一帧渲染，让导航+编辑区先绘制（降低 INP）
const previewReady = ref(false)

const saveTitle = async () => {
  await store.saveCurrentResumeNow()
}

// 路由离开守卫：确保脏数据在导航前保存
onBeforeRouteLeave(async () => {
  if (store.isDirty) {
    await store.saveCurrentResumeNow()
  }
})

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
    downloadJSON(json, store.currentResume?.title || 'resume')
  }
}

/** 应用一键优化结果 */
const handleFullOptimizeApply = (updates: Record<string, unknown>) => {
  if (!store.currentResume) return
  store.updateCurrentResume(updates)
  store.saveCurrentResumeNow()
}

const exportPDF = async () => {
  const el = previewRef.value?.getElement()
  if (!el) {
    console.warn('[exportPDF] 预览元素未就绪')
    return
  }
  // ponytail: 动态加载 print 模块，不阻塞编辑器首屏
  const { printViaIframe } = await import('@/utils/print')
  await printViaIframe({
    target: el,
    margin: store.currentResume?.pagePadding ?? DEFAULT_PAGE_PADDING,
    filename: store.currentResume?.title || 'resume',
  })
}

const exportImage = async () => {
  const el = previewRef.value?.getElement()
  if (!el) {
    console.warn('[exportImage] 预览元素未就绪')
    return
  }
  try {
    // ponytail: 动态加载 modern-screenshot，不阻塞编辑器首屏
    const { exportAsImage } = await import('@/utils/exportImage')
    await exportAsImage(
      el,
      store.currentResume?.title || 'resume',
      store.currentResume?.pagePadding ?? DEFAULT_PAGE_PADDING,
    )
  } catch (e) {
    console.error('[exportImage] 导出图片失败:', e)
    naiveMessage.error('导出图片失败，请重试')
  }
}

const exportDOCX = async () => {
  if (!store.currentResume) return
  try {
    // ponytail: 动态加载 docx 库，不阻塞编辑器首屏
    const { exportDocx } = await import('@/utils/exportDocx')
    await exportDocx(store.currentResume, store.currentResume.title || 'resume')
    naiveMessage.success('DOCX 导出成功')
  } catch (e) {
    console.error('[exportDOCX] 导出 DOCX 失败:', e)
    naiveMessage.error('导出 DOCX 失败，请重试')
  }
}

onMounted(async () => {
  // ponytail: 两个 store 并行等待，节省串行时间（E）
  await Promise.all([store.ready, aiConfigStore.ready])
  const id = route.params.id as string
  if (id) {
    if (!(await store.loadResume(id))) {
      router.push('/dashboard')
      return
    }
    // ponytail: 延后清理，不阻塞首帧（I）
    setTimeout(() => store.cleanupDeletedData(), 100)
  } else {
    router.push('/dashboard')
    return
  }
  isReady.value = true
  // 下一帧再渲染预览区，避免与挂载帧的长任务叠加（INP 优化）
  requestAnimationFrame(() => { previewReady.value = true })
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
    min-width: 260px;
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
    overflow-y: auto;
    position: relative;
    display: flex;
    flex-direction: column;
    @include scrollbar;
  }
}

// 预览/回收箱 Tab 切换栏
.preview-tabs {
  flex-shrink: 0;
  display: flex;
  gap: $spacing-xs;
  padding: $spacing-sm $spacing-xl;
  border-bottom: 1px solid $border-glass;
  background: var(--editor-panel-bg);
}

.preview-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: $spacing-xs $spacing-md;
  border: none;
  border-radius: $radius-md;
  background: transparent;
  color: $text-secondary;
  font-size: $font-size-sm;
  font-family: $font-family;
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    background: $bg-glass-hover;
    color: $text-primary;
  }

  &--active {
    background: $primary-bg-active;
    color: $text-white;
  }
}

// 预览背景光晕
.preview-wrapper {
  flex: 1;
  position: relative;
  max-width: 820px;
  width: 100%;
  margin: 0 auto;
  @include glass;
  padding: $spacing-xl;
  overflow-y: auto;
  @include scrollbar;
}

// 骨架屏 → 编辑器淡入过渡
.editor-fade-enter-active,
.editor-fade-leave-active {
  transition: opacity 0.2s ease;
}
.editor-fade-enter-from,
.editor-fade-leave-to {
  opacity: 0;
}
</style>
