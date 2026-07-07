/**
 * 图片处理 Worker composable
 * 使用 OffscreenCanvas + convertToBlob() 替代主线程 canvas.toDataURL()，
 * 实现非阻塞图片编码。
 *
 * - 支持 Worker + OffscreenCanvas 时使用 Worker
 * - 不支持时自动 fallback 到主线程 canvas.toDataURL()
 * - ImageBitmap 通过 Transferable 零拷贝传入 Worker
 *   ⚠️ 传入后主线程的 ImageBitmap 被 neutered（不可再访问），
 *   调用方不应在 sendMessage 后复用该 ImageBitmap
 * - 使用请求 ID 隔离并发消息，确保响应不错配
 * - 支持 persistent 模式（不依赖 onUnmounted，适用于 Pinia store）
 * - 组件卸载时自动 terminate Worker（非 persistent 模式）
 */

import { onUnmounted } from 'vue'
import type { ImageProcessOptions } from '@/workers/types'
import { nextRequestId } from '@/workers/types'

// 单例 Worker — 图片处理全局共享一个 Worker 实例
let _worker: Worker | null = null
let _workerRefCount = 0

export interface UseWorkerImageProcessorOptions {
  /**
   * 持久模式：不注册 onUnmounted 钩子，Worker 生命周期由调用方管理。
   * 适用于 Pinia store 等非组件场景。
   */
  persistent?: boolean
}

