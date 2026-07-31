/**
 * 彩蛋音效全局开关（单例）。
 * - 所有彩蛋声音的唯一闸门：localStorage `vivi-easter-egg-sound`，默认关闭
 * - 统一首次弹窗：未弹过 + 关闭时弹一次问用户，选择后记 `vivi-easter-egg-sound-prompted` 不再弹
 * - 订阅机制：开关变化时通知所有 listener，供运行中的彩蛋立即停/起声音
 */
import { ref } from 'vue'
import { dialog } from '@/plugins/naive-ui'

const SOUND_KEY = 'vivi-easter-egg-sound'
const PROMPTED_KEY = 'vivi-easter-egg-sound-prompted'

function loadSound(): boolean {
  if (typeof localStorage === 'undefined') return false
  return localStorage.getItem(SOUND_KEY) === 'true'
}
function saveSound(v: boolean) {
  if (typeof localStorage === 'undefined') return
  try { localStorage.setItem(SOUND_KEY, String(v)) } catch { /* 隐私模式 */ }
}
function loadPrompted(): boolean {
  if (typeof localStorage === 'undefined') return false
  return localStorage.getItem(PROMPTED_KEY) === 'true'
}
function savePrompted() {
  if (typeof localStorage === 'undefined') return
  try { localStorage.setItem(PROMPTED_KEY, 'true') } catch { /* 隐私模式 */ }
}

// 单例状态（模块顶层，跨组件共享）
const soundEnabled = ref(loadSound())
let prompting = false

// 订阅者集合：开关变化时通知（运行中的彩蛋用它立即停/起声音）
const listeners = new Set<(enabled: boolean) => void>()

function notify(enabled: boolean) {
  listeners.forEach(cb => {
    try { cb(enabled) } catch { /* 单个 listener 出错不影响其他 */ }
  })
}

/** 切换开关并通知所有订阅者 */
function setSound(v: boolean) {
  if (soundEnabled.value === v) return
  soundEnabled.value = v
  saveSound(v)
  notify(v)
}

function toggleSound() {
  setSound(!soundEnabled.value)
}

/** 注册开关变化监听，返回取消订阅函数 */
function onSoundChange(cb: (enabled: boolean) => void): () => void {
  listeners.add(cb)
  return () => { listeners.delete(cb) }
}

/**
 * 首次触发彩蛋时弹提示问是否开声（全局统一，弹过不再弹）。
 * - 全局已开 → 直接返回 true，不弹
 * - 已弹过 → 返回当前开关值，不弹
 * - 未弹过 + 关闭 → 弹窗，本次静音；点"开启"立即 setSound(true)
 * @returns 本次触发是否带声音
 */
function promptSoundOnce(): boolean {
  if (soundEnabled.value) return true
  if (loadPrompted()) return false
  if (!prompting) {
    prompting = true
    dialog.info({
      title: '彩蛋音效',
      content: '是否开启彩蛋音效？',
      positiveText: '开启',
      negativeText: '保持安静',
      class: 'easter-egg-sound-dialog',
      onPositiveClick: () => {
        setSound(true)
        savePrompted()
        prompting = false
      },
      onNegativeClick: () => {
        savePrompted()
        prompting = false
      },
      onMaskClick: () => { prompting = false },
    })
  }
  return false
}

export function useEasterEggSound() {
  return { soundEnabled, toggleSound, setSound, onSoundChange, promptSoundOnce }
}
