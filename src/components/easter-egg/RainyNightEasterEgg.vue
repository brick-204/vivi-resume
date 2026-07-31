<template>
  <Teleport to="body">
    <Transition name="lr-fade">
      <div
        v-if="shouldRender"
        ref="layerRef"
        class="light-rain-layer"
        :style="layerStyle"
        aria-hidden="true"
        tabindex="-1"
      >
        <canvas ref="canvasRef" class="light-rain-canvas" />
        <!-- 玻璃取景叠层（纯 CSS，pointer-events 透传） -->
        <div class="lr-glass" />
        <div class="lr-window-frame" />
        <div class="lr-droplets" aria-hidden="true">
          <i
            v-for="(d, i) in droplets"
            :key="i"
            class="lr-droplet"
            :style="d.style"
          />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import {
  type LightRainEffectOptions,
  clampLightRainOptions,
  clamp,
  smoothstep,
  computeMaxDrops,
} from '@/services/rainyNightEffect'
import { createRainAudio, type RainAudio, THUNDER_DELAY_RANGE } from '@/services/rainAudio'
import { useEasterEggSound } from '@/composables/useEasterEggSound'

const props = defineProps<{
  options: Required<LightRainEffectOptions>
  /** 单例 token：service 用来校验 finished 回调是否来自当前实例 */
  token: number
}>()
const emit = defineEmits<{ finished: [] }>()

// ponytail: service 已 normalize 并 clamp，这里只取响应式引用；组件独立可用时也能用 clampLightRainOptions 防御
const safe = computed(() => clampLightRainOptions(props.options))
const layerStyle = computed(() => ({
  zIndex: String(safe.value.zIndex),
  // 淡入淡出只动 opacity，由时间轴每帧写入 --lr-opacity
  opacity: 'var(--lr-opacity, 0)',
  // 压暗遮罩：由时间轴每帧写 --lr-mask（随闪电 flash 调制，闪现时降低压暗模拟照亮）
  background: 'var(--lr-mask, rgba(18,28,42,0))',
  // 内联 pointer-events 保证透传（不依赖 scoped CSS 解析）
  pointerEvents: 'none' as const,
  userSelect: 'none' as const,
}))

// ========== 生命周期时间轴（timer + 统一时间轴兜底，不依赖 animationend） ==========
type Phase = 'entering' | 'visible' | 'leaving' | 'finished'
const phase = ref<Phase>('entering')
const shouldRender = ref(true)

const layerRef = ref<HTMLDivElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)

