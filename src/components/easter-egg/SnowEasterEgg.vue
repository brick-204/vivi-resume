<template>
  <Teleport to="body">
    <Transition name="snow-fade">
      <div
        v-if="shouldRender"
        ref="layerRef"
        class="snow-layer"
        :style="layerStyle"
        aria-hidden="true"
        tabindex="-1"
      >
        <canvas ref="canvasRef" class="snow-canvas" />
        <!-- 玻璃取景叠层（雪天版，更淡） -->
        <div class="snow-glass" />
        <div class="snow-window-frame" />
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import {
  type SnowEffectOptions,
  clampSnowOptions,
  clamp,
  smoothstep,
  computeMaxFlakes,
} from '@/services/snowEffect'
import { createSnowAudio, type SnowAudio } from '@/services/snowAudio'
import { useEasterEggSound } from '@/composables/useEasterEggSound'

const props = defineProps<{
  options: Required<SnowEffectOptions>
  /** 单例 token：service 用来校验 finished 回调是否来自当前实例 */
  token: number
}>()
const emit = defineEmits<{ finished: [] }>()

const safe = computed(() => clampSnowOptions(props.options))
const layerStyle = computed(() => ({
  zIndex: String(safe.value.zIndex),
  opacity: 'var(--snow-opacity, 0)',
  // 压暗遮罩：雪天冷灰蓝，比雷雨淡
  background: 'var(--snow-mask, rgba(20,28,40,0))',
  pointerEvents: 'none' as const,
  userSelect: 'none' as const,
}))

// ========== 生命周期时间轴 ==========
type Phase = 'entering' | 'visible' | 'leaving' | 'finished'
const phase = ref<Phase>('entering')
const shouldRender = ref(true)

const layerRef = ref<HTMLDivElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)

let startTime = 0
let leaveStart = 0
let rafId: number | null = null
let enterTimer: ReturnType<typeof setTimeout> | null = null
let leaveTimer: ReturnType<typeof setTimeout> | null = null
let endTimer: ReturnType<typeof setTimeout> | null = null

const applyOpacity = (o: number) => {
  if (!layerRef.value) return
  layerRef.value.style.setProperty('--snow-opacity', String(o))
  layerRef.value.style.setProperty('--snow-mask', `rgba(20,28,42,${(safe.value.opacity * o).toFixed(4)})`)
}

// ========== Canvas 状态 ==========
interface SnowFlake {
  x: number
  y: number
  size: number
  speed: number
  opacity: number
  drift: number
  spin: number
  spinSpeed: number
  /** 摆动相位 + 频率（飘扬正弦项） */
  swayPhase: number
  swayFreq: number
  swayAmp: number
  life: number
  layer: 'far' | 'mid' | 'near'
}
interface SnowWind {
  current: number
  target: number
  changeAt: number
}

let ctx: CanvasRenderingContext2D | null = null
let pool: SnowFlake[] = []
let activeCount = 0
let maxFlakes = 0
let spawnAccumulator = 0
let emissionRate = 0
let emissionMultiplier = 1
let globalOpacity = 0
let cssW = 0
let cssH = 0
let dpr = 1
let prevTime = 0
let reducedMotion = false

const wind: SnowWind = { current: 0, target: 0, changeAt: 0 }

// 积雪：按 x 分桶记录累积高度，雪花触底沉积成雪堆
let accumulation: Float32Array = new Float32Array(1)
const ACCUM_BUCKET = 10 // 每桶 10px 宽
let accumulationBuckets = 1
// 雪堆上限高度（占屏幕高的比例），防止无限堆积盖满
const MAX_ACCUM_RATIO = 0.45

// 音频（sound 开启时创建）
let audio: SnowAudio | null = null
// 全局声音开关订阅：运行中切换开关时立即停/起声音
let unsubSound: (() => void) | null = null

// 三层配置：占比 / 大小 / 速度 / 透明度范围。速度加快让雪更快触底堆积
const LAYERS = {
  far: { ratio: 0.50, size: [2, 4], spd: [40, 80], opa: [0.45, 0.65] },
  mid: { ratio: 0.33, size: [4, 7], spd: [80, 140], opa: [0.6, 0.8] },
  near: { ratio: 0.17, size: [7, 12], spd: [130, 220], opa: [0.75, 0.95] },
} as const
type LayerKey = keyof typeof LAYERS

