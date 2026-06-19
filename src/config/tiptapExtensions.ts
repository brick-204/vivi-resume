/**
 * Tiptap 编辑器扩展共享配置
 * RichTextEditor.vue 和 fullResumeOptimizer.ts 共用，
 * 确保两者产出的 HTML 格式完全一致。
 */

import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import Link from '@tiptap/extension-link'
import { TextStyle } from '@tiptap/extension-text-style'
import Color from '@tiptap/extension-color'
import Highlight from '@tiptap/extension-highlight'

/**
 * 核心 Tiptap 扩展列表（不含 Placeholder 等仅 UI 相关的扩展）
 * 用于 HTML 二次规范化，确保与编辑器 getHTML() 输出一致
 */
export const CORE_TIPTAP_EXTENSIONS = [
  // StarterKit 内置了 link 和 underline 扩展，但功能较基础，
  // 因此先在 configure 中禁用它们，再由下方的独立扩展替换
  StarterKit.configure({
    heading: false,
    code: false,
    codeBlock: false,
    blockquote: false,
    horizontalRule: false,
    link: false,       // 禁用 StarterKit 内置 Link，改用下方独立 Link 扩展
    underline: false,  // 禁用 StarterKit 内置 Underline，改用下方独立 Underline 扩展
  }),
  Underline,
  TextAlign.configure({ types: ['paragraph'] }),
  Link.configure({
    openOnClick: false,
    HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' },
  }),
  TextStyle,
  Color,
  Highlight.configure({ multicolor: true }),
]
