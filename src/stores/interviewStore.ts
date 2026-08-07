/**
 * 「我的面试」Store
 *
 * 面试记录列表持久化（IndexedDB / 目录模式双后端）。
 * 三段分区（待面 / 进行中 / 已结束）由 inferInterviewSegment 纯函数推断。
 * 与 consultStore 同骨架：shallowRef + 不可变 commit + 300ms 防抖持久化 +
 * visibilitychange/pagehide flush。无流式状态，比 consultStore 简单。
 */

import { defineStore } from 'pinia'
import { computed, shallowRef, ref } from 'vue'
import { useSettingsStore } from '@/stores/settingsStore'
import { usePetStore } from '@/stores/petStore'
import { registerFlush, trackPending } from '@/composables/useFlushGuard'
import {
  getAllInterviews,
  saveInterview,
  deleteInterview as deleteInterviewFromStorage,
  getInterviewTrash,
  saveInterviewTrash,
  getTrashRetentionDays,
  getMeta,
  setMeta,
} from '@/utils/storageAdapter'
import type { Interview, InterviewRound, MockInterviewResult, InterviewReviewResult, InterviewJdScanResult, CareerChoiceResult } from '@/types/interview'
import { inferInterviewSegment, createEmptyInterview, createEmptyRound } from '@/types/interview'
import { generateId } from '@/types/resume'
import { message as naiveMessage } from '@/plugins/naive-ui'

/**
 * 深度脱 Vue Proxy：toPlain(toRaw) 只剥外层，嵌套 rounds 元素仍是 Proxy，
 * structuredClone 会抛 DataCloneError。JSON 往返彻底脱代理（与 settingsStore
 * addCustomPet/restorePet 同根因同方案）。假设 interview 为纯 JSON 数据。
 */
const toPlainDeep = (interview: Interview): Interview =>
  JSON.parse(JSON.stringify(interview))

/**
 * 旧数据兼容：早期 rounds 无 meetingLink 字段，读取后补空串；
 * roundType 曾是英文枚举（first/second/hr/final/other），改为自由字符串后需映射为中文，否则 UI 显示英文原值。
 * ponytail: 不做版本号迁移，只对新字段做读取时归一化（与 resumeStore 风格不同但更轻）
 */
const ROUND_TYPE_MIGRATION: Record<string, string> = {
  first: '一面',
  second: '二面',
  hr: 'HR面',
  final: '终面',
  other: '其他',
}
const normalizeInterview = (i: Interview): Interview => ({
  ...i,
  benefits: i.benefits ?? '',
  rounds: i.rounds.map(r => ({
    ...r,
    meetingLink: r.meetingLink ?? '',
    roundType: ROUND_TYPE_MIGRATION[r.roundType] ?? r.roundType,
  })),
})

/**
 * 取该面试「下一面」时间戳：rounds 中未来 scheduledAt 的最小值；无未来轮次返回 Infinity。
 * 用于「进行中」段按紧急度排序（越近越靠前，无安排垫底）。
 * ponytail: 时间判定基于调用时刻，computed 不会因时间流逝自动重算——
 * 用户进入面板/操作时重算即可，秒级重排无意义，不引入全局定时器驱动 store。
 */
const nextScheduledTs = (i: Interview, now = Date.now()): number => {
  let min = Infinity
  for (const r of i.rounds) {
    if (!r.scheduledAt) continue
    const ts = new Date(r.scheduledAt).getTime()
    if (ts > now && ts < min) min = ts
  }
  return min
}