const isMobile = () => {
  if (typeof navigator === 'undefined') return false
  return /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)
}

const rand = (a: number, b: number) => a + Math.random() * (b - a)

// ========== 时间轴与淡出双通道 ==========
const enterVisible = () => {
  phase.value = 'visible'
}
const enterLeaving = () => {
  if (phase.value === 'finished') return
  phase.value = 'leaving'
  leaveStart = performance.now()
}
const finish = () => {
  if (phase.value === 'finished') return
  phase.value = 'finished'
  applyOpacity(0)
  emit('finished')
}

const updateTimeline = (now: number) => {
  const o = safe.value
  const elapsed = now - startTime
  const remaining = o.duration - elapsed

  if (remaining <= o.fadeOutDuration && phase.value !== 'entering') {
    if (phase.value === 'visible') enterLeaving()
  }

  if (phase.value === 'entering') {
    const p = o.fadeInDuration > 0 ? elapsed / o.fadeInDuration : 1
    globalOpacity = p
    emissionMultiplier = p
    if (elapsed >= o.fadeInDuration) phase.value = 'visible'
  } else if (phase.value === 'visible') {
    globalOpacity = 1
    emissionMultiplier = 1
  } else if (phase.value === 'leaving') {
    const p = o.fadeOutDuration > 0 ? (now - leaveStart) / o.fadeOutDuration : 1
    emissionMultiplier = 1 - smoothstep(p, 0, 0.65)
    globalOpacity = 1 - smoothstep(p, 0.2, 1)
  } else {
    globalOpacity = 0
    emissionMultiplier = 0
  }
  applyOpacity(Math.max(0, Math.min(globalOpacity, 1)))
}

const requestLeave = () => {
  if (enterTimer) { clearTimeout(enterTimer); enterTimer = null }
  if (leaveTimer) { clearTimeout(leaveTimer); leaveTimer = null }
  enterLeaving()
  if (endTimer) clearTimeout(endTimer)
  endTimer = setTimeout(finish, safe.value.fadeOutDuration)
}

// ========== 对象池 ==========
const pickLayer = (): LayerKey => {
  let nearRatio = LAYERS.near.ratio
  if (isMobile() || reducedMotion) nearRatio *= 0.5
  const farRatio = LAYERS.far.ratio
  const midRatio = 1 - farRatio - nearRatio
  const r = Math.random()
  if (r < farRatio) return 'far'
  if (r < farRatio + midRatio) return 'mid'
  return 'near'
}

const spawnFlake = () => {
  if (activeCount >= pool.length) return
  const key = pickLayer()
  const L = LAYERS[key]
  const speedMul = reducedMotion ? 0.7 : 1
  const f = pool[activeCount]
  f.x = rand(0, cssW)
  f.y = -f.size - rand(0, 40)
  f.size = rand(L.size[0], L.size[1])
  f.speed = rand(L.spd[0], L.spd[1]) * speedMul
  f.opacity = rand(L.opa[0], L.opa[1])
  f.drift = rand(-4, 4)
  f.spin = rand(0, Math.PI * 2)
  f.spinSpeed = reducedMotion ? 0 : rand(-2, 2)
  f.swayPhase = rand(0, Math.PI * 2)
  f.swayFreq = rand(0.6, 1.8)
  f.swayAmp = rand(15, 40)
  f.life = 0
  f.layer = key
  activeCount++
}

