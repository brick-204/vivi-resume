/**
 * Converts plain text (with \n newlines) to HTML paragraphs.
 * If the value already contains HTML tags, returns as-is.
 * Handles backward compatibility for data created before the rich text editor.
 * Post-processes HTML to ensure empty paragraphs display correctly in resume output.
 */

const HTML_TAG_RE = /<(p|b|strong|i|em|s|strike|ul|ol|li|br)\b[^>]*>/i

const escapeHtml = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export function normalizeContent(value: string | undefined): string {
  if (!value) return ''
  if (HTML_TAG_RE.test(value)) {
    // 已有 HTML 标签：确保空 <p></p> 在渲染时有高度
    return value.replace(/<p><\/p>/g, '<p><br></p>')
  }
  return value
    .split('\n')
    .map(line => `<p>${escapeHtml(line) || '<br>'}</p>`)
    .join('')
}
