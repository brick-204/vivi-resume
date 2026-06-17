/**
 * 序列化 Worker composable
 * 将 JSON.stringify / JSON.parse 移至 Web Worker 执行，
 * 避免大数据序列化阻塞主线程。
 *
 * - Worker 懒初始化（首次调用时创建）
 * - 不支持 Worker 时自动 fallback 到主线程同步执行
 * - 使用请求 ID 隔离并发消息，确保响应不错配
 * - 支持 persistent 模式（不依赖 onUnmounted，适用于 Pinia store）
 */

import { ref, onUnmounted, toRaw } from 'vue'
import { nextRequestId } from '@/workers/types'

// 单例 Worker — 序列化操作全局共享一个 Worker 实例，避免重复创建
let _worker: Worker | null = null
let _workerRefCount = 0

export interface UseWorkerSerializerOptions {
  /**
   * 持久模式：不注册 onUnmounted 钩子，Worker 生命周期由调用方管理。
   * 适用于 Pinia store 等非组件场景。
   */
  persistent?: boolean
}

export function useWorkerSerializer(options?: UseWorkerSerializerOptions) {
  const isWorkerActive = ref(false)

  // 检测 Worker 支持
  const isSupported = typeof Worker !== 'undefined'

  // 获取或创建 Worker 实例
  const getWorker = (): Worker | null => {
    if (!isSupported) return null
    if (!_worker) {
      try {
        _worker = new Worker(
          new URL('@/workers/serializer.worker.ts', import.meta.url),
          { type: 'module' }
        )
        isWorkerActive.value = true
      } catch {
        console.warn('[useWorkerSerializer] Worker 创建失败，回退到主线程执行')
        return null
      }
    }
    isWorkerActive.value = true
    return _worker
  }

  // ========== 主线程 Fallback 实现 ==========

  const fallbackSerialize = (data: unknown): string => {
    return JSON.stringify(data)
  }

  const fallbackParse = <T>(json: string): T => {
    return JSON.parse(json) as T
  }

  // ========== 工具函数 ==========

  /**
   * 剥离 Vue Proxy：将 reactive/ref 数据转为纯 JS 对象。
   * Worker 的 postMessage 使用结构化克隆算法，无法克隆 Vue 的 Proxy 对象。
   * toRaw() 只剥离一层 Proxy，嵌套的响应式对象无法被 structuredClone 处理，
   * 因此使用 JSON 往返来递归剥离所有 Proxy 并生成纯数据对象。
   */
  const unwrapProxy = <T>(data: T): T => {
    return JSON.parse(JSON.stringify(toRaw(data as object))) as T
  }

  // ========== Worker 消息收发（带请求 ID 隔离） ==========

  /** 发送序列化请求到 Worker，fallback 时在主线程同步执行 */
  const serializeInWorker = (data: unknown, id: number): Promise<string> => {
    return new Promise((resolve, reject) => {
      const w = getWorker()

      if (!w) {
        try { resolve(fallbackSerialize(data)) } catch (err) { reject(err) }
        return
      }

      // 剥离 Vue Proxy，使数据可被结构化克隆
      const plain = unwrapProxy(data)

      const handleMessage = (e: MessageEvent) => {
        if (e.data.id !== id) return
        if (e.data.type === 'result') {
          resolve(e.data.result as string)
        } else {
          reject(new Error(e.data.error))
        }
        w.removeEventListener('message', handleMessage)
      }

      w.addEventListener('message', handleMessage)
      w.postMessage({ type: 'serialize', id, data: plain })
    })
  }

  /** 发送解析请求到 Worker，fallback 时在主线程同步执行 */
  const parseInWorker = <T>(json: string, id: number): Promise<T> => {
    return new Promise((resolve, reject) => {
      const w = getWorker()

      if (!w) {
        try { resolve(fallbackParse<T>(json)) } catch (err) { reject(err) }
        return
      }

      const handleMessage = (e: MessageEvent) => {
        if (e.data.id !== id) return
        if (e.data.type === 'result') {
          resolve(e.data.result as T)
        } else {
          reject(new Error(e.data.error))
        }
        w.removeEventListener('message', handleMessage)
      }

      w.addEventListener('message', handleMessage)
      w.postMessage({ type: 'parse', id, json })
    })
  }

  /**
   * 在 Worker 中执行 JSON.stringify
   * @param data 要序列化的数据
   * @returns JSON 字符串
   */
  const serialize = (data: unknown): Promise<string> => {
    return serializeInWorker(data, nextRequestId())
  }

  /**
   * 在 Worker 中执行 JSON.parse
   * @param json JSON 字符串
   * @returns 解析后的数据
   */
  const parse = <T = unknown>(json: string): Promise<T> => {
    return parseInWorker<T>(json, nextRequestId())
  }

  // 引用计数 + 组件卸载时清理（persistent 模式跳过）
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
    serialize,
    parse,
    isSupported,
    isWorkerActive,
  }
}
