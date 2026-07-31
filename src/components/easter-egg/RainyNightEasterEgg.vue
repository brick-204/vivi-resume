<template>
  <Teleport to="body">
    <Transition name="rn-fade">
      <div
        v-if="shouldRender"
        ref="layerRef"
        class="rainy-night-layer"
        :style="layerStyle"
        aria-hidden="true"
        tabindex="-1"
      >
        <canvas ref="canvasRef" class="rainy-night-canvas" />
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import type { RainyNightEffectOptions } from '@/services/rainyNightEffect'

const props = defineProps<{
  options: RainyNightEffectOptions
  /** 单例 token：service 用来校验 finished 回调是否来自当前实例 */
  token: number
}>()
const emit = defineEmits<{ finished: [] }>()

// ========== Props 安全化（service 已 clamp，这里二次防御，保证组件独立可用） ==========
const safe = computed(() => clampOptions(props.options))
const layerStyle = computed(() => ({
  zIndex: String(safe.value.zIndex),
  // ponytail: 淡入淡出只动 opacity，CSS Transition 接管；每帧由时间轴写入 --rn-opacity
  opacity: 'var(--rn-opacity, 0)',
  transitionDuration: `${safe.value.fadeOutDuration}ms`,
}))

// ========== 生命周期时间轴（不依赖 animationend，timer + 统一时间轴兜底） ==========
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
  if (layerRef.value) layerRef.value.style.setProperty('--rn-opacity', String(o))
}

// 单一时间轴：loop 内每帧同时更新 opacity 与 canvas 绘制，避免双 rAF
const updateOpacity = (now: number) => {
  const o = safe.value
  const elapsed = now - startTime
  let opacity: number
  if (phase.value === 'entering') {
    opacity = o.fadeInDuration > 0 ? (elapsed / o.fadeInDuration) * o.opacity : o.opacity
    if (elapsed >= o.fadeInDuration) phase.value = 'visible'
  } else if (phase.value === 'visible') {
    opacity = o.opacity
  } else if (phase.value === 'leaving') {
    const p = o.fadeOutDuration > 0 ? (now - leaveStart) / o.fadeOutDuration : 1
    opacity = (1 - Math.min(p, 1)) * o.opacity
  } else {
    opacity = 0
  }
  applyOpacity(Math.max(0, Math.min(opacity, o.opacity)))
}

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

/** 供 service 的 hide() 调用：立即进入淡出 */
const requestLeave = () => {
  if (enterTimer) { clearTimeout(enterTimer); enterTimer = null }
  if (leaveTimer) { clearTimeout(leaveTimer); leaveTimer = null }
  enterLeaving()
  // 淡出结束后收尾
  if (endTimer) clearTimeout(endTimer)
  endTimer = setTimeout(finish, safe.value.fadeOutDuration)
}
defineExpose({ requestLeave })

// ========== Canvas 绘制 ==========
interface Raindrop {
  x: number
  y: number
  radiusX: number
  radiusY: number
  speed: number
  opacity: number
  highlight: number
  trailLength: number
  moving: boolean
  /** 下滑时的轻微横向偏移幅度（水痕非笔直） */
  wobble?: number
  wobblePhase?: number
}
interface BokehLight {
  x: number
  y: number
  radius: number
  opacity: number
  blur: number
}

let ctx: CanvasRenderingContext2D | null = null
let staticDrops: Raindrop[] = []
let movingDrops: Raindrop[] = []
let bokeh: BokehLight[] = []
let noisePoints: { x: number; y: number; a: number }[] = []
let cssW = 0
let cssH = 0
let dpr = 1
let prevTime = 0
let reducedMotion = false

const isMobile = () => {
  if (typeof navigator === 'undefined') return false
  return /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)
}

