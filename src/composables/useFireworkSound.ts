/**
 * 礼炮 + 烟花合成音效（Web Audio API，零音频文件）。
 * 受 useEasterEggSound 全局闸门控制：soundEnabled 为 false 时不响。
 *
 * 关键：body 用低通白噪声（无音高），不用正弦波——正弦波带音高像乐器打击，
 * 真实爆炸是无音高的宽频气流闷响。
 *
 * 优化：
 * - 空间混响：用多个微延迟反馈模拟户外空气余韵（零脉冲响应文件）
 * - 噼啪疏密：click 错峰用指数分布，前密后稀，接近真实炸裂节奏
 * - 距离感：远处音量更轻、低通更低（更闷）、click 更少
 */

let ctx: AudioContext | null = null
let reverbNode: ConvolverNode | null = null
let reverbGain: GainNode | null = null

const getCtx = (): AudioContext | null => {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    const AC = window.AudioContext || (window as any).webkitAudioContext
    if (!AC) return null
    ctx = new AC()
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {})
  return ctx
}

/** 生成一段白噪声 buffer */
const makeNoiseBuffer = (ac: AudioContext, duration: number): AudioBuffer => {
  const len = Math.floor(ac.sampleRate * duration)
  const buf = ac.createBuffer(1, len, ac.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
  return buf
}

/**
 * 合成一段脉冲响应（用于 ConvolverNode 混响）。
 * 用指数衰减的噪声，模拟户外空间余韵，零音频文件。
 */
const makeReverbImpulse = (ac: AudioContext, duration: number, decay: number): AudioBuffer => {
  const len = Math.floor(ac.sampleRate * duration)
  const buf = ac.createBuffer(2, len, ac.sampleRate)
  for (let ch = 0; ch < 2; ch++) {
    const data = buf.getChannelData(ch)
    for (let i = 0; i < len; i++) {
      const t = i / len
      // 指数衰减 + 轻微前置强调（攻击瞬态后平滑衰减）
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, decay)
    }
  }
  return buf
}

/** 获取/懒初始化混响节点（所有声音都送一份进去，营造空间感） */
const getReverb = (ac: AudioContext): { node: ConvolverNode; gain: GainNode } => {
  if (!reverbNode || !reverbGain) {
    reverbNode = ac.createConvolver()
    reverbNode.buffer = makeReverbImpulse(ac, 0.6, 2.5)
    reverbGain = ac.createGain()
    reverbGain.gain.value = 0.18 // 混响湿信号占比（不太大，避免糊）
    reverbNode.connect(reverbGain).connect(ac.destination)
  }
  return { node: reverbNode, gain: reverbGain }
}

/** 把一个节点同时接到 dry（直达）和 wet（混响）输出 */
const toOutput = (ac: AudioContext, node: AudioNode) => {
  node.connect(ac.destination) // dry 直达
  const { node: reverb } = getReverb(ac)
  node.connect(reverb) // wet 混响
}

/**
 * 礼炮"砰"：
 * - 低通噪声 body（无音高，炮筒气流闷响，截止频率下滑让"嘭"有下沉感）
 * - 高通冲击瞬态（开头一瞬击发锐音）
 * @param sound 本次是否播音（由组件传入，反映工厂 promptSoundOnce 的首弹决策）
 */
