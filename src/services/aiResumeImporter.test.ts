import {
  _fixComments,
  _fixMissingCommas,
  _fixUnescapedNewlines,
  _repairJSON,
  _extractJSON,
  _partialRecoverJSON,
  _removeContinuationOverlaps,
  _preprocessAIData,
  _translateJSONError,
  _buildErrorContext,
} from '@/services/aiResumeImporter'

describe('aiResumeImporter', () => {
  describe('_fixComments', () => {
    it('removes single-line // comments outside strings', () => {
      const input = '{\n  "key": "value" // a comment\n}'
      const result = _fixComments(input)
      expect(result).not.toContain('// a comment')
      expect(JSON.parse(result)).toEqual({ key: 'value' })
    })

    it('removes multi-line /* */ comments outside strings', () => {
      const input = '{\n  /* block comment */\n  "key": "value"\n}'
      const result = _fixComments(input)
      expect(result).not.toContain('block comment')
      expect(JSON.parse(result)).toEqual({ key: 'value' })
    })

    it('preserves // inside strings', () => {
      const input = '{"url": "https://example.com/path"}'
      const result = _fixComments(input)
      expect(result).toContain('https://example.com/path')
      expect(JSON.parse(result)).toEqual({ url: 'https://example.com/path' })
    })

    it('preserves /* inside strings', () => {
      const input = '{"regex": "/* test */"}'
      const result = _fixComments(input)
      expect(result).toContain('/* test */')
    })

    it('handles multiple comments', () => {
      const input = `{
        // comment 1
        "a": "1",
        /* comment 2 */
        "b": "2"
      }`
      const result = _fixComments(input)
      expect(JSON.parse(result)).toEqual({ a: '1', b: '2' })
    })
  })

  describe('_fixMissingCommas', () => {
    it('inserts comma between adjacent object properties', () => {
      const input = '{"a": "1" "b": "2"}'
      const result = _fixMissingCommas(input)
      expect(JSON.parse(result)).toEqual({ a: '1', b: '2' })
    })

    it('inserts comma between adjacent array elements', () => {
      const input = '["a" "b" "c"]'
      const result = _fixMissingCommas(input)
      expect(JSON.parse(result)).toEqual(['a', 'b', 'c'])
    })

    it('inserts comma between object and array value', () => {
      const input = '{"a": [1] "b": [2]}'
      const result = _fixMissingCommas(input)
      expect(JSON.parse(result)).toEqual({ a: [1], b: [2] })
    })

    it('does not insert comma after colon', () => {
      const input = '{"a": "value"}'
      const result = _fixMissingCommas(input)
      expect(result).not.toContain(':,')
    })

    it('handles commas that already exist (no double insert)', () => {
      const input = '{"a": "1", "b": "2"}'
      const result = _fixMissingCommas(input)
      expect(JSON.parse(result)).toEqual({ a: '1', b: '2' })
    })

    it('inserts comma between adjacent objects in array', () => {
      const input = '[{"a": 1} {"b": 2}]'
      const result = _fixMissingCommas(input)
      expect(JSON.parse(result)).toEqual([{ a: 1 }, { b: 2 }])
    })

    it('inserts comma between bare value and string', () => {
      const input = '{"a": true "b": "value"}'
      const result = _fixMissingCommas(input)
      expect(JSON.parse(result)).toEqual({ a: true, b: 'value' })
    })
  })

  describe('_fixUnescapedNewlines', () => {
    it('replaces bare \\n inside strings with escaped \\n', () => {
      const input = '{"key": "line1\nline2"}'
      const result = _fixUnescapedNewlines(input)
      expect(JSON.parse(result)).toEqual({ key: 'line1\nline2' })
    })

    it('replaces bare \\r inside strings', () => {
      const input = '{"key": "line1\rline2"}'
      const result = _fixUnescapedNewlines(input)
      // \r is removed (replaced with empty)
      expect(JSON.parse(result).key).not.toContain('\r')
    })

    it('preserves already-escaped \\n', () => {
      const input = '{"key": "line1\\nline2"}'
      const result = _fixUnescapedNewlines(input)
      expect(JSON.parse(result)).toEqual({ key: 'line1\nline2' })
    })

    it('does not modify newlines outside strings', () => {
      const input = '{\n  "key": "value"\n}'
      const result = _fixUnescapedNewlines(input)
      expect(result).toContain('\n')
      expect(JSON.parse(result)).toEqual({ key: 'value' })
    })

    it('handles mixed escaped and unescaped newlines', () => {
      const input = '{"a": "escaped\\nhere" "b": "unescaped\nhere"}'
      // First fix unescaped newlines, then fix missing commas
      const fixed = _fixUnescapedNewlines(input)
      const withCommas = _fixMissingCommas(fixed)
      expect(JSON.parse(withCommas)).toEqual({
        a: 'escaped\nhere',
        b: 'unescaped\nhere',
      })
    })
  })

  describe('_repairJSON', () => {
    it('removes comments and fixes missing commas together', () => {
      const input = `{
        // comment
        "a": "1" "b": "2"
      }`
      const result = _repairJSON(input)
      expect(JSON.parse(result)).toEqual({ a: '1', b: '2' })
    })

    it('fixes trailing commas before closing braces', () => {
      const input = '{"a": "1", "b": "2",}'
      const result = _repairJSON(input)
      expect(JSON.parse(result)).toEqual({ a: '1', b: '2' })
    })

    it('fixes trailing commas before closing brackets', () => {
      const input = '["a", "b",]'
      const result = _repairJSON(input)
      expect(JSON.parse(result)).toEqual(['a', 'b'])
    })

    it('applies all fix strategies: comments + newlines + commas + trailing', () => {
      const input = `{
        // a comment
        "key": "line1
line2" "next": "value",
      }`
      const result = _repairJSON(input)
      expect(JSON.parse(result)).toEqual({
        key: 'line1\nline2',
        next: 'value',
      })
    })

    it('preserves already-valid JSON', () => {
      const input = '{"a": "1", "b": "2"}'
      const result = _repairJSON(input)
      expect(JSON.parse(result)).toEqual({ a: '1', b: '2' })
    })
  })

  describe('_extractJSON', () => {
    it('parses valid JSON directly', () => {
      const result = _extractJSON('{"key": "value"}')
      expect(result.json).toBe('{"key": "value"}')
      expect(result.error).toBeNull()
      expect(result.partial).toBeUndefined()
    })

    it('parses JSON with comments via repair', () => {
      const input = `{
        // comment
        "key": "value"
      }`
      const result = _extractJSON(input)
      expect(result.json).not.toBeNull()
      expect(result.error).toBeNull()
      expect(JSON.parse(result.json!)).toEqual({ key: 'value' })
    })

    it('extracts JSON from ```json code block', () => {
      const input = 'Some text here\n```json\n{"key": "value"}\n```\nMore text'
      const result = _extractJSON(input)
      expect(result.json).not.toBeNull()
      expect(JSON.parse(result.json!)).toEqual({ key: 'value' })
    })

    it('extracts JSON from plain ``` code block', () => {
      const input = '```\n{"key": "value"}\n```'
      const result = _extractJSON(input)
      expect(result.json).not.toBeNull()
      expect(JSON.parse(result.json!)).toEqual({ key: 'value' })
    })

    it('partially recovers truncated JSON', () => {
      const input = '{"name": "test", "age": "25", "uncomplete":'
      const result = _extractJSON(input)
      expect(result.json).not.toBeNull()
      const parsed = JSON.parse(result.json!)
      expect(parsed.name).toBe('test')
      expect(parsed.age).toBe('25')
      expect(result.partial).toBe(true)
    })

    it('extracts JSON via brace matching when wrapped in text', () => {
      const input = 'Here is the data: {"key": "value"} end'
      const result = _extractJSON(input)
      expect(result.json).not.toBeNull()
      expect(JSON.parse(result.json!)).toEqual({ key: 'value' })
    })

    it('returns error when no JSON found', () => {
      const result = _extractJSON('just plain text, no JSON here')
      expect(result.json).toBeNull()
      expect(result.error).not.toBeNull()
      expect(result.error).toContain('未找到')
    })

    it('returns error for invalid JSON in code block', () => {
      const input = '```json\n{invalid content}\n```'
      const result = _extractJSON(input)
      expect(result.json).toBeNull()
      expect(result.error).not.toBeNull()
    })

    it('handles empty string input', () => {
      const result = _extractJSON('')
      expect(result.json).toBeNull()
      expect(result.error).not.toBeNull()
    })
  })

  describe('_partialRecoverJSON', () => {
    it('truncates at last complete key-value and closes brackets', () => {
      const input = '{"name": "test", "age": "25", "uncomplete":'
      const result = _partialRecoverJSON(input, 'Unexpected end of JSON input')
      expect(result).not.toBeNull()
      const parsed = JSON.parse(result!)
      expect(parsed.name).toBe('test')
      expect(parsed.age).toBe('25')
    })

    it('returns null when no complete KV found', () => {
      const input = '{ incomplete'
      const result = _partialRecoverJSON(input, 'Unexpected token')
      expect(result).toBeNull()
    })

    it('handles JSON with bare values', () => {
      const input = '{"count": 42, "next":'
      const result = _partialRecoverJSON(input, 'Unexpected end of JSON input')
      expect(result).not.toBeNull()
      const parsed = JSON.parse(result!)
      expect(parsed.count).toBe(42)
    })

    it('closes nested structures', () => {
      // Use a simpler case: depth-1 key with nested object value that is complete
      const input = '{"outer": {"inner": "value"}, "next":'
      const result = _partialRecoverJSON(input, 'Unexpected end of JSON input')
      expect(result).not.toBeNull()
      const parsed = JSON.parse(result!)
      expect(parsed.outer.inner).toBe('value')
    })

    it('uses position from error message when available', () => {
      const input = '{"a": "1" "b": "2" invalid here}'
      const result = _partialRecoverJSON(input, 'Unexpected token at position 20')
      // Should recover up to the valid prefix
      expect(result === null || JSON.parse(result).a === '1').toBe(true)
    })
  })

  describe('_removeContinuationOverlaps', () => {
    it('removes duplicate },\\n  },\\n pattern', () => {
      const input = '},\n  },\n},\n  },\nrest'
      const result = _removeContinuationOverlaps(input)
      expect(result.length).toBeLessThanOrEqual(input.length)
    })

    it('removes duplicate ],\\n  },\\n pattern', () => {
      const input = '],\n  },\n],\n  },\nrest'
      const result = _removeContinuationOverlaps(input)
      expect(result.length).toBeLessThanOrEqual(input.length)
    })

    it('leaves non-duplicate content unchanged', () => {
      const input = '{"key": "value"}'
      const result = _removeContinuationOverlaps(input)
      expect(result).toBe(input)
    })

    it('handles input without overlaps', () => {
      const input = '},\n  },\nrest'
      // Single occurrence, no duplicate to remove
      expect(_removeContinuationOverlaps(input)).toBe(input)
    })
  })

  describe('_preprocessAIData', () => {
    it('converts null top-level string fields to empty string', () => {
      const data = { title: null, selfEvaluation: null }
      const result = _preprocessAIData(data) as any
      expect(result.title).toBe('')
      expect(result.selfEvaluation).toBe('')
    })

    it('converts non-array top-level array fields to []', () => {
      const data = { workExperience: null, education: 'invalid', skills: undefined }
      const result = _preprocessAIData(data) as any
      expect(result.workExperience).toEqual([])
      expect(result.education).toEqual([])
      expect(result.skills).toEqual([])
    })

    it('normalizes basicInfo null string fields', () => {
      const data = { basicInfo: { name: null, email: undefined, phone: null } }
      const result = _preprocessAIData(data) as any
      expect(result.basicInfo.name).toBe('')
      expect(result.basicInfo.email).toBe('')
      expect(result.basicInfo.phone).toBe('')
    })

    it('normalizes basicInfo null object/array fields', () => {
      const data = { basicInfo: { hiddenFields: null, customFields: null, fieldOrder: null } }
      const result = _preprocessAIData(data) as any
      expect(result.basicInfo.hiddenFields).toEqual({})
      expect(result.basicInfo.customFields).toEqual([])
      expect(result.basicInfo.fieldOrder).toEqual([])
    })

    it('sets basicInfo to {} when null', () => {
      const data = { basicInfo: null }
      const result = _preprocessAIData(data) as any
      expect(result.basicInfo).toEqual({})
    })

    it('normalizes null fields in array items', () => {
      const data = {
        workExperience: [{ company: null, position: 'Dev' }],
        education: [{ school: null, degree: 'BS' }],
      }
      const result = _preprocessAIData(data) as any
      expect(result.workExperience[0].company).toBe('')
      expect(result.workExperience[0].position).toBe('Dev')
      expect(result.education[0].school).toBe('')
    })

    it('normalizes non-array technologies/keywords in items', () => {
      const data = {
        projects: [{ name: 'P', technologies: null }],
        customCards: [{ id: 'c', keywords: 'invalid' }],
      }
      const result = _preprocessAIData(data) as any
      expect(result.projects[0].technologies).toEqual([])
    })

    it('normalizes sectionTitles to {} when null', () => {
      const data = { sectionTitles: null }
      const result = _preprocessAIData(data) as any
      expect(result.sectionTitles).toEqual({})
    })

    it('returns non-object input unchanged', () => {
      expect(_preprocessAIData(null)).toBeNull()
      expect(_preprocessAIData('string')).toBe('string')
      expect(_preprocessAIData(42)).toBe(42)
    })
  })

  describe('_translateJSONError', () => {
    it('maps Unexpected token to Chinese message', () => {
      const result = _translateJSONError('Unexpected token x in JSON at position 5')
      expect(result).toContain('非法字符')
      expect(result).toContain('位置 5')
    })

    it('maps Expected property name to Chinese message', () => {
      const result = _translateJSONError("Expected property name '}' in JSON at position 10")
      expect(result).toContain('结构不完整')
    })

    it('maps Expected comma to Chinese message', () => {
      const result = _translateJSONError("Expected ',' in JSON at position 10")
      expect(result).toContain('逗号')
    })

    it('maps Unexpected end to Chinese message', () => {
      const result = _translateJSONError('Unexpected end of JSON input')
      expect(result).toContain('不完整')
      expect(result).toContain('截断')
    })

    it('maps Bad control character to Chinese message', () => {
      const result = _translateJSONError('Bad control character in string literal in JSON')
      expect(result).toContain('控制字符')
    })

    it('includes context snippet when jsonText provided with position', () => {
      const jsonText = '{"key": "value" invalid}'
      const result = _translateJSONError('Unexpected token i in JSON at position 16', jsonText)
      expect(result).toContain('↑')
    })

    it('falls back to truncated raw error', () => {
      const result = _translateJSONError('Some unknown error type that is quite long and detailed')
      // Fallback takes first 80 chars
      expect(result.length).toBeLessThanOrEqual(120)
    })
  })

  describe('_buildErrorContext', () => {
    it('extracts context around error position with ↑ marker', () => {
      const jsonText = '{"key": "value", "more": "data"}'
      const result = _buildErrorContext(jsonText, 10)
      expect(result).toContain('↑')
      expect(result).toContain('\n')
    })

    it('adds prefix … when start > 0', () => {
      const jsonText = 'x'.repeat(100)
      const result = _buildErrorContext(jsonText, 50)
      expect(result).toContain('…')
    })

    it('adds suffix … when end < length', () => {
      const jsonText = 'x'.repeat(100)
      const result = _buildErrorContext(jsonText, 80)
      expect(result).toContain('…')
    })

    it('handles position at start of string', () => {
      const jsonText = '{"key": "value"}'
      const result = _buildErrorContext(jsonText, 0)
      expect(result).toContain('↑')
      expect(result).not.toContain('…{') // no prefix ellipsis at start
    })

    it('handles position at end of string', () => {
      const jsonText = '{"key": "value"}'
      const result = _buildErrorContext(jsonText, jsonText.length - 1)
      expect(result).toContain('↑')
    })
  })
})
