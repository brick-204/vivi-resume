import { describe, it, expect } from 'vitest'
import { computeDiff, computeSideBySideDiff } from '@/utils/textDiff'

describe('computeDiff', () => {
  it('returns all equal segments for identical strings', () => {
    const result = computeDiff('hello world', 'hello world')
    expect(result.every(seg => seg.type === 'equal')).toBe(true)
    // Should reconstruct the original string
    expect(result.map(s => s.value).join('')).toBe('hello world')
  })

  it('returns all added segments when original is empty', () => {
    const result = computeDiff('', 'added text')
    expect(result.every(seg => seg.type === 'added')).toBe(true)
    expect(result.map(s => s.value).join('')).toBe('added text')
  })

  it('returns all removed segments when modified is empty', () => {
    const result = computeDiff('removed text', '')
    expect(result.every(seg => seg.type === 'removed')).toBe(true)
    expect(result.map(s => s.value).join('')).toBe('removed text')
  })

  it('returns empty array for two empty strings', () => {
    const result = computeDiff('', '')
    expect(result).toEqual([])
  })

  it('detects character-level differences', () => {
    const result = computeDiff('abc', 'axc')
    const types = result.map(s => s.type)
    // Should have at least one equal, one removed, and one added segment
    expect(types).toContain('equal')
    expect(types).toContain('removed')
    expect(types).toContain('added')
  })

  it('reconstructs both strings from segments', () => {
    const original = 'the quick brown fox'
    const modified = 'the slow brown cat'
    const result = computeDiff(original, modified)
    // Reconstruct original from equal + removed
    const fromOriginal = result
      .filter(s => s.type === 'equal' || s.type === 'removed')
      .map(s => s.value)
      .join('')
    // Reconstruct modified from equal + added
    const fromModified = result
      .filter(s => s.type === 'equal' || s.type === 'added')
      .map(s => s.value)
      .join('')
    expect(fromOriginal).toBe(original)
    expect(fromModified).toBe(modified)
  })
})

describe('computeSideBySideDiff', () => {
  it('returns equal lines for identical strings', () => {
    const result = computeSideBySideDiff('line1\nline2', 'line1\nline2')
    expect(result.length).toBe(2)
    expect(result[0].type).toBe('equal')
    expect(result[0].oldLineNum).toBe(1)
    expect(result[0].newLineNum).toBe(1)
    expect(result[0].oldContent).toBe('line1')
    expect(result[0].newContent).toBe('line1')
    expect(result[1].type).toBe('equal')
    expect(result[1].oldLineNum).toBe(2)
    expect(result[1].newLineNum).toBe(2)
  })

  it('returns added lines when original is empty', () => {
    const result = computeSideBySideDiff('', 'new line\n')
    expect(result.length).toBe(1)
    expect(result[0].type).toBe('added')
    expect(result[0].newLineNum).toBe(1)
    expect(result[0].newContent).toBe('new line')
    expect(result[0].oldLineNum).toBeUndefined()
  })

  it('returns removed lines when modified is empty', () => {
    const result = computeSideBySideDiff('old line\n', '')
    expect(result.length).toBe(1)
    expect(result[0].type).toBe('removed')
    expect(result[0].oldLineNum).toBe(1)
    expect(result[0].oldContent).toBe('old line')
    expect(result[0].newLineNum).toBeUndefined()
  })

  it('returns empty array for two empty strings', () => {
    const result = computeSideBySideDiff('', '')
    expect(result).toEqual([])
  })

  it('pairs removed+added lines as modified', () => {
    const result = computeSideBySideDiff('old line\n', 'new line\n')
    expect(result.length).toBe(1)
    expect(result[0].type).toBe('modified')
    expect(result[0].oldContent).toBe('old line')
    expect(result[0].newContent).toBe('new line')
    expect(result[0].oldLineNum).toBe(1)
    expect(result[0].newLineNum).toBe(1)
    // modified lines should have char-level diffs
    expect(result[0].oldCharDiffs).toBeDefined()
    expect(result[0].newCharDiffs).toBeDefined()
  })

  it('handles mixed equal, modified, and added lines', () => {
    const original = 'same\nchanged\nextra old\n'
    const modified = 'same\nmodified\nextra old\nnew line\n'
    const result = computeSideBySideDiff(original, modified)

    // Line 1: equal
    const equalLine = result.find(l => l.oldContent === 'same' && l.newContent === 'same')
    expect(equalLine).toBeDefined()
    expect(equalLine!.type).toBe('equal')

    // Line 2: modified (changed → modified)
    const modLine = result.find(l => l.type === 'modified')
    expect(modLine).toBeDefined()
    expect(modLine!.oldContent).toBe('changed')
    expect(modLine!.newContent).toBe('modified')

    // Added line
    const addedLine = result.find(l => l.type === 'added')
    expect(addedLine).toBeDefined()
    expect(addedLine!.newContent).toBe('new line')
  })

  it('assigns correct line numbers', () => {
    const original = 'a\nb\nc\n'
    const modified = 'a\nb2\nc\nd\n'
    const result = computeSideBySideDiff(original, modified)

    // Line 1: equal (old=1, new=1)
    // Line 2: modified (old=2, new=2)
    // Line 3: equal (old=3, new=3)
    // Line 4: added (new=4)
    const equal1 = result[0]
    expect(equal1.oldLineNum).toBe(1)
    expect(equal1.newLineNum).toBe(1)

    const mod = result.find(l => l.type === 'modified')
    expect(mod!.oldLineNum).toBe(2)
    expect(mod!.newLineNum).toBe(2)

    const added = result.find(l => l.type === 'added')
    expect(added!.newLineNum).toBe(4)
  })
})
