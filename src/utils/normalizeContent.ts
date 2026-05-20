/**
 * Converts plain text (with \n newlines) to HTML paragraphs.
 * If the value already contains HTML tags, returns as-is.
 * Handles backward compatibility for data created before the rich text editor.
 */

const HTML_TAG_RE = /<(p|b|strong|i|em|s|strike|ul|ol|li|br)\b[^>]*>/i

const escapeHtml = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export function normalizeContent(value: string | undefined): string {
  if (!value) return ''
  if (HTML_TAG_RE.test(value)) return value
  return value
    .split('\n')
    .map(line => `<p>${escapeHtml(line)}</p>`)
    .join('')
}
