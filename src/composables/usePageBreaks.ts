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
  /** 测量期间标志，用于屏蔽 content-visibility 切换触发的 ResizeObserver 回调 */
  let isMeasuring = false

  const updateBreaks = () => {
    const el = previewRef.value
    if (!el) {
      pageBreaks.value = []
      return
    }

    isMeasuring = true

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

    // 打印分页按 A4 整页高度切割，padding 是元素内部间距，
    // 顶部 padding 只在第 1 页占空间，底部 padding 只在最后一页占空间，
    // 中间页无 padding，所以分页线位置 = A4_HEIGHT_PX 的整数倍。
    const breaks: number[] = []
    for (let y = A4_HEIGHT_PX; y < totalHeight; y += A4_HEIGHT_PX) {
      breaks.push(y)
    }

    // 仅在分页线实际变化时更新，避免无意义重渲染
    const prev = pageBreaks.value
    if (breaks.length !== prev.length || breaks.some((b, i) => b !== prev[i])) {
      pageBreaks.value = breaks
    }

    // 延迟重置标志：等浏览器完成布局重算后再放开，
    // 避免本次 content-visibility 切换触发的 ResizeObserver 再次进入 updateBreaks
    requestAnimationFrame(() => {
      isMeasuring = false
    })
  }

  const scheduleUpdate = () => {
    // 测量期间跳过，防止 content-visibility 切换 → 布局变化 → ResizeObserver 的无限循环
    if (isMeasuring) return
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
      // ponytail: 首测走防抖路径，避免阻塞挂载帧（INP）
      scheduleUpdate()
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
