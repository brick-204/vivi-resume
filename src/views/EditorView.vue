<template>
  <div class="editor-view">
    <!-- 顶部栏 -->
    <header class="editor-header">
      <div class="header__left">
        <router-link to="/" class="header__back">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M11 4L6 9L11 14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span class="back__text">返回</span>
        </router-link>
        <div class="header__divider"></div>
        <input
          v-model="resumeTitle"
          class="header__title-input"
          placeholder="给简历起个名字..."
          @blur="saveTitle"
        />
        <span v-if="templateName" class="header__template-badge">{{ templateName }}</span>
      </div>
      <div class="header__right">
        <button class="header-btn header-btn--template" @click="goToTemplates">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <rect x="1.5" y="1.5" width="5" height="5" rx="1" stroke="currentColor" stroke-width="1.5"/>
            <rect x="9.5" y="1.5" width="5" height="5" rx="1" stroke="currentColor" stroke-width="1.5"/>
            <rect x="1.5" y="9.5" width="5" height="5" rx="1" stroke="currentColor" stroke-width="1.5"/>
            <rect x="9.5" y="9.5" width="5" height="5" rx="1" stroke="currentColor" stroke-width="1.5"/>
          </svg>
          更换模板
        </button>
        <button class="header-btn header-btn--export" @click="exportJSON">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M5 3H12V10M12 3L5 10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          导出 JSON
        </button>
        <button class="header-btn header-btn--pdf" @click="exportPDF">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M4 8H12M8 4V12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            <rect x="2" y="2" width="12" height="12" rx="3" stroke="currentColor" stroke-width="1.5"/>
          </svg>
          导出 PDF
        </button>
      </div>
    </header>

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
        <!-- 背景光晕 -->
        <div class="preview__bg">
          <div class="preview__orb preview__orb--1"></div>
          <div class="preview__orb preview__orb--2"></div>
        </div>
        <div class="preview-wrapper">
          <ResumePreview ref="previewRef" @click-section="handleClickSection" />
        </div>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useResumeStore } from '@/stores/resumeStore'
import { useEditorLayoutStore } from '@/stores/editorLayoutStore'
import { downloadJSON } from '@/utils/export'
import { getTemplate } from '@/config/templates'
import SectionNavigator from '@/components/editor/SectionNavigator.vue'
import SectionEditor from '@/components/editor/SectionEditor.vue'
import ResizeHandle from '@/components/common/ResizeHandle.vue'
import ResumePreview from '@/components/preview/ResumePreview.vue'

const route = useRoute()
const router = useRouter()
const store = useResumeStore()
const layoutStore = useEditorLayoutStore()
const previewRef = ref<InstanceType<typeof ResumePreview>>()
const sectionEditorRef = ref<InstanceType<typeof SectionEditor>>()

const resumeTitle = computed({
  get: () => store.currentResume?.title || '',
  set: (value) => store.updateCurrentResume({ title: value })
})

const templateName = computed(() => {
  const id = store.currentResume?.templateId
  return id ? getTemplate(id).name : ''
})

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
    downloadJSON(json, `${resumeTitle.value || 'resume'}.json`)
  }
}

const exportPDF = () => {
  // 打印前临时强制 content-visibility: visible，
  // 确保所有内容被浏览器渲染（否则离屏内容不会输出到 PDF）
  const selectors = '.resume__section, .entry, .sidebar__section, .main__entry'
  const sections = document.querySelectorAll(selectors)
  const originalStyles: Array<{ el: HTMLElement; style: string }> = []

  sections.forEach(s => {
    if (s instanceof HTMLElement) {
      originalStyles.push({ el: s, style: s.style.contentVisibility })
      s.style.contentVisibility = 'visible'
    }
  })

  // 等待一帧让浏览器完成布局后再打印
  requestAnimationFrame(() => {
    window.print()

    // window.print() 在大多数浏览器中是同步阻塞的（打印对话框期间 JS 暂停），
    // 但 Firefox 的打印预览可能是异步的。加一个小延时确保安全恢复。
    setTimeout(() => {
      originalStyles.forEach(({ el, style }) => {
        if (style) {
          el.style.contentVisibility = style
        } else {
          el.style.removeProperty('content-visibility')
        }
      })
    }, 100)
  })
}

let saveTimer: ReturnType<typeof setTimeout> | null = null
watch(
  () => store.currentResume,
  () => {
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = setTimeout(() => {
      // saveCurrentResume 已改为异步（Worker 序列化），不阻塞 UI
      store.saveCurrentResume()
    }, 1000)
  },
  { deep: true }
)

