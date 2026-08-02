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
  generateOfferContent,
  OFFER_COMPANIES,
} from '@/services/offerEffect'
import { createRainAudio, type RainAudio } from '@/services/rainAudio'

const props = defineProps<{
  options: Omit<OfferEffectOptions, 'companies'> & { companies?: string[] }
  token: number
}>()
const emit = defineEmits<{ finished: [] }>()

const safe = computed(() => clampOfferOptions(props.options))
// 本次彩蛋公司列表快照：props 注入优先，否则回落默认 8 家
const companies = computed<string[]>(() => {
  const c = (props.options.companies ?? safe.value.companies)
  return c && c.length > 0 ? c : OFFER_COMPANIES
})
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
// offer 粒子：信纸（写着 公司 + Offer）
// sprite 内部纸张占 PAPER_W×PAPER_H（相对 size），绘制与贴图共用此比例避免变形
const PAPER_W = 0.92
const PAPER_H = 0.82
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
  content: { company: string; label: string }
  // 翻面：flipPhase 推进，draw 用 Math.cos(flipPhase) 的符号切正反
  flipPhase: number
  flipSpeed: number
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
// 音频（sound 开启时创建）：复用雨声，offer 雨视觉配雨声
let audio: RainAudio | null = null

const wind: OfferWind = { current: 0, target: 0, changeAt: 0 }

// 积雪式堆积：offer 掉地上堆成山 —— 离屏 stamp canvas，触地即盖印，自然成堆
let accumulation: Float32Array = new Float32Array(1)
const ACCUM_BUCKET = 12
let accumulationBuckets = 1
const MAX_ACCUM_RATIO = 0.4
// 离屏堆积画布：触地粒子 stamp 到此，drawAccumulation 一次性贴图
let accumCanvas: HTMLCanvasElement | null = null
let accumCtx: CanvasRenderingContext2D | null = null

// B：sprite 预渲染缓存。按 company → size 档位索引。
// 每家公司每档位预渲染一张完整信纸（含印章文字），运行时零文字绘制。
const SPRITE_SIZE_BUCKETS = [40, 50, 62, 76, 92, 108] as const
// company -> size -> sprite
let spriteCache: Map<string, Map<number, HTMLCanvasElement>> | null = null
// sprite 是否可用（jsdom/极端环境预渲染失败则 false，draw 跳过该粒子）
let spriteReady = false

// 三层配置：占比 / 大小 / 速度 / 透明度。仅信纸，放大让印章字看清
const LAYERS = {
  far: { ratio: 0.50, size: [40, 56], spd: [40, 80], opa: [0.5, 0.7] },
  mid: { ratio: 0.33, size: [56, 76], spd: [80, 140], opa: [0.65, 0.85] },
  near: { ratio: 0.17, size: [76, 108], spd: [130, 200], opa: [0.8, 1.0] },
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
  f.life = 0
  f.layer = key
  f.content = generateOfferContent(Math.random(), companies.value)
  // 信纸轻而飘：大漂移、大摇摆、会翻面
  f.drift = rand(-4, 4)
  f.spin = rand(0, Math.PI * 2)
  f.spinSpeed = reducedMotion ? 0 : rand(-2.0, 2.0)
  f.swayPhase = rand(0, Math.PI * 2)
  f.swayFreq = rand(0.6, 1.5)
  f.swayAmp = rand(14, 34)
  f.flipPhase = rand(0, Math.PI * 2)
  f.flipSpeed = reducedMotion ? 0 : rand(1.2, 2.6)
  activeCount++
}

// 触底沉积到 offer 山：更新高度数组 + stamp 到离屏 canvas
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
    // stamp 到离屏堆积画布：以当前姿态盖印，自然形成不规则纸堆
    stampToAccum(f, groundY)
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

