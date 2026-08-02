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
import { computed, onUnmounted, ref, watch } from 'vue'
import type { Interview, InterviewRound } from '@/types/interview'

export type UrgencyLevel = 'soon' | 'near' | 'urgent' | null

export function useNextRoundCountdown(interview: () => Interview | null | undefined) {
  /** 未来最近的待面轮次（scheduledAt > now 的最小值）；无则 null */
  const nextRound = computed<InterviewRound | null>(() => {
    const iv = interview()
    if (!iv || iv.status !== 'interviewing') return null
    const now = Date.now()
    const future = iv.rounds
      .filter(r => r.scheduledAt && new Date(r.scheduledAt).getTime() > now)
      .sort((a, b) => new Date(a.scheduledAt!).getTime() - new Date(b.scheduledAt!).getTime())
    return future.length > 0 ? future[0] : null
  })

  // 每秒刷新的当前时间戳，驱动 countdownText / urgencyLevel 重算
  // ponytail: 仅在存在未来轮次时启动定时器——无未来轮次的卡片/横幅不空转 1s 定时器
  const nowTs = ref(Date.now())
  let timer: ReturnType<typeof setInterval> | null = null
  const startTimer = () => {
    if (timer) return
    nowTs.value = Date.now() // 启动即校准，避免挂起期间 nowTs 滞后
    timer = setInterval(() => { nowTs.value = Date.now() }, 1000)
  }
  const stopTimer = () => {
    if (timer) { clearInterval(timer); timer = null }
  }
  // nextRound 有值才跑定时器；初始挂载时若已有未来轮次也立即启动
  watch(nextRound, (r) => { r ? startTimer() : stopTimer() }, { immediate: true })
  onUnmounted(stopTimer)

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

  return { nextRound, countdownText, urgencyLevel }
}
