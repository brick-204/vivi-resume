import { ref, computed, watch, onUnmounted, type Ref, unref } from 'vue'

export interface PageBreak {
  pageNumber: number   // 该分页线之后的页码
  topPosition: number  // 相对文档顶部的 px 位置
}

// A4 @ 96dpi
export const A4_WIDTH_PX = 794
export const A4_HEIGHT_PX = 1123

const DEBOUNCE_MS = 100

export function usePageBreaks(
  documentRef: Ref<HTMLElement | undefined>,
  pagePadding: Ref<number> | number = 48
) {
  const documentHeight = ref(0)
  const pageBreaks = ref<PageBreak[]>([])
  let resizeObserver: ResizeObserver | null = null
  let mutationObserver: MutationObserver | null = null
  let debounceTimer: ReturnType<typeof setTimeout> | null = null

  // @page { margin: 0 } 后，有效内容高度 = A4 高度 - 2 × pagePadding
  const effectivePageHeight = computed(() => {
    const padding = unref(pagePadding)
    return A4_HEIGHT_PX - padding * 2
  })

  // ===== content-visibility 处理 =====

  /** 临时强制 content-visibility: visible，返回原始样式以便恢复 */
  const forceContentVisible = (el: HTMLElement): Array<{ el: HTMLElement; style: string }> => {
    const selector = '.resume__section, .entry, .sidebar__section, .main__entry'
    const sections = el.querySelectorAll(selector)
    const saved: Array<{ el: HTMLElement; style: string }> = []

    sections.forEach(section => {
      if (section instanceof HTMLElement) {
        saved.push({ el: section, style: section.style.contentVisibility })
        section.style.contentVisibility = 'visible'
      }
    })

    // 强制同步布局
    void el.offsetHeight
    return saved
  }

  const restoreContentVisibility = (saved: Array<{ el: HTMLElement; style: string }>) => {
    saved.forEach(({ el, style }) => {
      if (style) {
        el.style.contentVisibility = style
      } else {
        el.style.removeProperty('content-visibility')
      }
    })
  }

  // ===== 测量 + 分页计算 =====

  /**
   * 计算智能分页线位置（模拟 page-break-inside: avoid）
   *
   * 单一迭代：从文档顶部开始，逐页推进。
   * 如果 entry 跨越分页线，将分页线提前到 entry 之前（与浏览器打印行为一致）。
   */
  const computePageBreaks = (el: HTMLElement): { height: number; breaks: PageBreak[] } => {
    const saved = forceContentVisible(el)
    const totalHeight = el.scrollHeight
    const pageHeight = effectivePageHeight.value

    if (totalHeight <= pageHeight) {
      restoreContentVisibility(saved)
      return { height: totalHeight, breaks: [] }
    }

    // 获取所有 entry 元素的位置信息
    const entrySelector = '.entry, .main__entry'
    const entries = el.querySelectorAll(entrySelector)
    type EntryInfo = { top: number; bottom: number }
    const entryInfos: EntryInfo[] = []

    entries.forEach(entry => {
      if (entry instanceof HTMLElement) {
        // 计算 entry 相对文档顶部的偏移
        let top = 0
        let current: HTMLElement | null = entry
        while (current && current !== el) {
          top += current.offsetTop
          current = current.offsetParent as HTMLElement | null
        }
        entryInfos.push({
          top,
          bottom: top + entry.offsetHeight
        })
      }
    })

    restoreContentVisibility(saved)

    // 单一迭代生成分页线
    const breaks: PageBreak[] = []
    let currentTop = 0
    let pageNum = 2

    while (currentTop + pageHeight < totalHeight) {
      const pageBottom = currentTop + pageHeight

      // 默认分页位置 = 当前页底部
      let breakPosition = pageBottom

      // 检查是否有 entry 跨越分页线
      for (const info of entryInfos) {
        if (info.top < pageBottom && info.bottom > pageBottom && info.top > currentTop) {
          // entry 跨越分页线 → 将分页线提前到 entry 之前
          breakPosition = info.top
          break
        }
      }

      // 防止死循环：如果 entry 比 pageHeight 还高，强制按 pageHeight 分页
      if (breakPosition <= currentTop) {
        breakPosition = currentTop + pageHeight
      }

      breaks.push({
        pageNumber: pageNum,
        topPosition: breakPosition
      })

      currentTop = breakPosition
      pageNum++
    }

    return { height: totalHeight, breaks }
  }

  /** 触发一次完整的测量 + 分页计算（带防抖） */
  const recalculate = () => {
    const el = documentRef.value
    if (!el) {
      documentHeight.value = 0
      pageBreaks.value = []
      return
    }

    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
      const result = computePageBreaks(el)
      documentHeight.value = result.height
      pageBreaks.value = result.breaks
    }, DEBOUNCE_MS)
  }

  // ===== Observer 管理 =====

  const setupObserver = (el: HTMLElement) => {
    teardownObserver()

    resizeObserver = new ResizeObserver(() => recalculate())
    resizeObserver.observe(el)

    // MutationObserver 监听内容变化（富文本编辑、字段增删）
    mutationObserver = new MutationObserver(() => recalculate())
    mutationObserver.observe(el, {
      childList: true,
      subtree: true,
      characterData: true,
    })

    // 首次计算
    recalculate()
  }

  const teardownObserver = () => {
    if (resizeObserver) {
      resizeObserver.disconnect()
      resizeObserver = null
    }
    if (mutationObserver) {
      mutationObserver.disconnect()
      mutationObserver = null
    }
  }

  // ===== Lifecycle =====

  watch(documentRef, (el) => {
    if (el) {
      setupObserver(el)
    } else {
      teardownObserver()
      documentHeight.value = 0
      pageBreaks.value = []
    }
  }, { immediate: true })

  // pagePadding 变化时重新计算分页线
  watch(effectivePageHeight, () => recalculate())

  onUnmounted(() => {
    teardownObserver()
    if (debounceTimer) {
      clearTimeout(debounceTimer)
    }
  })

  // ===== Public API =====

  const pageCount = computed(() => {
    if (pageBreaks.value.length === 0) return 1
    return pageBreaks.value[pageBreaks.value.length - 1].pageNumber
  })

  return {
    pageBreaks,
    pageCount,
    documentHeight,
    effectivePageHeight
  }
}