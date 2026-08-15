/**
 * 彩蛋特效 service 公共工厂。
 * 三个特效（雨夜/下雪/offer）的 service 层结构同构：单例挂载 + token 校验 +
 * 键盘序列触发 + HMR 清理。差异仅在组件、参数默认值、computeMax 系数、
 * 序列字母、桌宠话术分类、是否含音效。此处抽取共享骨架，各 service 只声明差异。
 */
import { createApp, shallowRef } from 'vue'
import type { App, Component } from 'vue'
import { usePetStore } from '@/stores/petStore'
import { useEasterEggSound } from '@/composables/useEasterEggSound'

// ========== 共享纯函数 ==========

export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

/** smoothstep：平滑插值，t 在 [edge0,edge1] 内从 0 渐变到 1，边界外钳制。 */
export function smoothstep(t: number, edge0: number, edge1: number): number {
  const x = clamp((t - edge0) / (edge1 - edge0), 0, 1)
  return x * x * (3 - 2 * x)
}

/** fadeIn + fadeOut 不超过 duration，否则按比例压缩（三特效共用不变量）。 */
export function clampFadeDurations(
  duration: number,
  fadeIn: number,
  fadeOut: number,
): { fadeInDuration: number; fadeOutDuration: number } {
  if (fadeIn + fadeOut > duration) {
    const sum = fadeIn + fadeOut
    const fi = Math.floor((fadeIn / sum) * duration)
    return { fadeInDuration: fi, fadeOutDuration: duration - fi }
  }
  return { fadeInDuration: fadeIn, fadeOutDuration: fadeOut }
}

// ========== 键盘序列匹配 ==========

/** 判断事件目标是否在可编辑元素内（用 closest 判断祖先） */
export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false
  return Boolean(target.closest(
    'input, textarea, select, button, [contenteditable], [role="textbox"]',
  ))
}

interface KeySequenceHandle {
  onKeydown: (e: KeyboardEvent) => void
  reset: () => void
}

/**
 * 创建键盘序列匹配器（如 R→A→I→N）。匹配成功调用 onMatch。
 * - 忽略输入法合成、重复键、组合键、可编辑元素内的按键
 * - 错位时若按下的是序列首字母则从第 2 位开始，否则归零
 * - 超时（默认 1500ms）自动归零
 */
export function createKeySequenceMatcher(
  sequence: string[],
  onMatch: () => void,
  timeout = 1500,
): KeySequenceHandle {
  let seqIndex = 0
  let seqTimer: ReturnType<typeof setTimeout> | null = null

  const reset = () => {
    seqIndex = 0
    if (seqTimer) { clearTimeout(seqTimer); seqTimer = null }
  }

  const onKeydown = (e: KeyboardEvent) => {
    if (e.isComposing || e.repeat) return
    if (e.ctrlKey || e.metaKey || e.altKey) return
    if (isEditableTarget(e.target)) return
    // 不 preventDefault / stopPropagation / 不抢焦点

    const key = e.key.toLowerCase()
    if (key !== sequence[seqIndex]) {
      seqIndex = key === sequence[0] ? 1 : 0
    } else {
      seqIndex++
    }

    if (seqTimer) clearTimeout(seqTimer)
    seqTimer = setTimeout(() => { seqIndex = 0 }, timeout)

    if (seqIndex === sequence.length) {
      reset()
      onMatch()
    }
  }

  return { onKeydown, reset }
}

// ========== 单例特效 service 工厂 ==========

export interface EffectServiceConfig {
  /** 渲染组件 */
  Component: Component
  /** 参数归一化（clamp + 默认值 + 不变量） */
  normalize: (o: any) => Record<string, any>
  /** 键盘序列字母（小写） */
  sequence: string[]
  /** 序列超时 ms */
  seqTimeout?: number
  /** 触发时桌宠话术分类（可选） */
  quoteCategory?: string
  /** 是否支持音效（true 则 show 时走 useEasterEggSound().promptSoundOnce()） */
  hasSound?: boolean
  /** 序列触发时是否额外调用 show（默认 true） */
  triggerOnMatch?: boolean
  /**
   * 序列匹配时的自定义触发钩子。提供则替代默认的 show()+sayCategory()。
   * 用于需要在触发前算上下文（如信封彩蛋算收件人/公司名）的场景。
   */
  onMatch?: () => void
}

export interface EffectService {
  active: ReturnType<typeof shallowRef<boolean>>
  show: (options?: any) => void
  hide: () => void
  isActive: () => boolean
  teardown: () => void
  /** 注册键盘序列，返回 cleanup */
  setupShortcut: (enabled: () => boolean) => () => void
}

/**
 * 创建单例特效 service。封装 host 元素挂载、token 校验、HMR 清理。
 * 各 service 仅提供差异配置，骨架逻辑全部复用。
 */
export function createEffectService(config: EffectServiceConfig): EffectService {
  const { Component, normalize, sequence, quoteCategory, hasSound } = config
  const seqTimeout = config.seqTimeout ?? 1500
  const triggerOnMatch = config.triggerOnMatch ?? true

  const active = shallowRef(false)
  let hostEl: HTMLDivElement | null = null
  let app: App | null = null
  let currentToken = 0
  let componentInstance: { requestLeave: () => void } | null = null

  const teardown = () => {
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

  const show = (options?: any) => {
    // SSR 守卫
    if (typeof document === 'undefined' || typeof window === 'undefined') return

    // 同步清理旧实例（若有）：保证不会短暂叠加、DOM 残留或多个 rAF 同时运行
    teardown()

    const opts = normalize(options) as Record<string, any>
    // 音效：用户显式传 sound 时尊重；否则走全局开关 + 统一首弹逻辑
    if (hasSound && options?.sound === undefined) {
      opts.sound = useEasterEggSound().promptSoundOnce()
    }
    currentToken++
    const token = currentToken

    hostEl = document.createElement('div')
    document.body.appendChild(hostEl)

    app = createApp(Component, {
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
    componentInstance = inst as unknown as { requestLeave: () => void }
    active.value = true
  }

  const hide = () => {
    if (componentInstance) {
      componentInstance.requestLeave()
    } else {
      teardown()
    }
  }

  const isActive = () => active.value

  const setupShortcut = (enabled: () => boolean) => {
    if (typeof document === 'undefined') return () => {}
    if (!enabled()) return () => {}

    const matcher = createKeySequenceMatcher(sequence, () => {
      if (config.onMatch) {
        // 自定义触发：service 自己负责 show + 话术（如信封需先算收件人/公司名）
        config.onMatch()
      } else {
        if (triggerOnMatch) show()
        // 快捷键触发也让桌宠说一句对应话术（pinia 此时已初始化，事件回调内取 store 安全）
        if (quoteCategory) {
          try { usePetStore().sayCategory(quoteCategory as any) } catch { /* pinia 未就绪，静默 */ }
        }
      }
    }, seqTimeout)

    document.addEventListener('keydown', matcher.onKeydown)
    return () => {
      document.removeEventListener('keydown', matcher.onKeydown)
      matcher.reset()
    }
  }

  // HMR 清理：开发环境热更新时卸载旧实例，避免 rAF/timer 泄漏
  if (import.meta.hot) {
    import.meta.hot.dispose(() => {
      teardown()
    })
  }

  return { active, show, hide, isActive, teardown, setupShortcut }
}
