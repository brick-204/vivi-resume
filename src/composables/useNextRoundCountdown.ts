/**
 * 「下一面」倒计时 composable。
 *
 * 给定一条面试记录，取其未来最近的待面轮次，每秒刷新倒计时文本 + 紧迫度分档。
 * 抽自 InterviewCard，供面试横幅复用——倒计时是纯展示逻辑，一处实现两处调用。
 *
 * 紧迫度分档（urgencyLevel）：
 *   - soon   2~3 天 [48h, 72h] 蓝
 *   - near   1~2 天 [24h, 48h) 橙
 *   - urgent ≤24h   [0, 24h)    红 + 脉冲
 *   - null   >3 天 / 无未来轮次 / 已过期（横幅不显示）
 *
 * 边界用 >=（含左端点）：剩正好 3 天=蓝、剩正好 2 天=橙、剩正好 1 天=红。
 */
import { computed, onUnmounted, ref } from 'vue'
import type { Interview, InterviewRound } from '@/types/interview'

export type UrgencyLevel = 'soon' | 'near' | 'urgent' | null

/**
 * 取一条面试记录，返回未来最近的待面轮次；无则 null。
 * ponytail: 注意 now 必须传响应式的 nowTs（或等效每秒变化的源），否则 computed 不重算，
 *           跨天/跨轮次后 nextRound 卡在旧数据。规则见下方 nextRound 注释。
 */
function findNextRound(iv: Interview | null | undefined, now: number): InterviewRound | null {
  if (!iv || iv.status !== 'interviewing') return null
  const future = iv.rounds
    .filter(r => r.scheduledAt && new Date(r.scheduledAt).getTime() > now)
    .sort((a, b) => new Date(a.scheduledAt!).getTime() - new Date(b.scheduledAt!).getTime())
  return future.length > 0 ? future[0] : null
}

/**
 * NextRound 由「interviews 列表 + nowTs」共同驱动：
 *
 * 背景 bug：原实现 interview = ongoingInterviews[0]（store 排序依赖 Date.now()），
 * 但 computed 不因 Date.now() 重算，时间流逝不会触发重排。跨过一场面试后，
 * ongoingInterviews[0] 仍是已过期那条，nextRound 找不到未来轮次 → 返回 null → 横幅消失，
 * 不会顺延到下一场（刷新浏览器才恢复）。
 *
 * 根因：所有"按时间选最近待面"的判定都必须挂在 nowTs 这个每秒 tick 的响应式源上，
 * 不能用 Date.now()。
 */
export function useNextRoundCountdown(getInterviews: () => Interview | Interview[] | null | undefined) {
  const nowTs = ref(Date.now())
  // ponytail: 只要有进行中面试就起定时器（不用 nextRound 有值才起——否则跨场时若当前
  //           nextRound 已为 null，定时器被 stop，19 号临近时不会自动恢复/重选）
  const timer = setInterval(() => { nowTs.value = Date.now() }, 1000)
  onUnmounted(() => clearInterval(timer))

  /** 把所有进行中面试里，未来最近待面轮次最早的那场（含其 nextRound）。
   *  兼容单条（InterviewCard）与数组（横幅）两种调用。 */
  const next = computed(() => {
    const now = nowTs.value
    const list = getInterviews()
    const arr: Interview[] = Array.isArray(list) ? list : list ? [list] : []
    let bestIv: Interview | null = null
    let bestRound: InterviewRound | null = null
    let bestTs = Infinity
    for (const iv of arr) {
      if (iv.status !== 'interviewing') continue
      const r = findNextRound(iv, now)
      if (!r?.scheduledAt) continue
      const ts = new Date(r.scheduledAt).getTime()
      if (ts < bestTs) { bestTs = ts; bestIv = iv; bestRound = r }
    }
    return { interview: bestIv, round: bestRound }
  })
  const nextRound = computed<InterviewRound | null>(() => next.value.round)
  /** 选中的整场面试（横幅/卡片展示公司名等），随 nowTs 重算 */
  const interview = computed<Interview | null>(() => next.value.interview)

  /** 下一面距现在的毫秒差；无未来轮次 / 已过期返回 null */
  const diffMs = computed<number | null>(() => {
    const r = nextRound.value
    if (!r?.scheduledAt) return null
    const diff = new Date(r.scheduledAt).getTime() - nowTs.value
    return diff > 0 ? diff : null
  })

  /** 倒计时文本：N天 HH:MM:SS 或 HH:MM:SS */
  const countdownText = computed(() => {
    const diff = diffMs.value
    if (diff === null) return ''
    let rest = diff
    const days = Math.floor(rest / 86_400_000); rest -= days * 86_400_000
    const hours = Math.floor(rest / 3_600_000); rest -= hours * 3_600_000
    const mins = Math.floor(rest / 60_000); rest -= mins * 60_000
    const secs = Math.floor(rest / 1000)
    const pad = (n: number) => n.toString().padStart(2, '0')
    return days > 0
      ? `${days}天 ${pad(hours)}:${pad(mins)}:${pad(secs)}`
      : `${pad(hours)}:${pad(mins)}:${pad(secs)}`
  })

  /** 紧迫度分档：soon 2~3天 / near 1~2天 / urgent ≤24h / null >3天或无未来轮次 */
  const urgencyLevel = computed<UrgencyLevel>(() => {
    const diff = diffMs.value
    if (diff === null) return null
    if (diff > 3 * 86_400_000) return null      // ponytail: >3 天不提示，横幅不显示
    if (diff >= 2 * 86_400_000) return 'soon'   // 剩 3 天 [48h,72h] 蓝
    if (diff >= 86_400_000) return 'near'       // 剩 2 天 [24h,48h) 橙
    return 'urgent'                             // ≤24h [0,24h) 红
  })

  return { nextRound, interview, countdownText, urgencyLevel }
}
