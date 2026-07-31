/**
 * 下雪彩蛋音效（纯 WebAudio 程序合成，0 外部资源）。
 * - 风声：白噪声 buffer 循环 + 低通滤波（截止频率比雨声低，~400Hz），音量随雪势联动
 *
 * 生命周期：lazy 创建 AudioContext；stop() 停 source 但保留 context 复用；dispose() 才 close。
 * autoplay 政策：start() 必须在用户交互后调用。
 */

export interface SnowAudio {
  /** 启动风声循环（用户交互后调用）。幂等。 */
  start: () => void
  /** 每帧调：按雪势 0~1 调整风声音量 */
  updateWindGain: (multiplier: number) => void
  /** 停风声（保留 context，可再 start 复用） */
  stop: () => void
  /** 彻底释放：close context */
  dispose: () => void
}

const WIND_BASE_GAIN = 0.12

function createNoiseBuffer(ctx: AudioContext, seconds: number): AudioBuffer {
  const len = Math.floor(ctx.sampleRate * seconds)
  const buf = ctx.createBuffer(1, len, ctx.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
  return buf
}

export function createSnowAudio(): SnowAudio {
  let ctx: AudioContext | null = null
  let windSource: AudioBufferSourceNode | null = null
  let windGain: GainNode | null = null
  let currentGain = 0

  const ensureCtx = (): AudioContext | null => {
    if (ctx) return ctx
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) return null
    ctx = new AC()
    return ctx
  }

  const start = () => {
    const c = ensureCtx()
    if (!c || windSource) return
    if (c.state === 'suspended') c.resume().catch(() => {})

    // 风声链：source(loop) → lowpass(400Hz，比雨声低) → gain → destination
    windSource = c.createBufferSource()
    windSource.buffer = createNoiseBuffer(c, 2)
    windSource.loop = true
    const lowpass = c.createBiquadFilter()
    lowpass.type = 'lowpass'
    lowpass.frequency.value = 400
    windGain = c.createGain()
    windGain.gain.value = currentGain * WIND_BASE_GAIN
    windSource.connect(lowpass).connect(windGain).connect(c.destination)
    windSource.start()
  }

  const updateWindGain = (multiplier: number) => {
    currentGain = Math.max(0, Math.min(1, multiplier))
    if (windGain) {
      windGain.gain.value = currentGain * WIND_BASE_GAIN
    }
  }

  const stop = () => {
    if (windSource) {
      try { windSource.stop() } catch { /* 已停 */ }
      windSource.disconnect()
      windSource = null
    }
    if (windGain) {
      windGain.disconnect()
      windGain = null
    }
  }

  const dispose = () => {
    stop()
    if (ctx) {
      ctx.close().catch(() => {})
      ctx = null
    }
  }

  return { start, updateWindGain, stop, dispose }
}
