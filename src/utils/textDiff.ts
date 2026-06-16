/**
 * 文本差异计算工具
 * 用于 AI 结果的 Diff 视图，对比原文和修改后的文本
 */

import { diffChars } from 'diff'

export interface DiffSegment {
  type: 'equal' | 'added' | 'removed'
  value: string
}

/** 计算字符级差异 */
export function computeDiff(original: string, modified: string): DiffSegment[] {
  return diffChars(original, modified).map(part => ({
    type: part.added ? 'added' : part.removed ? 'removed' : 'equal',
    value: part.value,
  }))
}