/** 把触地粒子以当前姿态盖印到离屏堆积画布 */
const stampToAccum = (f: OfferItem, groundY: number) => {
  if (!accumCtx || !spriteReady) return
  const s = quantizeSize(f.size)
  const sprite = spriteCache?.get(f.content.company)?.get(s)
  if (!sprite) return
  accumCtx.save()
  accumCtx.globalAlpha = 0.92 * f.opacity
  accumCtx.translate(f.x, groundY - f.size * 0.3)
  accumCtx.rotate(f.spin)
  // ponytail: 堆积体不画文字细节，只贴 sprite 轮廓，避免远看糊成一团
  accumCtx.drawImage(sprite, -s * PAPER_W / 2, -s * PAPER_H / 2, s * PAPER_W, s * PAPER_H)
  accumCtx.restore()
}

/** 把连续 size 量化到最近的 sprite 档位，复用有限张 sprite */
const quantizeSize = (size: number): number => {
  let best: number = SPRITE_SIZE_BUCKETS[0]
  let bestDiff = Infinity
  for (const b of SPRITE_SIZE_BUCKETS) {
    const d = Math.abs(b - size)
    if (d < bestDiff) { bestDiff = d; best = b }
  }
  return best
}

// ========== Canvas 初始化 ==========
const setupCanvas = () => {
  const canvas = canvasRef.value
  if (!canvas) return
  // ponytail: cap dpr 到 1.5。offer 是短暂彩蛋特效，非阅读内容，
  // 2K/4K 屏 dpr=2 时 canvas 像素翻倍导致掉帧，1.5 视觉差异极小
  const targetDpr = Math.min(window.devicePixelRatio || 1, 1.5)
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
    layer: 'far' as LayerKey,
    content: { company: '', label: 'Offer' },
    flipPhase: 0, flipSpeed: 0,
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
  // 离屏堆积画布：与主 canvas 同尺寸，触地粒子 stamp 到此
  accumCanvas = document.createElement('canvas')
  accumCanvas.width = Math.round(cssW * dpr)
  accumCanvas.height = Math.round(cssH * dpr)
  accumCtx = accumCanvas.getContext('2d')
  if (accumCtx) {
    accumCtx.setTransform(1, 0, 0, 1, 0, 0)
    accumCtx.scale(dpr, dpr)
  }
}

// ========== 更新与绘制 ==========

// B：sprite 预渲染 —— 离屏 canvas 画精致信纸，主循环只 drawImage
// 失败（jsdom/无 gradient 支持）则 spriteReady=false，draw 跳过该粒子

/** 画空白信纸底（预渲染进 sprite）：米白渐变 + 折痕 + 打印行 + 边框。不含印章文字 */
const paintPaperBase = (c: CanvasRenderingContext2D, s: number) => {
  const w = s * PAPER_W
  const h = s * PAPER_H
  // 纸张主体（米白渐变）
  const g = c.createLinearGradient(0, -h / 2, 0, h / 2)
  g.addColorStop(0, '#fffdf6')
  g.addColorStop(1, '#f7f1e0')
  c.fillStyle = g
  c.fillRect(-w / 2, -h / 2, w, h)
  // 横向折痕
  c.strokeStyle = 'rgba(210,198,170,0.6)'
  c.lineWidth = Math.max(0.4, s * 0.022)
  c.beginPath()
  c.moveTo(-w / 2, 0)
  c.lineTo(w / 2, 0)
  c.stroke()
  // 顶部打印行（模拟公司名行，灰色短横线）
  c.strokeStyle = 'rgba(150,140,120,0.45)'
  c.lineWidth = Math.max(0.4, s * 0.02)
  const lineY = -h * 0.28
  for (let i = 0; i < 3; i++) {
    const ly = lineY + i * s * 0.07
    const lw = (w * 0.7) * (1 - i * 0.18)
    c.beginPath()
    c.moveTo(-lw / 2, ly)
    c.lineTo(lw / 2, ly)
    c.stroke()
  }
  // 边框
  c.strokeStyle = 'rgba(180,168,145,0.8)'
  c.lineWidth = Math.max(0.5, s * 0.04)
  c.strokeRect(-w / 2, -h / 2, w, h)
}

