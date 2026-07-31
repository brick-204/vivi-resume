import { createApp, shallowRef } from 'vue'
import type { App } from 'vue'
import RainyNightEasterEgg from '@/components/easter-egg/RainyNightEasterEgg.vue'
import { isRainShortcutEnabled } from '@/utils/easterEggEnv'

// ========== 类型 ==========
export interface RainyNightEffectOptions {
  duration?: number
  fadeInDuration?: number
  fadeOutDuration?: number
  intensity?: number
  opacity?: number
  zIndex?: number
}
export type EffectPhase = 'entering' | 'visible' | 'leaving' | 'finished'

// ========== 参数安全限制（与组件内 clamp 一致，service 侧先归一化） ==========
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

function normalizeOptions(o: RainyNightEffectOptions = {}): Required<RainyNightEffectOptions> {
  const duration = clamp(o.duration ?? 13000, 2000, 30000)
  let fadeIn = clamp(o.fadeInDuration ?? 800, 0, 3000)
  let fadeOut = clamp(o.fadeOutDuration ?? 3500, 0, 5000)
  if (fadeIn + fadeOut > duration) {
    const sum = fadeIn + fadeOut
    fadeIn = Math.floor((fadeIn / sum) * duration)
    fadeOut = duration - fadeIn
  }
  return {
    duration,
    fadeInDuration: fadeIn,
    fadeOutDuration: fadeOut,
    intensity: clamp(o.intensity ?? 0.7, 0, 1),
    opacity: clamp(o.opacity ?? 0.92, 0, 1),
    zIndex: Math.round(clamp(o.zIndex ?? 2147483000, 0, 2147483647)),
  }
}

// ========== 模块级单例状态 ==========
const active = shallowRef(false)
let hostEl: HTMLDivElement | null = null
let app: App | null = null
let currentToken = 0
// 组件实例引用，用于 hide() 调用 requestLeave
let componentInstance: { requestLeave: () => void } | null = null

function teardown() {
  if (app) {
    app.unmount()
    app = null
  }
  if (hostEl) {
    hostEl.remove()
    hostEl = null
  }
  componentInstance = null
  active.value = false
}

/**
 * 触发雨夜窗景彩蛋。
 * 单例策略：先同步清理旧实例，再创建新实例（需求允许的备选策略）。
 * 同步清理保证不会出现短暂叠加、DOM 残留或多个 rAF 同时运行。
 * 比"复用实例更新 options"更稳——无需处理 props 响应式同步。
 */
export function showRainyNightEffect(options?: RainyNightEffectOptions): void {
  // SSR 守卫
  if (typeof document === 'undefined' || typeof window === 'undefined') return

  // 同步清理旧实例（若有）
  teardown()

  const opts = normalizeOptions(options)
  currentToken++
  const token = currentToken

  hostEl = document.createElement('div')
  document.body.appendChild(hostEl)

  app = createApp(RainyNightEasterEgg, {
    options: opts,
    token,
    // Vue 将 onFinished 识别为 finished 事件监听器（等价模板 @finished）
    onFinished: () => {
      // ponytail: token 校验，避免旧实例异步回调误删新实例
      if (token !== currentToken) return
      teardown()
    },
  })
  const inst = app.mount(hostEl)
  // 组件 defineExpose 的 requestLeave
  componentInstance = inst as unknown as { requestLeave: () => void }
  active.value = true
}

/** 立即触发淡出（若已存在实例） */
export function hideRainyNightEffect(): void {
  if (componentInstance) {
    componentInstance.requestLeave()
  } else {
    teardown()
  }
}

export function isRainyNightEffectActive(): boolean {
  return active.value
}

// ========== R → A → I → N 键盘序列彩蛋 ==========
const SEQUENCE = ['r', 'a', 'i', 'n']
const SEQ_TIMEOUT = 1500

/** 判断事件目标是否在可编辑元素内（用 closest 判断祖先） */
function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false
  return Boolean(target.closest(
    'input, textarea, select, button, [contenteditable], [role="textbox"]',
  ))
}

let seqIndex = 0
let seqTimer: ReturnType<typeof setTimeout> | null = null

function onKeydown(e: KeyboardEvent) {
  // 忽略：输入法合成、重复键、组合键
  if (e.isComposing || e.repeat) return
  if (e.ctrlKey || e.metaKey || e.altKey) return
  // 仅在非可编辑元素时识别
  if (isEditableTarget(e.target)) return
  // 不 preventDefault / stopPropagation / 不抢焦点

  const key = e.key.toLowerCase()
  if (key !== SEQUENCE[seqIndex]) {
    // 重新开始匹配
    seqIndex = key === SEQUENCE[0] ? 1 : 0
  } else {
    seqIndex++
  }

  if (seqTimer) clearTimeout(seqTimer)
  seqTimer = setTimeout(() => { seqIndex = 0 }, SEQ_TIMEOUT)

  if (seqIndex === SEQUENCE.length) {
    seqIndex = 0
    if (seqTimer) { clearTimeout(seqTimer); seqTimer = null }
    showRainyNightEffect()
  }
}

/**
 * 初始化键盘序列彩蛋。所有环境启用，VITE_ENABLE_RAINY_NIGHT_EASTER_EGG=false 可关。
 * 返回 cleanup 函数。
 */
export function setupRainyNightEasterEggShortcut(): () => void {
  if (typeof document === 'undefined') return () => {}
  if (!isRainShortcutEnabled()) return () => {}

  document.addEventListener('keydown', onKeydown)
  return () => {
    document.removeEventListener('keydown', onKeydown)
    if (seqTimer) { clearTimeout(seqTimer); seqTimer = null }
    seqIndex = 0
  }
}

export { active }
