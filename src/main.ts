import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import './assets/styles/main.scss'
import './generated/icon-bundle'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.mount('#app')

// Cloudflare Web Analytics：仅生产环境加载，token 从 .env 读取（不进版本库）
const cfToken = import.meta.env.VITE_CF_TOKEN
if (!import.meta.env.DEV && cfToken) {
  const s = document.createElement('script')
  s.defer = true
  s.src = 'https://static.cloudflareinsights.com/beacon.min.js'
  s.dataset.cfBeacon = JSON.stringify({ token: cfToken })
  document.head.appendChild(s)
}
