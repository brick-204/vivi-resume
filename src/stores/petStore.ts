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
import { pickQuote, pickIdleQuote, getTimePeriod, type QuoteCategory, type TimePeriod } from '@/data/petQuotes'
import { generatePetQuote } from '@/services/petAiQuote'
import { message as naiveMessage } from '@/plugins/naive-ui'

const IDLE_INTERVAL = 45_000 // 定时随机冒泡间隔
const SAY_TTL = 5000 // 单句话显示时长（静态话术）
const AI_SAY_MS_PER_CHAR = 120 // AI 话术每字阅读时长
const AI_SAY_BASE_MS = 2000 // AI 话术基础时长

/** AI 话术时长：字数 × 120ms + 2s 底，不低于静态 TTL */
const computeAiTtl = (text: string) => Math.max(SAY_TTL, text.length * AI_SAY_MS_PER_CHAR + AI_SAY_BASE_MS)

// ========== 连续用眼休息提醒（20-20-20 融合 25 分钟节奏） ==========
const REST_TICK_MS = 1000 // 计时检查粒度
const ACTIVITY_TIMEOUT_MS = 60_000 // 超过此时长无活动视为中断（暂停累计，不清零）
const REST_MIN_INTERVAL_MS = 10 * 60 * 1000 // 间隔下限 10 分钟（防御异常配置）

