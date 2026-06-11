/**
 * 主题切换 composable
 * 支持浅色/深色/跟随系统三种模式
 * 持久化到 localStorage，监听 prefers-color-scheme 媒体查询
 */

import { ref, computed, watch } from 'vue'
import { rebuildDiscreteApi } from '@/plugins/naive-ui'

export type ThemeMode = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'

const STORAGE_KEY = 'vivi-theme-mode'

// 单例状态（模块顶层，跨组件共享）
const mode = ref<ThemeMode>(loadMode())
const systemDark = ref(isSystemDark())

function loadMode(): ThemeMode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'light' || stored === 'dark' || stored === 'system') return stored
  } catch {}
  return 'system'
}

function isSystemDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

// 解析后的实际主题
const resolvedTheme = computed<ResolvedTheme>(() => {
  if (mode.value === 'system') return systemDark.value ? 'dark' : 'light'
  return mode.value
})

// 监听系统主题变化
let mediaQuery: MediaQueryList | null = null
let mediaHandler: ((e: MediaQueryListEvent) => void) | null = null

function startMediaListener() {
  if (typeof window === 'undefined') return
  mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  mediaHandler = (e) => { systemDark.value = e.matches }
  mediaQuery.addEventListener('change', mediaHandler)
}

// 应用 data-theme 属性到 <html>
function applyTheme(theme: ResolvedTheme) {
  document.documentElement.setAttribute('data-theme', theme)
}

// 初始化
startMediaListener()
applyTheme(resolvedTheme.value)

watch(resolvedTheme, (theme) => {
  applyTheme(theme)
  rebuildDiscreteApi(theme)
})

function setMode(newMode: ThemeMode) {
  mode.value = newMode
  try {
    localStorage.setItem(STORAGE_KEY, newMode)
  } catch {}
}

/**
 * 主题切换 composable（单例）
 */
export function useTheme() {
  return {
    /** 用户选择的模式 */
    mode,
    /** 解析后的实际主题（light/dark） */
    resolvedTheme,
    /** 切换模式 */
    setMode,
  }
}
