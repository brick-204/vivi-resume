<template>
  <Teleport to="body">
    <Transition name="envelope-fade">
      <div
        v-if="shouldRender"
        ref="layerRef"
        class="envelope-layer"
        :class="{ 'is-reduced': reducedMotion }"
        :style="layerStyle"
        aria-hidden="true"
        tabindex="-1"
      >
        <div class="envelope-stage" :class="{ 'is-reduced': reducedMotion }">
          <!-- 周围光点特效（纯 CSS 闪烁 + 上浮），多而亮，烘托惊喜 -->
          <div class="sparkles" aria-hidden="true">
            <span v-for="n in 32" :key="n" class="sparkle" :style="sparkleStyle(n)" />
            <!-- 信纸露出时的迸发光点（延迟出现，烘托惊喜） -->
            <span v-for="n in 12" :key="'burst-' + n" class="sparkle sparkle-burst" :style="burstStyle(n)" />
          </div>
          <!-- 信封：3D 透视容器 -->
          <div class="envelope">
            <!-- 信封背面（最底层） -->
            <div class="envelope-back" />

            <!-- 翻盖：翻开后 z-index 降到信纸之下（向后倒，物理上在信纸后） -->
            <div class="envelope-flap">
              <div class="wax-seal" />
            </div>

            <!-- 信纸：初始在信封内部（被翻盖+正面口袋遮住），向上升起，
                 顶部超出信封盖住翻开的盖子。z-index 1（翻盖翻开后降到 0，信纸在其前） -->
            <div class="letter">
              <div class="letter-company">{{ company }}</div>
              <div class="letter-stamp">
                <span class="stamp-text">Offer</span>
              </div>
              <div class="letter-recipient">To: {{ recipientName }}</div>
            </div>

            <!-- 信封正面口袋：遮挡信纸下半（z-index 最高，信纸从口袋后升起） -->
            <div class="envelope-front">
              <div class="envelope-address">{{ recipientName }} 收</div>
            </div>
          </div>
        </div>

        <!-- 礼炮 + 烟花：全屏，信纸露出时（~1.4s）放，持续到淡出 -->
        <div class="celebration" aria-hidden="true">
          <!-- 8 门礼炮：屏幕底部铺满，向上喷射彩纸碎片 -->
          <div v-for="n in 8" :key="'cannon-' + n" class="cannon" :style="{ left: CANNON_POSITIONS[n-1] }">
            <span v-for="p in 14" :key="p" class="confetti" :style="confettiStyle(n, p)" />
          </div>
          <!-- 7 朵烟花：从底部发射上升到顶部绽放 -->
          <div v-for="n in 7" :key="'firework-' + n" class="firework" :style="fireworkStyle(n)">
            <!-- 中心爆闪：炸开瞬间强光 -->
            <span class="firework-flash" :style="{ animationDelay: (fireworkDelay(n) + FIREWORK_RISE).toFixed(2) + 's' }" />
            <span v-for="p in 16" :key="p" class="firework-particle" :style="fireworkParticleStyle(n, p)" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { type EnvelopeEffectOptions, clampEnvelopeOptions } from '@/services/envelopeEffect'
import { useFireworkSound } from '@/composables/useFireworkSound'

const props = defineProps<{
  options: Required<EnvelopeEffectOptions>
  token: number
}>()
const emit = defineEmits<{ finished: [] }>()

const safe = computed(() => clampEnvelopeOptions(props.options))
const layerStyle = computed(() => ({
  zIndex: String(safe.value.zIndex),
  opacity: 'var(--env-opacity, 0)',
  background: 'var(--env-mask, rgba(20,28,40,0))',
  pointerEvents: 'none' as const,
  userSelect: 'none' as const,
}))

type Phase = 'entering' | 'visible' | 'leaving' | 'finished'
const phase = ref<Phase>('entering')
const shouldRender = ref(true)

const layerRef = ref<HTMLDivElement | null>(null)
const reducedMotion = ref(false)

const recipientName = computed(() => safe.value.recipientName || '亲爱的求职者')
const company = computed(() => safe.value.company || '字节跳动')

