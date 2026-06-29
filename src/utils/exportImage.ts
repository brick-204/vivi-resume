/**
 * 导出简历预览为 PNG 图片
 *
 * 方案：使用 modern-screenshot（SVG foreignObject 技术）直接从 DOM 截图。
 * 相比 html2canvas 的 CSS 重绘方案，modern-screenshot 利用浏览器原生渲染，
 * 完美支持 CSS Grid、content-visibility、CSS 自定义属性等现代特性。
 */
import { domToBlob } from 'modern-screenshot'
import { DEFAULT_PAGE_PADDING } from '@/types/resume'
import { formatTimestamp } from '@/utils/timestamp'

/** 浏览器 Canvas 单边最大像素限制 */
const MAX_CANVAS_DIMENSION = 16384

/** 需要 content-visibility 覆盖的选择器 */
const CV_SELECTORS = '.resume__section, .entry, .sidebar__section, .main__entry'

/**
 * 需要移除内联 width 的选择器
 *
 * modern-screenshot 的 copyCssStyles 会将 getComputedStyle().width 写为内联样式，
 * 对于 flex 子元素，这会将弹性尺寸变成固定像素值，导致在 SVG foreignObject 中
 * 文本换行/溢出。移除这些元素的内联 width 后，flex 布局可自然伸缩。
 */
const FLEX_CHILD_SELECTORS = [
  // entry header（flex 容器 + 子元素）
  '.entry__header',
  '.entry__info',
  '.entry__date',
  // entry body
  '.entry__content',   // flex: 1
  '.entry__tags',      // flex 容器（flex-wrap: wrap）
  '.tech-tag',         // tags 子元素
  // sidebar entry header
  '.main__entry-header',
  '.main__entry-info',
  '.main__entry-date',
  // sidebar entry body
  '.main__entry-tags',
  '.main__tech-tag',
  // sidebar 字段（flex 行）
  '.sidebar__field',
  '.sidebar__field-value', // flex: 1
].join(',')

/**
 * 需要禁止文本换行的选择器
 *
 * 日期和标签文本在 SVG foreignObject 中容易被内联宽度挤压而换行，
 * 强制 white-space: nowrap 确保它们保持单行显示。
 */
const NO_WRAP_SELECTORS = '.entry__date, .main__entry-date, .tech-tag, .main__tech-tag'

/**
 * 需要禁止 flex 收缩的选择器
 *
 * 日期元素在 flex 容器中不应被压缩，否则文字仍可能换行。
 */
const NO_SHRINK_SELECTORS = '.entry__date, .main__entry-date'

/**
 * 需要 min-width: 0 的选择器
 *
 * 在 flex 布局中，flex 子项默认 min-width 为 auto（即不小于内容宽度），
 * 这会导致右侧日期元素空间不足。设置 min-width: 0 允许 info 区域缩小，
 * 为日期腾出空间。
 */
const MIN_WIDTH_ZERO_SELECTORS = '.entry__info, .main__entry-info'

/**
 * 将 DOM 元素导出为 PNG 图片并触发下载
 *
 * @param element 要捕获的 DOM 元素（通常是 .resume-preview）
 * @param filename 下载文件名（不含扩展名）
 * @param margin 页边距（保留接口兼容，实际由 DOM 内联样式控制）
 * @throws 导出失败时抛出异常
 */
export async function exportAsImage(
  element: HTMLElement,
  filename: string = 'resume',
  _margin: number = DEFAULT_PAGE_PADDING,
): Promise<void> {
  // 1. 捕获前：强制 content-visibility: visible
  //    modern-screenshot 从原始 DOM 读取计算样式，需确保布局完整
  const cvElements = element.querySelectorAll(CV_SELECTORS)
  const savedCV: string[] = []
  cvElements.forEach((el, i) => {
    savedCV[i] = (el as HTMLElement).style.contentVisibility
    ;(el as HTMLElement).style.contentVisibility = 'visible'
  })

  try {
    // 2. 使用 modern-screenshot 截图
    const blob = await domToBlob(element, {
      scale: calculateScale(element),
      backgroundColor: '#ffffff',
      maximumCanvasSize: MAX_CANVAS_DIMENSION,
      features: {
        copyScrollbar: false,
      },
      filter: (node: Node) => {
        // 排除分页线和页码指示器（绝对定位，不影响布局）
        if (node instanceof HTMLElement) {
          if (
            node.classList.contains('page-break-line') ||
            node.classList.contains('page-break-label')
          ) {
            return false
          }
        }
        return true
      },
      onCloneNode: (cloned: Node) => {
        if (!(cloned instanceof HTMLElement)) return

        // 强制 content-visibility: visible + 移除交互样式
        const cvCloned = cloned.querySelectorAll(CV_SELECTORS)
        cvCloned.forEach((el) => {
          const htmlEl = el as HTMLElement
          htmlEl.style.contentVisibility = 'visible'
          htmlEl.style.setProperty('contain-intrinsic-size', 'none', 'important')
          htmlEl.style.cursor = 'default'
          htmlEl.style.opacity = '1'
        })

        // 移除 flex 子元素的内联 width，恢复弹性布局
        const flexChildren = cloned.querySelectorAll(FLEX_CHILD_SELECTORS)
        flexChildren.forEach((el) => {
          ;(el as HTMLElement).style.removeProperty('width')
        })

        // 禁止日期和标签文本换行
        const noWrapElements = cloned.querySelectorAll(NO_WRAP_SELECTORS)
        noWrapElements.forEach((el) => {
          ;(el as HTMLElement).style.setProperty('white-space', 'nowrap', 'important')
        })

        // 禁止日期元素 flex 收缩
        const noShrinkElements = cloned.querySelectorAll(NO_SHRINK_SELECTORS)
        noShrinkElements.forEach((el) => {
          ;(el as HTMLElement).style.setProperty('flex-shrink', '0', 'important')
        })

        // info 区域允许缩小，为日期腾出空间
        const minWidthZeroElements = cloned.querySelectorAll(MIN_WIDTH_ZERO_SELECTORS)
        minWidthZeroElements.forEach((el) => {
          ;(el as HTMLElement).style.setProperty('min-width', '0', 'important')
        })
      },
    })

    if (!blob || blob.size === 0) {
      throw new Error('图片生成失败：domToBlob 返回空数据')
    }

    // 3. 下载（文件名格式：简历名称_vivi-resume_时间戳.png）
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${filename}_vivi-resume_${formatTimestamp()}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  } finally {
    // 4. 恢复原始元素的样式
    cvElements.forEach((el, i) => {
      ;(el as HTMLElement).style.contentVisibility = savedCV[i] || ''
    })
  }
}

/**
 * 根据元素尺寸计算合适的 scale
 * 2x 用于高清输出；若超过 Canvas 最大尺寸则降为 1x
 */
function calculateScale(element: HTMLElement): number {
  const { scrollWidth, scrollHeight } = element
  if (scrollWidth * 2 > MAX_CANVAS_DIMENSION || scrollHeight * 2 > MAX_CANVAS_DIMENSION) {
    return 1
  }
  return 2
}
