/**
 * AI 服务层 — OpenAI 兼容 API 调用（SSE 流式）
 * 支持所有兼容 /v1/chat/completions 的服务商
 */

import type { AIServiceConfig } from '@/types/aiConfig'
import { buildMessages, type FullAIOperation } from '@/services/aiPrompts'

// ========== 开发代理支持 ==========

/** 是否为开发环境 */
const isDev = import.meta.env.DEV

/**
 * 获取请求 URL
 * 确保 endpoint 路径以 /v1（或 /v4 智谱）结尾，然后拼接 /chat/completions
 */
export function _getRequestUrl(config: AIServiceConfig): string {
  let base = config.endpoint.replace(/\/+$/, '')
  // 仅当路径不以 /v1 或 /v4 结尾时自动补充 /v1
  // 精确匹配路径末尾，避免误判 URL 中间含 /v1/ 的情况
  if (!/\/v[14]\/?$/.test(base)) {
    base += '/v1'
  }
  return `${base}/chat/completions`
}

// ========== 错误类型 ==========

export type AIErrorCode = 'auth' | 'cors' | 'rate_limit' | 'network' | 'invalid_response' | 'unknown'

export class AIServiceError extends Error {
  code: AIErrorCode
  constructor(message: string, code: AIErrorCode) {
    super(message)
    this.name = 'AIServiceError'
    this.code = code
  }
}

// ========== 错误提示映射 ==========

export const AI_ERROR_MESSAGES: Record<AIErrorCode, string> = {
  auth: 'API Key 无效，请检查配置',
  cors: '网络请求被阻止，该服务商可能不支持浏览器直调 API，请使用代理或切换服务商',
  rate_limit: '请求过于频繁，请稍后重试',
  network: '网络连接失败，请检查网络',
  invalid_response: 'AI 返回格式异常，请重试',
  unknown: '处理失败，请重试',
}

// ========== HTML ↔ 纯文本转换 ==========

/** 将 HTML 转为纯文本（供 AI 处理） */
export function htmlToPlainText(html: string): string {
  if (!html) return ''
  // 创建临时 DOM 元素提取文本
  const div = document.createElement('div')
  div.innerHTML = html
  // 将 <br> 和 </p> 转为换行
  let text = div.innerHTML
  text = text.replace(/<br\s*\/?>/gi, '\n')
  text = text.replace(/<\/p>/gi, '\n')
  text = text.replace(/<\/li>/gi, '\n')
  text = text.replace(/<li[^>]*>/gi, '• ')
  // 再次解析提取纯文本
  div.innerHTML = text
  text = div.textContent || div.innerText || ''
  // 清理多余空行
  return text.replace(/\n{3,}/g, '\n\n').trim()
}

/** 将 AI 返回的纯文本转为 HTML（供编辑器使用） */
export function plainTextToHtml(text: string): string {
  if (!text) return ''
  return text
    .split('\n')
    .map(line => {
      const escaped = line
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
      return `<p>${escaped || '<br>'}</p>`
    })
    .join('')
}

// ========== SSE 流式调用 ==========

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

/** streamChat 返回结果 */
export interface StreamChatResult {
  /** 输出是否因达到最大续写次数而被截断 */
  wasTruncated: boolean
  /** 清洗后的完整文本（包含拼接验证修正），调用方应优先使用此文本而非 onChunk 累积的原始文本 */
  finalText: string
}

// ========== 续写拼接验证 ==========

/**
 * 查找最长重叠长度：anchor 的后缀与 continuation 的前缀的最长匹配
 * 最小重叠阈值 6 字符，避免短字符串误判
 */
export function _findOverlapLength(anchor: string, continuation: string): number {
  const minOverlap = 6
  const maxCheck = Math.min(anchor.length, continuation.length, 200)

  for (let len = maxCheck; len >= minOverlap; len--) {
    const suffix = anchor.slice(-len)
    if (continuation.startsWith(suffix)) {
      return len
    }
  }
  return 0
}

/**
 * 验证并清洗续写拼接点
 * 处理三类常见问题：
 * 1. 续写开头的 Markdown 代码块标记（AI 可能输出 ```json）
 * 2. 续写开头的解释性文字（AI 可能先说一段话再继续 JSON）
 * 3. 重叠内容（AI 重复了截断点前的部分内容）
 *
 * 返回清洗后的续写文本
 */
