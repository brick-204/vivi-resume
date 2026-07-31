/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

interface ImportMetaEnv {
  /** Cloudflare Web Analytics token，从 .env 读取 */
  readonly VITE_CF_TOKEN?: string
  /** 雨夜彩蛋快捷键开关，默认开；设 false 关闭 */
  readonly VITE_ENABLE_RAINY_NIGHT_EASTER_EGG?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}