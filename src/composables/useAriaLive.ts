/**
 * ARIA Live Region 工具 — 向全局 aria-live 区域写入内容
 * 屏幕阅读器会在内容变化时自动播报
 */

let debounceTimer: ReturnType<typeof setTimeout> | null = null

/**
 * 向 aria-live 区域写入状态消息
 * @param message 要播报的文本
 * @param delay 防抖延迟（ms），避免频繁更新造成读屏器重复播报，默认 300ms
 */
export function announceToScreenReader(message: string, delay = 300): void {
  if (debounceTimer) clearTimeout(debounceTimer)

  debounceTimer = setTimeout(() => {
    const el = document.getElementById('aria-live-status')
    if (!el) return
    // 先清空再设置，确保即使相同内容也能触发播报
    el.textContent = ''
    // 使用 requestAnimationFrame 确保清空和设置不在同一帧
    requestAnimationFrame(() => {
      el.textContent = message
    })
  }, delay)
}
