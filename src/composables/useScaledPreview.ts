import { computed, ref, onMounted, onUnmounted } from 'vue'
import { DEFAULT_PAGE_PADDING } from '@/types/resume'

const DOC_WIDTH = 800
const DOC_HEIGHT = 1050

/**
 * 提供简历预览缩放逻辑的 composable
 * @param getPagePadding 返回当前页边距的函数，默认使用 DEFAULT_PAGE_PADDING
 */
export function useScaledPreview(getPagePadding?: () => number | undefined) {
  const previewContainer = ref<HTMLElement | null>(null)
  const scale = ref(0.35)

  const updateScale = () => {
    if (previewContainer.value) {
      const containerWidth = previewContainer.value.clientWidth
      scale.value = containerWidth / DOC_WIDTH
    }
  }

  let observer: ResizeObserver | null = null

  onMounted(() => {
    updateScale()
    observer = new ResizeObserver(updateScale)
    if (previewContainer.value) {
      observer.observe(previewContainer.value)
    }
  })

  onUnmounted(() => {
    observer?.disconnect()
  })

  const scaleStyle = computed(() => {
    const padding = getPagePadding ? (getPagePadding() ?? DEFAULT_PAGE_PADDING) : DEFAULT_PAGE_PADDING
    return {
      width: `${DOC_WIDTH}px`,
      minHeight: `${DOC_HEIGHT}px`,
      padding: `${padding}px`,
      transform: `scale(${scale.value})`,
      transformOrigin: 'top left'
    }
  })

  return { previewContainer, scaleStyle }
}
