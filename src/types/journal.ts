/**
 * 「求职手账」tab 的数据模型与工具函数。
 * 与 interview.ts 同风格：类型定义 + 纯函数 + 工厂函数。
 *
 * 两类实体（记事本 / 笔记）共用一个接口，靠 type 区分，省一套 CRUD：
 * - notebook（记事本）：目录容器，不可嵌套（parentId 永远 null），content 为空
 * - note（笔记）：富文本 + 内联 todolist，可在记事本内（parentId=记事本id）或根级（parentId=null）
 */

import { generateId } from '@/types/resume'

export type JournalEntryType = 'notebook' | 'note'

export interface JournalEntry {
  id: string
  type: JournalEntryType
  title: string                  // notebook: 用户填；note: 自动取正文前 20 字（可手改）
  parentId: string | null        // 所属记事本 id；根级为 null。notebook 永远 null（不可嵌套）
  content: string                // note 的富文本 HTML；notebook 为空字符串
  interviewIds: string[]         // 关联的面试（note 专用，notebook 为空数组）
  resumeIds: string[]            // 关联的简历（note 专用，notebook 为空数组）
  // 软删除标记：移入回收站时写入，恢复时置 undefined（与 Interview.deletedAt 同名同义）
  deletedAt?: string
  createdAt: string              // ISO
  updatedAt: string              // ISO
}

/** 工厂：新建一个空记事本 */
export function createEmptyNotebook(title: string): JournalEntry {
  const now = new Date().toISOString()
  return {
    id: generateId(),
    type: 'notebook',
    title: title || '新记事本',
    parentId: null,
    content: '',
    interviewIds: [],
    resumeIds: [],
    createdAt: now,
    updatedAt: now,
  }
}

/** 工厂：新建一条空笔记（parentId 为空则在根级） */
export function createEmptyNote(parentId: string | null = null): JournalEntry {
  const now = new Date().toISOString()
  return {
    id: generateId(),
    type: 'note',
    title: '', // 留空：退出编辑时标题为空则自动取正文第一行前6字，正文也空则不创建
    parentId,
    content: '',
    interviewIds: [],
    resumeIds: [],
    createdAt: now,
    updatedAt: now,
  }
}

/**
 * 从笔记正文提取标题：取纯文本第一行前 6 字（不加省略号）。
 * 用于退出编辑时补全空标题——只在标题为空时调用，标题一旦非空永不自动覆盖。
 * 正文也为空时返回「无标题」。
 */
export function deriveNoteTitle(content: string): string {
  // ponytail: 粗暴去标签取纯文本——标题补全不要求精确，避免引入 DOMParser
  const text = content
    .replace(/<[^>]+>/g, '\n')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .trim()
  if (!text) return '无标题'
  const firstLine = text.split('\n').map(s => s.trim()).find(Boolean) ?? ''
  if (!firstLine) return '无标题'
  return firstLine.length > 6 ? firstLine.slice(0, 6) : firstLine
}
