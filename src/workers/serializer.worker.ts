/**
 * 序列化 Worker
 * 将 JSON.stringify / JSON.parse 移至后台线程执行，
 * 避免大数据（含 base64 头像的简历）序列化阻塞主线程。
 *
 * 每条消息携带请求 ID，响应原样返回，确保单例 Worker 下多请求不错配。
 */

import type { SerializerWorkerMessage, SerializerWorkerResponse } from './types'

self.onmessage = (e: MessageEvent<SerializerWorkerMessage>) => {
  const { type, id } = e.data

  try {
    if (type === 'serialize') {
      const result = JSON.stringify((e.data as { type: 'serialize'; data: unknown }).data)
      self.postMessage({ type: 'result', id, result } as SerializerWorkerResponse)
    } else if (type === 'parse') {
      const result = JSON.parse((e.data as { type: 'parse'; json: string }).json)
      self.postMessage({ type: 'result', id, result } as SerializerWorkerResponse)
    }
  } catch (err) {
    self.postMessage({
      type: 'error',
      id,
      error: err instanceof Error ? err.message : 'Unknown serialization error',
    } as SerializerWorkerResponse)
  }
}

export default {} as never
