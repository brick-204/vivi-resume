/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
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