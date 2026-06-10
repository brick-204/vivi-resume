/**
 * 同步锁 composable
 * 在数据同步（IndexedDB → 本地目录 / 本地目录 → IndexedDB）期间，
 * 锁定所有数据修改操作，防止同步过程中数据被篡改。
 *
 * - 模块级单例：所有导入者共享同一个 reactive 状态
 * - acquire/release 由 settingsStore 控制
 * - SyncOverlay 组件根据 isLocked 显示全屏遮罩
 */

import { ref } from 'vue'

// 模块级单例状态
const isLocked = ref(false)
const lockMessage = ref('')
const syncPercent = ref(0)

export function useSyncLock() {
  /** 获取同步锁，禁止所有数据修改操作 */
  const acquire = (message: string) => {
    isLocked.value = true
    lockMessage.value = message
    syncPercent.value = 0
  }

  /** 更新同步进度 */
  const updateProgress = (message: string, percent: number) => {
    lockMessage.value = message
    syncPercent.value = Math.min(100, Math.max(0, percent))
  }

  /** 释放同步锁，恢复数据修改操作 */
  const release = () => {
    isLocked.value = false
    lockMessage.value = ''
    syncPercent.value = 0
  }

  return {
    isLocked,
    lockMessage,
    syncPercent,
    acquire,
    updateProgress,
    release,
  }
}
