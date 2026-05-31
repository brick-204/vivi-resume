/**
 * 图片处理 Worker
 * 使用 OffscreenCanvas + convertToBlob() 替代主线程 canvas.toDataURL()，
 * 实现非阻塞图片编码（裁剪输出、压缩缩放、纯编码）。
 *
 * 支持三种操作：
 * - process: 裁剪 + 编码（用于 PhotoEditor 确认输出）
 * - resize:  缩放 + 编码（用于 BasicInfo 上传压缩）
 * - encode:  纯编码（主线程已绘制好 canvas，仅需要 toDataURL 替代）
 *
 * 每条消息携带请求 ID，响应原样返回，确保单例 Worker 下多请求不错配。
 */

import type { ImageWorkerMessage, ImageWorkerResponse, ImageProcessOptions } from './types'

self.onmessage = async (e: MessageEvent<ImageWorkerMessage>) => {
  const { type, id } = e.data

  try {
    if (type === 'process') {
      const { imageBitmap, options } = e.data as {
        type: 'process'
        id: number
        imageBitmap: ImageBitmap
        options: ImageProcessOptions
      }
      const dataUrl = await processImage(imageBitmap, options)
      self.postMessage({ type: 'result', id, dataUrl } as ImageWorkerResponse)
    } else if (type === 'resize') {
      const { imageBitmap, maxDim, mimeType, quality } = e.data as {
        type: 'resize'
        id: number
        imageBitmap: ImageBitmap
        maxDim: number
        mimeType: 'image/jpeg'
        quality: number
      }
      const dataUrl = await resizeImage(imageBitmap, maxDim, mimeType, quality)
      self.postMessage({ type: 'result', id, dataUrl } as ImageWorkerResponse)
    } else if (type === 'encode') {
      const { imageBitmap, mimeType, quality } = e.data as {
        type: 'encode'
        id: number
        imageBitmap: ImageBitmap
        mimeType: 'image/png' | 'image/jpeg'
        quality?: number
      }
      const dataUrl = await encodeImage(imageBitmap, mimeType, quality)
      self.postMessage({ type: 'result', id, dataUrl } as ImageWorkerResponse)
    }
  } catch (err) {
    self.postMessage({
      type: 'error',
      id,
      error: err instanceof Error ? err.message : 'Unknown image processing error',
    } as ImageWorkerResponse)
  }
}

/**
 * 裁剪 + 编码：在 OffscreenCanvas 上绘制图片并导出 data URL
 */
async function processImage(
  imageBitmap: ImageBitmap,
  options: ImageProcessOptions
): Promise<string> {
  const { width, height, shape, mimeType, quality } = options

  const offscreen = new OffscreenCanvas(width, height)
  const ctx = offscreen.getContext('2d')!

  // 裁剪形状
  ctx.beginPath()
  if (shape === 'circle') {
    ctx.arc(width / 2, height / 2, Math.min(width, height) / 2, 0, Math.PI * 2)
  } else {
    ctx.rect(0, 0, width, height)
  }
  ctx.clip()

  // 白色背景（确保透明区域有底色）
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)

  // 绘制图片
  ctx.drawImage(imageBitmap, 0, 0, width, height)

  // 编码输出
  const blob = await offscreen.convertToBlob({
    type: mimeType,
    quality: quality ?? 0.92,
  })

  return blobToDataURL(blob)
}

/**
 * 缩放 + 编码：按最大尺寸等比缩放并导出 data URL
 */
async function resizeImage(
  imageBitmap: ImageBitmap,
  maxDim: number,
  mimeType: 'image/jpeg',
  quality: number
): Promise<string> {
  let width = imageBitmap.width
  let height = imageBitmap.height

  if (width > maxDim || height > maxDim) {
    const ratio = Math.min(maxDim / width, maxDim / height)
    width = Math.round(width * ratio)
    height = Math.round(height * ratio)
  }

  const offscreen = new OffscreenCanvas(width, height)
  const ctx = offscreen.getContext('2d')!
  ctx.drawImage(imageBitmap, 0, 0, width, height)

  const blob = await offscreen.convertToBlob({ type: mimeType, quality })
  return blobToDataURL(blob)
}

/**
 * 纯编码：将 ImageBitmap 直接编码为 data URL（不做裁剪/缩放）
 * 用于主线程已绘制好 canvas 的场景，仅需替代 toDataURL。
 */
async function encodeImage(
  imageBitmap: ImageBitmap,
  mimeType: 'image/png' | 'image/jpeg',
  quality?: number
): Promise<string> {
  const offscreen = new OffscreenCanvas(imageBitmap.width, imageBitmap.height)
  const ctx = offscreen.getContext('2d')!
  ctx.drawImage(imageBitmap, 0, 0)

  const blob = await offscreen.convertToBlob({
    type: mimeType,
    quality: quality ?? 0.92,
  })
  return blobToDataURL(blob)
}

/**
 * Blob → data URL 转换
 * Worker 中 FileReader 可用，直接使用即可。
 */
function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Failed to convert blob to data URL'))
    reader.readAsDataURL(blob)
  })
}

export default {} as never
