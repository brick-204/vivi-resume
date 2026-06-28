import { describe, it, expect } from 'vitest'
import { stripStyleOverrides, STYLE_OVERRIDE_KEYS } from '@/utils/resumeStyle'

// Minimal Resume-like object for testing
function makeResume(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'test-id',
    title: 'Test Resume',
    templateId: 'sidebar',
    basicInfo: { name: 'Test' },
    workExperience: [],
    education: [],
    projects: [],
    skills: [],
    selfEvaluation: '',
    customTexts: [],
    customCards: [],
    sectionOrder: [],
    sectionTitles: {},
    hiddenSections: [],
    ...overrides,
  }
}

describe('STYLE_OVERRIDE_KEYS', () => {
  it('contains exactly 13 style override keys', () => {
    expect(STYLE_OVERRIDE_KEYS.size).toBe(13)
  })

  it('includes all expected keys', () => {
    const expected = [
      'themeAccentColor', 'whiteHeaderText', 'iconFollowAccent',
      'headerTextColor', 'headerIconColor', 'fontFamily', 'lineHeight',
      'bodyFontSize', 'sectionTitleFontSize', 'entryTitleFontSize',
      'pagePadding', 'moduleSpacing', 'paragraphSpacing',
    ]
    for (const key of expected) {
      expect(STYLE_OVERRIDE_KEYS.has(key)).toBe(true)
    }
  })
})

describe('stripStyleOverrides', () => {
  it('returns the same object when no style overrides are present', () => {
    const resume = makeResume()
    const result = stripStyleOverrides(resume as any)
    // All content keys should be present
    expect(result.id).toBe('test-id')
    expect(result.title).toBe('Test Resume')
    expect(result.basicInfo).toEqual({ name: 'Test' })
    // No keys should have been removed
    expect(Object.keys(result).length).toBe(Object.keys(resume).length)
  })

  it('removes all 13 style override keys when present', () => {
    const resume = makeResume({
      themeAccentColor: '#3b82f6',
      whiteHeaderText: true,
      iconFollowAccent: false,
      headerTextColor: 'dark',
      headerIconColor: 'accent',
      fontFamily: 'Noto Sans SC',
      lineHeight: 1.6,
      bodyFontSize: 14,
      sectionTitleFontSize: 16,
      entryTitleFontSize: 15,
      pagePadding: 20,
      moduleSpacing: 8,
      paragraphSpacing: 6,
    })
    const result = stripStyleOverrides(resume as any)

    // All style keys should be removed
    for (const key of STYLE_OVERRIDE_KEYS) {
      expect(result).not.toHaveProperty(key)
    }

    // Content keys should remain
    expect(result.id).toBe('test-id')
    expect(result.title).toBe('Test Resume')
    expect(result.basicInfo).toEqual({ name: 'Test' })
  })

  it('removes only style keys, keeping other keys intact', () => {
    const resume = makeResume({
      themeAccentColor: '#3b82f6',
      fontFamily: 'Noto Sans SC',
    })
    const result = stripStyleOverrides(resume as any)

    expect(result).not.toHaveProperty('themeAccentColor')
    expect(result).not.toHaveProperty('fontFamily')
    expect(result.id).toBe('test-id')
    expect(result.title).toBe('Test Resume')
  })

  it('handles mixed content with some style overrides', () => {
    const resume = makeResume({
      themeAccentColor: '#3b82f6',
      lineHeight: 1.5,
      bodyFontSize: 14,
    })
    const result = stripStyleOverrides(resume as any)

    expect(result).not.toHaveProperty('themeAccentColor')
    expect(result).not.toHaveProperty('lineHeight')
    expect(result).not.toHaveProperty('bodyFontSize')
    // Non-style keys remain
    expect(result.id).toBe('test-id')
    expect(result.templateId).toBe('sidebar')
  })
})
