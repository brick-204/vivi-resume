/**
 * AI 识图服务：把图片里的文字提取出来。
 * 走多模态 streamChat（user content = ContentPart[]，图片走 image_url），
 * 绕过 buildMessages（它只产 string content）。
 * 骨架仿 petAiQuote.ts，多模态构造仿 consultStore.ts。
 *
 * 约定标识符：提示词要求 AI 在「无法识别/没能力/识别失败」时在最前面输出
 *   【OCR:UNSUPPORTED】（模型不支持图片）或 【OCR:FAILED】（支持但识别失败）。
 * 代码据此分流，避免靠关键词猜中英文自述。
 */

import { streamChat, AIServiceError, AI_ERROR_MESSAGES } from '@/services/aiService'
import type { ChatMessage, ContentPart } from '@/services/aiService'
import { useAIConfigStore } from '@/stores/aiConfigStore'

const MAX_TOKENS = 4096

/** AI 约定输出的错误标识符前缀 */
const TAG_UNSUPPORTED = '【OCR:UNSUPPORTED】'
const TAG_FAILED = '【OCR:FAILED】'

/** 流式期间检测：累积文本是否已确定为错误标识符（用于阻止往结果框写入） */
export function isOcrErrorPrefix(accumulated: string): boolean {
  const t = accumulated.trim()
  return t.startsWith(TAG_UNSUPPORTED) || t.startsWith(TAG_FAILED)
}

/**
 * 识别图片中的文字，流式回调。
 * @param imageDataUrl 图片的 Base64 data URL
 * @param onChunk 流式文本回调
 * @param signal 取消信号
 * @returns 识别完成的完整文本（trim 后）
 * @throws {NO_CONFIG} 未配置/激活服务商
 * @throws {UNSUPPORTED_VISION} 模型不支持图片识别
 * @throws {OCR_FAILED} 模型支持但识别失败
 * @throws {EMPTY_RESPONSE} 空响应
 */
export async function ocrImage(
  imageDataUrl: string,
  onChunk: (text: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  const aiConfigStore = useAIConfigStore()
  const config = aiConfigStore.activeConfig
  if (!config || !config.apiKey) {
    throw new Error('NO_CONFIG')
  }

  const userParts: ContentPart[] = [
    { type: 'text', text: OCR_INSTRUCTION },
    { type: 'image_url', image_url: { url: imageDataUrl } },
  ]

  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: SYSTEM_PROMPT,
    },
    { role: 'user', content: userParts },
  ]

  const t0 = performance.now()
  const result = await streamChat(config, messages, onChunk, {
    signal,
    maxTokens: MAX_TOKENS,
    onUsage: (u) => aiConfigStore.recordUsage(config.id, {
      ...u,
      durationMs: performance.now() - t0,
      feature: 'consult',
      modelId: config.modelId,
    }),
  })

  const text = (result.finalText || '').trim()
  if (!text) throw new Error('EMPTY_RESPONSE')

  // 约定标识符分流：AI 在最前面输出标识符声明失败类型
  if (text.startsWith(TAG_UNSUPPORTED)) throw new Error('UNSUPPORTED_VISION')
  if (text.startsWith(TAG_FAILED)) throw new Error('OCR_FAILED')
  return text
}

const SYSTEM_PROMPT =
  '你是一个精准的 OCR 助手。任务：把用户发送的图片里的文字原样提取出来，保持原有顺序、换行和标点。\n' +
  '输出规则（严格遵守）：\n' +
  '1. 如果能识别图片中的文字，只输出识别到的文字内容，不要任何解释、说明或前后缀。\n' +
  '2. 如果你无法查看/解析图片（例如你不具备图像识别能力、收不到图片），在回答最前面输出「' + TAG_UNSUPPORTED + '」，后面可简要说明原因。\n' +
  '3. 如果你能收到图片但识别失败（例如图片太模糊、无文字、格式不支持），在回答最前面输出「' + TAG_FAILED + '」，后面可简要说明原因。\n' +
  '无论中英文，正常识别时绝不要输出上述标识符。'

/** OCR 指令 */
const OCR_INSTRUCTION = '提取这张图片里的全部文字，保持原有排版和换行，只输出文字内容。'

/** 把 AIServiceError / Error 转成中文提示 */
export function formatOcrError(err: unknown): string {
  if (err instanceof Error) {
    if (err.name === 'AbortError') return '' // 取消静默
    const code = (err as AIServiceError).code
    if (code && AI_ERROR_MESSAGES[code]) return AI_ERROR_MESSAGES[code]
    if (err.message === 'NO_CONFIG') return '请先在「AI 设置」中配置并激活服务商'
    if (err.message === 'EMPTY_RESPONSE') return 'AI 未返回识别结果，请重试'
    if (err.message === 'UNSUPPORTED_VISION') return '当前模型不支持图片识别，请在「AI 设置」切换为支持视觉的模型（如 gpt-4o、glm-4v 等）'
    if (err.message === 'OCR_FAILED') return 'AI 识别失败，可能是图片过模糊或无文字，请换张图重试'
    return err.message
  }
  return '识别失败，请重试'
}

