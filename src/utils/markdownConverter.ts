/**
 * HTML ↔ Markdown 转换工具
 * 用于 AI 文本处理流程中的格式保留
 *
 * - htmlToMarkdown：将编辑器 HTML 转为 Markdown 发送给 AI
 * - markdownToHtml：将 AI 返回的 Markdown 转为 HTML 供编辑器使用
 *
 * 特殊格式映射（Markdown 无原生语法）：
 * - <u> 下划线  → __text__
 * - <mark> 高亮 → ==text==
 */

import TurndownService from 'turndown'
import { Marked } from 'marked'

// ========== HTML → Markdown ==========

const turndownService = new TurndownService({
  headingStyle: 'atx',
  bulletListMarker: '-',
  emDelimiter: '*',
  strongDelimiter: '**',
  codeBlockStyle: 'fenced',
})

// 下划线：<u> → __text__（Markdown 无原生下划线语法）
turndownService.addRule('underline', {
  filter: 'u',
  replacement: (content) => `__${content}__`,
})

// 高亮：<mark> → ==text==（Markdown 无原生高亮语法）
turndownService.addRule('highlight', {
  filter: 'mark',
  replacement: (content) => `==${content}==`,
})

// 删除线：<s>/<del> → ~~text~~（<strike> 非标准 HTML5，忽略）
turndownService.addRule('strikethrough', {
  filter: ['s', 'del'],
  replacement: (content) => `~~${content}~~`,
})

// 待办清单：<ul data-type="taskList"><li data-checked> → - [ ] / - [x]
// Tiptap TaskList 输出此结构，转 markdown 给 AI 时需保留勾选状态
turndownService.addRule('taskList', {
  filter: (node) =>
    node.nodeName === 'UL' && (node as HTMLElement).getAttribute('data-type') === 'taskList',
  replacement: (_content, node) => {
    const items = Array.from(node.querySelectorAll(':scope > li'))
    return items.map(li => {
      const checked = (li as HTMLElement).getAttribute('data-checked') === 'true'
      const text = (li as HTMLElement).textContent?.trim() || ''
      return `- [${checked ? 'x' : ' '}] ${text}`
    }).join('\n')
  },
})

/** 将 HTML 转为 Markdown（供 AI 处理） */
export function htmlToMarkdown(html: string): string {
  if (!html) return ''
  const md = turndownService.turndown(html)
  // 清理多余空行
  return md.replace(/\n{3,}/g, '\n\n').trim()
}

// ========== Markdown → HTML ==========

const markedInstance = new Marked({
  gfm: true,
  breaks: true, // 单个换行也转为 <br>
})

// 预处理：将自定义 Markdown 语法转为标准 HTML 标签
// __text__ → <u>text</u>
// ==text== → <mark>text</mark>
// ~~text~~ → <s>text</s>
// - [ ] / - [x] → <ul data-type="taskList"><li data-checked>（连续行合并为一个 ul）
function preprocessMarkdown(md: string): string {
  return md
    .replace(/__(.+?)__/g, '<u>$1</u>')
    .replace(/==(.+?)==/g, '<mark>$1</mark>')
    .replace(/~~(.+?)~~/g, '<s>$1</s>')
    // 待办清单：把连续的 - [ ] / - [x] 行合并为 Tiptap task list HTML
    // marked 不认此语法会当普通 list，必须在 marked 之前预转
    .replace(/(?:^|\n)((?:- \[[ x]\] .*(?:\n|$))+)/g, (block) => {
      const lines = block.trim().split('\n')
      const items = lines.map(line => {
        const m = line.match(/^- \[([ x])\] (.*)$/)
        if (!m) return ''
        const checked = m[1] === 'x'
        // ponytail: li 文本先经 marked 行内解析（**粗体**/*斜体*/[链接] 等），
        // 否则 marked 把整个 <ul> 当 HTML 块透传不解析内部，星号会变字面量
        const text = markedInstance.parseInline(m[2])
        return `<li data-type="taskItem" data-checked="${checked}">${text}</li>`
      }).filter(Boolean)
      return `\n<ul data-type="taskList">${items.join('')}</ul>\n`
    })
}

// 后处理：将 marked 输出中 TipTap 不支持的标签清理掉
// 以及确保列表、段落格式与 TipTap 一致
function postprocessHtml(html: string): string {
  // 移除 <code>（TipTap 编辑器不支持 code）
  let result = html.replace(/<code>(.*?)<\/code>/g, '$1')
  // 移除 <pre> 包裹
  result = result.replace(/<pre[^>]*>(.*?)<\/pre>/g, '$1')
  // 移除 <blockquote>
  result = result.replace(/<blockquote[^>]*>(.*?)<\/blockquote>/g, '<p>$1</p>')
  // 移除 heading 标签（简历编辑器不支持标题）
  result = result.replace(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/g, '<p><strong>$1</strong></p>')
  return result
}

/** 将 Markdown 转为 HTML（供编辑器使用） */
export function markdownToHtml(md: string): string {
  if (!md) return ''
  // 先处理自定义语法
  const preprocessed = preprocessMarkdown(md)
  // marked 解析
  const html = markedInstance.parse(preprocessed)
  // 后处理清理
  const result = postprocessHtml(typeof html === 'string' ? html : '')
  // 清理多余空行和空段落
  return result.replace(/\n{2,}/g, '\n').trim()
}