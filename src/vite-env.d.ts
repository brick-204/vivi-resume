/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

interface ImportMetaEnv {
  /** Cloudflare Web Analytics token，从 .env 读取 */
  readonly VITE_CF_TOKEN?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}