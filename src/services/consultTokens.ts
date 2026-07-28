/**
 * 咨询会话历史压缩辅助：token 估算 + 阈值判断 + 分段划分 + 历史格式化
 *
 * 压缩策略（方案 A：摘要注入前置消息）：
 * 当历史 user-question/assistant-answer 消息数 >= 6 且估算 token > 6000 时，
 * 取最旧的连续可压缩段调用一次 AI 压缩为 history-summary，替换原段位置。
 * resume-context / history-summary / compress-notice 作为锚点不参与压缩。
 */

import type { ConsultMessage } from '@/types/consult'

/** 估算阈值（字符近似），约 8000 字符 */
export const COMPRESS_THRESHOLD = 6000
/** 触发压缩前最少需要的可压缩消息数（user-question + assistant-answer） */
export const MIN_MESSAGES_BEFORE_COMPRESS = 6

/** 单条消息 token 估算：Σ ceil(content.length * 0.75) + 每条 4 */
export const estimateTokens = (messages: { content: string }[]): number =>
  messages.reduce((sum, m) => sum + Math.ceil(m.content.length * 0.75) + 4, 0)

/**
 * 判断是否应触发压缩：
 * 只统计 user-question/assistant-answer 消息，数量 < 6 直接 false，token 超阈值才 true
 */
export const shouldCompress = (messages: ConsultMessage[]): boolean => {
  const compressible = messages.filter(
    m => m.kind === 'user-question' || m.kind === 'assistant-answer',
  )
  if (compressible.length < MIN_MESSAGES_BEFORE_COMPRESS) return false
  return estimateTokens(compressible) > COMPRESS_THRESHOLD
}

/**
 * 划分消息段用于压缩。
 *
 * 规则：
 * - systemMsg = messages[0]（role=system）
 * - 跳过 resume-context / history-summary / compress-notice（锚点，保留原位）
 * - toCompress = 最旧的连续 user-question/assistant-answer 段（遇到锚点即终止该段）
 *   若已有旧 history-summary，新压缩要把"旧 summary + 新可压缩段"一起喂给压缩 prompt
 * - toRetain = 其余消息（含最近一段 + 所有锚点，按原顺序）
 *
 * 返回的 toCompress 不含 systemMsg；toRetain 已剔除 systemMsg。
 * 旧 history-summary（若存在）通过 oldSummary 字段单独返回，调用方将其内容拼入压缩输入，
 * 并在 apply 阶段从 toRetain 中移除（由新 summary 替换）。
 */
export interface PartitionResult {
  systemMsg: ConsultMessage
  /** 将被压缩的原始消息（user-question/assistant-answer） */
  toCompress: ConsultMessage[]
  /** 压缩后保留在 messages 里的其余消息（不含 systemMsg，含旧 history-summary） */
  toRetain: ConsultMessage[]
  /** 已存在的旧 history-summary 消息（在 toRetain 中），压缩时一并喂给 AI，apply 时被新 summary 替换 */
  oldSummary?: ConsultMessage
}

export const partitionCompressible = (messages: ConsultMessage[]): PartitionResult => {
  const systemMsg = messages[0]
  const rest = messages.slice(1)

  // 找最旧的连续可压缩段：从首个 user-question/assistant-answer 开始，遇到锚点即终止
  let startIdx = -1
  for (let i = 0; i < rest.length; i++) {
    const k = rest[i].kind
    if (k === 'user-question' || k === 'assistant-answer') {
      startIdx = i
      break
    }
  }

  // 无可压缩段：全部保留
  if (startIdx === -1) {
    return { systemMsg, toCompress: [], toRetain: rest }
  }

  let endIdx = startIdx
  while (
    endIdx < rest.length &&
    (rest[endIdx].kind === 'user-question' || rest[endIdx].kind === 'assistant-answer')
  ) {
    endIdx++
  }

  const toCompress = rest.slice(startIdx, endIdx)
  const before = rest.slice(0, startIdx)
  const after = rest.slice(endIdx)
  const toRetain = [...before, ...after]

  // 在 toRetain 中查找旧 history-summary（取第一个，正常最多一个）
  const oldSummary = toRetain.find(m => m.kind === 'history-summary')

  return { systemMsg, toCompress, toRetain, oldSummary }
}

/**
 * 把待压缩消息格式化为 prompt 输入文本。
 * - 旧 history-summary 前缀加"【之前的历史摘要】"
 * - user-question 显示为"用户：xxx"
 * - assistant-answer 显示为"助手：xxx"
 */
export const formatHistoryForCompress = (
  toCompress: ConsultMessage[],
  oldSummary?: ConsultMessage,
): string => {
  const parts: string[] = []
  if (oldSummary) {
    parts.push(`【之前的历史摘要】\n${oldSummary.content}`)
  }
  for (const m of toCompress) {
    if (m.kind === 'user-question') {
      parts.push(`用户：${m.content}`)
    } else if (m.kind === 'assistant-answer') {
      parts.push(`助手：${m.content}`)
    }
  }
  return parts.join('\n\n')
}
