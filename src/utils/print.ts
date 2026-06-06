import { DEFAULT_PAGE_PADDING } from '@/types/resume'

export interface PrintOptions {
  /** 要打印的目标 DOM 元素 */
  target: HTMLElement | (() => HTMLElement)
  /** 页边距 px，默认 DEFAULT_PAGE_PADDING */
  margin?: number
  /** 打印前回调（样式和 DOM 已准备好，资源已加载） */
  onBeforePrint?: () => void
  /** 打印后回调（打印对话框关闭后） */
  onAfterPrint?: () => void
}

/**
 * 使用隐藏 iframe 隔离打印简历
 *
 * 优势：
 * - 主页面不被打印对话框锁定
 * - 无需 @media print 规则隐藏编辑区
 * - 页边距由参数直接控制，所见即所得
 */
export async function printViaIframe(options: PrintOptions): Promise<void> {
  const { target, margin = DEFAULT_PAGE_PADDING, onBeforePrint, onAfterPrint } = options

  // 1. 获取目标元素
  const sourceEl = typeof target === 'function' ? target() : target
  if (!sourceEl) {
    throw new Error('[printViaIframe] 打印目标元素不存在')
  }

  // 2. 创建隐藏 iframe
  const iframe = document.createElement('iframe')
  iframe.style.cssText = `
    position: fixed;
    top: -9999px;
    left: -9999px;
    width: 0;
    height: 0;
    border: none;
    visibility: hidden;
  `
  document.body.appendChild(iframe)

  try {
    const iframeDoc = iframe.contentDocument!
    const iframeWin = iframe.contentWindow!

    // 3. 写入基础 HTML
    iframeDoc.open()
    iframeDoc.write('<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body></body></html>')
    iframeDoc.close()

    // 4. 注入样式
    const allCSS = collectAllStyles()
    for (const css of allCSS) {
      const styleEl = iframeDoc.createElement('style')
      styleEl.textContent = css
      iframeDoc.head.appendChild(styleEl)
    }

    // 5. 注入打印专用样式
    const printStyle = iframeDoc.createElement('style')
    printStyle.textContent = generatePrintOverrides(margin)
    iframeDoc.head.appendChild(printStyle)

    // 6. 克隆目标 DOM 并插入 iframe
    const clone = sourceEl.cloneNode(true) as HTMLElement
    iframeDoc.body.appendChild(clone)

    // 7. 等待资源加载（字体 + 图片）
    await waitForResources(iframeDoc)

    // 8. 打印前回调
    onBeforePrint?.()

    // 9. 触发打印
    iframeWin.focus()
    iframeWin.print()

    // 10. 打印后回调
    onAfterPrint?.()
  } finally {
    // 11. 延迟清理（给打印对话框处理时间）
    setTimeout(() => {
      iframe.parentNode?.removeChild(iframe)
    }, 2000)
  }
}

/**
 * 收集当前页面所有样式表内容
 *
 * 开发模式：Vite 通过 <style> 标签注入
 * 生产模式：样式抽取为 <link> 引用的 .css 文件
 */
function collectAllStyles(): string[] {
  const styles: string[] = []
  const isDev = import.meta.env.DEV

  if (isDev) {
    // 开发模式：收集所有 <style> 标签
    document.querySelectorAll('style').forEach((style) => {
      // 跳过 Vite 内部样式（HMR 等）
      const devId = style.getAttribute('data-vite-dev-id')
      if (devId && devId.includes('vite/')) return
      if (style.textContent) styles.push(style.textContent)
    })
  } else {
    // 生产模式：收集 <link> 样式表
    document.querySelectorAll('link[rel="stylesheet"]').forEach((link) => {
      const href = (link as HTMLLinkElement).href
      if (!href) return
      try {
        const css = fetchCSSSync(href)
        if (css) styles.push(css)
      } catch {
        console.warn(`[printViaIframe] 无法读取样式表: ${href}`)
      }
    })
  }

  return styles
}

/**
 * 同步获取 CSS 文件内容（仅生产模式使用）
 */
function fetchCSSSync(url: string): string {
  const xhr = new XMLHttpRequest()
  xhr.open('GET', url, false)
  xhr.send()
  return xhr.status === 200 ? xhr.responseText : ''
}

/**
 * 生成打印专用覆盖样式
 *
 * iframe 内只有简历内容，无需隐藏编辑区。
 * 主要处理：content-visibility、hover、颜色精确、页边距
 */
function generatePrintOverrides(margin: number): string {
  return `
    @page {
      size: A4;
      margin: 0;
    }

    body {
      margin: 0;
      padding: 0;
      background: white;
    }

    .resume-preview {
      padding: ${margin}px;
      background: white;
    }

    /* content-visibility 在打印时必须强制可见 */
    .resume__section,
    .entry,
    .sidebar__section,
    .main__entry {
      content-visibility: visible !important;
      contain-intrinsic-size: none !important;
    }

    /* 移除 hover 效果 */
    .resume__section,
    .entry,
    .sidebar__section,
    .main__entry {
      cursor: default !important;
      opacity: 1 !important;
    }

    /* 确保颜色精确打印 */
    * {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    /* 分页控制 */
    .resume-document,
    .resume--sidebar,
    .resume--classic,
    .resume--modern,
    .resume--minimal,
    .resume--timeline,
    .resume--elegant,
    .resume--twocolumn {
      page-break-inside: auto;
    }

    .entry {
      page-break-inside: avoid;
    }
  `
}

/**
 * 等待 iframe 内字体和图片加载完成
 */
async function waitForResources(doc: Document): Promise<void> {
  // 等待字体
  const fontReady = doc.fonts ? doc.fonts.ready : Promise.resolve()

  // 等待图片
  const images = Array.from(doc.querySelectorAll('img'))
  const imagePromises = images.map(
    (img) =>
      new Promise<void>((resolve) => {
        if (img.complete) return resolve()
        img.onload = () => resolve()
        img.onerror = () => resolve() // 图片加载失败不阻塞打印
      })
  )

  await Promise.all([fontReady, ...imagePromises])
}
