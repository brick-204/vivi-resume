import { _getRequestUrl, streamChat, htmlToPlainText, plainTextToHtml, _findOverlapLength, _cleanSplicePoint } from '@/services/aiService'
import type { AIServiceConfig } from '@/types/aiConfig'

function makeConfig(endpoint: string): AIServiceConfig {
  return {
    id: 'test',
    name: 'Test',
    provider: 'openai' as any,
    modelId: 'gpt-4',
    apiKey: 'sk-test',
    endpoint,
    createdAt: '',
    updatedAt: '',
  }
}

describe('aiService', () => {
  it.each([
    ['openai', 'gpt-6.1-sol', 'max_completion_tokens'],
    ['openrouter', 'openai/gpt-6.1-sol', 'max_completion_tokens'],
    ['moonshot', 'kimi-k3', 'max_completion_tokens'],
    ['custom', 'gpt-6.1-sol', 'max_completion_tokens'],
    ['openrouter', 'moonshotai/kimi-k3', 'max_completion_tokens'],
    ['deepseek', 'deepseek-flash', 'max_tokens'],
  ])('uses compatible request parameters for %s', async (provider, modelId, tokenField) => {
    const config = makeConfig('https://api.example.com/v1')
    config.provider = provider as AIServiceConfig['provider']
    config.modelId = modelId
    const fetchMock = vi.fn().mockResolvedValue(new Response('data: {"choices":[{"delta":{"content":"ok"},"finish_reason":"stop"}]}\n\n'))
    vi.stubGlobal('fetch', fetchMock)
    try {
      await streamChat(config, [{ role: 'user', content: 'test' }], () => {}, { maxTokens: 100 })
      const body = JSON.parse(fetchMock.mock.calls[0][1].body)
      expect(body[tokenField]).toBe(100)
      expect(body.temperature).toBe(tokenField === 'max_tokens' ? 0.7 : undefined)
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('Kimi 续写与下一轮对话保留原始正文和推理分段，尾帧没有换行也不丢失', async () => {
    const config = { ...makeConfig('https://api.example.com/v1'), modelId: 'kimi-k3' }
    const frame = (delta: object, finish_reason: string | null = null) => `data: ${JSON.stringify({ choices: [{ delta, finish_reason }] })}`
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(`${frame({ reasoning_content: '思考一' })}\n${frame({ content: '第一段' }, 'length')}\n\n`))
      .mockResolvedValueOnce(new Response(`${frame({ content: '第二段' })}\n${frame({ reasoning_content: '思考二' }, 'stop')}`))
      .mockResolvedValueOnce(new Response(`${frame({ reasoning_content: '思考三', content: '回答' }, 'stop')}\n\n`))
    vi.stubGlobal('fetch', fetchMock)
    const onChunk = vi.fn()
    try {
      const initial = [{ role: 'user' as const, content: '介绍项目' }]
      const result = await streamChat(config, initial, onChunk, { continuationPrompt: '继续' })
      const expected = [
        { role: 'assistant', content: '第一段', reasoning_content: '思考一' },
        { role: 'user', content: '继续' },
        { role: 'assistant', content: '第二段', reasoning_content: '思考二' },
      ]
      expect(result.finalText).toBe('第一段第二段')
      expect(result.responseMessages).toEqual(expected)
      expect(onChunk.mock.calls.flat()).toEqual(['第一段', '第二段'])
      expect(JSON.parse(fetchMock.mock.calls[1][1].body).messages).toEqual([...initial, ...expected.slice(0, 2)])
      const followup = [...initial, ...result.responseMessages!, { role: 'user' as const, content: '再解释' }]
      await streamChat(config, followup, () => {})
      expect(JSON.parse(fetchMock.mock.calls[2][1].body).messages).toEqual(followup)
    } finally { vi.unstubAllGlobals() }
  })

  it('更换到其他模型时不发送 Kimi 的推理字段', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('data: {"choices":[{"delta":{"content":"ok"},"finish_reason":"stop"}]}\n\n'))
    vi.stubGlobal('fetch', fetchMock)
    try {
      const result = await streamChat(makeConfig('https://api.example.com/v1'), [
        { role: 'assistant', content: '正文', reasoning_content: '不适用于此模型的推理' },
        { role: 'user', content: '继续' },
      ], () => {})
      expect(JSON.parse(fetchMock.mock.calls[0][1].body).messages[0]).toEqual({ role: 'assistant', content: '正文' })
      expect(result.responseMessages).toBeUndefined()
    } finally { vi.unstubAllGlobals() }
  })

  it('Kimi 流中途取消时返回已收到的正文和推理，以便下一轮继续', async () => {
    const reader = {
      read: vi.fn()
        .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode('data: {"choices":[{"delta":{"reasoning_content":"部分推理","content":"部分正文"}}]}\n\n') })
        .mockRejectedValueOnce(new DOMException('Aborted', 'AbortError')),
      releaseLock: vi.fn(),
    }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, body: { getReader: () => reader } }))
    try {
      const result = await streamChat({ ...makeConfig('https://api.example.com/v1'), modelId: 'kimi-k3' }, [{ role: 'user', content: '介绍项目' }], () => {})
      expect(result.wasTruncated).toBe(true)
      expect(result.finalText).toBe('部分正文')
      expect(result.responseMessages).toEqual([{ role: 'assistant', content: '部分正文', reasoning_content: '部分推理' }])
      expect(reader.releaseLock).toHaveBeenCalled()
    } finally { vi.unstubAllGlobals() }
  })

  describe('_getRequestUrl', () => {
    it('endpoint without /v1 — auto appends /v1', () => {
      const url = _getRequestUrl(makeConfig('https://api.example.com'))
      expect(url).toBe('https://api.example.com/v1/chat/completions')
    })

    it('endpoint already ending in /v1 — no change', () => {
      const url = _getRequestUrl(makeConfig('https://api.example.com/v1'))
      expect(url).toBe('https://api.example.com/v1/chat/completions')
    })

    it('endpoint ending in /v4 — no change (Zhipu)', () => {
      const url = _getRequestUrl(makeConfig('https://open.bigmodel.cn/api/paas/v4'))
      expect(url).toBe('https://open.bigmodel.cn/api/paas/v4/chat/completions')
    })

    it('endpoint with trailing slashes — strips them then appends /v1', () => {
      const url = _getRequestUrl(makeConfig('https://api.example.com/'))
      expect(url).toBe('https://api.example.com/v1/chat/completions')
    })

    it('endpoint with /v1/ in middle — should still append /v1', () => {
      // /v1/ in the middle is not at the end, so /v1 gets appended
      const url = _getRequestUrl(makeConfig('https://api.example.com/v1/models'))
      expect(url).toBe('https://api.example.com/v1/models/v1/chat/completions')
    })

    it('endpoint ending in /v1/ with trailing slash — recognized as /v1', () => {
      const url = _getRequestUrl(makeConfig('https://api.example.com/v1/'))
      expect(url).toBe('https://api.example.com/v1/chat/completions')
    })

    it('endpoint ending in /v4/ with trailing slash — recognized as /v4', () => {
      const url = _getRequestUrl(makeConfig('https://open.bigmodel.cn/api/paas/v4/'))
      expect(url).toBe('https://open.bigmodel.cn/api/paas/v4/chat/completions')
    })

    it('endpointComplete=true — uses endpoint as-is, no append at all', () => {
      const config = makeConfig('https://api.example.com/llm/v1/chat/completions')
      config.endpointComplete = true
      const url = _getRequestUrl(config)
      expect(url).toBe('https://api.example.com/llm/v1/chat/completions')
    })
  })

  describe('htmlToPlainText', () => {
    it('converts basic HTML to plain text', () => {
      const result = htmlToPlainText('<p>Hello</p><p>World</p>')
      expect(result).toBe('Hello\nWorld')
    })

    it('converts list items with bullet', () => {
      const result = htmlToPlainText('<ul><li>Item 1</li><li>Item 2</li></ul>')
      expect(result).toContain('• Item 1')
      expect(result).toContain('• Item 2')
    })

    it('returns empty string for empty input', () => {
      expect(htmlToPlainText('')).toBe('')
      expect(htmlToPlainText(null as any)).toBe('')
      expect(htmlToPlainText(undefined as any)).toBe('')
    })

    it('collapses 3+ newlines to 2', () => {
      const result = htmlToPlainText('<p>A</p><p></p><p></p><p>B</p>')
      // Multiple empty paragraphs produce multiple \n, should be collapsed
      expect(result).not.toContain('\n\n\n')
    })

    it('converts br tags to newlines', () => {
      const result = htmlToPlainText('Line 1<br>Line 2')
      expect(result).toContain('Line 1')
      expect(result).toContain('Line 2')
    })

    it('trims leading and trailing whitespace', () => {
      const result = htmlToPlainText('<p>  Hello  </p>')
      expect(result).toBe('Hello')
    })
  })

  describe('plainTextToHtml', () => {
    it('wraps each line in <p> tags', () => {
      const result = plainTextToHtml('Hello\nWorld')
      expect(result).toBe('<p>Hello</p><p>World</p>')
    })

    it('empty lines get <p><br></p>', () => {
      const result = plainTextToHtml('Hello\n\nWorld')
      expect(result).toContain('<p><br></p>')
    })

    it('escapes HTML entities', () => {
      const result = plainTextToHtml('A & B < C > D')
      expect(result).toContain('A &amp; B &lt; C &gt; D')
    })

    it('returns empty string for empty input', () => {
      expect(plainTextToHtml('')).toBe('')
      expect(plainTextToHtml(null as any)).toBe('')
    })

    it('single line wraps in <p>', () => {
      const result = plainTextToHtml('Hello')
      expect(result).toBe('<p>Hello</p>')
    })
  })

  describe('_findOverlapLength', () => {
    it('finds basic overlap > 6 characters', () => {
      const anchor = 'Hello World and Goodbye'
      const continuation = 'and Goodbye World'
      // Overlap: "and Goodbye" = 11 chars
      expect(_findOverlapLength(anchor, continuation)).toBe(11)
    })

    it('overlap exactly 6 characters returns 6', () => {
      const anchor = 'abcdef'
      const continuation = 'abcdefgh'
      expect(_findOverlapLength(anchor, continuation)).toBe(6)
    })

    it('overlap < 6 characters returns 0', () => {
      const anchor = 'abcde'
      const continuation = 'cdefg'
      // Overlap: "cde" = 3 chars, less than 6
      expect(_findOverlapLength(anchor, continuation)).toBe(0)
    })

    it('no overlap returns 0', () => {
      const anchor = 'Hello World'
      const continuation = 'Goodbye Moon'
      expect(_findOverlapLength(anchor, continuation)).toBe(0)
    })

    it('one empty string returns 0', () => {
      expect(_findOverlapLength('', 'Hello')).toBe(0)
      expect(_findOverlapLength('Hello', '')).toBe(0)
    })

    it('exact match returns overlap length', () => {
      const text = 'Hello World'
      expect(_findOverlapLength(text, text)).toBe(text.length)
    })

    it('respects max check of 200 characters', () => {
      const anchor = 'a'.repeat(300)
      const continuation = 'a'.repeat(300)
      // maxCheck = min(300, 300, 200) = 200
      expect(_findOverlapLength(anchor, continuation)).toBe(200)
    })
  })

  describe('_cleanSplicePoint', () => {
    it('removes ```json prefix from continuation', () => {
      const result = _cleanSplicePoint('previous text', '```json\n{"key": "value"}')
      expect(result).not.toContain('```json')
      expect(result).toContain('{"key": "value"}')
    })

    it('removes ``` prefix without json', () => {
      const result = _cleanSplicePoint('previous text', '```\n{"key": "value"}')
      expect(result).not.toContain('```')
      expect(result).toContain('{"key": "value"}')
    })

    it('removes explanatory text when previous ended in JSON value char', () => {
      const previous = '{"name": "test"'
      const continuation = 'Here is the continuation\n{"age": "25"}'
      const result = _cleanSplicePoint(previous, continuation)
      // Should skip the explanatory line
      expect(result).not.toContain('Here is the continuation')
      expect(result).toContain('{"age": "25"}')
    })

    it('removes overlapping content', () => {
      const previous = 'This is the end of the previous text with overlap section'
      const continuation = 'overlap section and new content here'
      const result = _cleanSplicePoint(previous, continuation)
      // The overlap "overlap section" should be removed from continuation
      expect(result.startsWith('overlap section')).toBe(false)
    })

    it('returns original continuation if previousText is empty', () => {
      const continuation = 'some text'
      expect(_cleanSplicePoint('', continuation)).toBe(continuation)
    })

    it('returns original continuation if continuationText is empty', () => {
      expect(_cleanSplicePoint('previous', '')).toBe('')
    })

    it('no cleanup needed when no overlap or prefix', () => {
      // Use previous text ending with non-JSON char to avoid explanatory text removal
      const previous = 'Hello world!'
      const continuation = 'New content starts here'
      const result = _cleanSplicePoint(previous, continuation)
      expect(result).toBe(continuation)
    })

    it('removes up to 3 non-JSON lines after JSON value end', () => {
      const previous = '{"key": "value"'
      const continuation = 'Line 1\nLine 2\nLine 3\n{"next": "item"}'
      const result = _cleanSplicePoint(previous, continuation)
      expect(result).toContain('{"next": "item"}')
      expect(result).not.toContain('Line 1')
    })
  })
})
