import DOMPurify from 'isomorphic-dompurify'

const ALLOWED_TAGS = ['b', 'strong', 'i', 'em', 's', 'strike', 'ul', 'ol', 'li', 'p', 'br']
const ALLOWED_ATTR: string[] = []

export function sanitizeHtml(html: string): string {
  if (!html) return ''
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
  })
}