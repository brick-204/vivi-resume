import { describe, it, expect } from 'vitest'
import {
  parseAccentColor,
  deriveSectionTitleColor,
  isDarkEnoughForWhiteText,
  deriveTagBg,
} from '@/utils/colorUtils'

describe('parseAccentColor', () => {
  describe('hex parsing', () => {
    it('parses 6-digit hex #RRGGBB', () => {
      const result = parseAccentColor('#ff0000')
      expect(result).toEqual({ r: 255, g: 0, b: 0, a: 1 })
    })

    it('parses #000000', () => {
      const result = parseAccentColor('#000000')
      expect(result).toEqual({ r: 0, g: 0, b: 0, a: 1 })
    })

    it('parses #ffffff', () => {
      const result = parseAccentColor('#ffffff')
      expect(result).toEqual({ r: 255, g: 255, b: 255, a: 1 })
    })

    it('parses hex without leading #', () => {
      // hexToRgb strips the #, so "ff0000" should also work
      const result = parseAccentColor('ff0000')
      expect(result).toEqual({ r: 255, g: 0, b: 0, a: 1 })
    })
  })

  describe('rgba parsing', () => {
    it('parses rgb(r, g, b)', () => {
      const result = parseAccentColor('rgb(100, 200, 50)')
      expect(result).toEqual({ r: 100, g: 200, b: 50, a: 1 })
    })

    it('parses rgba(r, g, b, a)', () => {
      const result = parseAccentColor('rgba(100, 200, 50, 0.5)')
      expect(result).toEqual({ r: 100, g: 200, b: 50, a: 0.5 })
    })
  })

  describe('invalid input', () => {
    it('returns null for empty string', () => {
      expect(parseAccentColor('')).toBeNull()
    })

    it('returns null for 3-digit hex', () => {
      // Only 6-digit hex is supported
      expect(parseAccentColor('#f00')).toBeNull()
    })

    it('returns null for random string', () => {
      expect(parseAccentColor('not-a-color')).toBeNull()
    })

    it('returns null for incomplete hex', () => {
      expect(parseAccentColor('#ff')).toBeNull()
    })
  })
})

describe('isDarkEnoughForWhiteText', () => {
  it('returns true for black (#000000)', () => {
    expect(isDarkEnoughForWhiteText('#000000')).toBe(true)
  })

  it('returns false for white (#ffffff)', () => {
    expect(isDarkEnoughForWhiteText('#ffffff')).toBe(false)
  })

  it('returns false for light colors', () => {
    expect(isDarkEnoughForWhiteText('#f0f0f0')).toBe(false)
  })

  it('returns true for very dark colors', () => {
    expect(isDarkEnoughForWhiteText('#1a1a2e')).toBe(true)
  })

  it('returns false for invalid input', () => {
    expect(isDarkEnoughForWhiteText('')).toBe(false)
    expect(isDarkEnoughForWhiteText('invalid')).toBe(false)
  })
})

describe('deriveSectionTitleColor', () => {
  it('returns a valid rgba string for a valid accent color', () => {
    const result = deriveSectionTitleColor('#3b82f6')
    expect(result).toMatch(/^rgba\(\d+, \d+, \d+, 1\.00\)$/)
  })

  it('returns fallback for invalid input', () => {
    const result = deriveSectionTitleColor('')
    expect(result).toBe('#1a1a2e')
  })

  it('produces a dark color (lightness ~0.20)', () => {
    // The function darkens to lightness 0.20, so the result should be dark
    const result = deriveSectionTitleColor('#3b82f6')
    // Extract rgba values and verify they are relatively low (dark)
    const match = result.match(/rgba\((\d+), (\d+), (\d+),/)
    if (match) {
      const [, r, g, b] = match.map(Number)
      // Lightness 0.20 means the average channel value is around 0.20*255 ≈ 51
      // Allow some tolerance since HSL conversion is not linear
      const avg = (r + g + b) / 3
      expect(avg).toBeLessThan(120)
    }
  })
})

describe('deriveTagBg', () => {
  it('returns a valid rgba string with alpha 0.08', () => {
    const result = deriveTagBg('#3b82f6')
    expect(result).toMatch(/^rgba\(\d+, \d+, \d+, 0\.08\)$/)
  })

  it('returns fallback for invalid input', () => {
    const result = deriveTagBg('')
    expect(result).toBe('rgba(124, 92, 252, 0.08)')
  })

  it('uses the same RGB channels as the accent color', () => {
    const result = deriveTagBg('#ff0000')
    // #ff0000 → r=255, g=0, b=0
    expect(result).toContain('255')
    expect(result).toContain('0, 0')
  })
})
