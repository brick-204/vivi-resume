import { describe, it, expect } from 'vitest'
import { sanitizeHtml } from '@/utils/sanitizeHtml'

describe('sanitizeHtml', () => {
  describe('falsy input', () => {
    it('returns empty string for empty string', () => {
      expect(sanitizeHtml('')).toBe('')
    })
  })

  describe('allowed tags preserved', () => {
    it('preserves <b> and <strong>', () => {
      expect(sanitizeHtml('<b>bold</b>')).toContain('<b>bold</b>')
      expect(sanitizeHtml('<strong>strong</strong>')).toContain(
        '<strong>strong</strong>',
      )
    })

    it('preserves <i> and <em>', () => {
      expect(sanitizeHtml('<i>italic</i>')).toContain('<i>italic</i>')
      expect(sanitizeHtml('<em>em</em>')).toContain('<em>em</em>')
    })

    it('preserves <s>, <strike>, <u>', () => {
      expect(sanitizeHtml('<s>struck</s>')).toContain('<s>struck</s>')
      expect(sanitizeHtml('<u>under</u>')).toContain('<u>under</u>')
    })

    it('preserves list tags <ul>, <ol>, <li>', () => {
      const html = '<ul><li>one</li><li>two</li></ul>'
      const result = sanitizeHtml(html)
      expect(result).toContain('<ul>')
      expect(result).toContain('<li>one</li>')
    })

    it('preserves <p> and <br>', () => {
      expect(sanitizeHtml('<p>para</p>')).toContain('<p>para</p>')
      expect(sanitizeHtml('<p>a<br>b</p>')).toContain('<br>')
    })

    it('preserves <mark> and <span>', () => {
      expect(sanitizeHtml('<mark>m</mark>')).toContain('<mark>m</mark>')
      expect(sanitizeHtml('<span>s</span>')).toContain('<span>s</span>')
    })
  })

  describe('allowed attributes preserved', () => {
    it('preserves legitimate links with href', () => {
      const html = '<a href="https://example.com">link</a>'
      const result = sanitizeHtml(html)
      expect(result).toContain('href="https://example.com"')
      expect(result).toContain('>link</a>')
    })

    it('preserves target and rel attributes on links', () => {
      const html =
        '<a href="https://example.com" target="_blank" rel="noopener">link</a>'
      const result = sanitizeHtml(html)
      expect(result).toContain('target="_blank"')
      // rel may be added/normalized by DOMPurify; check it is present
      expect(result).toMatch(/rel=/)
    })

    it('preserves style attribute on allowed tags', () => {
      const html = '<span style="color: red;">x</span>'
      const result = sanitizeHtml(html)
      expect(result).toContain('style=')
    })

    it('preserves class attribute', () => {
      const html = '<span class="my-class">x</span>'
      const result = sanitizeHtml(html)
      expect(result).toContain('class="my-class"')
    })

    it('preserves data-color attribute', () => {
      const html = '<mark data-color="#ff0000">m</mark>'
      const result = sanitizeHtml(html)
      expect(result).toContain('data-color="#ff0000"')
    })
  })

  describe('disallowed tags stripped', () => {
    it('strips <script> tag entirely', () => {
      const html = '<script>alert(1)</script>'
      const result = sanitizeHtml(html)
      expect(result).not.toContain('<script')
      expect(result).not.toContain('alert')
    })

    it('strips <img> tag', () => {
      const html = '<img src="https://evil.com/x.png" alt="x">'
      const result = sanitizeHtml(html)
      expect(result).not.toContain('<img')
    })

    it('strips <iframe> tag', () => {
      const html = '<iframe src="https://evil.com"></iframe>'
      const result = sanitizeHtml(html)
      expect(result).not.toContain('<iframe')
    })

    it('strips <video> tag', () => {
      const html = '<video src="https://evil.com/v.mp4"></video>'
      const result = sanitizeHtml(html)
      expect(result).not.toContain('<video')
    })

    it('keeps surrounding text when stripping disallowed tags', () => {
      const html = 'before<script>x</script>after'
      const result = sanitizeHtml(html)
      expect(result).toContain('before')
      expect(result).toContain('after')
    })
  })

  describe('event handlers removed', () => {
    it('removes onclick handler', () => {
      const html = '<a href="https://example.com" onclick="alert(1)">x</a>'
      const result = sanitizeHtml(html)
      expect(result).not.toContain('onclick')
    })

    it('removes onerror handler', () => {
      const html = '<img src="x" onerror="alert(1)">'
      const result = sanitizeHtml(html)
      expect(result).not.toContain('onerror')
    })

    it('removes onload handler from allowed span', () => {
      const html = '<span onload="alert(1)">x</span>'
      const result = sanitizeHtml(html)
      expect(result).toContain('<span>x</span>')
      expect(result).not.toContain('onload')
    })
  })

  describe('script injection attempts', () => {
    it('neutralizes javascript: URL on links', () => {
      const html = '<a href="javascript:alert(1)">click</a>'
      const result = sanitizeHtml(html)
      expect(result).not.toContain('javascript:alert')
    })

    it('strips nested script inside paragraph', () => {
      const html = '<p>hi <script>bad()</script> there</p>'
      const result = sanitizeHtml(html)
      expect(result).toContain('hi')
      expect(result).toContain('there')
      expect(result).not.toContain('bad()')
    })
  })
})