/** 画红色印章 + 公司名 + Offer（draw 时动态调用，每片纸文字不同） */
const paintStamp = (c: CanvasRenderingContext2D, s: number, content: { company: string; label: string }) => {
  const w = s * PAPER_W
  const h = s * PAPER_H
  c.save()
  c.translate(0, h * 0.18)
  c.rotate(-0.08)
  const stampW = w * 0.72
  const stampH = s * 0.34
  c.fillStyle = 'rgba(200,50,50,0.88)'
  c.strokeStyle = 'rgba(200,50,50,0.95)'
  c.lineWidth = Math.max(0.5, s * 0.025)
  const r = Math.max(1, s * 0.04)
  // 圆角矩形
  c.beginPath()
  c.moveTo(-stampW / 2 + r, -stampH / 2)
  c.lineTo(stampW / 2 - r, -stampH / 2)
  c.quadraticCurveTo(stampW / 2, -stampH / 2, stampW / 2, -stampH / 2 + r)
  c.lineTo(stampW / 2, stampH / 2 - r)
  c.quadraticCurveTo(stampW / 2, stampH / 2, stampW / 2 - r, stampH / 2)
  c.lineTo(-stampW / 2 + r, stampH / 2)
  c.quadraticCurveTo(-stampW / 2, stampH / 2, -stampW / 2, stampH / 2 - r)
  c.lineTo(-stampW / 2, -stampH / 2 + r)
  c.quadraticCurveTo(-stampW / 2, -stampH / 2, -stampW / 2 + r, -stampH / 2)
  c.closePath()
  c.fill()
  c.stroke()
  // 印章文字：公司名（上）+ Offer（下），字号按宽度限制
  const companyFont = Math.max(5, Math.min(s * 0.16, stampW / Math.max(content.company.length, 2) * 0.9))
  c.fillStyle = 'rgba(255,250,245,0.96)'
  c.font = `bold ${companyFont}px sans-serif`
  c.textAlign = 'center'
  c.textBaseline = 'middle'
  c.fillText(content.company, 0, -stampH * 0.16)
  const labelFont = Math.max(6, s * 0.19)
  c.font = `bold ${labelFont}px sans-serif`
  c.fillText(content.label, 0, stampH * 0.22)
  c.restore()
}

/** 为给定 size + company 预渲染一张完整信纸 sprite（空白底 + 印章文字） */
const renderSprite = (size: number, company: string): HTMLCanvasElement | null => {
  const scale = 2 // 高清预渲染
  const cv = document.createElement('canvas')
  cv.width = Math.ceil(size * scale)
  cv.height = Math.ceil(size * scale)
  const c = cv.getContext('2d')
  if (!c) return null
  c.scale(scale, scale)
  c.translate(size / 2, size / 2)
  try {
    paintPaperBase(c, size)
    paintStamp(c, size, { company, label: 'Offer' })
  } catch {
    return null
  }
  return cv
}

/** 预渲染所有公司 × 档位 sprite，填满缓存。失败则 spriteReady 保持 false */
const buildSprites = () => {
  spriteCache = new Map()
  let ok = true
  for (const company of companies.value) {
    const sizeMap = new Map<number, HTMLCanvasElement>()
    for (const s of SPRITE_SIZE_BUCKETS) {
      const p = renderSprite(s, company)
      if (!p) { ok = false; break }
      sizeMap.set(s, p)
    }
    if (!ok) break
    spriteCache.set(company, sizeMap)
  }
  spriteReady = ok
}

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
    // 翻面推进：flipPhase 在 draw 时用 Math.cos 的符号切正反
    if (f.flipSpeed > 0) f.flipPhase += f.flipSpeed * deltaSeconds
    f.life += deltaSeconds
    if (recycleIfNeeded(i)) i--
  }
}

