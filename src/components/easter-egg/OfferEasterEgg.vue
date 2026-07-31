<template>
  <Teleport to="body">
    <Transition name="offer-fade">
      <div
        v-if="shouldRender"
        ref="layerRef"
        class="offer-layer"
        :style="layerStyle"
        aria-hidden="true"
        tabindex="-1"
      >
        <canvas ref="canvasRef" class="offer-canvas" />
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import {
  type OfferEffectOptions,
  clampOfferOptions,
  clamp,
  smoothstep,
  computeMaxOffers,
} from '@/services/offerEffect'

const props = defineProps<{
  options: Required<OfferEffectOptions>
  token: number
}>()
const emit = defineEmits<{ finished: [] }>()

const safe = computed(() => clampOfferOptions(props.options))
const layerStyle = computed(() => ({
  zIndex: String(safe.value.zIndex),
  opacity: 'var(--offer-opacity, 0)',
  // offer 场景偏亮，压暗很淡
  background: 'var(--offer-mask, rgba(20,28,40,0))',
  pointerEvents: 'none' as const,
  userSelect: 'none' as const,
}))

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
  layerRef.value.style.setProperty('--offer-opacity', String(o))
  layerRef.value.style.setProperty('--offer-mask', `rgba(20,28,42,${(safe.value.opacity * o).toFixed(4)})`)
}

// ========== Canvas 状态 ==========
// offer 粒子：信封 或 纸张（写着 Offer）
interface OfferItem {
  x: number
  y: number
  size: number
  speed: number
  opacity: number
  drift: number
  spin: number
  spinSpeed: number
  swayPhase: number
  swayFreq: number
  swayAmp: number
  life: number
  layer: 'far' | 'mid' | 'near'
  kind: 'envelope' | 'paper'
}
interface OfferWind {
  current: number
  target: number
  changeAt: number
}

let ctx: CanvasRenderingContext2D | null = null
let pool: OfferItem[] = []
let activeCount = 0
let maxOffers = 0
let spawnAccumulator = 0
let emissionRate = 0
let emissionMultiplier = 1
let globalOpacity = 0
let cssW = 0
let cssH = 0
let dpr = 1
let prevTime = 0
let reducedMotion = false

const wind: OfferWind = { current: 0, target: 0, changeAt: 0 }

// 积雪式堆积：offer 掉地上堆成山
let accumulation: Float32Array = new Float32Array(1)
const ACCUM_BUCKET = 12
let accumulationBuckets = 1
const MAX_ACCUM_RATIO = 0.4

// 三层配置：占比 / 大小 / 速度 / 透明度。offer 比雪花大、稍快
const LAYERS = {
  far: { ratio: 0.50, size: [10, 16], spd: [40, 80], opa: [0.5, 0.7] },
  mid: { ratio: 0.33, size: [16, 24], spd: [80, 140], opa: [0.65, 0.85] },
  near: { ratio: 0.17, size: [24, 36], spd: [130, 200], opa: [0.8, 1.0] },
} as const
type LayerKey = keyof typeof LAYERS

const isMobile = () => {
  if (typeof navigator === 'undefined') return false
  return /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)
}

const rand = (a: number, b: number) => a + Math.random() * (b - a)

// ========== 时间轴 ==========
const enterVisible = () => { phase.value = 'visible' }
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

const spawnItem = () => {
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
  f.drift = rand(-3, 3)
  f.spin = rand(0, Math.PI * 2)
  f.spinSpeed = reducedMotion ? 0 : rand(-1.5, 1.5)
  f.swayPhase = rand(0, Math.PI * 2)
  f.swayFreq = rand(0.5, 1.4)
  f.swayAmp = rand(10, 30)
  f.life = 0
  f.layer = key
  f.kind = Math.random() < 0.5 ? 'envelope' : 'paper'
  activeCount++
}

