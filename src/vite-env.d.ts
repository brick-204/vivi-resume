/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

// ========== Electron preload 暴露的 API 类型 ==========
// 与 electron/preload.ts 的 contextBridge.exposeInMainWorld('electronAPI', ...) 保持同步。
// 两处共用，改动时同步更新（preload 与 src 编译独立，无法直接共享类型）。

interface ElectronFsApi {
  pick: () => Promise<string | null>
  rebind: (dirPath: string) => Promise<{ ok: boolean; error?: string }>
  ensureDir: (args: { root: string; name: string }) => Promise<string | null>
  listJson: (args: { dir: string }) => Promise<string[]>
  readJson: (args: { root: string; path: string }) => Promise<unknown>
  writeJson: (args: { root: string; path: string; data: unknown }) => Promise<{ ok: boolean }>
  readAllJson: (args: { root: string; subdir: string }) => Promise<Record<string, unknown>>
  deleteFile: (args: { dir: string; fileName: string }) => Promise<{ ok: boolean }>
  deleteByPrefix: (args: { root: string; subdir: string; prefix: string }) => Promise<{ ok: boolean }>
  readDataUrl: (args: { root: string; path: string; mimeType: string }) => Promise<string | null>
  writeDataUrl: (args: { root: string; path: string; dataUrl: string }) => Promise<{ ok: boolean }>
  clearDir: (args: { root: string; subdir: string }) => Promise<{ ok: boolean }>
}

interface ElectronAiApi {
  registerProxy: (args: { id: string; endpoint: string }) => Promise<{ ok: boolean; error?: string }>
  unregisterProxy: (id: string) => Promise<{ ok: boolean }>
  clearProxies: () => Promise<{ ok: boolean }>
}

interface ElectronWindowApi {
  setCloseBehavior: (behavior: 'ask' | 'tray' | 'quit') => Promise<{ ok: boolean }>
  onCloseBehaviorChanged: (cb: (behavior: 'ask' | 'tray' | 'quit') => void) => () => void
  ackCloseBehaviorChanged: () => Promise<void>
}

interface ElectronAppApi {
  getVersion: () => Promise<string>
  checkUpdate: () => Promise<{
    hasUpdate: boolean
    currentVersion: string
    latestVersion: string
    releaseUrl: string
    error?: string
  }>
}

interface ElectronAPI {
  aiProxyBase: string
  ai: ElectronAiApi
  fs: ElectronFsApi
  saveFile: (args: {
    defaultName: string
    filters: { name: string; extensions: string[] }[]
    content: string
    encoding: 'base64' | 'utf8'
  }) => Promise<{ saved: boolean; error?: string }>
  exportPdf: (args: { html: string; defaultName: string }) => Promise<{ saved: boolean; error?: string }>
  window: ElectronWindowApi
  app: ElectronAppApi
}

interface Window {
  electronAPI?: ElectronAPI
}

interface ImportMetaEnv {
  /** Cloudflare Web Analytics token，从 .env 读取 */
  readonly VITE_CF_TOKEN?: string
  /** 小雨彩蛋快捷键开关：显式设置优先；未设置时默认开启（开发与生产均开） */
  readonly VITE_ENABLE_RAINY_NIGHT_EASTER_EGG?: string
  /** 下雪彩蛋快捷键开关：显式设置优先；未设置时默认开启（开发与生产均开） */
  readonly VITE_ENABLE_SNOW_EASTER_EGG?: string
  /** offer 彩蛋快捷键开关：显式设置优先；未设置时默认开启（开发与生产均开） */
  readonly VITE_ENABLE_OFFER_EASTER_EGG?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}