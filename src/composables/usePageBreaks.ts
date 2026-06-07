import { ref, watch, onMounted, onUnmounted } from 'vue'
import type { Ref } from 'vue'

/** A4 尺寸 @ 96 DPI */
export const A4_WIDTH_PX = 794
export const A4_HEIGHT_PX = 1123

/**
 * 计算简历预览中的 A4 分页线位置
 *
 * 分页线位置是相对于 .resume-preview 元素顶部的像素值，
 * 即 padding-top + N × 内容区域高度。
 */
export function usePageBreaks(
  previewRef: Ref<HTMLElement | undefined>,
  padding: Ref<number>,
) {
  const pageBreaks = ref<number[]>([])

  let resizeObserver: ResizeObserver | null = null
  let debounceTimer: ReturnType<typeof setTimeout> | null = null

  const updateBreaks = () => {
    const el = previewRef.value
    if (!el) {
      pageBreaks.value = []
      return
    }

    const pad = padding.value
    const contentHeight = A4_HEIGHT_PX - pad * 2
    if (contentHeight <= 0) {
      pageBreaks.value = []
      return
    }

    // content-visibility: auto 会让浏览器用 contain-intrinsic-size 估算高度，
    // 导致 scrollHeight 不准确。临时切换为 visible 以读取真实高度。
    const cvEls = el.querySelectorAll('.resume__section, .entry, .sidebar__section, .main__entry')
    const saved: string[] = []
    cvEls.forEach((e, idx) => {
      const htmlEl = e as HTMLElement
      saved[idx] = htmlEl.style.contentVisibility
      htmlEl.style.contentVisibility = 'visible'
    })

    const totalHeight = el.scrollHeight

    // 恢复原始 content-visibility
    cvEls.forEach((e, idx) => {
      const htmlEl = e as HTMLElement
      htmlEl.style.contentVisibility = saved[idx] || ''
    })

    const breaks: number[] = []
    for (let y = contentHeight; y < totalHeight; y += contentHeight) {
      breaks.push(y + pad)
    }
    pageBreaks.value = breaks
  }

  const scheduleUpdate = () => {
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(updateBreaks, 100)
  }

  // 监听 previewRef 变化，动态注册/注销 ResizeObserver
  const stopWatchRef = watch(previewRef, (el, prevEl) => {
    if (prevEl) {
      resizeObserver?.unobserve(prevEl)
    }
    if (el) {
      if (!resizeObserver) {
        resizeObserver = new ResizeObserver(scheduleUpdate)
      }
      resizeObserver.observe(el)
      updateBreaks()
    } else {
      pageBreaks.value = []
    }
  })

  // 监听 padding 变化
  const stopWatchPadding = watch(padding, scheduleUpdate)

  onMounted(() => {
    // 首次计算（如果 ref 已有值）
    if (previewRef.value) {
      if (!resizeObserver) {
        resizeObserver = new ResizeObserver(scheduleUpdate)
      }
      resizeObserver.observe(previewRef.value)
      updateBreaks()
    }
  })

  onUnmounted(() => {
    stopWatchRef()
    stopWatchPadding()
    resizeObserver?.disconnect()
    resizeObserver = null
    if (debounceTimer) clearTimeout(debounceTimer)
  })

  return { pageBreaks }
}