// 光点：用索引派生位置/延迟，纯 CSS 驱动闪烁上浮（n 为 1..32）
const sparkleStyle = (n: number) => {
  // golden angle 派生分布，避免聚堆
  const angle = n * 137.5
  const dist = 90 + (n % 7) * 50 // 距信封中心 90~390px，范围更大
  const rad = (angle * Math.PI) / 180
  const x = Math.cos(rad) * dist
  const y = Math.sin(rad) * dist * 0.75
  const size = 5 + (n % 4) * 3 // 5~14px，更大更亮
  const delay = (n % 10) * 0.4 // 0~3.6s 错峰
  const dur = 2.2 + (n % 5) * 0.5 // 2.2~4.2s
  return {
    left: `calc(50% + ${x.toFixed(0)}px)`,
    top: `calc(50% + ${y.toFixed(0)}px)`,
    width: `${size}px`,
    height: `${size}px`,
    animationDelay: `${delay.toFixed(2)}s`,
    animationDuration: `${dur.toFixed(1)}s`,
  }
}
// 迸发光点：信纸露出瞬间（~1.5s）从信封顶部向四周扩散，烘托惊喜
const burstStyle = (n: number) => {
  const angle = n * 30
  const dist = 70 + (n % 5) * 35
  const rad = (angle * Math.PI) / 180
  const x = Math.cos(rad) * dist
  const y = Math.sin(rad) * dist * 0.6 - 50 // 偏上，从信封顶部迸发
  const size = 8 + (n % 4) * 4 // 8~20px，迸发光点更大更亮
  return {
    left: `calc(50% + ${x.toFixed(0)}px)`,
    top: `calc(50% + ${y.toFixed(0)}px)`,
    width: `${size}px`,
    height: `${size}px`,
    animationDelay: '1.4s',
    animationDuration: '1.8s',
  }
}

// ========== 礼炮彩纸 + 烟花 ==========
// 多彩色板（金红蓝绿紫），庆典感
const CONFETTI_COLORS = ['#ffd54a', '#ff5a5a', '#5a8cff', '#4ade80', '#c084fc', '#ff8a3d']
const pickColor = (seed: number) => CONFETTI_COLORS[seed % CONFETTI_COLORS.length]

// 礼炮彩纸：8 门礼炮均匀铺满屏幕底部，向上喷射彩纸
// 每片彩纸有独立喷射角度/距离/旋转，用 CSS 变量驱动 keyframes
const CANNON_POSITIONS = ['5%', '17%', '30%', '42%', '56%', '68%', '81%', '93%']
const confettiStyle = (cannon: number, p: number) => {
  // 喷射方向：偶数门偏向右上，奇数门偏向左上，制造交叉扇形
  const dirSign = cannon % 2 === 0 ? 1 : -1
  const spreadAngle = (p - 7) * 7 // ±约 49° 散布
  const angle = 80 + spreadAngle // 主方向接近竖直，加散布
  const rad = (angle * Math.PI) / 180
  const distance = 320 + (p % 5) * 60 // 喷射距离 320~560px
  const dx = Math.cos(rad) * distance * dirSign
  const dy = -Math.abs(Math.sin(rad)) * distance // 向上
  const size = 6 + (p % 4) * 3 // 6~15px
  const rot = (p * 137) % 720
  const delay = 1.4 + (p % 6) * 0.12 // 1.4~2.0s 错峰喷射
  const color = pickColor(cannon * 7 + p)
  return {
    left: '0', // 相对 cannon（cannon 已定位在底部对应位置）
    bottom: '0',
    width: `${size}px`,
    height: `${size * 1.6}px`,
    background: color,
    '--cx': `${dx.toFixed(0)}px`,
    '--cy': `${dy.toFixed(0)}px`,
    '--crot': `${rot}deg`,
    animationDelay: `${delay.toFixed(2)}s`,
    animationDuration: '2.4s',
  } as Record<string, string>
}