// 触底沉积到 offer 山
const recycleIfNeeded = (i: number) => {
  const f = pool[i]
  if (f.x < -f.size * 2 || f.x > cssW + f.size * 2) {
    activeCount--
    const last = pool[activeCount]
    pool[i] = last
    pool[activeCount] = f
    return true
  }
  const bucket = clamp(Math.floor(f.x / ACCUM_BUCKET), 0, accumulationBuckets - 1)
  const groundY = cssH - accumulation[bucket]
  if (f.y + f.size * 0.5 >= groundY) {
    const deposit = f.size * 0.5
    accumulation[bucket] = Math.min(accumulation[bucket] + deposit, cssH * MAX_ACCUM_RATIO)
    if (bucket > 0) {
      accumulation[bucket - 1] = Math.min(accumulation[bucket - 1] + deposit * 0.5, cssH * MAX_ACCUM_RATIO)
    }
    if (bucket < accumulationBuckets - 1) {
      accumulation[bucket + 1] = Math.min(accumulation[bucket + 1] + deposit * 0.5, cssH * MAX_ACCUM_RATIO)
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
  maxOffers = computeMaxOffers(cssW, cssH, safe.value.intensity, isMobile(), reducedMotion)
  pool = Array.from({ length: maxOffers }, () => ({
    x: 0, y: 0, size: 12, speed: 60, opacity: 0.6, drift: 0,
    spin: 0, spinSpeed: 0, swayPhase: 0, swayFreq: 1, swayAmp: 15, life: 0,
    layer: 'far' as LayerKey, kind: 'envelope' as 'envelope' | 'paper',
  }))
  activeCount = 0
  spawnAccumulator = maxOffers * 0.5
  const avgSpeed = (LAYERS.far.spd[0] + LAYERS.near.spd[1]) / 2
  const avgLifetime = cssH / avgSpeed
  emissionRate = (maxOffers / Math.max(avgLifetime, 0.1)) * 4
  wind.current = safe.value.wind
  wind.target = safe.value.wind
  wind.changeAt = 0
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

const updateItems = (deltaSeconds: number) => {
  spawnAccumulator += emissionRate * emissionMultiplier * deltaSeconds
  while (spawnAccumulator >= 1 && activeCount < maxOffers) {
    spawnItem()
    spawnAccumulator -= 1
  }
  const windDrift = wind.current * 40
  for (let i = 0; i < activeCount; i++) {
    const f = pool[i]
    f.y += f.speed * deltaSeconds
    f.x += (windDrift + f.drift + Math.sin(f.life * f.swayFreq + f.swayPhase) * f.swayAmp) * deltaSeconds
    f.spin += f.spinSpeed * deltaSeconds
    f.life += deltaSeconds
    if (recycleIfNeeded(i)) i--
  }
}

/** 画信封：金色矩形 + 三角盖 + 封口线 */
const drawEnvelope = (s: number) => {
  if (!ctx) return
  const w = s
  const h = s * 0.68
  // 信封主体
  ctx.fillStyle = 'rgba(255,198,88,1)'
  ctx.fillRect(-w / 2, -h / 2, w, h)
  // 信封盖三角（上半部分）
  ctx.fillStyle = 'rgba(240,180,60,1)'
  ctx.beginPath()
  ctx.moveTo(-w / 2, -h / 2)
  ctx.lineTo(0, h * 0.1)
  ctx.lineTo(w / 2, -h / 2)
  ctx.closePath()
  ctx.fill()
  // 封口线（下半部分）
  ctx.strokeStyle = 'rgba(180,130,30,0.5)'
  ctx.lineWidth = Math.max(0.5, s * 0.04)
  ctx.beginPath()
  ctx.moveTo(-w / 2, -h / 2)
  ctx.lineTo(0, h * 0.1)
  ctx.lineTo(w / 2, -h / 2)
  ctx.stroke()
  // 边框
  ctx.strokeStyle = 'rgba(160,115,25,0.7)'
  ctx.lineWidth = Math.max(0.5, s * 0.05)
  ctx.strokeRect(-w / 2, -h / 2, w, h)
}

/** 画信纸（信封纸）：米白纸 + 折痕线 + "Offer" 红色印章 */
const drawPaper = (s: number) => {
  if (!ctx) return
  const w = s * 0.92
  const h = s * 0.82
  // 纸张主体（米白）
  ctx.fillStyle = 'rgba(255,251,240,1)'
  ctx.fillRect(-w / 2, -h / 2, w, h)
  // 横向折痕（信纸对折痕迹）
  ctx.strokeStyle = 'rgba(220,210,190,0.7)'
  ctx.lineWidth = Math.max(0.4, s * 0.022)
  ctx.beginPath()
  ctx.moveTo(-w / 2, 0)
  ctx.lineTo(w / 2, 0)
  ctx.stroke()
  // 边框
  ctx.strokeStyle = 'rgba(190,180,160,0.85)'
  ctx.lineWidth = Math.max(0.5, s * 0.04)
  ctx.strokeRect(-w / 2, -h / 2, w, h)
  // "Offer" 印章（红色，居中，字号按宽度限制不超出）
  const fontSize = Math.min(s * 0.2, w * 0.22)
  ctx.fillStyle = 'rgba(205,55,55,0.95)'
  ctx.font = `bold ${fontSize}px sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('Offer', 0, h * 0.22)
}

/** 画堆积的 offer 山：从底部往上分层堆叠信封/纸张，紧密排列成真实纸堆 */
const drawAccumulation = () => {
  if (!ctx) return
  let has = false
  for (let i = 0; i < accumulationBuckets; i++) {
    if (accumulation[i] > 0.5) { has = true; break }
  }
  if (!has) return

  ctx.save()
  ctx.globalAlpha = globalOpacity
  // 每个堆积桶画一个信封/纸张，从底部往上紧密堆叠
  // ponytail: 用 bucket 索引做确定性伪随机，位置稳定不闪烁
  const itemSize = ACCUM_BUCKET * 1.4 // 略宽于桶，让相邻项重叠形成堆叠感
  for (let i = 0; i < accumulationBuckets; i++) {
    const h = accumulation[i]
    if (h < 2) continue
    // 该桶堆积了几层（每层约 itemSize 高）
    const layers = Math.ceil(h / (itemSize * 0.7))
    for (let layer = 0; layer < layers; layer++) {
      // 确定性伪随机（ponytail: Math.abs 防 seed 取模负数，当前参数恒正，防御未来变化）
      const seed = (i * 73 + layer * 131 + 49297)
      const rng = ((Math.abs(seed) % 233280) / 233280)
      const rng2 = (((Math.abs(seed) * 7 + 11) % 233280) / 233280)
      const x = i * ACCUM_BUCKET + ACCUM_BUCKET / 2 + (rng - 0.5) * 4
      const y = cssH - layer * itemSize * 0.6 - itemSize * 0.4
      const kind = rng2 < 0.5 ? 'envelope' : 'paper'
      const rot = (rng - 0.5) * 0.3
      ctx.save()
      ctx.translate(x, y)
      ctx.rotate(rot)
      if (kind === 'envelope') drawEnvelope(itemSize)
      else drawPaper(itemSize)
      ctx.restore()
    }
  }
  ctx.restore()
}

const draw = (now: number) => {
  if (!ctx) return
  ctx.clearRect(0, 0, cssW, cssH)
  if (globalOpacity <= 0 && activeCount === 0) return

  // 1. offer 山（底层）
  drawAccumulation()

  const globalAlpha = globalOpacity
  for (let i = 0; i < activeCount; i++) {
    const f = pool[i]
    const opacityFactor = reducedMotion ? 1 : 0.92 + Math.sin(now * 0.002 + f.life) * 0.08
    const alpha = clamp(f.opacity * opacityFactor * globalAlpha, 0, 1)
    if (alpha <= 0.01) continue

    ctx.save()
    ctx.globalAlpha = alpha
    ctx.translate(f.x, f.y)
    if (!reducedMotion) ctx.rotate(f.spin)
    if (f.layer === 'near') {
      ctx.shadowBlur = 4
      ctx.shadowColor = 'rgba(255,220,150,0.6)'
    } else if (ctx.shadowBlur !== 0) {
      ctx.shadowBlur = 0
    }
    if (f.kind === 'envelope') drawEnvelope(f.size)
    else drawPaper(f.size)
    ctx.restore()
  }
  if (ctx.shadowBlur !== 0) ctx.shadowBlur = 0
}

const loop = (now: number) => {
  const delta = Math.min(now - prevTime, 50)
  prevTime = now
  const deltaSeconds = delta / 1000
  updateTimeline(now)
  updateWind(now, deltaSeconds)
  updateItems(deltaSeconds)
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
  if (document.hidden) {
    if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null }
  } else {
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
  getItem: (i: number) => (i < activeCount ? pool[i] : null),
  getPhase: () => phase.value,
})

onMounted(() => {
  startTime = performance.now()
  prevTime = startTime
  applyOpacity(0)
  setupCanvas()
  startTimers()
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
.offer-layer {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  height: 100dvh;
  overflow: hidden;
  pointer-events: none;
  user-select: none;
  will-change: opacity;
  transition: opacity var(--offer-fade, 800ms) ease;
}
.offer-canvas {
  display: block;
  width: 100%;
  height: 100%;
}
.offer-fade-enter-active,
.offer-fade-leave-active {
  transition: opacity 800ms ease;
}
.offer-fade-enter-from,
.offer-fade-leave-to {
  opacity: 0;
}
</style>
