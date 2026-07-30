/**
 * 桌宠 Store — 说话状态汇聚点
 *
 * 各业务点（保存/导出/AI报错/进编辑器）调用 say()，桌宠组件 watch currentQuote 显示气泡。
 * 与项目现有 store 互调模式一致（如 settingsStore.notifyStoresReload），不引入事件总线。
 *
 * 定时随机冒泡由 start()/stop() 控制，桌宠挂载时 start、卸载时 stop；
 * 抽屉打开时 setPaused(true) 暂停定时与清气泡（桌宠已隐藏，不该说话）。
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { pickQuote, type QuoteCategory } from '@/data/petQuotes'

const IDLE_INTERVAL = 45_000 // 定时随机冒泡间隔
const SAY_TTL = 5000 // 单句话显示时长

export const usePetStore = defineStore('pet', () => {
  /** 当前显示的话；null 表示不显示气泡 */
  const currentQuote = ref<string | null>(null)
  /** 是否暂停（抽屉打开时 true，停止定时并清气泡） */
  const paused = ref(false)

  let idleTimer: ReturnType<typeof setInterval> | null = null
  let ttlTimer: ReturnType<typeof setTimeout> | null = null

  const clearTtl = () => {
    if (ttlTimer) {
      clearTimeout(ttlTimer)
      ttlTimer = null
    }
  }

  /** 说一句；TTL 后自动闭嘴。paused 中也允许一次性说（操作触发的反馈该立刻给） */
  const say = (text: string) => {
    clearTtl()
    currentQuote.value = text
    ttlTimer = setTimeout(() => {
      currentQuote.value = null
      ttlTimer = null
    }, SAY_TTL)
  }

  /** 按话术分类说一句（随机取一条） */
  const sayCategory = (category: QuoteCategory) => {
    say(pickQuote(category))
  }

  /** 立即闭嘴 */
  const clear = () => {
    clearTtl()
    currentQuote.value = null
  }

  /** 暂停/恢复：暂停时停定时 + 清气泡；恢复时重启定时 */
  const setPaused = (v: boolean) => {
    paused.value = v
    if (v) {
      stopIdle()
      clear()
    } else {
      startIdle()
    }
  }

  const stopIdle = () => {
    if (idleTimer) {
      clearInterval(idleTimer)
      idleTimer = null
    }
  }

  /** 启动定时随机冒泡；已在跑则不重复启动 */
  const startIdle = () => {
    if (paused.value || idleTimer) return
    idleTimer = setInterval(() => {
      if (!paused.value) sayCategory('idle')
    }, IDLE_INTERVAL)
  }

  const start = () => {
    startIdle()
  }

  const stop = () => {
    stopIdle()
    clearTtl()
    currentQuote.value = null
  }

  return {
    currentQuote,
    paused,
    say,
    sayCategory,
    clear,
    setPaused,
    start,
    stop,
  }
})