// 烟花：从屏幕底部发射，上升到顶部绽放。7 朵分布在不同水平位置
const FIREWORK_XS = ['12%', '28%', '44%', '60%', '76%', '88%', '20%']
const FIREWORK_RISE = 0.9 // 上升到顶部的时长（秒），粒子 delay 须在此基础上叠加
const fireworkDelay = (n: number) => 1.5 + (n % 4) * 0.4 // 1.5~2.7s 错峰发射
const fireworkStyle = (n: number) => {
  const left = FIREWORK_XS[(n - 1) % FIREWORK_XS.length]
  const delay = fireworkDelay(n)
  return {
    left,
    bottom: '0', // 从底部出发
    '--rise': '-82vh', // 上升到屏幕顶部附近
    animationDelay: `${delay.toFixed(2)}s`,
  } as Record<string, string>
}

// 烟花粒子：每朵 16 个粒子向外炸开。delay = 烟花发射 delay + 上升时间（到顶才炸）
// 粒子朝运动方向旋转（流星拖尾感），末段下坠模拟重力
const fireworkParticleStyle = (firework: number, p: number) => {
  const angle = (p / 16) * 360
  const distance = 60 + (firework % 3) * 25 // 60~110px 炸开半径
  const rad = (angle * Math.PI) / 180
  const dx = Math.cos(rad) * distance
  const dy = Math.sin(rad) * distance
  // 粒子下坠量（末段受重力下沉），距中心越远下坠越多
  const drop = 20 + (p % 4) * 12
  // 旋转角度：粒子长轴朝运动方向（angle + 90 让椭圆指向中心反方向）
  const rot = angle + 90
  const color = pickColor(firework * 5 + p)
  // 粒子 delay：等对应烟花上升到顶部后才炸开（烟花 delay + 上升时长）
  const particleDelay = fireworkDelay(firework) + FIREWORK_RISE
  return {
    background: color,
    color, // box-shadow currentColor 用，让光晕同色
    '--fx': `${dx.toFixed(0)}px`,
    '--fy': `${dy.toFixed(0)}px`,
    '--fdrop': `${drop}px`,
    '--frot': `${rot.toFixed(0)}deg`,
    transform: `rotate(${rot.toFixed(0)}deg)`,
    animationDelay: `${particleDelay.toFixed(2)}s`,
  } as Record<string, string>
}

let leaveTimer: ReturnType<typeof setTimeout> | null = null
let endTimer: ReturnType<typeof setTimeout> | null = null
let enterTimer: ReturnType<typeof setTimeout> | null = null
const soundTimers: ReturnType<typeof setTimeout>[] = []
const { playCannon, playFirework } = useFireworkSound()

const applyOpacity = (o: number) => {
  if (!layerRef.value) return
  layerRef.value.style.setProperty('--env-opacity', String(o))
  layerRef.value.style.setProperty('--env-mask', `rgba(20,28,42,${(safe.value.opacity * o).toFixed(4)})`)
}

// ========== 时间轴 ==========
// 正常：翻盖 0~1.4s，信纸 1.0~3.6s 滑出，停留 2.0s，淡出 1.5s，总 9000ms
// reduced-motion：跳过翻盖，信纸仍滑出，总 6000ms
const enterVisible = () => { phase.value = 'visible' }
const enterLeaving = () => {
  if (phase.value === 'finished') return
  phase.value = 'leaving'
  // 触发整体淡出：--env-opacity 1→0，配合 .envelope-layer 的 transition 渐隐
  applyOpacity(0)
}
const finish = () => {
  if (phase.value === 'finished') return
  phase.value = 'finished'
  applyOpacity(0)
  emit('finished')
}

const requestLeave = () => {
  if (leaveTimer) { clearTimeout(leaveTimer); leaveTimer = null }
  enterLeaving()
  if (endTimer) clearTimeout(endTimer)
  endTimer = setTimeout(finish, safe.value.fadeOutDuration)
}