export function _cleanSplicePoint(previousText: string, continuationText: string): string {
  if (!continuationText || !previousText) return continuationText

  let cleaned = continuationText

  // 1. 移除续写开头的 Markdown 代码块标记
  cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '')

  // 2. 移除续写开头的解释性文字
  // 如果前文以 JSON 结构字符结尾（说明截断在 JSON 内部），
  // 跳过续写开头的非 JSON 行（最多 3 行）
  const prevTail = previousText.slice(-5)
  const prevEndedInJsonValue = /["\]\}0-9a-z]$/i.test(prevTail)
  if (prevEndedInJsonValue) {
    const lines = cleaned.split('\n')
    let firstJsonLine = 0
    for (let i = 0; i < Math.min(lines.length, 3); i++) {
      const line = lines[i].trim()
      if (!line) { firstJsonLine = i + 1; continue }
      // JSON 续行应包含结构字符或转义序列
      if (/^["\[\]{},:]/.test(line) || /^\\[nrtu]/.test(line)) break
      // 可能是解释性文字，跳过
      firstJsonLine = i + 1
    }
    if (firstJsonLine > 0) {
      cleaned = lines.slice(firstJsonLine).join('\n')
    }
  }

  // 3. 检测并移除重叠内容
  const anchor = previousText.slice(-150)
  const overlapLen = _findOverlapLength(anchor, cleaned)
  if (overlapLen > 0) {
    cleaned = cleaned.slice(overlapLen)
  }

  return cleaned
}

/** streamChat 可选参数 */
export interface StreamChatOptions {
  /** 取消信号 */
  signal?: AbortSignal
  /** 连接建立、首个 chunk 到达时的回调（用于更新 UI 状态） */
  onConnected?: () => void
  /** token 用量回调（每次续写请求单独上报） */
  onUsage?: (usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number }) => void
  /** 单次请求最大生成 token 数（建议 4096，配合自动续写兜底） */
  maxTokens?: number
  /** 自定义续写提示，当 finish_reason === 'length' 时使用。默认为通用中文续写提示 */
  continuationPrompt?: string
  /** 是否验证并清洗续写拼接点（针对 JSON/结构化输出），清理重复内容、代码块标记等 */
  validateSplice?: boolean
}

/**
 * 流式调用 OpenAI 兼容 API（带自动续写）
 *
 * 当 AI 因达到 max_tokens 上限而截断时（finish_reason === 'length'），
 * 自动将已生成内容追加为 assistant 消息 + 续写提示发起新请求，
 * 对调用方完全透明，onChunk 持续接收直至完整输出。
 *
 * @param config AI 服务配置
 * @param messages 消息列表
 * @param onChunk 每收到一段文本时的回调
 * @param options 可选参数（signal、onConnected、onUsage、maxTokens）
 */
export async function streamChat(
  config: AIServiceConfig,
  messages: ChatMessage[],
  onChunk: (text: string) => void,
  options: StreamChatOptions = {},
): Promise<StreamChatResult> {
  const { signal, onConnected, onUsage, maxTokens, continuationPrompt, validateSplice } = options
  const MAX_CONTINUATIONS = 3          // 最大续写次数，防止无限循环
  const conversationMessages: ChatMessage[] = [...messages]
  let accumulatedText = ''              // 跨续写累积的完整文本
  let preContinuationLength = 0        // 续写前的 accumulatedText 长度（供拼接验证使用）
  let hasConnected = false              // onConnected 仅首次触发
  let wasTruncated = false              // 是否因续写次数上限被截断

  for (let attempt = 0; attempt <= MAX_CONTINUATIONS; attempt++) {
    // ---- 发起请求 ----
    const url = _getRequestUrl(config)

    let response: Response
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: config.modelId,
          messages: conversationMessages,
          stream: true,
          temperature: 0.7,
          ...(maxTokens ? { max_tokens: maxTokens } : {}),
        }),
        signal,
      })
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') return { wasTruncated: false, finalText: accumulatedText }
      if (err instanceof TypeError) {
        throw new AIServiceError('网络请求被阻止，可能是 CORS 限制或网络不可达', 'cors')
      }
      throw new AIServiceError('网络连接失败', 'network')
    }

    // HTTP 状态码检查
    if (!response.ok) {
      const status = response.status
      if (status === 401 || status === 403) {
        throw new AIServiceError('API Key 无效或无权限', 'auth')
      }
      if (status === 429) {
        throw new AIServiceError('请求过于频繁', 'rate_limit')
      }
      let detail = ''
      try {
        const body = await response.json()
        detail = body?.error?.message || body?.message || ''
      } catch { /* ignore */ }
      throw new AIServiceError(
        detail || `请求失败 (${status})`,
        status >= 500 ? 'network' : 'unknown',
      )
    }

    // ---- 解析 SSE 流 ----
    const reader = response.body?.getReader()
    if (!reader) {
      throw new AIServiceError('响应体不可读', 'invalid_response')
    }

    const decoder = new TextDecoder()
    let buffer = ''
    let finishReason: string | null = null
    const MAX_BUFFER_SIZE = 1024 * 1024
    let totalBufferedSize = 0

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        totalBufferedSize += value?.byteLength || 0
        if (totalBufferedSize > MAX_BUFFER_SIZE) {
          throw new AIServiceError('响应数据超过大小限制 (1MB)', 'invalid_response')
        }
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed || trimmed.startsWith(':')) continue
          if (trimmed === 'data: [DONE]') continue  // 结束当前 SSE 流，不 return（可能需要续写）

          if (trimmed.startsWith('data: ')) {
            const jsonStr = trimmed.slice(6)
            try {
              const parsed = JSON.parse(jsonStr)
              const choice = parsed?.choices?.[0]
              const content = choice?.delta?.content
              if (content) {
                accumulatedText += content
                onChunk(content)
                if (!hasConnected) {
                  hasConnected = true
                  onConnected?.()
                }
              }
              // 提取 finish_reason（最后一个 chunk 携带）
              if (choice?.finish_reason) {
                finishReason = choice.finish_reason
              }
              if (parsed?.usage && onUsage) {
                onUsage(parsed.usage)
              }
            } catch {
              // 单行 JSON 解析失败，跳过
            }
          }
        }
      }

      // 流结束后排空缓冲区残余内容
      if (buffer.trim()) {
        const trimmed = buffer.trim()
        if (trimmed.startsWith('data: ') && trimmed !== 'data: [DONE]') {
          const jsonStr = trimmed.slice(6)
          try {
            const parsed = JSON.parse(jsonStr)
            const choice = parsed?.choices?.[0]
            if (choice?.delta?.content) {
              accumulatedText += choice.delta.content
              onChunk(choice.delta.content)
            }
            if (choice?.finish_reason) {
              finishReason = choice.finish_reason
            }
          } catch { /* skip */ }
        }
      }
    } finally {
      reader.releaseLock()
    }

    // ---- 续写判定 ----
    if (finishReason !== 'length') break    // 正常结束（stop）或未知，直接退出
    if (attempt >= MAX_CONTINUATIONS) {
      // 达到最大续写次数，输出可能被截断
      wasTruncated = true
      console.warn('[aiService] 达到最大续写次数，输出可能不完整')
      break
    }

    // ---- 续写拼接点验证 ----
    if (validateSplice && attempt > 0) {
      const preText = accumulatedText.slice(0, preContinuationLength)
      const continuationContent = accumulatedText.slice(preContinuationLength)
      const cleanedContinuation = _cleanSplicePoint(preText, continuationContent)
      const trimmedChars = continuationContent.length - cleanedContinuation.length
      if (trimmedChars > 0) {
        accumulatedText = preText + cleanedContinuation
        console.warn(`[aiService] 续写拼接验证：清理了 ${trimmedChars} 个多余字符`)
      }
    }

    // 追加已生成的 assistant 回复 + 续写提示，对调用方透明
    const defaultContinuationPrompt = '请继续，从你中断的地方接着说，不要重复已经说过的内容。'
    conversationMessages.push(
      { role: 'assistant', content: accumulatedText },
      { role: 'user', content: continuationPrompt ?? defaultContinuationPrompt },
    )

    // 记录续写前的文本长度，供下轮拼接验证使用
    preContinuationLength = accumulatedText.length
  }

  return { wasTruncated, finalText: accumulatedText }
}

