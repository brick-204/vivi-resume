/**
 * 运行时环境检测。
 * 运行时检测 window.electronAPI（preload contextBridge 注入）——production build 下编译期常量拿不到桌面标志，
 * preload 注入最可靠。
 */
export const isElectron =
  typeof window !== 'undefined' && !!(window as { electronAPI?: unknown }).electronAPI