const startTimers = () => {
  const o = safe.value
  if (o.fadeInDuration > 0) {
    enterTimer = setTimeout(enterVisible, o.fadeInDuration)
  } else {
    phase.value = 'visible'
  }
  // 停留后进入淡出：信纸滑出结束(~3.6s) + 停留 2.0s
  // reduced-motion 跳过翻盖，信纸滑出结束更早(~2.8s)
  const animDuration = reducedMotion.value ? 2800 : 3600
  const stayEnd = animDuration + 2000
  const leaveAt = Math.max(o.fadeInDuration, stayEnd)
  leaveTimer = setTimeout(enterLeaving, leaveAt)
  // 淡出完成后真正结束（leaveAt + fadeOutDuration）
  endTimer = setTimeout(finish, leaveAt + o.fadeOutDuration)

  // 音效：reduced-motion 下跳过（无烟花不该响）；sound 由工厂 promptSoundOnce 决定（首弹静音语义）
  if (!reducedMotion.value && safe.value.sound) {
    // 礼炮"砰"：8 门分两批播（避免 8 声齐响太吵），1.4s/1.7s 各 1 声代表
    soundTimers.push(setTimeout(() => playCannon(safe.value.sound), 1400))
    soundTimers.push(setTimeout(() => playCannon(safe.value.sound), 1700))
    // 烟花"噼啪"：每朵到顶时（delay + 上升时长）各播 1 声
    // distance 按烟花水平位置离屏幕中心的距离算（远处更闷更轻）
    for (let i = 1; i <= 7; i++) {
      const at = (fireworkDelay(i) + FIREWORK_RISE) * 1000
      const xPos = parseFloat(FIREWORK_XS[(i - 1) % 7]) / 100 // 0~1
      const distance = Math.abs(xPos - 0.5) * 2 // 0(中心)~1(边缘)
      soundTimers.push(setTimeout(() => playFirework(distance, safe.value.sound), at))
    }
  }
}

const onVisibility = () => {
  if (document.hidden) {
    // 隐藏时不动；可见时由现有 timer 继续推进
  }
}

const cleanup = () => {
  if (enterTimer) { clearTimeout(enterTimer); enterTimer = null }
  if (leaveTimer) { clearTimeout(leaveTimer); leaveTimer = null }
  if (endTimer) { clearTimeout(endTimer); endTimer = null }
  soundTimers.forEach(t => clearTimeout(t))
  soundTimers.length = 0
  window.removeEventListener('visibilitychange', onVisibility)
}

defineExpose({ requestLeave, getPhase: () => phase.value })

onMounted(() => {
  reducedMotion.value = typeof matchMedia !== 'undefined'
    ? matchMedia('(prefers-reduced-motion: reduce)').matches
    : false
  // 淡出过渡时长跟 fadeOutDuration 联动（供 .envelope-layer 的 transition 用）
  if (layerRef.value) {
    layerRef.value.style.setProperty('--env-fade', `${safe.value.fadeOutDuration}ms`)
  }
  applyOpacity(0)
  // 信封直接出现（fadeIn 0），opacity 立即拉满
  requestAnimationFrame(() => applyOpacity(1))
  startTimers()
  window.addEventListener('visibilitychange', onVisibility)
})

onBeforeUnmount(() => {
  cleanup()
  shouldRender.value = false
})
</script>

<style scoped>
.envelope-layer {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  height: 100dvh;
  overflow: hidden;
  pointer-events: none;
  user-select: none;
  will-change: opacity;
  /* leaving 阶段 --env-opacity 1→0 时渐隐（淡出 1.5s） */
  transition: opacity var(--env-fade, 1500ms) ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.envelope-stage {
  position: relative;
  perspective: 1400px;
  /* 入场轻微上浮（放慢） */
  animation: env-stage-in 0.8s ease-out both;
}

@keyframes env-stage-in {
  from { transform: translateY(24px) scale(0.9); opacity: 0; }
  to { transform: translateY(0) scale(1); opacity: 1; }
}

/* ========== 光点特效 ========== */
.sparkles {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}
.sparkle {
  position: absolute;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255,240,180,1) 0%, rgba(255,200,100,0.85) 35%, rgba(255,170,70,0.5) 60%, transparent 80%);
  box-shadow: 0 0 8px rgba(255,210,120,0.9), 0 0 16px rgba(255,180,80,0.5);
  opacity: 0;
  animation-name: env-sparkle;
  animation-timing-function: ease-in-out;
  animation-iteration-count: infinite;
}
@keyframes env-sparkle {
  0% { opacity: 0; transform: scale(0.4) translateY(0); }
  40% { opacity: 1; }
  70% { opacity: 0.85; transform: scale(1.1) translateY(-20px); }
  100% { opacity: 0; transform: scale(0.5) translateY(-40px); }
}

