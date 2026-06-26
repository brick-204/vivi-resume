/**
 * 文本差异计算工具
 * 用于 AI 结果的 Diff 视图，对比原文和修改后的文本
 */

import { diffChars, diffLines, diffWords } from 'diff'

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

// ==================== 行级 Side-by-Side Diff ====================

/** 行内字符级 diff 片段 */
export interface CharDiffSegment {
  type: 'equal' | 'added' | 'removed'
  value: string
}

/** Side-by-side diff 中的一行 */
export interface SideBySideLine {
  type: 'equal' | 'added' | 'removed' | 'modified'
  /** 左侧行号（1-based），纯 added 行无此值 */
  oldLineNum?: number
  /** 右侧行号（1-based），纯 removed 行无此值 */
  newLineNum?: number
  /** 左侧内容，纯 added 行无此值 */
  oldContent?: string
  /** 右侧内容，纯 removed 行无此值 */
  newContent?: string
  /** modified 行左侧字符级 diff（仅 removed + equal 片段） */
  oldCharDiffs?: CharDiffSegment[]
  /** modified 行右侧字符级 diff（仅 added + equal 片段） */
  newCharDiffs?: CharDiffSegment[]
}

/**
 * 计算行级 side-by-side diff
 * 1. diffLines 做行级 diff（oneChangePerToken 确保每行独立）
 * 2. 连续 removed + added 行配对为 modified，用 diffWords 做行内高亮
 * 3. 未配对的 removed/added 保持原类型
 */
export function computeSideBySideDiff(
  original: string,
  modified: string,
): SideBySideLine[] {
  const lineChanges = diffLines(original, modified, { oneChangePerToken: true })
  const result: SideBySideLine[] = []
  let oldLine = 1
  let newLine = 1

  let i = 0
  while (i < lineChanges.length) {
    const change = lineChanges[i]

    if (!change.added && !change.removed) {
      // 相同行
      const lines = change.value.replace(/\n$/, '').split('\n')
      for (const line of lines) {
        result.push({
          type: 'equal',
          oldLineNum: oldLine++,
          newLineNum: newLine++,
          oldContent: line,
          newContent: line,
        })
      }
      i++
    } else {
      // 收集连续的 removed 和 added 行
      const removedLines: string[] = []
      const addedLines: string[] = []

      while (i < lineChanges.length && lineChanges[i].removed) {
        const lines = lineChanges[i].value.replace(/\n$/, '').split('\n')
        removedLines.push(...lines)
        i++
      }
      while (i < lineChanges.length && lineChanges[i].added) {
        const lines = lineChanges[i].value.replace(/\n$/, '').split('\n')
        addedLines.push(...lines)
        i++
      }

      // 配对 removed + added 为 modified
      const pairCount = Math.min(removedLines.length, addedLines.length)

      for (let p = 0; p < pairCount; p++) {
        const oldC = removedLines[p]
        const newC = addedLines[p]
        const charDiffs = diffWords(oldC, newC).map(part => ({
          type: part.added ? 'added' : part.removed ? 'removed' : 'equal',
          value: part.value,
        })) as CharDiffSegment[]
        result.push({
          type: 'modified',
          oldLineNum: oldLine++,
          newLineNum: newLine++,
          oldContent: oldC,
          newContent: newC,
          oldCharDiffs: charDiffs.filter(d => d.type !== 'added'),
          newCharDiffs: charDiffs.filter(d => d.type !== 'removed'),
        })
      }

      // 未配对的 removed 行
      for (let p = pairCount; p < removedLines.length; p++) {
        result.push({
          type: 'removed',
          oldLineNum: oldLine++,
          oldContent: removedLines[p],
        })
      }

      // 未配对的 added 行
      for (let p = pairCount; p < addedLines.length; p++) {
        result.push({
          type: 'added',
          newLineNum: newLine++,
          newContent: addedLines[p],
        })
      }
    }
  }

  return result
}
