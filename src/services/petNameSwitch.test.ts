/**
 * 临时调查测试：验证切换桌宠后，AI 动态话术是否用新名字。
 *
 * 关键验证点：petStore.petName 更新后，sayCategory 传给 generatePetQuote
 * 的 system prompt "你是桌宠「${name}」" 是否用新名字。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// 捕获 streamChat 收到的 messages，供断言 system prompt 里的 name
let capturedMessages: { role: string; content: string }[] = []

// 可控的 streamChat resolver：让测试显式决定 AI 何时返回，
// 从而精确控制 generating 窗口，不再依赖 setTimeout 时序。
let resolveStream: (r: { finalText: string; finishReason: string }) => void = () => {}
let pendingStream: Promise<{ finalText: string; finishReason: string }> = Promise.resolve({ finalText: '你好呀', finishReason: 'stop' })

vi.mock('@/services/aiService', () => ({
  streamChat: (
    _config: unknown,
    messages: { role: string; content: string }[],
    _onChunk: unknown,
  ) => {
    capturedMessages = messages
    // 每次调用挂起在一个新的可控 Promise 上，测试通过 resolveStream() 放行
    pendingStream = new Promise(resolve => { resolveStream = resolve })
    return pendingStream
  },
}))

// mock aiConfigStore.activeConfig 返回有 apiKey 的配置，让 generatePetQuote 走到 streamChat
vi.mock('@/stores/aiConfigStore', () => ({
  useAIConfigStore: () => ({
    activeConfig: { id: 't', apiKey: 'sk-test', endpoint: 'https://x/v1', provider: 'openai', modelId: 'm' },
  }),
}))

import { setActivePinia, createPinia } from 'pinia'
import { usePetStore } from '@/stores/petStore'

/**
 * 等待 sayCategory 内部的 streamChat 真正被调用（resolveStream 绑定到本次的 pending），
 * 再放行 AI 返回。避免在 streamChat 尚未执行时就 resolve 到旧 Promise。
 * 通过让出微任务队列直到 capturedMessages 被本次调用刷新来判定就绪。
 */
async function resolveWhenReady(
  call: Promise<unknown>,
  result: { finalText: string; finishReason: string },
) {
  // 让出足够多的微任务，确保 sayCategory → generatePetQuote → streamChat 执行完毕
  for (let i = 0; i < 5; i++) await Promise.resolve()
  resolveStream(result)
  await call
}

describe('petStore 切换桌宠后 AI 话术名字', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    capturedMessages = []
  })

  it('切换 petName 后 sayCategory 用新名字（传 name 参数）', async () => {
    const petStore = usePetStore()
    petStore.setAIChatEnabled(true)

    // 桌宠 A
    petStore.petName = '桌宠A'
    const aCall = petStore.sayCategory('greet', petStore.petName)
    await resolveWhenReady(aCall, { finalText: '你好呀', finishReason: 'stop' })
    let sys = capturedMessages[0]?.content ?? ''
    console.log('A greet system:', sys)
    expect(sys).toContain('桌宠A')

    // generating 已在 finally 复位，切换到桌宠 B
    petStore.petName = '桌宠B'
    const bCall = petStore.sayCategory('greet', petStore.petName)
    await resolveWhenReady(bCall, { finalText: '你好呀', finishReason: 'stop' })
    sys = capturedMessages[0]?.content ?? ''
    console.log('B greet system:', sys)
    expect(sys).toContain('桌宠B')
    expect(sys).not.toContain('桌宠A')
  })

  it('切换 petName 后 sayCategory 不传 name 时用 petName.value', async () => {
    const petStore = usePetStore()
    petStore.setAIChatEnabled(true)

    petStore.petName = '桌宠A'
    // 模拟 DesktopPet 的 hover/click/dragStart/dragEnd（不传 name）
    const aCall = petStore.sayCategory('hover')
    await resolveWhenReady(aCall, { finalText: '你好呀', finishReason: 'stop' })
    let sys = capturedMessages[0]?.content ?? ''
    console.log('A hover system:', sys)
    expect(sys).toContain('桌宠A')

    petStore.petName = '桌宠B'
    const bCall = petStore.sayCategory('hover')
    await resolveWhenReady(bCall, { finalText: '你好呀', finishReason: 'stop' })
    sys = capturedMessages[0]?.content ?? ''
    console.log('B hover system:', sys)
    expect(sys).toContain('桌宠B')
    expect(sys).not.toContain('桌宠A')
  })

  it('AI 生成中切换 petName，新调用走静态回退用新名字', async () => {
    const petStore = usePetStore()
    petStore.setAIChatEnabled(true)

    petStore.petName = '桌宠A'
    // 发起一个 AI 生成（挂起，模拟生成中），不 resolve
    const p1 = petStore.sayCategory('greet', petStore.petName)
    // 让出微任务，使 sayCategory 执行到 await generatePetQuote（generating 已置 true）
    await Promise.resolve()
    await Promise.resolve()
    // 此时 generating=true，立即切换桌宠并触发新调用 → 必走静态回退
    petStore.petName = '桌宠B'
    const p2 = petStore.sayCategory('greet', petStore.petName)
    await p2
    // p2 是静态回退（同步路径），气泡应已含桌宠B
    console.log('并发场景气泡:', petStore.currentQuote)
    expect(petStore.currentQuote).toContain('桌宠B')

    // 放行挂起的 p1，其 AI 结果因 token 已被 p2 取代而丢弃，不覆盖气泡
    resolveStream({ finalText: '你好呀', finishReason: 'stop' })
    await p1
    expect(petStore.currentQuote).toContain('桌宠B')
  })
})