/* 迸发光点：信纸露出瞬间从信封顶部向四周扩散，只闪一次，更大更亮 */
.sparkle-burst {
  background: radial-gradient(circle, rgba(255,250,220,1) 0%, rgba(255,220,140,0.95) 30%, rgba(255,180,80,0.6) 55%, transparent 80%);
  box-shadow: 0 0 12px rgba(255,220,140,1), 0 0 24px rgba(255,190,90,0.7), 0 0 36px rgba(255,160,60,0.4);
  animation-name: env-sparkle-burst;
  animation-iteration-count: 1;
  animation-fill-mode: both;
}
@keyframes env-sparkle-burst {
  0% { opacity: 0; transform: scale(0.2) translate(0, 0); }
  25% { opacity: 1; transform: scale(1.4) translate(0, -10px); }
  100% { opacity: 0; transform: scale(0.6) translate(0, -32px); }
}

/* ========== 礼炮 + 烟花 ========== */
.celebration {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0; /* 在信封(1)后，烘托不抢戏 */
}

/* 礼炮：底部发射点容器 */
.cannon {
  position: absolute;
  bottom: 0;
  width: 0;
  height: 0;
}
/* 礼炮彩纸：矩形碎片，向上喷射后渐变淡出（不强制掉落） */
.confetti {
  position: absolute;
  bottom: 0;
  border-radius: 2px;
  opacity: 0;
  /* 用 CSS 变量 --cx/--cy 控制落点，--crot 控制旋转 */
  animation-name: env-confetti;
  animation-timing-function: cubic-bezier(0.15, 0.6, 0.4, 1);
  animation-iteration-count: 1;
  animation-fill-mode: both;
}
@keyframes env-confetti {
  0% { opacity: 0; transform: translate(0, 0) rotate(0deg) scale(0.5); }
  12% { opacity: 1; transform: translate(calc(var(--cx) * 0.5), calc(var(--cy) * 0.6)) rotate(calc(var(--crot) * 0.3)) scale(1); }
  70% { opacity: 1; transform: translate(var(--cx), var(--cy)) rotate(var(--crot)) scale(1); }
  100% { opacity: 0; transform: translate(calc(var(--cx) * 1.15), calc(var(--cy) * 1.1)) rotate(calc(var(--crot) * 1.5)) scale(0.8); }
}

/* 烟花：从底部发射上升到顶部，到达后停留（粒子绽放由粒子自身动画负责）。
   容器不淡出——否则子粒子被父级 opacity 拖累看不见。
   上升时有光尾拖迹（::before），到顶消失 */
.firework {
  position: absolute;
  bottom: 0;
  width: 0;
  height: 0;
  animation-name: env-firework-rise;
  animation-timing-function: cubic-bezier(0.3, 0.7, 0.4, 1);
  animation-iteration-count: 1;
  animation-fill-mode: forwards;
  animation-duration: 0.9s; /* 上升到顶部的时间 */
}
@keyframes env-firework-rise {
  0% { transform: translateY(0); }
  100% { transform: translateY(var(--rise)); }
}
/* 上升光尾：竖向渐变亮线，跟随烟花上升，到顶（容器动画结束）后消失 */
.firework::before {
  content: '';
  position: absolute;
  left: 50%;
  bottom: 0;
  width: 3px;
  height: 0;
  margin-left: -1.5px;
  background: linear-gradient(to top, rgba(255,240,180,0), rgba(255,220,120,0.8) 40%, rgba(255,250,220,1));
  border-radius: 2px;
  box-shadow: 0 0 8px rgba(255,210,120,0.9);
  transform-origin: bottom center;
  animation: env-firework-trail 0.9s ease-out forwards;
}
@keyframes env-firework-trail {
  0% { height: 0; opacity: 0; }
  30% { opacity: 1; height: 60px; }
  100% { opacity: 0; height: 24px; }
}
/* 中心爆闪：炸开瞬间强光球，0.18s 闪一下即逝 */
.firework-flash {
  position: absolute;
  top: 0;
  left: 0;
  width: 24px;
  height: 24px;
  margin: -12px 0 0 -12px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255,255,255,1) 0%, rgba(255,240,180,0.9) 30%, rgba(255,200,100,0) 70%);
  opacity: 0;
  animation: env-firework-flash 0.5s ease-out forwards;
  /* delay 由内联 style 设（烟花到顶时闪） */
}
@keyframes env-firework-flash {
  0% { opacity: 0; transform: scale(0.3); }
  20% { opacity: 1; transform: scale(1.4); }
  100% { opacity: 0; transform: scale(0.6); }
}
/* 烟花粒子：细长椭圆，朝运动方向旋转（流星拖尾感），末段下坠模拟重力。
   delay 由内联 style 设（含烟花发射 delay + 上升时长），到顶才炸开 */
