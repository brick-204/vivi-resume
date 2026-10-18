import { createPinia, setActivePinia } from 'pinia'
import { describe, expect, it, vi } from 'vitest'
import type { ConsultSession } from '@/types/consult'

const { sessions, streamChat } = vi.hoisted(() => ({
  sessions: new Map<string, ConsultSession>(),
  streamChat: vi.fn(),
}))

vi.mock('@/services/aiService', async importOriginal => ({
  ...await importOriginal<typeof import('@/services/aiService')>(), streamChat,
}))
vi.mock('@/utils/storageAdapter', () => ({
  getAllConsultSessions: async () => JSON.parse(JSON.stringify([...sessions.values()])),
  saveConsultSession: async (session: ConsultSession) => { sessions.set(session.id, JSON.parse(JSON.stringify(session))) },
  deleteConsultSession: async (id: string) => { sessions.delete(id) },
}))
vi.mock('@/stores/settingsStore', () => ({ useSettingsStore: () => ({ ready: Promise.resolve() }) }))
vi.mock('@/stores/resumeStore', () => ({ useResumeStore: () => ({ resumeList: [] }) }))
vi.mock('@/stores/aiConfigStore', () => ({
  useAIConfigStore: () => ({ activeConfig: { id: 'kimi', modelId: 'kimi-k3' }, recordUsage: vi.fn() }),
}))
vi.mock('@/composables/useFlushGuard', () => ({ registerFlush: vi.fn(), trackPending: (promise: Promise<unknown>) => promise }))
vi.mock('@/plugins/naive-ui', () => ({ message: { warning: vi.fn(), error: vi.fn(), info: vi.fn() } }))

import { useConsultStore } from './consultStore'

describe('consultStore Kimi 历史', () => {
  it('保存、重载后将原始推理和续写消息用于下一轮，界面仍只显示合并正文', async () => {
    sessions.clear()
    streamChat.mockReset()
    setActivePinia(createPinia())
    const store = useConsultStore()
    await store.ready
    const responseMessages = [
      { role: 'assistant', content: '第一段', reasoning_content: '推理一' },
      { role: 'user', content: '继续' },
      { role: 'assistant', content: '第二段', reasoning_content: '推理二' },
    ]
    streamChat.mockResolvedValueOnce({ wasTruncated: false, finalText: '第一段第二段', responseMessages })
    await store.sendMessage('介绍项目')
    const saved = [...sessions.values()][0].messages.at(-1)!
    expect(saved.content).toBe('第一段第二段')
    expect(saved.apiMessages).toEqual(responseMessages)

    await store.reloadFromStorage()
    streamChat.mockResolvedValueOnce({ wasTruncated: false, finalText: '好的' })
    await store.sendMessage('再解释')
    expect(streamChat.mock.calls[1][1].slice(-4)).toEqual([
      ...responseMessages, { role: 'user', content: '再解释' },
    ])
    expect(store.currentMessages.filter(message => message.kind === 'assistant-answer').map(message => message.content))
      .toEqual(['第一段第二段', '好的'])
  })
})