export function useWorkerImageProcessor(options?: UseWorkerImageProcessorOptions) {
  // 检测 Worker + OffscreenCanvas + convertToBlob 支持
  const isSupported = typeof Worker !== 'undefined' &&
    typeof OffscreenCanvas !== 'undefined' &&
    typeof OffscreenCanvas.prototype.convertToBlob === 'function'

  // 获取或创建 Worker 实例
  const getWorker = (): Worker | null => {
    if (!isSupported) return null
    if (!_worker) {
      try {
        _worker = new Worker(
          new URL('@/workers/imageProcessor.worker.ts', import.meta.url),
          { type: 'module' }
        )
      } catch {
        console.warn('[useWorkerImageProcessor] Worker 创建失败，回退到主线程执行')
        return null
      }
    }
    return _worker
  }

  // ========== 主线程 Fallback 实现 ==========

  const fallbackProcess = (
    source: CanvasImageSource,
    options: ImageProcessOptions
  ): string => {
    const { width, height, shape, mimeType, quality } = options
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')!

    ctx.beginPath()
    if (shape === 'circle') {
      ctx.arc(width / 2, height / 2, Math.min(width, height) / 2, 0, Math.PI * 2)
    } else {
      ctx.rect(0, 0, width, height)
    }
    ctx.clip()

    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)
    ctx.drawImage(source, 0, 0, width, height)

    return canvas.toDataURL(mimeType, quality)
  }

  const fallbackResize = (
    source: CanvasImageSource,
    maxDim: number,
    mimeType: 'image/jpeg',
    quality: number
  ): string => {
    const srcWidth = 'width' in source ? (source.width as number) : 0
    const srcHeight = 'height' in source ? (source.height as number) : 0
    let width = srcWidth
    let height = srcHeight

    if (width > maxDim || height > maxDim) {
      const ratio = Math.min(maxDim / width, maxDim / height)
      width = Math.round(width * ratio)
      height = Math.round(height * ratio)
    }

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(source, 0, 0, width, height)

    return canvas.toDataURL(mimeType, quality)
  }

  const fallbackEncode = (
    source: HTMLCanvasElement | ImageBitmap,
    mimeType: 'image/png' | 'image/jpeg',
    quality?: number
  ): string => {
    if (source instanceof HTMLCanvasElement) {
      return source.toDataURL(mimeType, quality ?? 0.92)
    }
    // ImageBitmap → canvas → toDataURL
    const canvas = document.createElement('canvas')
    canvas.width = source.width
    canvas.height = source.height
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(source, 0, 0)
    return canvas.toDataURL(mimeType, quality ?? 0.92)
  }

  // ========== Worker 消息收发（带请求 ID 隔离） ==========

  /**
   * 向 Worker 发送消息并等待响应。
   * 请求 ID 在此统一赋值，确保每条消息都有唯一 ID。
   *
   * ⚠️ transferables 中的 ImageBitmap 传入后会被 neutered，
   * 调用方不应在发送后复用该对象。
   */
  const sendMessage = (
    message: Record<string, unknown>,
    transferables?: Transferable[]
  ): Promise<string> => {
    return new Promise((resolve, reject) => {
      const w = getWorker()

      if (!w) {
        // Fallback：主线程同步执行
        try {
          if (message.type === 'process') {
            resolve(fallbackProcess(message.imageBitmap as CanvasImageSource, message.options as ImageProcessOptions))
          } else if (message.type === 'resize') {
            resolve(fallbackResize(message.imageBitmap as CanvasImageSource, message.maxDim as number, message.mimeType as 'image/jpeg', message.quality as number))
          } else {
            // encode
            resolve(fallbackEncode(message.imageBitmap as HTMLCanvasElement | ImageBitmap, message.mimeType as 'image/png' | 'image/jpeg', message.quality as number | undefined))
          }
        } catch (err) {
          reject(err)
        }
        return
      }

      const id = nextRequestId()
      const handleMessage = (e: MessageEvent) => {
        // 仅处理匹配当前请求 ID 的响应
        if (e.data.id !== id) return
        if (e.data.type === 'result') {
          resolve(e.data.dataUrl as string)
        } else {
          reject(new Error(e.data.error as string))
        }
        w.removeEventListener('message', handleMessage)
      }

      w.addEventListener('message', handleMessage)
      w.postMessage({ ...message, id }, transferables || [])
    })
  }

  /**
   * 裁剪 + 编码图片（替代 canvas.toDataURL）
   * @param source 图片源（canvas 或 ImageBitmap）
   * @param options 裁剪选项
   * @returns data URL 字符串
   */
  const processImage = async (
    source: HTMLCanvasElement | ImageBitmap,
    options: ImageProcessOptions
  ): Promise<string> => {
    const w = getWorker()

    if (w) {
      // Worker 模式：将 canvas 转为 ImageBitmap，零拷贝传入 Worker
      const imageBitmap = source instanceof ImageBitmap
        ? source
        : await createImageBitmap(source)
      return sendMessage(
        { type: 'process', imageBitmap, options },
        [imageBitmap]
      )
    }

    // Fallback：主线程同步执行
    return fallbackProcess(source, options)
  }

  /**
   * 缩放 + 编码图片（替代 canvas.toDataURL）
   * @param source 图片源（Image 元素、canvas 或 ImageBitmap）
   * @param maxDim 最大边长
   * @param mimeType 输出 MIME 类型
   * @param quality 输出质量（0-1）
   * @returns data URL 字符串
   */
  const resizeImage = async (
    source: HTMLCanvasElement | HTMLImageElement | ImageBitmap,
    maxDim: number,
    mimeType: 'image/jpeg' = 'image/jpeg',
    quality: number = 0.85
  ): Promise<string> => {
    const w = getWorker()

    if (w) {
      // Worker 模式：转为 ImageBitmap
      const imageBitmap = source instanceof ImageBitmap
        ? source
        : await createImageBitmap(source)
      return sendMessage(
        { type: 'resize', imageBitmap, maxDim, mimeType, quality },
        [imageBitmap]
      )
    }

    // Fallback：主线程同步执行
    return fallbackResize(source, maxDim, mimeType, quality)
  }

  /**
   * 纯编码：将已绘制好的 canvas/ImageBitmap 编码为 data URL
   * 用于主线程已完成绘制（如 PhotoEditor 的旋转/缩放/裁剪），
   * 仅需替代 toDataURL 的编码步骤。
   *
   * @param source 已绘制好的 canvas 或 ImageBitmap
   * @param mimeType 输出 MIME 类型
   * @param quality 输出质量（0-1），默认 0.92
   * @returns data URL 字符串
   */
  const encodeImage = async (
    source: HTMLCanvasElement | ImageBitmap,
    mimeType: 'image/png' | 'image/jpeg',
    quality?: number
  ): Promise<string> => {
    const w = getWorker()

    if (w) {
      const imageBitmap = source instanceof ImageBitmap
        ? source
        : await createImageBitmap(source)
      return sendMessage(
        { type: 'encode', imageBitmap, mimeType, quality },
        [imageBitmap]
      )
    }

    // Fallback：主线程同步执行
    return fallbackEncode(source, mimeType, quality)
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
    })
  }

  return {
    processImage,
    resizeImage,
    encodeImage,
  }
}