const perfFactor = () => {
  // ponytail: 低性能设备降粒子数。hardwareConcurrency/deviceMemory 不一定可用，保守取值
  const cores = (navigator as any).hardwareConcurrency ?? 4
  const mem = (navigator as any).deviceMemory ?? 4
  let f = 1
  if (cores <= 2 || mem <= 2) f = 0.5
  else if (cores <= 4 || mem <= 4) f = 0.75
  if (isMobile()) f *= 0.6
  return f
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

const buildParticles = () => {
  const area = cssW * cssH
  const intensity = safe.value.intensity
  const pf = perfFactor()
  reducedMotion = typeof matchMedia !== 'undefined'
    ? matchMedia('(prefers-reduced-motion: reduce)').matches
    : false

  // 面积归一化到 1920x1080 ≈ 2.07e6
  const areaScale = clamp(area / 2_070_000, 0.5, 2.2)

  const staticCount = Math.round(clamp(60 * areaScale * intensity * pf, 60, 280))
  const moveBase = Math.round(clamp(12 * areaScale * intensity * pf, 8, 40))
  const movingCount = reducedMotion ? Math.max(2, Math.round(moveBase * 0.3)) : moveBase
  const bokehCount = Math.round(clamp(10 * areaScale * intensity * pf, 8, 36))

  const rand = (a: number, b: number) => a + Math.random() * (b - a)

  staticDrops = Array.from({ length: staticCount }, () => {
    const r = rand(2, 9)
    return {
      x: rand(0, cssW),
      y: rand(0, cssH),
      radiusX: r,
      radiusY: r * rand(0.8, 1.2),
      speed: 0,
      opacity: rand(0.25, 0.6),
      highlight: rand(0.4, 0.85),
      trailLength: 0,
      moving: false,
    }
  })

  const speedMul = reducedMotion ? 0.3 : 1
  movingDrops = Array.from({ length: movingCount }, () => {
    const r = rand(4, 11)
    return {
      x: rand(0, cssW),
      y: rand(-cssH * 0.2, cssH),
      radiusX: r,
      radiusY: r * rand(1.1, 1.6),
      speed: rand(18, 48) * speedMul,
      opacity: rand(0.35, 0.65),
      highlight: rand(0.5, 0.9),
      trailLength: rand(40, 110),
      moving: true,
      wobble: rand(0, 2.5),
      wobblePhase: rand(0, Math.PI * 2),
    }
  })

  // 散景集中在下半部
  bokeh = Array.from({ length: bokehCount }, () => {
    const radius = rand(20, 90)
    return {
      x: rand(0, cssW),
      y: rand(cssH * 0.45, cssH + 30),
      radius,
      opacity: rand(0.12, 0.4),
      blur: rand(2, 14),
    }
  })

  // 预生成颗粒噪点（非闪烁，静态）
  const noiseCount = Math.round(clamp(120 * areaScale * pf, 60, 260))
  noisePoints = Array.from({ length: noiseCount }, () => ({
    x: rand(0, cssW),
    y: rand(0, cssH),
    a: rand(0.02, 0.08),
  }))
}

const setupCanvas = () => {
  const canvas = canvasRef.value
  if (!canvas) return
  const targetDpr = Math.min(window.devicePixelRatio || 1, 2)
  // 低性能/移动端限制 1.5
  dpr = isMobile() || perfFactor() < 0.7 ? Math.min(targetDpr, 1.5) : targetDpr
  cssW = window.innerWidth
  cssH = window.innerHeight
  canvas.width = Math.round(cssW * dpr)
  canvas.height = Math.round(cssH * dpr)
  canvas.style.width = cssW + 'px'
  canvas.style.height = cssH + 'px'
  ctx = canvas.getContext('2d')
  if (ctx) {
    // ponytail: 先重置 transform 再 scale，避免 resize 累积
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.scale(dpr, dpr)
  }
  buildParticles()
}

const drawDrop = (d: Raindrop) => {
  if (!ctx) return
  ctx.save()
  ctx.globalAlpha = d.opacity
  // 折射感：径向渐变主体 + 边缘高光
  const grad = ctx.createRadialGradient(
    d.x - d.radiusX * 0.3, d.y - d.radiusY * 0.3, 0,
    d.x, d.y, Math.max(d.radiusX, d.radiusY),
  )
  grad.addColorStop(0, 'rgba(180, 200, 230, 0.9)')
  grad.addColorStop(0.6, 'rgba(90, 110, 140, 0.5)')
  grad.addColorStop(1, 'rgba(40, 50, 70, 0.2)')
  ctx.fillStyle = grad
  ctx.beginPath()
  ctx.ellipse(d.x, d.y, d.radiusX, d.radiusY, 0, 0, Math.PI * 2)
  ctx.fill()
  // 边缘高光
  ctx.globalAlpha = d.opacity * d.highlight
  ctx.strokeStyle = 'rgba(220, 235, 255, 0.7)'
  ctx.lineWidth = 0.8
  ctx.beginPath()
  ctx.ellipse(d.x, d.y, d.radiusX, d.radiusY, 0, 0, Math.PI * 2)
  ctx.stroke()
  // 顶部小高光点
  ctx.globalAlpha = d.opacity * d.highlight * 0.8
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
  ctx.beginPath()
  ctx.arc(d.x - d.radiusX * 0.3, d.y - d.radiusY * 0.4, d.radiusX * 0.18, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

/** 移动水滴的水痕：沿下滑路径画一条头粗尾细、半透明渐变的细线，带轻微抖动 */
const drawMovingTrail = (d: Raindrop, t: number) => {
  if (!ctx) return
  const w = d.wobble ?? 0
  const ph = d.wobblePhase ?? 0
  const headX = d.x + Math.sin(t * 0.02 + ph) * w
  const tailY = d.y - d.trailLength
  const tailX = d.x + Math.sin((t - d.trailLength) * 0.02 + ph) * w
  const headW = d.radiusX * 0.55
  const tailW = d.radiusX * 0.12

  ctx.save()
  ctx.globalAlpha = d.opacity * 0.22
  // 沿路径线性渐变：尾部透明 → 头部略实
  const grad = ctx.createLinearGradient(tailX, tailY, headX, d.y)
  grad.addColorStop(0, 'rgba(170, 195, 225, 0)')
  grad.addColorStop(0.6, 'rgba(170, 195, 225, 0.35)')
  grad.addColorStop(1, 'rgba(190, 210, 235, 0.6)')
  ctx.strokeStyle = grad
  ctx.lineCap = 'round'
  // 用变宽度的 path 近似锥形：分两段，头部粗、尾部细
  ctx.beginPath()
  ctx.moveTo(tailX, tailY)
  ctx.quadraticCurveTo(
    (tailX + headX) / 2 + Math.sin((t - d.trailLength / 2) * 0.02 + ph) * w * 0.7,
    tailY + d.trailLength / 2,
    headX, d.y,
  )
  // 多次描边递减宽度模拟头粗尾细
  ctx.lineWidth = tailW
  ctx.stroke()
  ctx.globalAlpha = d.opacity * 0.28
  ctx.lineWidth = headW
  // 仅头部一段用粗线
  ctx.beginPath()
  ctx.moveTo(headX - d.trailLength * 0.35, d.y - d.trailLength * 0.35)
  ctx.quadraticCurveTo(headX, d.y - d.trailLength * 0.15, headX, d.y)
  ctx.stroke()
  ctx.restore()
}

/** 移动水滴本体：水滴形（上尖下圆），带折射渐变 + 边缘高光 */
const drawMovingDrop = (d: Raindrop, t: number) => {
  if (!ctx) return
  const w = d.wobble ?? 0
  const ph = d.wobblePhase ?? 0
  const x = d.x + Math.sin(t * 0.02 + ph) * w
  const y = d.y
  const rx = d.radiusX
  const ry = d.radiusY
  // 下滑时拉长：越快越长
  const stretch = 1 + Math.min(d.speed / 60, 0.6)
  const ryS = ry * stretch

  ctx.save()
  ctx.globalAlpha = d.opacity
  // 折射渐变
  const grad = ctx.createRadialGradient(
    x - rx * 0.3, y - ryS * 0.3, 0,
    x, y, Math.max(rx, ryS),
  )
  grad.addColorStop(0, 'rgba(190, 210, 235, 0.95)')
  grad.addColorStop(0.55, 'rgba(95, 115, 145, 0.55)')
  grad.addColorStop(1, 'rgba(45, 55, 75, 0.25)')
  ctx.fillStyle = grad
  ctx.beginPath()
  // 水滴形：顶部尖（向上收窄），底部圆
  ctx.moveTo(x, y - ryS) // 顶点
  ctx.bezierCurveTo(
    x + rx * 0.55, y - ryS * 0.5,
    x + rx, y + ryS * 0.15,
    x + rx * 0.7, y + ryS * 0.7,
  )
  ctx.bezierCurveTo(
    x + rx * 0.4, y + ryS,
    x - rx * 0.4, y + ryS,
    x - rx * 0.7, y + ryS * 0.7,
  )
  ctx.bezierCurveTo(
    x - rx, y + ryS * 0.15,
    x - rx * 0.55, y - ryS * 0.5,
    x, y - ryS,
  )
  ctx.fill()
  // 边缘高光
  ctx.globalAlpha = d.opacity * d.highlight
  ctx.strokeStyle = 'rgba(225, 240, 255, 0.7)'
  ctx.lineWidth = 0.8
  ctx.stroke()
  // 顶部小高光点
  ctx.globalAlpha = d.opacity * d.highlight * 0.8
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)'
  ctx.beginPath()
  ctx.arc(x - rx * 0.25, y + ryS * 0.1, rx * 0.16, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

const draw = (now: number) => {
  if (!ctx) return
  const delta = Math.min(now - prevTime, 50) // 限制 delta，防标签恢复跳跃
  prevTime = now

  // 1. 暗蓝黑径向渐变底色（非纯黑）
  const bg = ctx.createRadialGradient(
    cssW * 0.5, cssH * 0.4, 0,
    cssW * 0.5, cssH * 0.5, Math.max(cssW, cssH) * 0.75,
  )
  bg.addColorStop(0, '#0a1424')
  bg.addColorStop(0.6, '#070d18')
  bg.addColorStop(1, '#03060d')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, cssW, cssH)

  // 2. 暖黄散景光斑（底部中下部）
  for (const b of bokeh) {
    ctx.save()
    ctx.globalAlpha = b.opacity
    ctx.filter = `blur(${b.blur}px)`
    const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.radius)
    g.addColorStop(0, 'rgba(255, 200, 110, 0.95)')
    g.addColorStop(0.5, 'rgba(255, 170, 70, 0.5)')
    g.addColorStop(1, 'rgba(255, 150, 50, 0)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }
  ctx.filter = 'none'

  // 3. 极淡雾气
  ctx.save()
  ctx.globalAlpha = 0.08
  const fog = ctx.createRadialGradient(
    cssW * 0.5, cssH * 0.7, 0,
    cssW * 0.5, cssH * 0.7, Math.max(cssW, cssH) * 0.6,
  )
  fog.addColorStop(0, 'rgba(120, 140, 170, 0.5)')
  fog.addColorStop(1, 'rgba(120, 140, 170, 0)')
  ctx.fillStyle = fog
  ctx.fillRect(0, 0, cssW, cssH)
  ctx.restore()

  // 4. 移动水滴 + 水痕（头粗尾细的锥形水痕 + 水滴形头部 + 轻微抖动）
  for (const d of movingDrops) {
    d.y += d.speed * (delta / 1000)
    if (d.y - d.trailLength > cssH) {
      d.y = -d.radiusY
      d.x = Math.random() * cssW
    }
    const t = d.y // 头部时间参数，用于抖动
    drawMovingTrail(d, t)
    drawMovingDrop(d, t)
  }

  // 5. 静态水珠
  for (const d of staticDrops) drawDrop(d)

  // 6. 暗角
  ctx.save()
  const vig = ctx.createRadialGradient(
    cssW * 0.5, cssH * 0.5, Math.min(cssW, cssH) * 0.35,
    cssW * 0.5, cssH * 0.5, Math.max(cssW, cssH) * 0.75,
  )
  vig.addColorStop(0, 'rgba(0, 0, 0, 0)')
  vig.addColorStop(1, 'rgba(0, 0, 0, 0.55)')
  ctx.fillStyle = vig
  ctx.fillRect(0, 0, cssW, cssH)
  ctx.restore()

  // 7. 静态颗粒感
  ctx.save()
  for (const n of noisePoints) {
    ctx.globalAlpha = n.a
    ctx.fillStyle = '#aab8cc'
    ctx.fillRect(n.x, n.y, 1, 1)
  }
  ctx.restore()
}

const loop = (now: number) => {
  updateOpacity(now)
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
    // 恢复：重置 prevTime，按真实时间判断是否已结束
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

// ========== options 变化：重新播放时间轴（service 复用实例时触发） ==========
watch(() => props.options, () => {
  // 重置时间轴从头播放
  cleanup()
  phase.value = 'entering'
  startTime = performance.now()
  prevTime = startTime
  applyOpacity(0)
  setupCanvas()
  startTimers()
  rafId = requestAnimationFrame(loop)
}, { deep: true })

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
  // reduced-motion 变化时重建粒子
  if (typeof matchMedia !== 'undefined') {
    const mq = matchMedia('(prefers-reduced-motion: reduce)')
    mqListener = () => buildParticles()
    mq.addEventListener('change', mqListener)
  }
})

onBeforeUnmount(() => {
  cleanup()
  // 卸载后立即清 will-change，避免长期驻留
  shouldRender.value = false
})

// ========== 本地 clamp（与 service 一致，组件独立可用时的防御） ==========
function clampOptions(o: RainyNightEffectOptions): Required<RainyNightEffectOptions> {
  const duration = clamp(o.duration ?? 13000, 2000, 30000)
  let fadeIn = clamp(o.fadeInDuration ?? 800, 0, 3000)
  let fadeOut = clamp(o.fadeOutDuration ?? 3500, 0, 5000)
  // 不变量：fadeIn + fadeOut <= duration，否则按比例压缩
  if (fadeIn + fadeOut > duration) {
    const sum = fadeIn + fadeOut
    fadeIn = Math.floor((fadeIn / sum) * duration)
    fadeOut = duration - fadeIn
  }
  return {
    duration,
    fadeInDuration: fadeIn,
    fadeOutDuration: fadeOut,
    intensity: clamp(o.intensity ?? 0.7, 0, 1),
    opacity: clamp(o.opacity ?? 0.92, 0, 1),
    zIndex: Math.round(clamp(o.zIndex ?? 2147483000, 0, 2147483647)),
  }
}
</script>

<style scoped>
.rainy-night-layer {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  height: 100dvh;
  overflow: hidden;
  pointer-events: none;
  user-select: none;
  touch-action: none;
  will-change: opacity;
  /* opacity 由 --rn-opacity 驱动，CSS Transition 辅助淡出 */
  transition: opacity var(--rn-fade, 800ms) ease;
}
.rainy-night-canvas {
  display: block;
  width: 100%;
  height: 100%;
}
/* backdrop-filter 仅作增强，不支持时降级（散景已在 canvas 内） */
@supports (backdrop-filter: blur(1px)) {
  .rainy-night-layer {
    backdrop-filter: blur(0.5px);
    -webkit-backdrop-filter: blur(0.5px);
  }
}
/* Transition：Teleport 后 scoped 仍生效（Vue 3 对 Teleport 内容加 data 属性） */
.rn-fade-enter-active,
.rn-fade-leave-active {
  transition: opacity 800ms ease;
}
.rn-fade-enter-from,
.rn-fade-leave-to {
  opacity: 0;
}
</style>