// ponytail: 回收——触底沉积到雪堆 / 出视口侧边消失
const recycleIfNeeded = (i: number) => {
  const f = pool[i]
  // 侧边出视口直接回收（不沉积）
  if (f.x < -f.size * 2 || f.x > cssW + f.size * 2) {
    activeCount--
    const last = pool[activeCount]
    pool[i] = last
    pool[activeCount] = f
    return true
  }
  // 触底或碰到雪堆顶部 → 沉积
  const bucket = clamp(Math.floor(f.x / ACCUM_BUCKET), 0, accumulationBuckets - 1)
  const accumHeight = accumulation[bucket]
  const groundY = cssH - accumHeight
  if (f.y + f.size >= groundY) {
    // 该桶沉积一点高度（按雪花大小），并向相邻桶扩散形成自然坡度
    const deposit = f.size * 1.2
    accumulation[bucket] = Math.min(accumulation[bucket] + deposit, cssH * MAX_ACCUM_RATIO)
    // 扩散到左右桶（雪自然滑落堆积成坡）
    if (bucket > 0) {
      accumulation[bucket - 1] = Math.min(accumulation[bucket - 1] + deposit * 0.6, cssH * MAX_ACCUM_RATIO)
    }
    if (bucket < accumulationBuckets - 1) {
      accumulation[bucket + 1] = Math.min(accumulation[bucket + 1] + deposit * 0.6, cssH * MAX_ACCUM_RATIO)
    }
    activeCount--
    const last = pool[activeCount]
    pool[i] = last
    pool[activeCount] = f
    return true
  }
  return false
}

// ========== Canvas 初始化 ==========
const setupCanvas = () => {
  const canvas = canvasRef.value
  if (!canvas) return
  const targetDpr = Math.min(window.devicePixelRatio || 1, 2)
  dpr = isMobile() ? Math.min(targetDpr, 1.5) : targetDpr
  cssW = window.innerWidth
  cssH = window.innerHeight
  canvas.width = Math.round(cssW * dpr)
  canvas.height = Math.round(cssH * dpr)
  canvas.style.width = cssW + 'px'
  canvas.style.height = cssH + 'px'
  ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.scale(dpr, dpr)
  }
  buildParticles()
}

const buildParticles = () => {
  reducedMotion = typeof matchMedia !== 'undefined'
    ? matchMedia('(prefers-reduced-motion: reduce)').matches
    : false
  maxFlakes = computeMaxFlakes(cssW, cssH, safe.value.intensity, isMobile(), reducedMotion)
  pool = Array.from({ length: maxFlakes }, () => ({
    x: 0, y: 0, size: 2, speed: 50, opacity: 0.5, drift: 0,
    spin: 0, spinSpeed: 0, swayPhase: 0, swayFreq: 1, swayAmp: 15, life: 0, layer: 'far' as LayerKey,
  }))
  activeCount = 0
  spawnAccumulator = maxFlakes * 0.5
  const avgSpeed = (LAYERS.far.spd[0] + LAYERS.near.spd[1]) / 2
  const avgLifetime = cssH / avgSpeed
  emissionRate = (maxFlakes / Math.max(avgLifetime, 0.1)) * 4
  wind.current = safe.value.wind
  wind.target = safe.value.wind
  wind.changeAt = 0
  // 积雪分桶初始化
  accumulationBuckets = Math.max(1, Math.ceil(cssW / ACCUM_BUCKET))
  accumulation = new Float32Array(accumulationBuckets)
}

// ========== 更新与绘制 ==========
const updateWind = (now: number, deltaSeconds: number) => {
  if (reducedMotion) {
    wind.current = safe.value.wind
    wind.target = safe.value.wind
    return
  }
  if (now >= wind.changeAt) {
    wind.target = safe.value.wind + rand(-0.05, 0.05)
    wind.changeAt = now + rand(2000, 4000)
  }
  wind.current += (wind.target - wind.current) * Math.min(1, deltaSeconds * 0.35)
}

const updateFlakes = (deltaSeconds: number) => {
  spawnAccumulator += emissionRate * emissionMultiplier * deltaSeconds
  while (spawnAccumulator >= 1 && activeCount < maxFlakes) {
    spawnFlake()
    spawnAccumulator -= 1
  }
  const windDrift = wind.current * 60
  for (let i = 0; i < activeCount; i++) {
    const f = pool[i]
    f.y += f.speed * deltaSeconds
    // 飘扬 = 风 + 个体 drift + 正弦摆动
    f.x += (windDrift + f.drift + Math.sin(f.life * f.swayFreq + f.swayPhase) * f.swayAmp) * deltaSeconds
    f.spin += f.spinSpeed * deltaSeconds
    f.life += deltaSeconds
    if (recycleIfNeeded(i)) i--
  }
}

