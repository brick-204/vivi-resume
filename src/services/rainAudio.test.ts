import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRainAudio, THUNDER_DELAY_RANGE } from '@/services/rainAudio'

// ========== mock AudioContext（jsdom 无 WebAudio） ==========
function createMockCtx() {
  const nodes: any[] = []
  const makeNode = () => {
    const n: any = {
      connect: vi.fn().mockReturnThis(),
      disconnect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      gain: { value: 0, setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
      frequency: { value: 0 },
      Q: { value: 0 },
      buffer: null,
      loop: false,
    }
    nodes.push(n)
    return n
  }
  const ctx: any = {
    state: 'running',
    sampleRate: 44100,
    currentTime: 0,
    resume: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
    createBuffer: vi.fn((_ch: number, len: number) => ({ getChannelData: () => new Float32Array(len) })),
    createBufferSource: vi.fn(makeNode),
    createBiquadFilter: vi.fn(makeNode),
    createGain: vi.fn(makeNode),
    destination: {},
  }
  return { ctx, nodes }
}

let mockCtx: any
let ACSpy: any

beforeEach(() => {
  const m = createMockCtx()
  mockCtx = m.ctx
  ACSpy = vi.fn(() => m.ctx)
  vi.stubGlobal('AudioContext', ACSpy)
  // webkitAudioContext 不存在时 createRainAudio 应仍能用 AudioContext
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('createRainAudio', () => {
  it('start 创建 AudioContext 并启动雨声 source', () => {
    const audio = createRainAudio()
    audio.start()
    expect(ACSpy).toHaveBeenCalled()
    expect(mockCtx.createBuffer).toHaveBeenCalled()
    expect(mockCtx.createBufferSource).toHaveBeenCalled()
    expect(mockCtx.createBiquadFilter).toHaveBeenCalled()
    expect(mockCtx.createGain).toHaveBeenCalled()
    // source.start 被调用
    const source = mockCtx.createBufferSource.mock.results[0].value
    expect(source.start).toHaveBeenCalled()
  })

  it('start 幂等：重复调用不创建新 source', () => {
    const audio = createRainAudio()
    audio.start()
    audio.start()
    expect(mockCtx.createBufferSource).toHaveBeenCalledTimes(1)
  })

  it('updateRainGain 按雨势调整 gain', () => {
    const audio = createRainAudio()
    audio.start()
    const gainNode = mockCtx.createGain.mock.results[0].value
    audio.updateRainGain(0.5)
    // baseGain 0.18 × 0.5 = 0.09
    expect(gainNode.gain.value).toBeCloseTo(0.09, 4)
    audio.updateRainGain(1)
    expect(gainNode.gain.value).toBeCloseTo(0.18, 4)
  })

  it('triggerThunder 创建独立 burst source 并 stop', () => {
    const audio = createRainAudio()
    audio.start()
    const before = mockCtx.createBufferSource.mock.calls.length
    audio.triggerThunder()
    // 雷声新建了一个 source（不同于雨声 source）
    expect(mockCtx.createBufferSource.mock.calls.length).toBe(before + 1)
    const thunderSource = mockCtx.createBufferSource.mock.results[before].value
    expect(thunderSource.start).toHaveBeenCalled()
    expect(thunderSource.stop).toHaveBeenCalled()
  })

  it('stop 停 source 但不 close context；dispose 才 close', () => {
    const audio = createRainAudio()
    audio.start()
    const source = mockCtx.createBufferSource.mock.results[0].value
    audio.stop()
    expect(source.stop).toHaveBeenCalled()
    expect(mockCtx.close).not.toHaveBeenCalled()
    // 再 start 可复用 context
    audio.start()
    expect(ACSpy).toHaveBeenCalledTimes(1) // 未新建 context
    audio.dispose()
    expect(mockCtx.close).toHaveBeenCalled()
  })

  it('THUNDER_DELAY_RANGE 在 200~800ms 区间', () => {
    expect(THUNDER_DELAY_RANGE[0]).toBe(200)
    expect(THUNDER_DELAY_RANGE[1]).toBe(800)
  })
})