// 玻璃水珠：随机散布 10 个，缓慢下滑（CSS animation，reduced-motion 禁用）
const droplets = Array.from({ length: 10 }, () => {
  const size = 6 + Math.random() * 10
  return {
    style: {
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 60}%`,
      width: `${size}px`,
      height: `${size}px`,
      animationDuration: `${8 + Math.random() * 7}s`,
      animationDelay: `${-Math.random() * 8}s`,
    },
  }
})

let startTime = 0
let leaveStart = 0
let rafId: number | null = null
let enterTimer: ReturnType<typeof setTimeout> | null = null
let leaveTimer: ReturnType<typeof setTimeout> | null = null
let endTimer: ReturnType<typeof setTimeout> | null = null

const applyOpacity = (o: number) => {
  if (!layerRef.value) return
  layerRef.value.style.setProperty('--lr-opacity', String(o))
  // 压暗遮罩：基础 = opacity 参数，闪电视觉上"照亮"场景时短暂降低压暗
  const maskAlpha = safe.value.opacity * (1 - flashIntensity * 0.7)
  layerRef.value.style.setProperty('--lr-mask', `rgba(18,28,42,${(maskAlpha * o).toFixed(4)})`)
}

// ========== Canvas 状态 ==========
interface RainDrop {
  x: number
  y: number
  length: number
  width: number
  speed: number
  opacity: number
  drift: number
  /** 当前生命（用于轻微透明度波动相位） */
  life: number
  layer: 'far' | 'mid' | 'near'
}
interface RainWind {
  current: number
  target: number
  changeAt: number
}

let ctx: CanvasRenderingContext2D | null = null
let pool: RainDrop[] = []
let activeCount = 0
let maxDrops = 0
let spawnAccumulator = 0
let emissionRate = 0
let emissionMultiplier = 1
let globalOpacity = 0
// 雨后彩虹+太阳：leaving 后段（雨势已降）渐显，随 globalOpacity 淡出
let afterglowAlpha = 0
let cssW = 0
let cssH = 0
let dpr = 1
let prevTime = 0
let reducedMotion = false

const wind: RainWind = { current: 0, target: 0, changeAt: 0 }

// 乌云
interface CloudBlob {
  dx: number // 相对团心的偏移
  dy: number
  r: number // 子团半径
}
interface Cloud {
  x: number
  y: number
  radius: number
  opacity: number
  drift: number
  blobs: CloudBlob[] // 多个子团叠加成不规则形态
}
let clouds: Cloud[] = []

// 落地溅射粒子（仅 near 层雨滴触地时生成，对象池 swap 回收）
interface Splash {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  size: number
}
let splashPool: Splash[] = []
let splashCount = 0
let totalSplashes = 0 // 累计生成数（测试用，判断是否曾触发溅射）
const GRAVITY = 400 // px/s²（较低重力让溅射飞得更久）

// 闪电状态机
type FlashPhase = 'idle' | 'rise' | 'hold' | 'fall'
let flashIntensity = 0
let flashPhase: FlashPhase = 'idle'
let flashStart = 0
let nextFlashAt = 0
// 闪电线：主干 + 分叉子路径。points=[x,y,x,y,...]，width/alpha 区分主干与分叉
interface FlashBolt {
  points: number[]
  width: number
  alpha: number
}
// 闪电锯齿路径：每次触发时预生成，主干 + 递归分叉
let flashBolts: FlashBolt[] = []

// 音频（sound 开启时创建）
let audio: RainAudio | null = null
// 全局声音开关订阅：运行中切换开关时立即停/起声音
let unsubSound: (() => void) | null = null
// 雷声防重复：每次闪电 rise 阶段只触发一次雷声
let thunderScheduled = false
let thunderTimer: ReturnType<typeof setTimeout> | null = null

// 三层配置：占比 / 长度 / 宽度 / 透明度 / 速度范围（CSS px / px-per-sec）
// ponytail: 颜色深蓝灰(70,95,130)+高 alpha+粗线，保证雷雨在亮主题(白底)清晰可见
const LAYERS = {
  far: { ratio: 0.55, len: [8, 16], width: [1.2, 1.6], opa: [0.45, 0.58], spd: [120, 190] },
  mid: { ratio: 0.35, len: [14, 26], width: [1.7, 2.2], opa: [0.52, 0.65], spd: [190, 280] },
  near: { ratio: 0.10, len: [20, 36], width: [2.1, 2.8], opa: [0.60, 0.72], spd: [270, 390] },
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

/** 每帧更新：layerOpacity（容器淡入淡出 0~1）+ emissionMultiplier（雨势）+ 风向 */
const updateTimeline = (now: number) => {
  const o = safe.value
  const elapsed = now - startTime
  const remaining = o.duration - elapsed

  if (remaining <= o.fadeOutDuration && phase.value !== 'entering') {
    // 进入淡出（即便 timer 未到也按真实时间兜底）
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
    // 双通道：雨势先降（emission 先停），容器透明度后降
    emissionMultiplier = 1 - smoothstep(p, 0, 0.65)
    globalOpacity = 1 - smoothstep(p, 0.2, 1)
    // 雨后彩虹+太阳：雨势降到一半后渐显，随 globalOpacity 淡出
    afterglowAlpha = smoothstep(p, 0.4, 0.75) - smoothstep(p, 0.85, 1)
  } else {
    globalOpacity = 0
    emissionMultiplier = 0
    afterglowAlpha = 0
  }
  applyOpacity(Math.max(0, Math.min(globalOpacity, 1)))
}

/** 供 service 的 hide() 调用：立即进入淡出 */
const requestLeave = () => {
  if (enterTimer) { clearTimeout(enterTimer); enterTimer = null }
  if (leaveTimer) { clearTimeout(leaveTimer); leaveTimer = null }
  enterLeaving()
  if (endTimer) clearTimeout(endTimer)
  endTimer = setTimeout(finish, safe.value.fadeOutDuration)
}

// ========== 对象池 ==========
const pickLayer = (): LayerKey => {
  // 按占比随机选层；移动端/reducedMotion 近景减半
  let nearRatio = LAYERS.near.ratio
  if (isMobile() || reducedMotion) nearRatio *= 0.5
  const farRatio = LAYERS.far.ratio
  const midRatio = 1 - farRatio - nearRatio
  const r = Math.random()
  if (r < farRatio) return 'far'
  if (r < farRatio + midRatio) return 'mid'
  return 'near'
}

const spawnDrop = () => {
  if (activeCount >= pool.length) return
  const key = pickLayer()
  const L = LAYERS[key]
  const speedMul = reducedMotion ? 0.65 : 1
  const d = pool[activeCount]
  d.x = rand(0, cssW)
  d.y = -d.length - rand(0, 40) // 顶部上方进入
  d.length = rand(L.len[0], L.len[1])
  d.width = rand(L.width[0], L.width[1])
  d.speed = rand(L.spd[0], L.spd[1]) * speedMul
  d.opacity = rand(L.opa[0], L.opa[1])
  d.drift = rand(-3, 3) // 轻微个体横向漂移
  d.life = rand(0, Math.PI * 2)
  d.layer = key
  activeCount++
}

// ponytail: 回收——出视口的雨滴与末尾交换，activeCount--，不频繁创建销毁
const recycleIfNeeded = (i: number) => {
  const d = pool[i]
  if (d.y - d.length > cssH) {
    // near/mid 层雨滴触地：生成溅射（reduced-motion 完全关闭）
    if ((d.layer === 'near' || d.layer === 'mid') && !reducedMotion && Math.random() < (d.layer === 'near' ? 0.7 : 0.3)) {
      spawnSplash(d.x, cssH)
    }
    activeCount--
    const last = pool[activeCount]
    pool[i] = last
    pool[activeCount] = d
    return true
  }
  return false
}

/** 在落点生成 4~7 个溅射粒子（上抛 + 横向散开，受重力） */
const spawnSplash = (x: number, y: number) => {
  const count = reducedMotion ? 2 : Math.round(rand(4, 7))
  for (let k = 0; k < count; k++) {
    if (splashCount >= splashPool.length) break
    const s = splashPool[splashCount]
    s.x = x + rand(-4, 4)
    s.y = y - rand(0, 4)
    s.vx = rand(-70, 70)
    s.vy = -rand(120, 220) // 上抛更高，溅射感明显
    s.life = 0
    s.maxLife = rand(500, 900)
    s.size = rand(1.5, 2.8)
    splashCount++
    totalSplashes++
  }
}

/** 更新溅射粒子：重力下落 + 寿命到期回收（swap） */
const updateSplashes = (deltaSeconds: number) => {
  for (let i = 0; i < splashCount; i++) {
    const s = splashPool[i]
    s.life += deltaSeconds * 1000
    if (s.life >= s.maxLife) {
      splashCount--
      const last = splashPool[splashCount]
      splashPool[i] = last
      splashPool[splashCount] = s
      i--
      continue
    }
    s.vy += GRAVITY * deltaSeconds
    s.x += s.vx * deltaSeconds
    s.y += s.vy * deltaSeconds
  }
}

/** 绘制溅射粒子：小圆点，alpha 随寿命衰减 */
const drawSplashes = () => {
  if (!ctx || splashCount === 0) return
  ctx.save()
  ctx.fillStyle = 'rgba(180,210,240,1)'
  ctx.shadowColor = 'rgba(150,190,230,0.8)'
  ctx.shadowBlur = 3
  for (let i = 0; i < splashCount; i++) {
    const s = splashPool[i]
    const lifeRatio = s.life / s.maxLife
    const alpha = clamp((1 - lifeRatio) * globalOpacity, 0, 1)
    if (alpha <= 0.01) continue
    ctx.globalAlpha = alpha
    ctx.beginPath()
    ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.shadowBlur = 0
  ctx.restore()
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
  maxDrops = computeMaxDrops(cssW, cssH, safe.value.intensity, isMobile(), reducedMotion)
  // 预分配对象池（上界按 maxDrops，resize 时会重建）
  pool = Array.from({ length: maxDrops }, () => ({
    x: 0, y: 0, length: 10, width: 0.6, speed: 150, opacity: 0.15, drift: 0, life: 0, layer: 'far' as LayerKey,
  }))
  activeCount = 0
  // 溅射池：mid+near 都溅射，容量按 maxDrops×2 上界（每滴最多触发一次溅射，够用）
  splashPool = Array.from({ length: maxDrops * 2 }, () => ({
    x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 400, size: 1,
  }))
  splashCount = 0
  // ponytail: 起步预存较多生成额度，让触发瞬间就有密集雨丝
  spawnAccumulator = maxDrops * 0.5
  // 稳态近似：active 趋近 maxDrops，平均寿命 ≈ cssH / avgSpeed
  const avgSpeed = (LAYERS.far.spd[0] + LAYERS.near.spd[1]) / 2
  const avgLifetime = cssH / avgSpeed
  // ×4 倍率：让 1s 内就接近稳态密度，触发后立即密集可见
  emissionRate = (maxDrops / Math.max(avgLifetime, 0.1)) * 4
  // 风向初始化
  wind.current = safe.value.wind
  wind.target = safe.value.wind
  wind.changeAt = 0
  // 乌云：4~6 团，集中在顶部 1/3，缓慢漂移；每团由 3~4 个子团叠加成不规则形态
  const cloudCount = Math.round(clamp(4 + safe.value.intensity * 2, 4, 7))
  clouds = Array.from({ length: cloudCount }, () => {
    const baseR = rand(cssW * 0.18, cssW * 0.4)
    const blobN = Math.round(rand(3, 4))
    const blobs: CloudBlob[] = Array.from({ length: blobN }, () => ({
      dx: rand(-baseR * 0.5, baseR * 0.5),
      dy: rand(-baseR * 0.3, baseR * 0.3),
      r: baseR * rand(0.6, 1.0),
    }))
    return {
      x: rand(-cssW * 0.2, cssW * 1.2),
      y: rand(-cssH * 0.05, cssH * 0.32),
      radius: baseR,
      opacity: rand(0.45, 0.8),
      drift: rand(4, 14),
      blobs,
    }
  })
  // 闪电：首次随机延迟 2~5s
  flashIntensity = 0
  flashPhase = 'idle'
  nextFlashAt = performance.now() + rand(2000, 5000)
}

// ========== 更新与绘制 ==========
const updateWind = (now: number, deltaSeconds: number) => {
  if (reducedMotion) {
    wind.current = safe.value.wind
    wind.target = safe.value.wind
    return
  }
  if (now >= wind.changeAt) {
    // 每 2~4 秒生成新 target，在 wind 基值附近小范围漂移
    wind.target = safe.value.wind + rand(-0.05, 0.05)
    wind.changeAt = now + rand(2000, 4000)
  }
  // lerp 缓慢靠近，连续不跳变
  wind.current += (wind.target - wind.current) * Math.min(1, deltaSeconds * 0.35)
}

// 乌云漂移（reduced-motion 不漂移）
const updateClouds = (deltaSeconds: number) => {
  if (reducedMotion) return
  for (const c of clouds) {
    c.x += c.drift * deltaSeconds
    if (c.x - c.radius > cssW) c.x = -c.radius
  }
}

// 生成一条锯齿闪电线：从顶部云区向下，返回 [x,y,x,y,...] 坐标
const genBolt = (startX: number): number[] => {
  const pts: number[] = [startX, rand(-20, cssH * 0.1)]
  let x = startX
  let y = pts[1]
  const endY = rand(cssH * 0.5, cssH * 0.9)
  while (y < endY) {
    y += rand(20, 50)
    x += rand(-35, 35) // 锯齿横向抖动
    pts.push(x, y)
  }
  return pts
}

// ponytail: 递归生成分叉——主干每隔 2~3 节点概率分叉，深度 2 层上限，分支更细更淡
const genFork = (parentPts: number[], depth: number, out: FlashBolt[]) => {
  if (depth >= 2) return
  for (let i = 4; i < parentPts.length; i += 2) {
    // 每隔 2~3 个节点 30% 概率分叉
    if (Math.random() > 0.3) continue
    const sx = parentPts[i - 2]
    const sy = parentPts[i - 1]
    const pts: number[] = [sx, sy]
    let x = sx
    let y = sy
    // 分叉长度为主干的 40~60%
    const branchEndY = y + (cssH * 0.9 - y) * rand(0.4, 0.6)
    const dirSign = Math.random() < 0.5 ? -1 : 1 // ±方向偏移
    while (y < branchEndY) {
      y += rand(15, 35)
      x += dirSign * rand(10, 40)
      pts.push(x, y)
    }
    out.push({ points: pts, width: depth === 0 ? 1.4 : 0.8, alpha: depth === 0 ? 0.55 : 0.3 })
    genFork(pts, depth + 1, out)
  }
}

/** 触发闪电时生成完整路径树：1~2 条主干 + 各自递归分叉 */
const genBoltTree = (startX: number): FlashBolt[] => {
  const out: FlashBolt[] = []
  const main = genBolt(startX)
  out.push({ points: main, width: 2.5, alpha: 1 })
  genFork(main, 0, out)
  return out
}

// 闪电状态机（reduced-motion / thunder 关闭时不触发）
const updateFlash = (now: number) => {
  if (reducedMotion || !safe.value.thunder) {
    flashIntensity = 0
    flashPhase = 'idle'
    return
  }
  if (flashPhase === 'idle') {
    if (phase.value === 'visible' && now >= nextFlashAt) {
      flashPhase = 'rise'
      flashStart = now
      thunderScheduled = false // 重置：本次闪电的雷声尚未触发
      // 触发时预生成 1~2 条主干 + 递归分叉
      flashBolts = []
      const n = Math.random() < 0.5 ? 1 : 2
      for (let i = 0; i < n; i++) flashBolts.push(...genBoltTree(rand(cssW * 0.15, cssW * 0.85)))
      nextFlashAt = now + rand(2000, 5000)
    }
    return
  }
  const elapsed = now - flashStart
  if (flashPhase === 'rise') {
    flashIntensity = elapsed < 60 ? elapsed / 60 : 1
    // rise 阶段调度雷声（延迟 200~800ms 模拟光速/音速差），只调一次
    if (!thunderScheduled && audio) {
      thunderScheduled = true
      const delay = rand(THUNDER_DELAY_RANGE[0], THUNDER_DELAY_RANGE[1])
      thunderTimer = setTimeout(() => {
        const a = audio as RainAudio | null
        a?.triggerThunder()
        thunderTimer = null
      }, delay)
    }
    if (elapsed >= 60) flashPhase = 'hold'
  } else if (flashPhase === 'hold') {
    flashIntensity = 0.9
    if (elapsed >= 120) flashPhase = 'fall'
  } else if (flashPhase === 'fall') {
    flashIntensity = Math.max(0, 1 - (elapsed - 120) / 280)
    if (elapsed >= 400) { flashPhase = 'idle'; flashIntensity = 0; flashBolts = [] }
  }
}

// 绘制乌云（底层）：每团由多个子团径向渐变叠加，形成不规则连片
const drawClouds = () => {
  if (!ctx) return
  for (const c of clouds) {
    ctx.save()
    ctx.globalAlpha = c.opacity * globalOpacity
    for (const b of c.blobs) {
      const bx = c.x + b.dx
      const by = c.y + b.dy
      const g = ctx.createRadialGradient(bx, by, 0, bx, by, b.r)
      // 深灰黑核心 + 柔和弥散边缘，模拟雷雨乌云
      g.addColorStop(0, 'rgba(18,22,30,0.92)')
      g.addColorStop(0.5, 'rgba(28,32,42,0.55)')
      g.addColorStop(0.85, 'rgba(35,40,52,0.18)')
      g.addColorStop(1, 'rgba(35,40,52,0)')
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.arc(bx, by, b.r, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.restore()
  }
}

// 绘制闪电（顶层）：全屏冷蓝白闪 + 锯齿闪电线（带发光）
const drawFlash = () => {
  if (!ctx || flashIntensity <= 0.001) return
  // 全屏冷蓝白闪（压暗背景下突出；白底上闪电线提供闪电视觉标识）
  ctx.save()
  ctx.globalAlpha = flashIntensity * 0.6 * globalOpacity
  ctx.fillStyle = 'rgba(210,225,245,1)'
  ctx.fillRect(0, 0, cssW, cssH)
  ctx.restore()
  // 锯齿闪电线（主干 + 分叉，按宽度分组绘制）
  if (flashBolts.length === 0) return
  ctx.save()
  ctx.globalAlpha = flashIntensity * globalOpacity
  ctx.strokeStyle = 'rgba(235,245,255,1)'
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.shadowColor = 'rgba(190,215,255,0.9)'
  // 主干（width>=2）：粗线 + 强发光
  ctx.lineWidth = 2.5
  ctx.shadowBlur = 12
  for (const bolt of flashBolts) {
    if (bolt.width < 2 || bolt.points.length < 4) continue
    ctx.globalAlpha = flashIntensity * globalOpacity * bolt.alpha
    ctx.beginPath()
    ctx.moveTo(bolt.points[0], bolt.points[1])
    for (let i = 2; i < bolt.points.length; i += 2) ctx.lineTo(bolt.points[i], bolt.points[i + 1])
    ctx.stroke()
  }
  // 分叉（width<2）：细线 + 弱发光
  ctx.lineWidth = 1.2
  ctx.shadowBlur = 4
  for (const bolt of flashBolts) {
    if (bolt.width >= 2 || bolt.points.length < 4) continue
    ctx.globalAlpha = flashIntensity * globalOpacity * bolt.alpha
    ctx.beginPath()
    ctx.moveTo(bolt.points[0], bolt.points[1])
    for (let i = 2; i < bolt.points.length; i += 2) ctx.lineTo(bolt.points[i], bolt.points[i + 1])
    ctx.stroke()
  }
  ctx.restore()
}

const drawRainbow = () => {
  if (!ctx || afterglowAlpha <= 0.001) return
  const alpha = afterglowAlpha * globalOpacity
  if (alpha <= 0.001) return

  // 太阳：右上角暖黄圆 + 光晕
  const sunX = cssW * 0.82
  const sunY = cssH * 0.18
  const sunR = Math.min(cssW, cssH) * 0.045
  ctx.save()
  ctx.globalAlpha = alpha
  const halo = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunR * 4)
  halo.addColorStop(0, 'rgba(255,235,170,0.9)')
  halo.addColorStop(0.3, 'rgba(255,220,130,0.4)')
  halo.addColorStop(1, 'rgba(255,210,100,0)')
  ctx.fillStyle = halo
  ctx.beginPath()
  ctx.arc(sunX, sunY, sunR * 4, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = 'rgba(255,240,190,1)'
  ctx.beginPath()
  ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  // 彩虹：圆弧带（7 色），中心在屏幕下方偏外，露出上半弧
  const cx = cssW * 0.5
  const cy = cssH * 1.15 // 圆心在屏幕下方，露出顶部弧
  const baseR = Math.min(cssW, cssH) * 0.55
  const colors = [
    'rgba(255,90,90,', 'rgba(255,160,70,', 'rgba(255,230,90,',
    'rgba(120,230,120,', 'rgba(90,180,255,', 'rgba(110,110,235,', 'rgba(200,120,235,',
  ]
  ctx.save()
  ctx.globalAlpha = alpha * 0.5
  ctx.lineWidth = Math.max(4, baseR * 0.015)
  for (let i = 0; i < colors.length; i++) {
    ctx.strokeStyle = colors[i] + '1)'
    ctx.beginPath()
    ctx.arc(cx, cy, baseR + i * ctx.lineWidth, Math.PI, Math.PI * 2)
    ctx.stroke()
  }
  ctx.restore()
}

const updateDrops = (deltaSeconds: number) => {
  // 生成新雨滴（淡出阶段 emissionMultiplier→0，停止生成）
  spawnAccumulator += emissionRate * emissionMultiplier * deltaSeconds
  while (spawnAccumulator >= 1 && activeCount < maxDrops) {
    spawnDrop()
    spawnAccumulator -= 1
  }
  // 更新已有雨滴
  const windDrift = wind.current * 30 // 风向对 x 的贡献系数
  for (let i = 0; i < activeCount; i++) {
    const d = pool[i]
    d.y += d.speed * deltaSeconds
    d.x += (windDrift + d.drift) * deltaSeconds
    d.life += deltaSeconds
    if (recycleIfNeeded(i)) i-- // 回收后该位换了新雨滴，重新检查同一位
  }
}

const draw = (now: number) => {
  if (!ctx) return
  ctx.clearRect(0, 0, cssW, cssH)
  if (globalOpacity <= 0 && activeCount === 0 && clouds.length === 0) return

  // 1. 乌云（底层）
  drawClouds()

  // 2. 雨丝
  // globalAlpha = 层淡入淡出系数（0~1）。雨丝深蓝灰(70,95,130)在白底清晰可见
  const globalAlpha = globalOpacity
  for (let i = 0; i < activeCount; i++) {
    const d = pool[i]
    const windOffset = wind.current * d.length * 0.3
    // 透明度轻微波动（reducedMotion 不波动）
    const opacityFactor = reducedMotion ? 1 : 0.92 + Math.sin(now * 0.003 + d.life) * 0.08
    const alpha = clamp(d.opacity * opacityFactor * globalAlpha, 0, 1)
    if (alpha <= 0.01) continue

    const grad = ctx.createLinearGradient(
      d.x, d.y,
      d.x + windOffset, d.y + d.length,
    )
    const base = `rgba(70,95,130,${alpha.toFixed(4)})`
    grad.addColorStop(0, 'rgba(70,95,130,0)')
    grad.addColorStop(0.25, base) // 头部略亮
    grad.addColorStop(1, 'rgba(70,95,130,0)') // 尾部变淡
    ctx.strokeStyle = grad
    ctx.lineWidth = d.width
    ctx.lineCap = 'round'
    // 近景极少数加轻微模糊（不每条都用 shadowBlur）
    if (d.layer === 'near' && d.opacity > 0.25) {
      ctx.shadowBlur = 1
      ctx.shadowColor = 'rgba(70,95,130,0.25)'
    } else if (ctx.shadowBlur !== 0) {
      ctx.shadowBlur = 0
    }
    ctx.beginPath()
    ctx.moveTo(d.x, d.y)
    const endX = d.x + windOffset
    const endY = d.y + d.length
    if (d.layer === 'near') {
      // near 层：弯曲（控制点偏向风向，风越大越弯）+ 残影拖尾模拟运动模糊
      const cpx = d.x + windOffset * 0.5
      const cpy = d.y + d.length * 0.5
      ctx.quadraticCurveTo(cpx, cpy, endX, endY)
      ctx.stroke()
      // 残影：半透明偏移 2px 再画一次
      if (!reducedMotion && alpha > 0.3) {
        ctx.save()
        ctx.globalAlpha = alpha * 0.4
        ctx.beginPath()
        ctx.moveTo(d.x + 1, d.y + 2)
        ctx.quadraticCurveTo(cpx + 1, cpy + 2, endX + 1, endY + 2)
        ctx.stroke()
        ctx.restore()
      }
    } else {
      ctx.lineTo(endX, endY)
      ctx.stroke()
    }
  }
  if (ctx.shadowBlur !== 0) ctx.shadowBlur = 0

  // 2.5 落地溅射（雨丝之上、闪电之下）
  drawSplashes()

  // 3. 闪电（顶层）
  drawFlash()
  // 4. 雨后彩虹+太阳（最顶层，雨停时渐显）
  drawRainbow()
}

const loop = (now: number) => {
  const delta = Math.min(now - prevTime, 50) // 限制 delta，防标签恢复跳跃
  prevTime = now
  const deltaSeconds = delta / 1000

  // flash 先于 timeline 更新：applyOpacity 用 flashIntensity 调制压暗遮罩
  updateFlash(now)
  updateTimeline(now)
  // 音量联动：雨势 × 容器透明度（淡出时也降音量）
  const a = audio as RainAudio | null
  if (a) a.updateRainGain(emissionMultiplier * globalOpacity)
  updateWind(now, deltaSeconds)
  updateClouds(deltaSeconds)
  updateDrops(deltaSeconds)
  updateSplashes(deltaSeconds)
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
  const a = audio as RainAudio | null
  if (document.hidden) {
    if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null }
    // 音频暂停（保留 context，恢复时复用）
    if (a) a.stop()
  } else {
    // 音频恢复
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
  if (thunderTimer) { clearTimeout(thunderTimer); thunderTimer = null }
  if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null }
  if (resizeRaf !== null) { cancelAnimationFrame(resizeRaf); resizeRaf = null }
  // 音频释放：dispose 关闭 AudioContext
  const a = audio as RainAudio | null
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

// 暴露给测试用的只读状态
defineExpose({
  requestLeave,
  /** 当前活跃雨滴数（测试用） */
  getActiveCount: () => activeCount,
  /** 当前雨势系数（测试用） */
  getEmissionMultiplier: () => emissionMultiplier,
  /** 取活跃雨滴引用（测试用，只读断言位移） */
  getDrop: (i: number) => (i < activeCount ? pool[i] : null),
  /** 当前阶段 */
  getPhase: () => phase.value,
  /** 当前闪电亮度（测试用） */
  getFlashIntensity: () => flashIntensity,
  /** 当前活跃溅射粒子数（测试用） */
  getSplashCount: () => splashCount,
  /** 累计生成溅射数（测试用，判断是否曾触发） */
  getTotalSplashes: () => totalSplashes,
  /** 音频是否已启动（测试用） */
  getAudioStarted: () => audio !== null,
})

onMounted(() => {
  startTime = performance.now()
  prevTime = startTime
  applyOpacity(0)
  setupCanvas()
  startTimers()
  // 音效：sound 开启时创建并启动（service 层已确认用户偏好，此处 AudioContext 由 RAIN 按键手势链触发）
  if (safe.value.sound) {
    audio = createRainAudio()
    audio.start()
  }
  // 运行中切换全局开关：立即停/起声音
  unsubSound = useEasterEggSound().onSoundChange(enabled => {
    if (enabled && !audio) {
      audio = createRainAudio()
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
.light-rain-layer {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  height: 100dvh;
  overflow: hidden;
  pointer-events: none;
  user-select: none;
  will-change: opacity;
  /* opacity 由 --lr-opacity 驱动，CSS Transition 辅助淡出 */
  transition: opacity var(--lr-fade, 800ms) ease;
  /* 压暗遮罩由内联 --lr-mask 驱动（时间轴每帧写入，随闪电调制） */
}
.light-rain-canvas {
  display: block;
  width: 100%;
  height: 100%;
}
/* Transition：Teleport 后 scoped 仍生效（Vue 3 对 Teleport 内容加 data 属性） */
.lr-fade-enter-active,
.lr-fade-leave-active {
  transition: opacity 800ms ease;
}
.lr-fade-enter-from,
.lr-fade-leave-to {
  opacity: 0;
}

/* ========== 玻璃取景叠层 ========== */
/* 玻璃隔层：轻微模糊+压暗，模拟透过窗玻璃看雨 */
.lr-glass {
  position: absolute;
  inset: 0;
  pointer-events: none;
  -webkit-backdrop-filter: blur(2px) brightness(0.92);
  backdrop-filter: blur(2px) brightness(0.92);
  /* 不支持 backdrop-filter 时降级为半透明 */
}
@supports not ((-webkit-backdrop-filter: blur(1px)) or (backdrop-filter: blur(1px))) {
  .lr-glass {
    background: rgba(18, 28, 42, 0.08);
  }
}

/* 窗框：细而淡的四周内阴影，仅作取景暗示，不抢戏 */
.lr-window-frame {
  position: absolute;
  inset: 0;
  pointer-events: none;
  box-shadow:
    inset 0 0 0 6px rgba(30, 22, 16, 0.35),
    inset 0 0 50px rgba(15, 10, 6, 0.3);
}

/* 玻璃水珠：径向渐变小圆，缓慢下滑 */
.lr-droplets {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}
.lr-droplet {
  position: absolute;
  border-radius: 50%;
  background: radial-gradient(
    circle at 35% 30%,
    rgba(200, 220, 240, 0.6),
    rgba(120, 150, 180, 0.25) 60%,
    rgba(80, 110, 140, 0.1)
  );
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
  animation-name: lr-droplet-fall;
  animation-timing-function: linear;
  animation-iteration-count: infinite;
}
@keyframes lr-droplet-fall {
  0% {
    transform: translateY(0);
    opacity: 0;
  }
  10% {
    opacity: 0.8;
  }
  90% {
    opacity: 0.8;
  }
  100% {
    transform: translateY(80vh);
    opacity: 0;
  }
}
@media (prefers-reduced-motion: reduce) {
  .lr-droplet {
    animation: none;
  }
}
</style>
