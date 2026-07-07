// ========== 请求 ID（用于单例 Worker 消息隔离） ==========

// 模块级全局计数器，确保单例 Worker 下每条消息有唯一 ID。
// 注意：当前项目为纯 SPA，不涉及 SSR。若未来引入 SSR，需改为请求级作用域。
let _requestId = 0
export const nextRequestId = (): number => ++_requestId

// ========== 图片处理 Worker 消息类型 ==========

export interface ImageProcessOptions {
  width: number
  height: number
  shape: 'circle' | 'rectangle'
  mimeType: 'image/png' | 'image/jpeg'
  quality?: number
}

export interface ProcessImageMessage {
  type: 'process'
  id: number
  imageBitmap: ImageBitmap
  options: ImageProcessOptions
}

export interface ResizeImageMessage {
  type: 'resize'
  id: number
  imageBitmap: ImageBitmap
  maxDim: number
  mimeType: 'image/jpeg'
  quality: number
}

/** 仅编码已有 canvas 内容为 data URL（主线程绘制后传入） */
export interface EncodeImageMessage {
  type: 'encode'
  id: number
  imageBitmap: ImageBitmap
  mimeType: 'image/png' | 'image/jpeg'
  quality?: number
}

export interface ImageProcessorResult {
  type: 'result'
  id: number
  dataUrl: string
}

// ========== 通用错误类型 ==========

export interface WorkerError {
  type: 'error'
  id: number
  error: string
}

// ========== 联合类型 ==========

export type ImageWorkerMessage = ProcessImageMessage | ResizeImageMessage | EncodeImageMessage
export type ImageWorkerResponse = ImageProcessorResult | WorkerError
