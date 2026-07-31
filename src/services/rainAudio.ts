/**
 * 雨夜彩蛋音效（纯 WebAudio 程序合成，0 外部资源）。
 * - 雨声：白噪声 buffer 循环 + 低通滤波，音量随雨势 emissionMultiplier 联动
 * - 雷声：白噪声 burst + 带通滤波 + 指数衰减包络，调用方延迟触发模拟光速/音速差
 *
 * 生命周期：lazy 创建 AudioContext；stop() 停 source 但保留 context 复用；dispose() 才 close。
 * autoplay 政策：start() 必须在用户交互后调用（首次提示"开启"按钮点击即是交互点）。
 */

export interface RainAudio {
  /** 启动雨声循环（用户交互后调用）。幂等。 */
  start: () => void
  /** 每帧调：按雨势 0~1 调整雨声音量 */
  updateRainGain: (emissionMultiplier: number) => void
  /** 触发一次雷声（调用方负责延迟 200~800ms） */
  triggerThunder: () => void
  /** 停雨声（保留 context，可再 start 复用） */
  stop: () => void
  /** 彻底释放：close context */
  dispose: () => void
}

const RAIN_BASE_GAIN = 0.18
const THUNDER_BASE_GAIN = 0.5

/** 生成 N 秒白噪声 buffer（1 通道） */
function createNoiseBuffer(ctx: AudioContext, seconds: number): AudioBuffer {
  const len = Math.floor(ctx.sampleRate * seconds)
  const buf = ctx.createBuffer(1, len, ctx.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
  return buf
}

export function createRainAudio(): RainAudio {
  let ctx: AudioContext | null = null
  let rainSource: AudioBufferSourceNode | null = null
  let rainGain: GainNode | null = null
  let currentRainGain = 0

  const ensureCtx = (): AudioContext | null => {
    if (ctx) return ctx
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) return null
    ctx = new AC()
    return ctx
  }

  const start = () => {
    const c = ensureCtx()
    if (!c || rainSource) return // 幂等：已在播
    if (c.state === 'suspended') c.resume().catch(() => {})

    // 雨声链：source(loop) → lowpass(800Hz) → gain → destination
    rainSource = c.createBufferSource()
    rainSource.buffer = createNoiseBuffer(c, 2)
    rainSource.loop = true
    const lowpass = c.createBiquadFilter()
    lowpass.type = 'lowpass'
    lowpass.frequency.value = 800
    rainGain = c.createGain()
    rainGain.gain.value = currentRainGain * RAIN_BASE_GAIN
    rainSource.connect(lowpass).connect(rainGain).connect(c.destination)
    rainSource.start()
  }

  const updateRainGain = (emissionMultiplier: number) => {
    currentRainGain = Math.max(0, Math.min(1, emissionMultiplier))
    if (rainGain && ctx) {
      // ponytail: 直接设值，不做 ramp——每帧调，ramp 反而抖动
      rainGain.gain.value = currentRainGain * RAIN_BASE_GAIN
    }
  }

  const triggerThunder = () => {
    const c = ensureCtx()
    if (!c) return
    // 雷声链：source(0.8s burst) → bandpass(200Hz) → gain(衰减) → destination
    const src = c.createBufferSource()
    src.buffer = createNoiseBuffer(c, 0.8)
    const bandpass = c.createBiquadFilter()
    bandpass.type = 'bandpass'
    bandpass.frequency.value = 200
    bandpass.Q.value = 0.7
    const g = c.createGain()
    const now = c.currentTime
    // 指数衰减包络：0→1→0 in 800ms
    g.gain.setValueAtTime(0, now)
    g.gain.linearRampToValueAtTime(THUNDER_BASE_GAIN, now + 0.02)
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.8)
    src.connect(bandpass).connect(g).connect(c.destination)
    src.start(now)
    src.stop(now + 0.8)
  }

  const stop = () => {
    if (rainSource) {
      try { rainSource.stop() } catch { /* 已停 */ }
      rainSource.disconnect()
      rainSource = null
    }
    if (rainGain) {
      rainGain.disconnect()
      rainGain = null
    }
  }

  const dispose = () => {
    stop()
    if (ctx) {
      ctx.close().catch(() => {})
      ctx = null
    }
  }

  return { start, updateRainGain, triggerThunder, stop, dispose }
}

/** 雷声延迟范围（ms）：模拟光速 vs 音速差，调用方在此区间随机 */
export const THUNDER_DELAY_RANGE: [number, number] = [200, 800]