.firework-particle {
  position: absolute;
  top: 0;
  left: 0;
  width: 8px;
  height: 3px;
  margin: -1.5px 0 0 -4px;
  border-radius: 50%;
  transform-origin: center;
  opacity: 0;
  animation-name: env-firework-particle;
  animation-timing-function: cubic-bezier(0.15, 0.75, 0.3, 1);
  animation-iteration-count: 1;
  animation-fill-mode: forwards;
  animation-duration: 1.6s;
  box-shadow: 0 0 5px currentColor, 0 0 10px currentColor;
}
@keyframes env-firework-particle {
  0% { opacity: 0; transform: rotate(var(--frot)) translate(0, 0) scale(0.2); }
  10% { opacity: 1; transform: rotate(var(--frot)) translate(calc(var(--fx) * 0.25), calc(var(--fy) * 0.25)) scale(1.4); }
  50% { opacity: 1; transform: rotate(var(--frot)) translate(var(--fx), var(--fy)) scale(1); }
  75% { opacity: 0.7; transform: rotate(var(--frot)) translate(calc(var(--fx) * 1.15), calc(var(--fy) * 1.15 + var(--fdrop) * 0.4)) scale(0.9); }
  100% { opacity: 0; transform: rotate(var(--frot)) translate(calc(var(--fx) * 1.3), calc(var(--fy) * 1.3 + var(--fdrop))) scale(0.4); }
}

/* ========== 信封（放大一圈） ========== */
.envelope {
  position: relative;
  width: 440px;
  height: 300px;
  transform-style: preserve-3d;
  z-index: 1;
}

/* 通用信封面：牛皮纸色 + 金边 */
.envelope-back,
.envelope-front,
.envelope-flap {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, #d4a574 0%, #c4956a 50%, #b8835a 100%);
  border: 2.5px solid #a06b3a;
  box-shadow: inset 0 0 14px rgba(120, 80, 40, 0.28);
}

/* 信封背面：最底层 */
.envelope-back {
  z-index: 0;
  border-radius: 5px;
}

/* 翻盖：初始在信纸前（盖住信封开口和信纸顶部），翻开后倒到信纸后。
   翻开动画末段（90% 处）把 z-index 降到 0（信纸背后），物理上翻盖已在信纸背后 */
.envelope-flap {
  z-index: 2;
  /* 翻盖是信封上半的三角形，用 clip-path 画成上方三角 */
  clip-path: polygon(0 0, 100% 0, 50% 50%);
  transform-origin: top center;
  /* 翻开动画：0~1.4s 缓慢翻开到接近贴背；末段降 z-index */
  animation: env-flap-open 1.4s cubic-bezier(0.34, 0.04, 0.4, 1) both;
  backface-visibility: visible;
}

@keyframes env-flap-open {
  0% { transform: rotateX(0deg); z-index: 2; }
  89% { z-index: 2; }
  90% { transform: rotateX(-160deg); z-index: 0; }
  100% { transform: rotateX(-175deg); z-index: 0; }
}

/* 信纸：直接放信封内部底部（bottom:0），初始 opacity:0 看不见（翻盖也遮着）。
   不向下超出信封（绝不从页面底部滑入），向上升起时顶部超出信封、盖住翻开的盖子。
   z-index 1：翻盖翻开后降到 0，信纸在其前，故能盖住翻倒的盖子 */