// ========== 便捷方法 ==========

/** performAIOperation 可选参数 */
export interface PerformAIOperationOptions extends StreamChatOptions {
  /** 自定义指令（帮写/定制模式） */
  customInstruction?: string
}

/**
 * 执行 AI 文本操作
 * @param config AI 服务配置
 * @param operation 操作类型
 * @param content 纯文本内容
 * @param onChunk 流式回调
 * @param options 可选参数（signal、customInstruction、onConnected、onUsage、maxTokens）
 */
export async function performAIOperation(
  config: AIServiceConfig,
  operation: FullAIOperation,
  content: string,
  onChunk: (text: string) => void,
  options: PerformAIOperationOptions = {},
): Promise<StreamChatResult> {
  const { customInstruction, ...streamOptions } = options
  const messages = buildMessages(operation, content, customInstruction)
  return await streamChat(config, messages, onChunk, streamOptions)
}

/**
 * 开发代理辅助：为不支持 CORS 的服务商生成开发环境下的代理 endpoint
 * 在开发环境下返回 /api/ai/{provider} 路径，生产环境返回原始 endpoint
 */
export function getDevProxyEndpoint(provider: string, originalEndpoint: string): string {
  if (!isDev) return originalEndpoint
  // CORS 友好的服务商无需代理
  const proxyMap: Record<string, string> = {
    openai: '/api/ai/openai/v1',
    zhipu: '/api/ai/zhipu/api/paas/v4',
    qwen: '/api/ai/qwen/compatible-mode/v1',
    minimax: '/api/ai/minimax/v1',
    baichuan: '/api/ai/baichuan/v1',
    yi: '/api/ai/yi/v1',
  }
  return proxyMap[provider] || originalEndpoint
}
