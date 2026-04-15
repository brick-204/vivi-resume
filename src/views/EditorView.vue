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

    <!-- 主体 -->
    <main class="editor-body">
      <aside class="editor-body__panel">
        <EditorPanel ref="editorPanelRef" @click-tab="handleClickTab" />
      </aside>
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
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useResumeStore } from '@/stores/resumeStore'
import { exportToPDF, downloadJSON } from '@/utils/export'
import EditorPanel from '@/components/editor/EditorPanel.vue'
import ResumePreview from '@/components/preview/ResumePreview.vue'

const route = useRoute()
const router = useRouter()
const store = useResumeStore()
const previewRef = ref<InstanceType<typeof ResumePreview>>()
const editorPanelRef = ref<InstanceType<typeof EditorPanel>>()

const resumeTitle = computed({
  get: () => store.currentResume?.title || '',
  set: (value) => store.updateCurrentResume({ title: value })
})

const saveTitle = () => {
  store.saveCurrentResume()
}

const handleClickSection = (tabId: string) => {
  editorPanelRef.value?.switchTab(tabId)
}

// 点击左侧编辑区模块时，右侧预览区滚动到对应模块
const handleClickTab = (tabId: string) => {
  previewRef.value?.scrollToSection(tabId)
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
    downloadJSON(store.currentResume, `${resumeTitle.value || 'resume'}.json`)
  }
}

const exportPDF = async () => {
  const element = previewRef.value?.getElement()
  if (element) {
    await exportToPDF(element, `${resumeTitle.value || 'resume'}.pdf`)
  }
}

let saveTimer: ReturnType<typeof setTimeout> | null = null
watch(
  () => store.currentResume,
  () => {
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = setTimeout(() => {
      store.saveCurrentResume()
    }, 1000)
  },
  { deep: true }
)

onMounted(() => {
  const id = route.params.id as string
  if (id) {
    if (!store.loadResume(id)) {
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

// 主体
.editor-body {
  flex: 1;
  display: flex;
  overflow: hidden;

  &__panel {
    width: $editor-panel-width;
    flex-shrink: 0;
    background: rgba($bg-primary, 0.6);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border-right: 1px solid $border-glass;
  }

  &__preview {
    flex: 1;
    background: $bg-secondary;
    padding: $spacing-xl;
    overflow-y: auto;
    position: relative;
    @include scrollbar;
  }
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