export const useInterviewStore = defineStore('interview', () => {
  // 按 updatedAt 降序排列的面试记录列表
  const interviews = shallowRef<Interview[]>([])

  // 回收站：与 resumeStore.trash 同构，独立数组 + deletedAt 软删除
  const trash = shallowRef<Interview[]>([])
  const trashRetentionDays = ref(30)

  // AI 择业最近一次结果缓存（全局单值，存 meta，仅历史展示不复用）
  const lastCareerChoice = ref<CareerChoiceResult | null>(null)

  // ========== 初始化就绪 Promise ==========

  let _readyResolve!: () => void
  const ready = new Promise<void>(resolve => { _readyResolve = resolve })

  // ========== Computed（三段分区，段内按 updatedAt 降序） ==========

  const upcomingInterviews = computed<Interview[]>(() =>
    interviews.value
      .filter(i => inferInterviewSegment(i) === 'upcoming')
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
  )

  const ongoingInterviews = computed<Interview[]>(() => {
    const now = Date.now()
    return interviews.value
      .filter(i => inferInterviewSegment(i) === 'ongoing')
      // ponytail: 按下一面紧急度升序（越近越靠前，无未来轮次 Infinity 垫底）；同紧急度按 updatedAt 降序兜底
      .sort((a, b) => {
        const da = nextScheduledTs(a, now), db = nextScheduledTs(b, now)
        if (da !== db) return da - db
        return b.updatedAt.localeCompare(a.updatedAt)
      })
  })

  const endedInterviews = computed<Interview[]>(() =>
    interviews.value
      .filter(i => inferInterviewSegment(i) === 'ended')
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
  )

  // ========== 持久化（300ms 防抖） ==========

  let _saveTimer: Map<string, ReturnType<typeof setTimeout>> = new Map()

  const persistInterview = (interview: Interview) => {
    const existing = _saveTimer.get(interview.id)
    if (existing) clearTimeout(existing)
    const timer = setTimeout(() => {
      _saveTimer.delete(interview.id)
      trackPending(saveInterview(toPlainDeep(interview))).catch(e => {
        console.error('[interviewStore] persistInterview failed:', e)
      })
    }, 300)
    _saveTimer.set(interview.id, timer)
  }

  /** 取消某记录的 pending 持久化定时器（删除前必须调用，否则已删记录会被定时器写回） */
  const cancelPendingPersist = (id: string) => {
    const t = _saveTimer.get(id)
    if (t) {
      clearTimeout(t)
      _saveTimer.delete(id)
    }
  }

  const flushInterview = async (id: string) => {
    // ponytail: 无 pending 防抖定时器则早退，避免 flushAll 时无谓写一次面试文件（目录模式慢）
    const timer = _saveTimer.get(id)
    if (!timer) return
    clearTimeout(timer)
    _saveTimer.delete(id)
    const interview = interviews.value.find(i => i.id === id)
    if (interview) {
      await saveInterview(toPlainDeep(interview))
    }
  }

  // ========== 初始化 ==========

  const init = async () => {
    const settingsStore = useSettingsStore()
    await settingsStore.ready

    try {
      const [all, trashData, retentionDays, careerChoice] = await Promise.all([
        getAllInterviews(),
        getInterviewTrash(),
        getTrashRetentionDays(),
        getMeta<CareerChoiceResult>('lastCareerChoice'),
      ])
      // 按 updatedAt 降序（ISO 字符串 localeCompare 降序）
      all.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      interviews.value = all.map(normalizeInterview)
      trash.value = trashData.map(normalizeInterview)
      trashRetentionDays.value = retentionDays
      lastCareerChoice.value = careerChoice ?? null
      // 自动清理过期面试记录（与 resumeStore.cleanupTrash 同策略）
      await cleanupTrash()
      // 注入面试临近提醒 getter 到 petStore（每秒 tick 调用，每次用最新 now 重算）
      // ponytail: 用函数而非 computed——computed 不因时间流逝重算，函数每次调用都取最新 Date.now()
      try {
        usePetStore().setInterviewTsGetter(() => {
          const now = Date.now()
          let min = Infinity
          for (const i of interviews.value) {
            // 仅对待面/进行中的面试提醒（已结束的不提醒）
            if (inferInterviewSegment(i) === 'ended') continue
            const ts = nextScheduledTs(i, now)
            if (ts < min) min = ts
          }
          return min
        })
      } catch { /* petStore 未就绪，忽略 */ }
    } catch (e) {
      console.error('[interviewStore] 初始化失败:', e)
    } finally {
      _readyResolve()
    }
  }

  // ========== 不可变更新 ==========

  /**
   * 用新对象替换 interviews 中对应记录（不可变更新）。
   * shallowRef 下原地改字段不触发响应式：三段分区 computed 依赖 interviews.value，
   * 若记录引用不变则不重算 → UI 不更新。改任何字段后必须走这里整体替换。
   * rounds 也生成新数组引用，确保依赖 rounds 的视图刷新。
   * 返回新对象供调用方继续使用。
   */
  const commitInterview = (interview: Interview): Interview => {
    const next = { ...interview, rounds: [...interview.rounds] }
    interviews.value = interviews.value.map(i => (i.id === interview.id ? next : i))
    return next
  }

  // ========== Actions ==========

  /** 新建空白面试记录，unshift 到列表头部并立即落盘（不走防抖）；返回新记录 id */
  const createInterview = (partial?: Partial<Interview>): string => {
    const interview: Interview = { ...createEmptyInterview(), ...partial }
    // shallowRef 需整体替换触发响应式
    interviews.value = [interview, ...interviews.value]
    // 新建即落盘，避免关页面丢失
    trackPending(saveInterview(toPlainDeep(interview))).catch(e => {
      console.error('[interviewStore] createInterview persist failed:', e)
    })
    return interview.id
  }

  /** 更新面试记录（整体替换 + 更新时间戳 + 防抖持久化） */
  const updateInterview = (interview: Interview) => {
    // ponytail: commit 前取旧 status，commit 后整体替换引用再 find 就拿不到旧值了
    const old = interviews.value.find(i => i.id === interview.id)
    const statusChanged = old && old.status !== interview.status
    interview.updatedAt = new Date().toISOString()
    const next = commitInterview(interview)
    persistInterview(next)
    // status 流转到 offer/rejected 是强情绪事件 → 桌宠反馈（仅变化时触发，避免每次 update 都说）
    if (statusChanged) {
      try {
        const ps = usePetStore()
        if (interview.status === 'offer') void ps.sayCategory('offerGot')
        else if (interview.status === 'rejected') void ps.sayCategory('rejected')
      } catch { /* pinia 未就绪，静默 */ }
    }
  }

  /**
   * 标记某场面试为 AI 择业推荐（清旧加新：任意时刻最多一场 careerChoiceRecommended=true）。
   * 不刷 updatedAt，避免污染「按 updatedAt 降序」的列表排序。
   * 逐条 commit + persist（300ms 防抖合并），批量改也只产生 N 个独立写定时器。
   */
  const markCareerChoiceRecommended = (id: string | null) => {
    for (const iv of interviews.value) {
      const want = iv.id === id
      if (!!iv.careerChoiceRecommended !== want) {
        const next = commitInterview({ ...iv, careerChoiceRecommended: want })
        persistInterview(next)
      }
    }
  }

  /**
   * 移入回收站（软删除）：取消 pending 定时器 + 从主列表移除 + 打 deletedAt + 推进 trash + 双写持久化。
   * 主列表落盘（删除源文件）与回收站 meta 落盘并行。
   */
  const trashInterview = async (id: string) => {
    const interview = interviews.value.find(i => i.id === id)
    if (!interview) return
    cancelPendingPersist(id)
    const now = new Date().toISOString()
    const deleted: Interview = { ...toPlainDeep(interview), deletedAt: now }
    interviews.value = interviews.value.filter(i => i.id !== id)
    trash.value = [...trash.value, deleted]
    try {
      await trackPending(Promise.all([
        deleteInterviewFromStorage(id),
        saveInterviewTrash(trash.value),
      ]))
    } catch (e) {
      console.error('[interviewStore] trashInterview persist failed:', e)
      naiveMessage.warning('删除未完全同步，刷新后可能恢复，请检查存储空间')
    }
  }

  /**
   * 物理删除（不进回收站）：仅用于「新建未填的空记录」清理。
   * 用户主动删除已有记录请走 trashInterview（软删除进回收站）。
   */
  const purgeInterview = async (id: string) => {
    cancelPendingPersist(id)
    interviews.value = interviews.value.filter(i => i.id !== id)
    try {
      await trackPending(deleteInterviewFromStorage(id))
    } catch (e) {
      console.error('[interviewStore] purgeInterview persist failed:', e)
      naiveMessage.warning('删除未完全同步，请检查存储空间')
    }
  }

  /** 批量移入回收站 */
  const trashInterviews = async (ids: string[]) => {
    if (ids.length === 0) return
    const idSet = new Set(ids)
    const now = new Date().toISOString()
    const deleted = interviews.value
      .filter(i => idSet.has(i.id))
      .map(i => ({ ...toPlainDeep(i), deletedAt: now }))
    if (deleted.length === 0) return
    ids.forEach(cancelPendingPersist)
    interviews.value = interviews.value.filter(i => !idSet.has(i.id))
    trash.value = [...trash.value, ...deleted]
    try {
      await trackPending(Promise.all([
        Promise.all(ids.map(id => deleteInterviewFromStorage(id))),
        saveInterviewTrash(trash.value),
      ]))
    } catch (e) {
      console.error('[interviewStore] trashInterviews persist failed:', e)
      naiveMessage.warning('删除未完全同步，刷新后可能恢复，请检查存储空间')
    }
  }

  /** 从回收站恢复：移除 deletedAt + 回到主列表 + 重新落盘源文件 */
  const restoreInterview = async (id: string) => {
    const interview = trash.value.find(i => i.id === id)
    if (!interview) return
    const restored: Interview = { ...interview, deletedAt: undefined }
    trash.value = trash.value.filter(i => i.id !== id)
    interviews.value = [restored, ...interviews.value]
    await trackPending(Promise.all([
      saveInterview(toPlainDeep(restored)),
      saveInterviewTrash(trash.value),
    ]))
  }

  /** 永久删除（仅从回收站 meta 移除；源文件在 trashInterview 时已物理删除） */
  const permanentDeleteInterview = async (id: string) => {
    trash.value = trash.value.filter(i => i.id !== id)
    await trackPending(saveInterviewTrash(trash.value))
  }

  /** 清空面试回收站 */
  // ponytail: 先清内存让 UI 立即响应，落盘后台执行
  const emptyTrash = () => {
    trash.value = []
    trackPending(saveInterviewTrash([])).catch(e => {
      console.error('[interviewStore] emptyTrash persist failed:', e)
      naiveMessage.warning('清空未完全同步，请检查存储空间')
    })
  }

  /** 自动清理过期面试记录（复用简历保留天数配置） */
  const cleanupTrash = async () => {
    const cutoff = Date.now() - trashRetentionDays.value * 24 * 60 * 60 * 1000
    const valid = trash.value.filter(i => {
      const deletedAt = i.deletedAt ? new Date(i.deletedAt).getTime() : Date.now()
      return deletedAt > cutoff
    })
    if (valid.length !== trash.value.length) {
      trash.value = valid
      await saveInterviewTrash(valid)
    }
  }

  /**
   * 复制面试记录：深拷贝 → 新 id（主记录 + 每个 round 都重新生成，避免冲突）→
   * 公司名加「(副本)」→ unshift + 立即落盘。与 resumeStore.copyResume 同策略。
   */
  const duplicateInterview = (id: string): string => {
    const source = interviews.value.find(i => i.id === id)
    if (!source) return ''
    const now = new Date().toISOString()
    const copy: Interview = toPlainDeep(source)
    copy.id = generateId()
    copy.company = source.company ? `${source.company} (副本)` : '(副本)'
    copy.rounds = copy.rounds.map(r => ({ ...r, id: generateId(), createdAt: now, updatedAt: now }))
    copy.createdAt = now
    copy.updatedAt = now
    delete copy.deletedAt
    interviews.value = [copy, ...interviews.value]
    trackPending(saveInterview(toPlainDeep(copy))).catch(e => {
      console.error('[interviewStore] duplicateInterview persist failed:', e)
    })
    return copy.id
  }

  /** 新增一轮空白面试轮次（两层不可变：新 rounds 数组 + 新 interview 对象） */
  const addRound = (interviewId: string) => {
    const interview = interviews.value.find(i => i.id === interviewId)
    if (!interview) return
    const now = new Date().toISOString()
    const newRounds = [...interview.rounds, createEmptyRound()]
    const next = commitInterview({ ...interview, rounds: newRounds, updatedAt: now })
    persistInterview(next)
  }

  /** 更新指定轮次（两层不可变：新 round + 新 rounds + 新 interview） */
  const updateRound = (interviewId: string, round: InterviewRound) => {
    const interview = interviews.value.find(i => i.id === interviewId)
    if (!interview) return
    const now = new Date().toISOString()
    const newRounds = interview.rounds.map(r =>
      r.id === round.id ? { ...round, updatedAt: now } : r,
    )
    const next = commitInterview({ ...interview, rounds: newRounds, updatedAt: now })
    persistInterview(next)
  }

  /** 移除指定轮次 */
  const removeRound = (interviewId: string, roundId: string) => {
    const interview = interviews.value.find(i => i.id === interviewId)
    if (!interview) return
    const now = new Date().toISOString()
    const newRounds = interview.rounds.filter(r => r.id !== roundId)
    const next = commitInterview({ ...interview, rounds: newRounds, updatedAt: now })
    persistInterview(next)
  }

  // ========== AI 结果缓存（三个功能各存最新一次，立即落盘） ==========
  // ponytail: 不走防抖——AI 结果是关键数据，与 resumeStore.saveJdScanResult 同策略立即写

  const saveMockInterviewResult = (interviewId: string, result: MockInterviewResult) => {
    const interview = interviews.value.find(i => i.id === interviewId)
    if (!interview) return
    const next = commitInterview({ ...interview, lastMockInterview: result })
    persistInterview(next)
  }

  const saveReviewResult = (interviewId: string, result: InterviewReviewResult) => {
    const interview = interviews.value.find(i => i.id === interviewId)
    if (!interview) return
    const next = commitInterview({ ...interview, lastReview: result })
    persistInterview(next)
  }

  const saveJdScanResult = (interviewId: string, result: InterviewJdScanResult) => {
    const interview = interviews.value.find(i => i.id === interviewId)
    if (!interview) return
    const next = commitInterview({ ...interview, lastJdScan: result })
    persistInterview(next)
  }

  // ========== AI 择业结果缓存（全局单值，存 meta，仅历史展示不复用） ==========
  const saveCareerChoiceResult = (result: CareerChoiceResult) => {
    lastCareerChoice.value = result
    trackPending(setMeta('lastCareerChoice', result)).catch(e => {
      console.error('[interviewStore] saveCareerChoiceResult failed:', e)
    })
  }

  // ========== 页面隐藏/关闭 flush ==========
  // ponytail: 统一交由 useFlushGuard 注册三事件 + 驱动保存遮罩（顺带补上原本缺失的 beforeunload）。
  //           返回 Promise.all 让 flushAll 的 allSettled 真正 await 落盘，避免遮罩提前消失、写被中断丢数据。
  const flushCurrentInterviews = (): Promise<void> => {
    return Promise.all([..._saveTimer.keys()].map(id => flushInterview(id))).then(() => undefined)
  }
  registerFlush(() => _saveTimer.size > 0, () => flushCurrentInterviews())

  // 初始化
  init()

  // ========== 重新加载（目录模式切换后调用） ==========

  const reloadFromStorage = async () => {
    // 等 init 完成后再重载，避免与 init 并发读 IndexedDB 互相覆盖
    await ready
    // 清空 pending 持久化定时器，避免旧快照写回覆盖新数据
    _saveTimer.forEach(t => clearTimeout(t))
    _saveTimer.clear()

    try {
      const [all, trashData, retentionDays, careerChoice] = await Promise.all([
        getAllInterviews(),
        getInterviewTrash(),
        getTrashRetentionDays(),
        getMeta<CareerChoiceResult>('lastCareerChoice'),
      ])
      all.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      interviews.value = all.map(normalizeInterview)
      trash.value = trashData.map(normalizeInterview)
      trashRetentionDays.value = retentionDays
      lastCareerChoice.value = careerChoice ?? null
      await cleanupTrash()
    } catch (e) {
      console.error('[interviewStore] reloadFromStorage 失败:', e)
    }
  }

  return {
    interviews,
    trash,
    trashRetentionDays,
    lastCareerChoice,
    ready,
    upcomingInterviews,
    ongoingInterviews,
    endedInterviews,
    createInterview,
    updateInterview,
    trashInterview,
    trashInterviews,
    restoreInterview,
    permanentDeleteInterview,
    purgeInterview,
    emptyTrash,
    cleanupTrash,
    duplicateInterview,
    addRound,
    updateRound,
    removeRound,
    saveMockInterviewResult,
    saveReviewResult,
    saveJdScanResult,
    saveCareerChoiceResult,
    markCareerChoiceRecommended,
    reloadFromStorage,
  }
})
