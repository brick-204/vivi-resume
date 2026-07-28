import type { ChatMessage } from '@/services/aiService'

/** 咨询消息类型，扩展自 ChatMessage 以支持 UI 区分与简历注入追踪 */
export interface ConsultMessage extends ChatMessage {
  /**
   * 消息种类，用于 UI 区分：
   * - 'resume-context'：用户注入的简历上下文消息（与提问一起发送）
   * - 'user-question'：用户的实际提问
   * - 'assistant-answer'：AI 的流式回复
   * - undefined：system 消息
   */
  kind?: 'resume-context' | 'user-question' | 'assistant-answer'
  /** 这轮注入了哪些简历（仅 resume-context 消息携带） */
  attachedResumeIds?: string[]
  /** 消息时间戳（ms），用于持久化排序 */
  timestamp: number
}

/** 咨询会话，全局共享，最多保留最近 5 个 */
export interface ConsultSession {
  id: string
  /** 会话标题，取首条 user 提问前 20 字 */
  title: string
  messages: ConsultMessage[]
  createdAt: number
  updatedAt: number
}

/** 全局最多保留的会话数，超出删除最旧会话 */
export const MAX_CONSULT_SESSIONS = 5