export const usePetStore = defineStore('pet', () => {
  /** 当前显示的话；null 表示不显示气泡 */
  const currentQuote = ref<string | null>(null)
  /** 是否暂停（抽屉打开时 true，停止定时冒泡并清气泡，但休息提醒照常计时） */
  const paused = ref(false)
  /** 当前桌宠名字（供定时 idle 冒泡替换 {name}），由桌宠组件同步 */
  const petName = ref<string | undefined>(undefined)
  /** 是否在编辑器内（EditorView 挂载设 true）—— idle 简历相关话术仅此时说 */
  const inEditor = ref(false)

  let idleTimer: ReturnType<typeof setInterval> | null = null
  let ttlTimer: ReturnType<typeof setTimeout> | null = null

  // ----- 时段招呼跨段检测 -----
  // ponytail: 复用 idleTimer 的 45s tick 顺带检查时段变化即可，
  //   不必为跨段检测单独起 setInterval（精度足够，最坏迟 45s 提示）。
  let lastGreetPeriod: TimePeriod | null = null

  // ----- 连续用眼计时 -----
  // ponytail: 间隔与开关由 settingsStore 注入；默认 25 分钟、开。
  //   桌宠组件 onMounted 先 start()，此时 settingsStore 可能尚未 ready，
  //   用默认值起步，settingsStore init 完成后再 setRestConfig 覆盖。
  let restTimer: ReturnType<typeof setInterval> | null = null
  let restEnabled = true
  let restIntervalMs = 25 * 60 * 1000
  let useTimeMs = 0 // 连续用眼累计时长
  let lastActivityAt = 0 // 最近一次活动时间戳
  let activityListenersBound = false

  // ----- 桌宠 AI 动态话术（settingsStore 注入） -----
  // ponytail: 注入式（与 restEnabled 同模式），保持 petStore 不依赖 settingsStore。
  //   AI 生成中 generating=true，新调用直接回退静态（不排队不串台，最简）。
  //   genToken 标记每次发起的 AI 生成；AI 回来时若 token 已变（期间有新调用）则丢弃结果，
  //   避免 dragStart 的 AI 结果延迟回来覆盖已显示的 dragEnd 静态话术。
  let petAIChatEnabled = false
  let generating = false
  let genToken = 0

  const clearTtl = () => {
    if (ttlTimer) {
      clearTimeout(ttlTimer)
      ttlTimer = null
    }
  }

  /** 说一句；TTL 后自动闭嘴。paused 中也允许一次性说（操作触发的反馈该立刻给）。
   *  durationMs 可选，仅 AI 话术传入动态时长；缺省用静态 SAY_TTL */
  const say = (text: string, durationMs?: number) => {
    clearTtl()
    currentQuote.value = text
    ttlTimer = setTimeout(() => {
      currentQuote.value = null
      ttlTimer = null
    }, durationMs ?? SAY_TTL)
  }

  /** 按话术分类说一句（随机取一条），name 替换占位符 {name}。
   *  静态场景（idle/rest/aiError）直接走 pickQuote；
   *  AI 场景开关开且未在生成中时调大模型现编，失败回退静态。 */
  const sayCategory = async (category: QuoteCategory, name?: string) => {
    // 每次调用递增 token：后续若有 AI 结果延迟回来，对比 token 即知是否已被新调用取代
    const myToken = ++genToken
    // 静态场景：idle 控成本、rest 保 20-20-20 护眼指令、aiError 时 AI 不可用
    if (category === 'idle' || category === 'rest' || category === 'aiError') {
      say(pickQuote(category, name))
      return
    }
    // AI 场景：开关关 或 正在生成中 → 静态回退
    if (!petAIChatEnabled || generating) {
      say(pickQuote(category, name))
      return
    }
    generating = true
    try {
      const text = await generatePetQuote(category, {
        name: name ?? petName.value,
        inEditor: inEditor.value,
        period: getTimePeriod(new Date().getHours()),
      })
      // 期间有新调用（如拖拽松手的 dragEnd 静态）取代了本次 → 丢弃 AI 结果，不覆盖当前气泡
      if (myToken !== genToken) return
      say(text, computeAiTtl(text))
    } catch {
      // 期间有新调用取代 → 不再回退静态（避免覆盖当前气泡）
      if (myToken !== genToken) return
      // 无配置/超时/失败 → 静态回退，气泡不空
      say(pickQuote(category, name))
    } finally {
      generating = false
    }
  }

  /** 立即闭嘴 */
  const clear = () => {
    clearTtl()
    currentQuote.value = null
  }

  /** 暂停/恢复：暂停时停定时冒泡 + 清气泡；休息提醒计时不受影响（抽屉打开也照常计时） */
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
      if (paused.value) return
      // 跨时段检测：当前时段与上次招呼不同 → 主动说时段招呼（挂着过午夜也会提示）
      const period = getTimePeriod(new Date().getHours())
      if (lastGreetPeriod && period !== lastGreetPeriod) {
        lastGreetPeriod = period
        void sayCategory('greet', petName.value)
        return
      }
      lastGreetPeriod = period
      // idle 冒泡：非编辑器过滤简历相关话术
      say(pickIdleQuote(inEditor.value, petName.value))
    }, IDLE_INTERVAL)
  }

  // ----- 连续用眼计时：活动感知，页面可见且有活动才累计 -----
  // ponytail: 全局活动监听只绑一次（start/stop 复用），节流靠 lastActivityAt 时间戳
  //   而非事件级 throttle——每事件只写一个时间戳，开销可忽略。
  const markActivity = () => {
    lastActivityAt = Date.now()
  }

  const onVisibilityChange = () => {
    // 切回可见时刷新活动时间戳，避免隐藏期间 lastActivityAt 陈旧导致误判中断
    if (document.visibilityState === 'visible') markActivity()
  }

  const bindActivityListeners = () => {
    if (activityListenersBound) return
    activityListenersBound = true
    document.addEventListener('mousemove', markActivity, { passive: true })
    document.addEventListener('keydown', markActivity, { passive: true })
    document.addEventListener('click', markActivity, { passive: true })
    document.addEventListener('touchstart', markActivity, { passive: true })
    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('blur', onVisibilityChange)
    window.addEventListener('focus', onVisibilityChange)
  }

  const unbindActivityListeners = () => {
    if (!activityListenersBound) return
    activityListenersBound = false
    document.removeEventListener('mousemove', markActivity)
    document.removeEventListener('keydown', markActivity)
    document.removeEventListener('click', markActivity)
    document.removeEventListener('touchstart', markActivity)
    document.removeEventListener('visibilitychange', onVisibilityChange)
    window.removeEventListener('blur', onVisibilityChange)
    window.removeEventListener('focus', onVisibilityChange)
  }

  /** 触发休息提醒：抽屉打开时桌宠隐藏气泡看不见，改用 naiveMessage 顶替 */
  const triggerRest = () => {
    const text = pickQuote('rest', petName.value)
    if (paused.value) {
      naiveMessage.info(text)
    } else {
      say(text)
    }
  }

  const stopRest = () => {
    if (restTimer) {
      clearInterval(restTimer)
      restTimer = null
    }
  }

  /** 启动连续用眼计时；已在跑则不重复启动 */
  const startRest = () => {
    if (restTimer) return
    bindActivityListeners()
    lastActivityAt = Date.now()
    restTimer = setInterval(() => {
      // 开关关闭时不计时（settingsStore 关开关时调 setRestEnabled(false) 会 stopRest，这里兜底）
      if (!restEnabled) return
      // 页面可见 + 最近 60s 内有活动 → 视为连续用眼，累计
      const active = document.visibilityState === 'visible'
        && Date.now() - lastActivityAt < ACTIVITY_TIMEOUT_MS
      if (!active) return
      useTimeMs += REST_TICK_MS
      if (useTimeMs >= restIntervalMs) {
        useTimeMs = 0
        triggerRest()
      }
    }, REST_TICK_MS)
  }

  const start = () => {
    startIdle()
    startRest()
  }

  const stop = () => {
    stopIdle()
    stopRest()
    unbindActivityListeners()
    clearTtl()
    currentQuote.value = null
  }

  // ----- 休息提醒配置入口（settingsStore 注入） -----
  /** 开关切换：关时停计时 + 清零；开时重启计时（从 0 重新计） */
  const setRestEnabled = (enabled: boolean) => {
    restEnabled = enabled
    if (!enabled) {
      stopRest()
      useTimeMs = 0
    } else {
      // 已绑定监听则只重置时间戳；首次开启才绑监听 + 起计时
      lastActivityAt = Date.now()
      startRest()
    }
  }

  /** 间隔变更（毫秒），下限 REST_MIN_INTERVAL_MS 防御 */
  const setRestIntervalMs = (ms: number) => {
    restIntervalMs = Math.max(REST_MIN_INTERVAL_MS, ms)
    // 已累计超过新间隔 → 立即触发并清零，避免改小后要等很久
    if (restEnabled && useTimeMs >= restIntervalMs) {
      useTimeMs = 0
      triggerRest()
    }
  }

  /** 进编辑器设 true、离开设 false；idle 简历相关话术仅编辑器内说 */
  const setInEditor = (v: boolean) => {
    inEditor.value = v
  }

  /** 注入桌宠 AI 动态话术开关（settingsStore 调用） */
  const setAIChatEnabled = (v: boolean) => {
    petAIChatEnabled = v
  }

  /** 说当前时段的招呼（进页面/切桌宠时调用），并记录时段供跨段检测。
   *  走 sayCategory('greet')：开关开时由 AI 现编，否则静态时段招呼 */
  const sayTimeGreet = () => {
    lastGreetPeriod = getTimePeriod(new Date().getHours())
    void sayCategory('greet', petName.value)
  }

  return {
    currentQuote,
    paused,
    petName,
    inEditor,
    say,
    sayCategory,
    clear,
    setPaused,
    start,
    stop,
    setRestEnabled,
    setRestIntervalMs,
    setInEditor,
    setAIChatEnabled,
    sayTimeGreet,
  }
})