function playCannon(sound: boolean): void {
  if (!sound) return
  const ac = getCtx()
  if (!ac) return
  const t = ac.currentTime

  // 1. 低通噪声 body：截止频率从 400 下滑到 120
  const bodySrc = ac.createBufferSource()
  bodySrc.buffer = makeNoiseBuffer(ac, 0.4)
  const lp = ac.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.setValueAtTime(420, t)
  lp.frequency.exponentialRampToValueAtTime(120, t + 0.25)
  lp.Q.value = 0.8
  const bodyGain = ac.createGain()
  bodyGain.gain.setValueAtTime(0.0001, t)
  bodyGain.gain.exponentialRampToValueAtTime(0.6, t + 0.006)
  bodyGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.35)
  bodySrc.connect(lp).connect(bodyGain)
  toOutput(ac, bodyGain)
  bodySrc.start(t)
  bodySrc.stop(t + 0.4)

  // 2. 高通冲击瞬态：开头一瞬"咔"
  const noiseSrc = ac.createBufferSource()
  noiseSrc.buffer = makeNoiseBuffer(ac, 0.12)
  const hp = ac.createBiquadFilter()
  hp.type = 'highpass'
  hp.frequency.value = 1500
  const noiseGain = ac.createGain()
  noiseGain.gain.setValueAtTime(0.0001, t)
  noiseGain.gain.exponentialRampToValueAtTime(0.3, t + 0.003)
  noiseGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.08)
  noiseSrc.connect(hp).connect(noiseGain)
  toOutput(ac, noiseGain)
  noiseSrc.start(t)
  noiseSrc.stop(t + 0.12)
}

/**
 * 单个高频 click 颗粒（烟花噼啪的一个"啪"）
 */
const playClick = (ac: AudioContext, at: number, freq: number, vol: number) => {
  const src = ac.createBufferSource()
  src.buffer = makeNoiseBuffer(ac, 0.04)
  const bp = ac.createBiquadFilter()
  bp.type = 'bandpass'
  bp.frequency.value = freq
  bp.Q.value = 2
  const g = ac.createGain()
  g.gain.setValueAtTime(0.0001, at)
  g.gain.exponentialRampToValueAtTime(vol, at + 0.002)
  g.gain.exponentialRampToValueAtTime(0.0001, at + 0.04)
  src.connect(bp).connect(g)
  toOutput(ac, g)
  src.start(at)
  src.stop(at + 0.05)
}

/**
 * 烟花爆炸"嘭 + 噼啪"：
 * - 低通噪声"嘭"body（无音高，空中爆炸气流闷响，截止频率下滑）
 * - 一串离散高频 click 颗粒（指数错峰，前密后稀，颗粒感的"噼啪"）
 * @param distance 0~1，距离感：0 近(响亮清脆) 1 远(轻闷少颗粒)
 * @param sound 本次是否播音（由组件传入，反映工厂 promptSoundOnce 的首弹决策）
 */
function playFirework(distance = 0, sound: boolean): void {
  if (!sound) return
  const ac = getCtx()
  if (!ac) return
  const t = ac.currentTime

  // 距离感：远处音量更轻、低通截止更低（更闷）
  const volScale = 1 - distance * 0.55
  const bodyCutoffStart = 500 - distance * 280
  const bodyCutoffEnd = 100 - distance * 50

  // 1. 低通噪声"嘭"body
  const bodySrc = ac.createBufferSource()
  bodySrc.buffer = makeNoiseBuffer(ac, 0.5)
  const lp = ac.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.setValueAtTime(bodyCutoffStart, t)
  lp.frequency.exponentialRampToValueAtTime(Math.max(40, bodyCutoffEnd), t + 0.3)
  lp.Q.value = 0.9
  const bodyGain = ac.createGain()
  bodyGain.gain.setValueAtTime(0.0001, t)
  bodyGain.gain.exponentialRampToValueAtTime(0.45 * volScale, t + 0.006)
  bodyGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.45)
  bodySrc.connect(lp).connect(bodyGain)
  toOutput(ac, bodyGain)
  bodySrc.start(t)
  bodySrc.stop(t + 0.5)

  // 2. 高频"噼啪"颗粒：远处颗粒更少（近 12 个，远 5 个）
  const clickCount = Math.round(12 - distance * 7)
  for (let i = 0; i < clickCount; i++) {
    // 指数错峰：前密后稀（i 越大间隔越大）
    const spread = Math.pow(i / clickCount, 0.6) * 0.32
    const at = t + 0.02 + spread + Math.random() * 0.04
    const freq = 2000 + Math.random() * 4000
    const vol = (0.08 + Math.random() * 0.1) * volScale
    playClick(ac, at, freq, vol)
  }
}

export function useFireworkSound() {
  return { playCannon, playFirework }
}
