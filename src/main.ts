import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import './assets/styles/main.scss'
import './generated/icon-bundle'
import { setupRainyNightEasterEggShortcut } from '@/services/rainyNightEffect'
import { setupSnowEasterEggShortcut } from '@/services/snowEffect'
import { setupOfferEasterEggShortcut } from '@/services/offerEffect'
// ponytail: 纯副作用 import——模块顶层注册内置彩蛋（雨夜/下雪/offer），不导出任何东西
import '@/services/builtinEasterEggs'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.mount('#app')

// 小雨彩蛋快捷键（R→A→I→N）：开发和生产环境均默认开启（env 可覆盖）
setupRainyNightEasterEggShortcut()
// 下雪彩蛋快捷键（S→N→O→W）：开发和生产环境均默认开启（env 可覆盖）
setupSnowEasterEggShortcut()
// offer 彩蛋快捷键（O→F→F→E→R）：开发和生产环境均默认开启（env 可覆盖）
setupOfferEasterEggShortcut()

// Cloudflare Web Analytics：仅生产模式加载，token 从 .env 读取（不进版本库）
const cfToken = import.meta.env.VITE_CF_TOKEN
if (import.meta.env.MODE === 'production' && cfToken) {
  const s = document.createElement('script')
  s.defer = true
  s.src = 'https://static.cloudflareinsights.com/beacon.min.js'
  s.dataset.cfBeacon = JSON.stringify({ token: cfToken })
  document.head.appendChild(s)
}
