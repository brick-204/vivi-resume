import type { ChatMessage } from '@/services/aiService'

/** 咨询消息类型，扩展自 ChatMessage 以支持 UI 区分与简历注入追踪 */
export interface ConsultMessage extends ChatMessage {
  /**
   * 消息种类，用于 UI 区分：
   * - 'resume-context'：用户注入的简历上下文消息（与提问一起发送）
   * - 'user-question'：用户的实际提问
   * - 'assistant-answer'：AI 的流式回复
   * - 'history-summary'：历史压缩摘要（不在 UI 渲染，作为前置上下文注入）
   * - 'compress-notice'：历史压缩提示 chip（UI 居中渲染，不发给模型，不参与压缩）
   * - undefined：system 消息
   */
  kind?: 'resume-context' | 'user-question' | 'assistant-answer' | 'history-summary' | 'compress-notice'
  /** 这轮注入了哪些简历（仅 resume-context 消息携带） */
  attachedResumeIds?: string[]
  /** 当轮附带的文件/图片附件（仅 user-question 携带，随提问一起发送） */
  attachments?: ConsultAttachment[]
  /** 消息时间戳（ms），用于持久化排序 */
  timestamp: number
}

/** 咨询附件：图片走多模态 image_url，文本注入到消息文本 */
export interface ConsultAttachment {
  /** 文件名 */
  name: string
  /** 图片：Base64 data URL；文本文件：提取的纯文本 */
  dataUrl: string
  /** 附件类型：图片走多模态 image_url，文本注入到消息文本 */
  kind: 'image' | 'text'
}

/** 咨询会话，全局共享，最多保留最近 10 个 */
export interface ConsultSession {
  id: string
  /** 会话标题，取首条 user 提问前 20 字 */
  title: string
  messages: ConsultMessage[]
  /** 被压缩归档的原始消息副本（压缩时从 messages 移出的 user-question/assistant-answer 段） */
  archivedMessages?: ConsultMessage[]
  createdAt: number
  updatedAt: number
  /**
   * 是否已从标签栏关闭（软删除）。
   * - true：不在标签栏显示，但仍在历史会话列表里，可点击恢复
   * - false / undefined：正常显示在标签栏
   * 关闭空会话（无对话）时直接真删除，不置此标记
   */
  closed?: boolean
}

/** 全局最多保留的会话数，超出删除最旧会话 */
export const MAX_CONSULT_SESSIONS = 10