/** 绘制积雪：底部按各桶高度画白色雪堆轮廓，平滑过渡成自然坡形 */
const drawAccumulation = () => {
  if (!ctx) return
  let hasSnow = false
  for (let i = 0; i < accumulationBuckets; i++) {
    if (accumulation[i] > 0.5) { hasSnow = true; break }
  }
  if (!hasSnow) return
  ctx.save()
  ctx.globalAlpha = globalOpacity
  ctx.fillStyle = 'rgba(245,250,255,1)'
  ctx.shadowBlur = 6
  ctx.shadowColor = 'rgba(220,235,255,0.5)'
  ctx.beginPath()
  ctx.moveTo(0, cssH)
  for (let i = 0; i < accumulationBuckets; i++) {
    const x = i * ACCUM_BUCKET
    const y = cssH - accumulation[i]
    if (i === 0) ctx.lineTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.lineTo(cssW, cssH)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

const draw = (now: number) => {
  if (!ctx) return
  ctx.clearRect(0, 0, cssW, cssH)
  if (globalOpacity <= 0 && activeCount === 0) return

  // 1. 积雪（底层）
  drawAccumulation()

  const globalAlpha = globalOpacity
  for (let i = 0; i < activeCount; i++) {
    const f = pool[i]
    const opacityFactor = reducedMotion ? 1 : 0.9 + Math.sin(now * 0.002 + f.life) * 0.1
    const alpha = clamp(f.opacity * opacityFactor * globalAlpha, 0, 1)
    if (alpha <= 0.01) continue

    ctx.save()
    ctx.globalAlpha = alpha
    ctx.translate(f.x, f.y)
    if (!reducedMotion) ctx.rotate(f.spin)
    // near 层加轻微发光
    if (f.layer === 'near') {
      ctx.shadowBlur = 3
      ctx.shadowColor = 'rgba(220,235,255,0.8)'
    } else if (ctx.shadowBlur !== 0) {
      ctx.shadowBlur = 0
    }
    // 径向渐变：白核心 → 透边缘
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, f.size)
    g.addColorStop(0, 'rgba(255,255,255,1)')
    g.addColorStop(0.5, 'rgba(240,248,255,0.8)')
    g.addColorStop(1, 'rgba(220,235,255,0)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(0, 0, f.size, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }
  if (ctx.shadowBlur !== 0) ctx.shadowBlur = 0
}

const loop = (now: number) => {
  const delta = Math.min(now - prevTime, 50)
  prevTime = now
  const deltaSeconds = delta / 1000

  updateTimeline(now)
  // 风声音量联动：雪势 × 容器透明度
  const a = audio as SnowAudio | null
  if (a) a.updateWindGain(emissionMultiplier * globalOpacity)
  updateWind(now, deltaSeconds)
  updateFlakes(deltaSeconds)
  draw(now)

  if (phase.value !== 'finished') rafId = requestAnimationFrame(loop)
}

// ========== 监听器 ==========
let resizeRaf: number | null = null
const onResize = () => {
  if (resizeRaf !== null) return
  resizeRaf = requestAnimationFrame(() => {
    resizeRaf = null
    setupCanvas()
  })
}
const onVisibility = () => {
  const a = audio as SnowAudio | null
  if (document.hidden) {
    if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null }
    if (a) a.stop()
  } else {
    if (a) a.start()
    prevTime = performance.now()
    const elapsed = performance.now() - startTime
    const o = safe.value
    if (elapsed >= o.duration) {
      finish()
    } else if (elapsed >= o.duration - o.fadeOutDuration) {
      enterLeaving()
      rafId = requestAnimationFrame(loop)
    } else {
      if (phase.value === 'entering' && elapsed >= o.fadeInDuration) phase.value = 'visible'
      rafId = requestAnimationFrame(loop)
    }
  }
}
let mqListener: ((e: MediaQueryListEvent) => void) | null = null

const startTimers = () => {
  const o = safe.value
  if (o.fadeInDuration > 0) enterTimer = setTimeout(enterVisible, o.fadeInDuration)
  else phase.value = 'visible'
  const leaveAt = Math.max(o.fadeInDuration, o.duration - o.fadeOutDuration)
  leaveTimer = setTimeout(enterLeaving, leaveAt)
  endTimer = setTimeout(finish, o.duration)
}

const cleanup = () => {
  if (enterTimer) { clearTimeout(enterTimer); enterTimer = null }
  if (leaveTimer) { clearTimeout(leaveTimer); leaveTimer = null }
  if (endTimer) { clearTimeout(endTimer); endTimer = null }
  if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null }
  if (resizeRaf !== null) { cancelAnimationFrame(resizeRaf); resizeRaf = null }
  const a = audio as SnowAudio | null
  if (a) { a.dispose(); audio = null }
  if (unsubSound) { unsubSound(); unsubSound = null }
  window.removeEventListener('resize', onResize)
  window.removeEventListener('visibilitychange', onVisibility)
  if (window.visualViewport) window.visualViewport.removeEventListener('resize', onResize)
  if (mqListener) {
    const mq = matchMedia('(prefers-reduced-motion: reduce)')
    mq.removeEventListener('change', mqListener)
    mqListener = null
  }
}

defineExpose({
  requestLeave,
  getActiveCount: () => activeCount,
  getEmissionMultiplier: () => emissionMultiplier,
  getFlake: (i: number) => (i < activeCount ? pool[i] : null),
  getPhase: () => phase.value,
  getAudioStarted: () => audio !== null,
})

onMounted(() => {
  startTime = performance.now()
  prevTime = startTime
  applyOpacity(0)
  setupCanvas()
  startTimers()
  if (safe.value.sound) {
    audio = createSnowAudio()
    audio.start()
  }
  // 运行中切换全局开关：立即停/起声音
  unsubSound = useEasterEggSound().onSoundChange(enabled => {
    if (enabled && !audio) {
      audio = createSnowAudio()
      audio.start()
    } else if (!enabled && audio) {
      audio.stop()
      audio = null
    }
  })
  rafId = requestAnimationFrame(loop)
  window.addEventListener('resize', onResize)
  window.addEventListener('visibilitychange', onVisibility)
  if (window.visualViewport) window.visualViewport.addEventListener('resize', onResize)
  if (typeof matchMedia !== 'undefined') {
    const mq = matchMedia('(prefers-reduced-motion: reduce)')
    mqListener = () => buildParticles()
    mq.addEventListener('change', mqListener)
  }
})

onBeforeUnmount(() => {
  cleanup()
  shouldRender.value = false
})
</script>

<style scoped>
.snow-layer {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  height: 100dvh;
  overflow: hidden;
  pointer-events: none;
  user-select: none;
  will-change: opacity;
  transition: opacity var(--snow-fade, 800ms) ease;
}
.snow-canvas {
  display: block;
  width: 100%;
  height: 100%;
}
.snow-fade-enter-active,
.snow-fade-leave-active {
  transition: opacity 800ms ease;
}
.snow-fade-enter-from,
.snow-fade-leave-to {
  opacity: 0;
}

/* ========== 玻璃取景叠层（雪天版，更淡） ========== */
.snow-glass {
  position: absolute;
  inset: 0;
  pointer-events: none;
  -webkit-backdrop-filter: blur(1.5px) brightness(0.95);
  backdrop-filter: blur(1.5px) brightness(0.95);
}
@supports not ((-webkit-backdrop-filter: blur(1px)) or (backdrop-filter: blur(1px))) {
  .snow-glass {
    background: rgba(20, 28, 42, 0.05);
  }
}

/* 窗框：细而淡的四周内阴影 */
.snow-window-frame {
  position: absolute;
  inset: 0;
  pointer-events: none;
  box-shadow:
    inset 0 0 0 6px rgba(30, 22, 16, 0.3),
    inset 0 0 50px rgba(15, 10, 6, 0.25);
}
</style>
