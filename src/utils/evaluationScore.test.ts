import { describe, it, expect } from 'vitest'
import {
  getScoreColor,
  getScoreLabel,
  formatDateTime,
} from '@/utils/evaluationScore'

describe('getScoreColor', () => {
  it('returns green for score >= 80', () => {
    expect(getScoreColor(80)).toBe('#34d399')
    expect(getScoreColor(90)).toBe('#34d399')
    expect(getScoreColor(100)).toBe('#34d399')
  })

  it('returns yellow for 60 <= score < 80', () => {
    expect(getScoreColor(60)).toBe('#fbbf24')
    expect(getScoreColor(70)).toBe('#fbbf24')
    expect(getScoreColor(79.9)).toBe('#fbbf24')
  })

  it('returns red for score < 60', () => {
    expect(getScoreColor(59.9)).toBe('#f87171')
    expect(getScoreColor(0)).toBe('#f87171')
    expect(getScoreColor(59)).toBe('#f87171')
  })

  it('returns transparent for null', () => {
    expect(getScoreColor(null)).toBe('transparent')
  })

  it('handles boundary value 80', () => {
    expect(getScoreColor(80)).toBe('#34d399')
  })

  it('handles boundary value 60', () => {
    expect(getScoreColor(60)).toBe('#fbbf24')
  })
})

describe('getScoreLabel', () => {
  it('returns "优秀" for score >= 80', () => {
    expect(getScoreLabel(80)).toBe('优秀')
    expect(getScoreLabel(95)).toBe('优秀')
  })

  it('returns "良好" for 60 <= score < 80', () => {
    expect(getScoreLabel(60)).toBe('良好')
    expect(getScoreLabel(79.9)).toBe('良好')
  })

  it('returns "待改进" for score < 60', () => {
    expect(getScoreLabel(59.9)).toBe('待改进')
    expect(getScoreLabel(0)).toBe('待改进')
  })

  it('returns empty string for null', () => {
    expect(getScoreLabel(null)).toBe('')
  })
})

describe('formatDateTime', () => {
  it('returns formatted date for valid ISO string', () => {
    // 2023-06-15T14:30:00Z in UTC
    const result = formatDateTime('2023-06-15T14:30:00Z')
    // Format should be YYYY-MM-DD HH:mm
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/)
  })

  it('returns empty string for empty input', () => {
    expect(formatDateTime('')).toBe('')
  })

  it('pads month/day/hour/minute with leading zeros', () => {
    // 2023-01-05T09:08:00Z
    const result = formatDateTime('2023-01-05T09:08:00Z')
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/)
  })

  it('does not throw for invalid date input', () => {
    // The implementation uses try/catch; invalid date should return '' gracefully
    const result = formatDateTime('not-a-date')
    expect(typeof result).toBe('string')
  })
})
