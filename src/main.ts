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

// Cloudflare Web Analytics：仅生产环境加载
if (!import.meta.env.DEV) {
  const s = document.createElement('script')
  s.defer = true
  s.src = 'https://static.cloudflareinsights.com/beacon.min.js'
  s.dataset.cfBeacon = '{"token": "4577ba68a80d482f9d73377fc203e1c4"}'
  document.head.appendChild(s)
}
