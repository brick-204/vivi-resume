<template>
  <div class="resume-preview" ref="previewRef">
    <div class="resume-preview__scaler" :style="scalerStyle">
      <div class="resume-preview__container">
        <ResumeDocument
          v-if="resume"
          :resume="resume"
          :template-id="templateId"
          @click-section="(s: string, i?: string) => emit('click-section', s, i)"
        />
        <PageBreakIndicator
          v-if="documentElement"
          :page-breaks="pageBreaks"
        />
      </div>
    </div>
    <!-- 占位元素：补偿 transform:scale() 不影响 DOM 布局的高度差异 -->
    <div class="resume-preview__spacer" :style="spacerStyle"></div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useResumeStore } from '@/stores/resumeStore'
import { DEFAULT_PAGE_PADDING } from '@/types/resume'
import { usePageBreaks, A4_WIDTH_PX } from '@/composables/usePageBreaks'
import ResumeDocument from './ResumeDocument.vue'
import PageBreakIndicator from './PageBreakIndicator.vue'

const store = useResumeStore()
const previewRef = ref<HTMLElement>()
const documentElement = ref<HTMLElement>()

const templateId = computed(() => store.currentResume?.templateId || 'classic')
const resume = computed(() => store.currentResume)
const pagePadding = computed(() =>
  store.currentResume?.pagePadding ?? DEFAULT_PAGE_PADDING
)

// Scale 缩放：将 794px 宽的 A4 文档缩放到预览面板宽度
const scale = ref(1)
let resizeObserver: ResizeObserver | null = null

const updateScale = () => {
  if (previewRef.value) {
    const containerWidth = previewRef.value.clientWidth
    scale.value = containerWidth / A4_WIDTH_PX
  }
}

onMounted(() => {
  updateScale()
  if (previewRef.value) {
    resizeObserver = new ResizeObserver(updateScale)
    resizeObserver.observe(previewRef.value)
  }
})

onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }
  if (retryTimer) {
    clearInterval(retryTimer)
    retryTimer = null
  }
})

const scalerStyle = computed(() => ({
  width: `${A4_WIDTH_PX}px`,
  transform: `scale(${scale.value})`,
  transformOrigin: 'top left',
}))

// 获取 .resume-document 元素引用（带重试，处理异步组件加载）
let retryTimer: ReturnType<typeof setInterval> | null = null

const updateDocumentRef = () => {
  if (retryTimer) {
    clearInterval(retryTimer)
    retryTimer = null
  }

  const tryGetDocument = (): boolean => {
    const doc = previewRef.value?.querySelector('.resume-document')
    if (doc instanceof HTMLElement) {
      documentElement.value = doc
      return true
    }
    return false
  }

  nextTick(() => {
    if (tryGetDocument()) return

    let attempts = 0
    retryTimer = setInterval(() => {
      attempts++
      if (tryGetDocument() || attempts >= 10) {
        clearInterval(retryTimer!)
        retryTimer = null
      }
    }, 50)
  })
}

watch(templateId, () => {
  documentElement.value = undefined
  updateDocumentRef()
})

watch(resume, updateDocumentRef, { immediate: true })

// 分页计算
const { pageBreaks, documentHeight } = usePageBreaks(documentElement, pagePadding)

// 占位元素高度：transform:scale() 不改变 DOM 布局尺寸，
// 需要在 scaler 后面放一个占位 div 来撑开正确的滚动高度。
// 占位高度 = 文档实际高度 × scale - scaler 的 DOM 布局高度（即文档实际高度）
// 简化：占位高度 = documentHeight × (scale - 1)
const spacerStyle = computed(() => {
  const s = scale.value
  const h = documentHeight.value
  if (s >= 1 || h <= 0) return { height: '0px' }
  // scale < 1 时，视觉高度 = h * s，DOM 高度 = h
  // 需要额外空间 = h * s - h = h * (s - 1)，这是负值
  // 实际上 DOM 高度是 h（未缩放），但视觉上只占 h*s
  // 滚动容器需要知道"视觉高度"，所以需要用 margin-bottom 调整
  // 更简单的方式：用 margin-bottom 把多余空间收回来
  return { height: '0px', marginTop: `${h * (s - 1)}px` }
})

const emit = defineEmits<{
  'click-section': [tabId: string, itemId?: string]
}>()

// 滚动到指定模块
const scrollToSection = (sectionId: string) => {
  const section = previewRef.value?.querySelector(`[data-section="${sectionId}"]`)
  if (section) {
    section.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

// 滚动到指定条目
const scrollToEntry = (sectionId: string, itemId: string) => {
  const entry = previewRef.value?.querySelector(`[data-section="${sectionId}"] [data-item-id="${itemId}"]`)
  if (entry) entry.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

defineExpose({
  getElement: () => previewRef.value,
  scrollToSection,
  scrollToEntry
})
</script>

<style lang="scss" scoped>
.resume-preview {
  min-height: 100%;
  background: #ffffff;
  overflow-y: auto;
  @include scrollbar;
}

.resume-preview__scaler {
  position: relative;
}

.resume-preview__container {
  position: relative;
}
</style>