onMounted(async () => {
  // Undo/Redo 全局快捷键（必须在第一个 await 之前注册 onUnmounted）
  const handleKeyDown = (e: KeyboardEvent) => {
    if (!(e.ctrlKey || e.metaKey)) return
    // 排除焦点在可编辑元素内（这些组件有自己的 undo 逻辑）
    const tag = (e.target as HTMLElement).tagName
    const isEditable = tag === 'INPUT' || tag === 'TEXTAREA' ||
      (e.target as HTMLElement).isContentEditable
    if (isEditable) return

    if (e.key === 'z' && !e.shiftKey) {
      e.preventDefault()
      store.undo()
    } else if ((e.key === 'z' && e.shiftKey) || e.key === 'y') {
      e.preventDefault()
      store.redo()
    }
  }
  window.addEventListener('keydown', handleKeyDown)
  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeyDown)
  })

  // 等待 store 初始化完成（Worker 异步加载 IndexedDB 数据）
  await store.ready
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

// 顶部栏
.editor-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: $header-height;
  padding: 0 $spacing-lg;
  background: rgba($bg-primary, 0.8);
  backdrop-filter: blur(20px) saturate(1.8);
  -webkit-backdrop-filter: blur(20px) saturate(1.8);
  border-bottom: 1px solid $border-glass;
  z-index: 100;
}

.header__left {
  display: flex;
  align-items: center;
  gap: $spacing-md;
}

.header__back {
  display: flex;
  align-items: center;
  gap: $spacing-xs;
  color: $text-secondary;
  font-size: $font-size-sm;
  font-weight: 500;
  padding: $spacing-sm $spacing-md;
  border-radius: $radius-lg;
  transition: all $transition-fast;

  &:hover {
    background: $bg-glass;
    color: $primary-light;
  }
}

.back__arrow {
  font-size: 18px;
}

.header__divider {
  width: 1px;
  height: 24px;
  background: $border-glass;
}

.header__title-input {
  border: none;
  background: transparent;
  font-size: $font-size-lg;
  font-weight: 600;
  color: $text-primary;
  padding: $spacing-sm $spacing-md;
  border-radius: $radius-lg;
  min-width: 200px;
  transition: all $transition-fast;
  font-family: $font-family;

  &:focus {
    outline: none;
    background: $bg-glass;
    box-shadow: 0 0 0 2px rgba(124, 92, 252, 0.2);
  }

  &::placeholder {
    color: $text-light;
  }
}

.header__template-badge {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  padding: 2px 10px;
  font-size: 11px;
  font-weight: 600;
  color: $text-light;
  background: $bg-glass;
  border-radius: $radius-sm;
  border: 1px solid $border-glass;
  user-select: none;
  white-space: nowrap;
}

.header__right {
  display: flex;
  gap: $spacing-sm;
}

.header-btn {
  display: inline-flex;
  align-items: center;
  gap: $spacing-xs;
  padding: $spacing-sm $spacing-lg;
  border-radius: $radius-lg;
  font-size: $font-size-sm;
  font-weight: 600;
  cursor: pointer;
  transition: all $transition-base;
  border: none;
  font-family: $font-family;

  &--template {
    background: $bg-glass;
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    color: $text-secondary;
    border: 1px solid $border-glass;

    &:hover {
      background: $bg-glass-hover;
      color: $text-primary;
      border-color: $primary-color;
      box-shadow: 0 4px 20px rgba(124, 92, 252, 0.15);
    }
  }

  &--export {
    background: $bg-glass;
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    color: $text-secondary;
    border: 1px solid $border-glass;

    &:hover {
      background: $bg-glass-hover;
      color: $text-primary;
      border-color: $accent-color;
      box-shadow: 0 4px 20px rgba(244, 114, 182, 0.15);
    }
  }

  &--pdf {
    background: $primary-gradient;
    color: $text-white;
    box-shadow: $shadow-primary;

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 32px rgba(124, 92, 252, 0.4);
    }
  }
}

// 主体 - 三列布局
.editor-body {
  flex: 1;
  display: flex;
  overflow: hidden;

  &__nav {
    flex-shrink: 0;
    min-width: 200px;
    background: rgba($bg-primary, 0.6);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
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
    background: rgba($bg-primary, 0.6);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
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
.preview__bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

.preview__orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  animation: float 10s ease-in-out infinite;

  &--1 {
    width: 300px;
    height: 300px;
    background: radial-gradient(circle, rgba(124, 92, 252, 0.15) 0%, transparent 70%);
    top: 10%;
    right: 10%;
  }

  &--2 {
    width: 250px;
    height: 250px;
    background: radial-gradient(circle, rgba(6, 182, 212, 0.1) 0%, transparent 70%);
    bottom: 20%;
    left: 20%;
    animation-delay: -4s;
  }
}

.preview-wrapper {
  position: relative;
  max-width: 820px;
  margin: 0 auto;
  @include glass;
  padding: 0;
  min-height: 100%;
  border-radius: $radius-xl;
}
</style>