.letter {
  position: absolute;
  left: 50%;
  bottom: 0;
  width: 380px;
  height: 270px;
  margin-left: -190px;
  z-index: 1;
  background: linear-gradient(180deg, #fffdf6 0%, #f7f1e0 100%);
  border: 2px solid #c9b98a;
  box-shadow: 0 -3px 10px rgba(0, 0, 0, 0.18);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  padding: 30px 24px 24px;
  /* 初始贴信封底部（不下移，绝不穿透信封底）。opacity 0 看不见 */
  transform: translateY(0);
  opacity: 0;
  /* 升起动画：1.0s 延迟（等翻盖打开），2.6s 时长，缓慢向上盖住翻开的盖子。
     同时 opacity 0→1 渐显，避免初始顶部两侧露出 */
  animation: env-letter-slide 2.6s cubic-bezier(0.22, 0.61, 0.36, 1) 1.0s both;
}

@keyframes env-letter-slide {
  0% { transform: translateY(0); opacity: 0; }
  15% { opacity: 1; }
  100% { transform: translateY(-75%); opacity: 1; }
}

.letter-company {
  font-size: 24px;
  font-weight: 700;
  color: #2c2418;
  letter-spacing: 1.5px;
  font-family: 'Georgia', 'Times New Roman', serif;
}

.letter-stamp {
  width: 144px;
  height: 72px;
  background: rgba(200, 50, 50, 0.9);
  border: 2.5px solid rgba(200, 50, 50, 0.95);
  border-radius: 7px;
  display: flex;
  align-items: center;
  justify-content: center;
  transform: rotate(-6deg);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.22);
}

.stamp-text {
  color: rgba(255, 250, 245, 0.96);
  font-size: 32px;
  font-weight: 800;
  letter-spacing: 3px;
  font-family: 'Georgia', serif;
}

.letter-recipient {
  font-size: 17px;
  color: #6b5d44;
  font-family: 'Georgia', serif;
  align-self: flex-start;
}

/* 信封正面口袋：z-index 最高，遮挡信纸下半（信纸从口袋后升起） */
.envelope-front {
  z-index: 3;
  border-radius: 5px;
  /* 正面口袋只画下半部分：用 clip-path 裁掉上半，露出背面的上半 */
  clip-path: polygon(0 50%, 100% 50%, 100% 100%, 0 100%);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding-bottom: 28px;
}

.envelope-address {
  font-size: 18px;
  color: #5a3d22;
  font-family: 'Georgia', serif;
  letter-spacing: 0.5px;
}

/* 火漆封口：圆形红色，在翻盖尖端 */
.wax-seal {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 34px;
  height: 34px;
  margin-left: -17px;
  margin-top: -17px;
  background: radial-gradient(circle at 35% 35%, #d44545, #a02828);
  border-radius: 50%;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.4), inset 0 -2px 5px rgba(0, 0, 0, 0.3);
}

/* ========== reduced-motion：跳过翻盖，保留信纸滑出 ========== */
.envelope-stage.is-reduced .envelope-flap {
  animation: none;
  transform: rotateX(-175deg);
  z-index: 0; /* 翻开态直接在信纸后 */
}
.envelope-stage.is-reduced .letter {
  /* 信纸仍缓慢滑出，无翻盖等待，时长 2.8s 匹配 startTimers */
  animation: env-letter-slide 2.8s cubic-bezier(0.22, 0.61, 0.36, 1) 0.2s both;
}
.envelope-stage.is-reduced .sparkle {
  /* reduced-motion 下光点也减弱：只淡入淡出不上浮 */
  animation-name: env-sparkle-static;
}
.envelope-layer.is-reduced .sparkle-burst {
  display: none; /* 迸发光点在 reduced-motion 下不出现 */
}
.envelope-layer.is-reduced .celebration {
  display: none; /* 礼炮烟花在 reduced-motion 下不出现 */
}
@keyframes env-sparkle-static {
  0%, 100% { opacity: 0; }
  50% { opacity: 0.7; }
}

.envelope-fade-enter-active,
.envelope-fade-leave-active {
  transition: opacity 1200ms ease;
}
.envelope-fade-enter-from,
.envelope-fade-leave-to {
  opacity: 0;
}
</style>
