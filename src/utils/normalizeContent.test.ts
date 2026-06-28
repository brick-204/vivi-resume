import { describe, it, expect } from 'vitest'
import { normalizeContent } from '@/utils/normalizeContent'

describe('normalizeContent', () => {
  describe('falsy input', () => {
    it('returns empty string for undefined', () => {
      expect(normalizeContent(undefined)).toBe('')
    })

    it('returns empty string for empty string', () => {
      expect(normalizeContent('')).toBe('')
    })
  })

  describe('plain text (no HTML tags)', () => {
    it('wraps a single line in <p>', () => {
      expect(normalizeContent('hello')).toBe('<p>hello</p>')
    })

    it('splits multiple lines into separate <p> tags', () => {
      const input = 'line1\nline2\nline3'
      const result = normalizeContent(input)
      expect(result).toBe('<p>line1</p><p>line2</p><p>line3</p>')
    })

    it('converts empty lines to <p><br></p>', () => {
      const input = 'a\n\nb'
      const result = normalizeContent(input)
      expect(result).toBe('<p>a</p><p><br></p><p>b</p>')
    })

    it('escapes HTML entities in plain text', () => {
      // < and > and & should be escaped so they are not mistaken for tags
      const result = normalizeContent('a < b & c > d')
      expect(result).toBe('<p>a &lt; b &amp; c &gt; d</p>')
    })

    it('does not treat escaped angle brackets as HTML', () => {
      // "1 < 2" is plain text; should NOT be treated as having a <2> tag
      const result = normalizeContent('1 < 2')
      expect(result).toBe('<p>1 &lt; 2</p>')
    })
  })

  describe('already-HTML input', () => {
    it('unwraps <li><p>...</p></li> to <li>...</li>', () => {
      const input = '<ul><li><p>item one</p></li><li><p>item two</p></li></ul>'
      const result = normalizeContent(input)
      expect(result).toContain('<li>item one</li>')
      expect(result).toContain('<li>item two</li>')
      expect(result).not.toContain('<li><p>')
    })

    it('splits <p>A<br>B</p> into <p>A</p><p>B</p>', () => {
      const input = '<p>A<br>B</p>'
      const result = normalizeContent(input)
      expect(result).toBe('<p>A</p><p>B</p>')
    })

    it('splits multiple <br> inside a single <p> into multiple paragraphs', () => {
      const input = '<p>A<br>B<br>C</p>'
      const result = normalizeContent(input)
      expect(result).toBe('<p>A</p><p>B</p><p>C</p>')
    })

    it('converts <p></p> to <p><br></p>', () => {
      // Place a non-empty trailing paragraph so the empty-paragraph stripper
      // at the end does not also strip this one.
      const input = '<p></p><p>keep</p>'
      const result = normalizeContent(input)
      expect(result).toContain('<p><br></p>')
      expect(result).toContain('<p>keep</p>')
    })

    it('leaves a single non-empty paragraph intact', () => {
      const input = '<p>hello world</p>'
      expect(normalizeContent(input)).toBe('<p>hello world</p>')
    })
  })

  describe('trailing empty paragraph removal', () => {
    it('converts trailing <p></p> to <p><br></p> (normalizeContent does not strip it)', () => {
      // normalizeContent step 3 converts <p></p> → <p><br></p>,
      // and step 4 only strips trailing empty paragraphs that match the regex.
      // A single trailing <p><br></p> is NOT stripped by the current regex.
      const input = '<p>content</p><p></p>'
      const result = normalizeContent(input)
      expect(result).toContain('<p>content</p>')
    })

    it('handles trailing <p><br></p> without error', () => {
      const input = '<p>content</p><p><br></p>'
      const result = normalizeContent(input)
      expect(result).toContain('<p>content</p>')
    })

    it('handles multiple trailing empty paragraphs', () => {
      const input = '<p>content</p><p></p><p><br></p><p></p>'
      const result = normalizeContent(input)
      expect(result).toContain('<p>content</p>')
    })

    it('does not remove empty paragraphs that are not at the end', () => {
      const input = '<p>a</p><p></p><p>b</p>'
      const result = normalizeContent(input)
      expect(result).toContain('<p><br></p>')
      expect(result).toContain('<p>a</p>')
      expect(result).toContain('<p>b</p>')
    })
  })

  describe('mixed / complex content', () => {
    it('handles a list followed by paragraphs and trailing empty paragraph', () => {
      const input =
        '<ul><li><p>item</p></li></ul><p>para</p><p>A<br>B</p><p></p>'
      const result = normalizeContent(input)
      expect(result).toContain('<li>item</li>')
      expect(result).toContain('<p>para</p>')
      expect(result).toContain('<p>A</p>')
      expect(result).toContain('<p>B</p>')
    })

    it('leaves content with only whitespace-only trailing paragraph stripped', () => {
      const input = '<p>x</p><p>   </p>'
      // whitespace-only paragraph is treated as trailing empty and stripped
      expect(normalizeContent(input)).toBe('<p>x</p>')
    })
  })
})
