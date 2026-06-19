/**
 * Converts plain text (with \n newlines) to HTML paragraphs.
 * If the value already contains HTML tags, normalizes to Tiptap-compatible format:
 * - Splits <br> into separate <p> paragraphs (Tiptap uses <p> per line, not <br>)
 * - Unwraps <p> inside <li> (marked generates <li><p>...</p></li> for loose lists,
 *   but Tiptap outputs <li>text</li> without inner <p>)
 * - Ensures empty paragraphs display correctly in resume output
 */

const HTML_TAG_RE = /<(p|b|strong|i|em|s|strike|ul|ol|li|br)\b[^>]*>/i

const escapeHtml = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export function normalizeContent(value: string | undefined): string {
  if (!value) return ''
  if (!HTML_TAG_RE.test(value)) {
    // 纯文本：按换行拆分为 <p> 段落
    return value
      .split('\n')
      .map(line => `<p>${escapeHtml(line) || '<br>'}</p>`)
      .join('')
  }

  // 已有 HTML 标签：归一化为 Tiptap 格式
  let html = value

  // 1. 将 <li><p>...</p></li> 简化为 <li>...</li>
  //    marked 对松散列表（列表项间有空行）会生成 <li><p>...</p></li>
  //    Tiptap 不会在 <li> 内嵌套 <p>，需要去掉
  html = html.replace(/<li>\s*<p>([\s\S]*?)<\/p>\s*<\/li>/g, '<li>$1</li>')

  // 2. 将 <p> 内的 <br> 拆分为独立的 <p> 段落
  //    marked 的 breaks:true 会把单换行转为 <br>
  //    Tiptap 中用户按 Enter 创建新段落 <p>，而非 <br>
  //    <p>A<br>B</p> → <p>A</p><p>B</p>
  html = html.replace(/<p>([\s\S]*?)<\/p>/g, (_, content) => {
    // 如果段落内没有 <br>，保持原样
    if (!content.includes('<br>')) {
      return `<p>${content}</p>`
    }
    // 按 <br> 拆分为多个段落
    const parts = content.split('<br>')
    return parts
      .map((part: string) => `<p>${part || '<br>'}</p>`)
      .join('')
  })

  // 3. 确保空 <p></p> 在渲染时有高度
  html = html.replace(/<p><\/p>/g, '<p><br></p>')

  return html
}
