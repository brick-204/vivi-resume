/**
 * 同步 Worker composable
 * 复用 useWorkerSerializer 的单例 + 请求 ID 隔离模式。
 *
 * 用于 settingsStore.bindDirectory() 流程中，将 IndexedDB 数据
 * 发送给 Worker 进行 JSON 序列化，避免主线程阻塞。
 */

import { ref, onUnmounted, toRaw } from 'vue'
import { nextRequestId } from '@/workers/types'
import type { SyncWorkerResponse, SyncPreparedResponse } from '@/workers/types'

// 单例 Worker
let _worker: Worker | null = null
let _workerRefCount = 0

export interface SyncWorkerResult {
  resumeFiles: { filename: string; content: string }[]
  aiConfigFiles: { filename: string; content: string }[]
  metaContent: string
}

export interface UseSyncWorkerOptions {
  persistent?: boolean
  onProgress?: (message: string, percent: number) => void
}

export function useSyncWorker(options?: UseSyncWorkerOptions) {
  const isWorkerActive = ref(false)
  const isSupported = typeof Worker !== 'undefined'

  const getWorker = (): Worker | null => {
    if (!isSupported) return null
    if (!_worker) {
      try {
        _worker = new Worker(
          new URL('@/workers/sync.worker.ts', import.meta.url),
          { type: 'module' }
        )
        isWorkerActive.value = true
      } catch {
        console.warn('[useSyncWorker] Worker 创建失败，回退到主线程执行')
        return null
      }
    }
    isWorkerActive.value = true
    return _worker
  }

  /** 剥离 Vue Proxy */
  const unwrapProxy = <T>(data: T): T => {
    return structuredClone(toRaw(data as object)) as T
  }

  /** 主线程 fallback：同步序列化 */
  const fallbackPrepare = (
    resumes: unknown[],
    aiConfigs: unknown[],
    meta: Record<string, unknown>,
  ): SyncWorkerResult => {
    const resumeFiles = resumes.map((r) => ({
      filename: `${(r as Record<string, unknown>).id}.json`,
      content: JSON.stringify(r, null, 2),
    }))
    const aiConfigFiles = aiConfigs.map((c) => ({
      filename: `${(c as Record<string, unknown>).id}.json`,
      content: JSON.stringify(c, null, 2),
    }))
    const metaContent = JSON.stringify(meta, null, 2)
    return { resumeFiles, aiConfigFiles, metaContent }
  }

  /** 发送数据到 Worker 进行序列化 */
  const prepareSync = (
    resumes: unknown[],
    aiConfigs: unknown[],
    meta: Record<string, unknown>,
  ): Promise<SyncWorkerResult> => {
    return new Promise((resolve, reject) => {
      const w = getWorker()

      if (!w) {
        // Fallback：主线程同步执行
        try {
          resolve(fallbackPrepare(resumes, aiConfigs, meta))
        } catch (err) {
          reject(err)
        }
        return
      }

      const requestId = nextRequestId()

      const handleMessage = (e: MessageEvent<SyncWorkerResponse>) => {
        if (e.data.id !== requestId) return

        if (e.data.type === 'progress') {
          options?.onProgress?.(e.data.message, e.data.percent)
        } else if (e.data.type === 'prepared') {
          const result = e.data as SyncPreparedResponse
          resolve({
            resumeFiles: result.resumeFiles,
            aiConfigFiles: result.aiConfigFiles,
            metaContent: result.metaContent,
          })
          w.removeEventListener('message', handleMessage)
        } else if (e.data.type === 'error') {
          reject(new Error(e.data.error))
          w.removeEventListener('message', handleMessage)
        }
      }

      w.addEventListener('message', handleMessage)
      w.postMessage({
        type: 'prepare-sync',
        id: requestId,
        resumes: unwrapProxy(resumes),
        aiConfigs: unwrapProxy(aiConfigs),
        meta,
      })
    })
  }

  // 引用计数 + 组件卸载时清理
  if (!options?.persistent) {
    _workerRefCount++
    onUnmounted(() => {
      _workerRefCount--
      if (_workerRefCount <= 0 && _worker) {
        _worker.terminate()
        _worker = null
        _workerRefCount = 0
      }
      isWorkerActive.value = false
    })
  }

  return {
    prepareSync,
    isSupported,
    isWorkerActive,
  }
}
