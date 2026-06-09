/**
 * AI 服务层 — OpenAI 兼容 API 调用（SSE 流式）
 * 支持所有兼容 /v1/chat/completions 的服务商
 */

import type { AIServiceConfig, AIOperation } from '@/types/aiConfig'
import { buildMessages } from '@/services/aiPrompts'

// ========== 开发代理支持 ==========

/** 是否为开发环境 */
const isDev = import.meta.env.DEV

/**
 * 获取请求 URL
 * 确保 endpoint 路径以 /v1（或 /v4 智谱）结尾，然后拼接 /chat/completions
 */
function getRequestUrl(config: AIServiceConfig): string {
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

interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

/**
 * 流式调用 OpenAI 兼容 API
 * @param config AI 服务配置
 * @param messages 消息列表
 * @param onChunk 每收到一段文本时的回调
 * @param signal 取消信号
 */
export async function streamChat(
  config: AIServiceConfig,
  messages: ChatMessage[],
  onChunk: (text: string) => void,
  signal?: AbortSignal,
): Promise<void> {
  const url = getRequestUrl(config)

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
        messages,
        stream: true,
        temperature: 0.7,
      }),
      signal,
    })
  } catch (err: unknown) {
    // 网络错误分类
    if (err instanceof DOMException && err.name === 'AbortError') {
      return // 用户取消，静默返回
    }
    if (err instanceof TypeError) {
      // TypeError 通常是 CORS 或网络不可达
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
    // 尝试读取错误详情
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

  // 解析 SSE 流
  const reader = response.body?.getReader()
  if (!reader) {
    throw new AIServiceError('响应体不可读', 'invalid_response')
  }

  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      // 最后一行可能不完整，保留到下次
      buffer = lines.pop() || ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith(':')) continue // 空行或注释
        if (trimmed === 'data: [DONE]') return

        if (trimmed.startsWith('data: ')) {
          const jsonStr = trimmed.slice(6)
          try {
            const parsed = JSON.parse(jsonStr)
            const content = parsed?.choices?.[0]?.delta?.content
            if (content) {
              onChunk(content)
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
          const content = parsed?.choices?.[0]?.delta?.content
          if (content) {
            onChunk(content)
          }
        } catch {
          // 最后一块 JSON 解析失败，跳过
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}

// ========== 便捷方法 ==========

/**
 * 执行 AI 文本操作
 * @param config AI 服务配置
 * @param operation 操作类型
 * @param content 纯文本内容
 * @param onChunk 流式回调
 * @param signal 取消信号
 */
export async function performAIOperation(
  config: AIServiceConfig,
  operation: AIOperation,
  content: string,
  onChunk: (text: string) => void,
  signal?: AbortSignal,
): Promise<void> {
  const messages = buildMessages(operation, content)
  await streamChat(config, messages, onChunk, signal)
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
