import DOMPurify from 'isomorphic-dompurify'

const ALLOWED_TAGS = [
  'b', 'strong', 'i', 'em', 's', 'strike', 'u',
  'ul', 'ol', 'li', 'p', 'br', 'a', 'mark', 'span',
]
const ALLOWED_ATTR = ['href', 'target', 'rel', 'style', 'class', 'data-color']

export function sanitizeHtml(html: string): string {
  if (!html) return ''
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
  })
}