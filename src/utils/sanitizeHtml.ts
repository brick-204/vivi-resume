import DOMPurify from 'isomorphic-dompurify'

const ALLOWED_TAGS = [
  'b', 'strong', 'i', 'em', 's', 'strike', 'u',
  'ul', 'ol', 'li', 'p', 'br', 'a', 'mark', 'span',
]
// data-type/data-checked: Tiptap TaskList/TaskItem 约定属性，值由代码生成（taskList/taskItem/true/false），无 XSS 风险
const ALLOWED_ATTR = ['href', 'target', 'rel', 'style', 'class', 'data-color', 'data-type', 'data-checked']

export function sanitizeHtml(html: string): string {
  if (!html) return ''
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
  })
}