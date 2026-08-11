import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import './assets/styles/main.scss'
import './generated/icon-bundle'
import { setupRainyNightEasterEggShortcut } from '@/services/rainyNightEffect'
import { setupSnowEasterEggShortcut } from '@/services/snowEffect'
import { setupOfferEasterEggShortcut } from '@/services/offerEffect'
import { setupEnvelopeEasterEggShortcut } from '@/services/envelopeEffect'
import { isElectron } from '@/utils/runtime'
// ponytail: 纯副作用 import——模块顶层注册内置彩蛋（雨夜/下雪/offer），不导出任何东西
import '@/services/builtinEasterEggs'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

// 桌面端首屏：第一次启动留在主页（HomeView），之后直接进工作台。
// web 端不受影响。localStorage 同步读，守卫在挂载前注册，首屏即可判定，无闪烁。
// ponytail: 标志在首次访问 / 时即置位（不看是否点按钮）——首次展示 HomeView，之后重启一律跳 /dashboard；
//           清应用数据会清掉 localStorage，回到首次态。
// 仅拦截应用启动后的初始导航一次；之后用户主动点「首页」回 / 不再被拦，能正常看 HomeView。
if (isElectron) {
  const LAUNCHED_KEY = 'hasLaunched'
  let initialRouteHandled = false
  router.beforeEach((to) => {
    if (!initialRouteHandled && to.path === '/') {
      initialRouteHandled = true
      if (localStorage.getItem(LAUNCHED_KEY)) {
        return { path: '/dashboard' }
      }
      localStorage.setItem(LAUNCHED_KEY, '1')
    }
    return true
  })
}

app.mount('#app')

// 小雨彩蛋快捷键（R→A→I→N）：开发和生产环境均默认开启（env 可覆盖）
setupRainyNightEasterEggShortcut()
// 下雪彩蛋快捷键（S→N→O→W）：开发和生产环境均默认开启（env 可覆盖）
setupSnowEasterEggShortcut()
// offer 彩蛋快捷键（O→F→F→E→R）：开发和生产环境均默认开启（env 可覆盖）
setupOfferEasterEggShortcut()
// 信封 offer 彩蛋快捷键（H→I→R→E）：开发和生产环境均默认开启（env 可覆盖）
setupEnvelopeEasterEggShortcut()

// Cloudflare Web Analytics：仅 web 生产模式加载（桌面端打包也是 production，但不该注入统计脚本，
// 会被 CSP 拦报错）。token 从 .env 读取（不进版本库）。
const cfToken = import.meta.env.VITE_CF_TOKEN
if (import.meta.env.MODE === 'production' && cfToken && !isElectron) {
  const s = document.createElement('script')
  s.defer = true
  s.src = 'https://static.cloudflareinsights.com/beacon.min.js'
  s.dataset.cfBeacon = JSON.stringify({ token: cfToken })
  document.head.appendChild(s)
}