/** 画堆积的 offer 山：直接贴离屏 stamp canvas（触地粒子已盖印） */
const drawAccumulation = () => {
  if (!ctx || !accumCanvas) return
  let has = false
  for (let i = 0; i < accumulationBuckets; i++) {
    if (accumulation[i] > 0.5) { has = true; break }
  }
  if (!has) return
  ctx.save()
  ctx.globalAlpha = globalOpacity
  // 一次性贴整张离屏堆积画布（css 坐标系，accumCtx 已 scale dpr）
  ctx.drawImage(accumCanvas, 0, 0, cssW, cssH)
  ctx.restore()
}

const draw = (now: number) => {
  if (!ctx) return
  ctx.clearRect(0, 0, cssW, cssH)
  if (globalOpacity <= 0 && activeCount === 0) return

  // 1. offer 山（底层）
  drawAccumulation()

  const gAlpha = globalOpacity
  for (let i = 0; i < activeCount; i++) {
    const f = pool[i]
    const opacityFactor = reducedMotion ? 1 : 0.92 + Math.sin(now * 0.002 + f.life) * 0.08
    const alpha = clamp(f.opacity * opacityFactor * gAlpha, 0, 1)
    if (alpha <= 0.01) continue

    ctx.save()
    ctx.globalAlpha = alpha
    ctx.translate(f.x, f.y)
    if (!reducedMotion) ctx.rotate(f.spin)
    // ponytail: 景深不用 ctx.filter blur（每帧高斯模糊 N 粒子，性能崩盘），
    // 靠 far 层已有的小 size + 低 opa 体现纵深感，零运行时模糊开销

    if (spriteReady && spriteCache) {
      // B：sprite 贴图 + 翻面（scaleX = |cos|，过零切正反）
      // ponytail: far 层粒子小且半透明，翻面不可见，直接当静态贴图省计算
      const s = quantizeSize(f.size)
      const sprite = spriteCache.get(f.content.company)?.get(s)
      if (sprite) {
        const px = -s * PAPER_W / 2
        const py = -s * PAPER_H / 2
        const pw = s * PAPER_W
        const ph = s * PAPER_H
        if (f.flipSpeed > 0 && !reducedMotion && f.layer !== 'far') {
          const sx = Math.cos(f.flipPhase)
          ctx.scale(Math.abs(sx) < 0.05 ? 0.05 : Math.abs(sx), 1)
          ctx.drawImage(sprite, px, py, pw, ph)
          // 反面盖一层半透明灰模拟纸背，省掉第二张 sprite
          if (sx < 0) {
            ctx.fillStyle = 'rgba(120,110,90,0.3)'
            ctx.fillRect(px, py, pw, ph)
          }
        } else {
          ctx.drawImage(sprite, px, py, pw, ph)
        }
        ctx.restore()
        continue
      }
    }
    // sprite 不可用（极端环境预渲染失败）则跳过该粒子
    ctx.restore()
  }
}

const loop = (now: number) => {
  const delta = Math.min(now - prevTime, 50)
  prevTime = now
  const deltaSeconds = delta / 1000
  updateTimeline(now)
  // 音量联动：offer 势 × 容器透明度（淡出时也降音量）
  const a = audio as RainAudio | null
  if (a) a.updateRainGain(emissionMultiplier * globalOpacity)
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
  // 音频释放：dispose 关闭 AudioContext
  const a = audio as RainAudio | null
  if (a) { a.dispose(); audio = null }
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
  /** 音频是否已启动（测试用） */
  getAudioStarted: () => audio !== null,
})

onMounted(() => {
  startTime = performance.now()
  prevTime = startTime
  applyOpacity(0)
  setupCanvas()
  buildSprites()
  startTimers()
  // 音效：sound 开启时创建并启动（service 层已确认用户偏好，此处 AudioContext 由 offer 按键手势链触发）
  // 复用雨声但调成细雨：低通 400Hz 去"沙沙"颗粒感留闷柔底噪，音量 0.10 更轻；不调 triggerThunder 故无雷
  if (safe.value.sound) {
    audio = createRainAudio({ cutoff: 400, baseGain: 0.10 })
    audio.start()
  }
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
