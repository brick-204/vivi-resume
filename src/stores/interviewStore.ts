/**
 * 「我的面试」Store
 *
 * 面试记录列表持久化（IndexedDB / 目录模式双后端）。
 * 三段分区（待面 / 进行中 / 已结束）由 inferInterviewSegment 纯函数推断。
 * 与 consultStore 同骨架：shallowRef + 不可变 commit + 300ms 防抖持久化 +
 * visibilitychange/pagehide flush。无流式状态，比 consultStore 简单。
 */

import { defineStore } from 'pinia'
import { computed, shallowRef, onScopeDispose } from 'vue'
import { useSettingsStore } from '@/stores/settingsStore'
import {
  getAllInterviews,
  saveInterview,
  deleteInterview as deleteInterviewFromStorage,
} from '@/utils/storageAdapter'
import type { Interview, InterviewRound } from '@/types/interview'
import { inferInterviewSegment, createEmptyInterview, createEmptyRound } from '@/types/interview'

/**
 * 深度脱 Vue Proxy：toPlain(toRaw) 只剥外层，嵌套 rounds 元素仍是 Proxy，
 * structuredClone 会抛 DataCloneError。JSON 往返彻底脱代理（与 settingsStore
 * addCustomPet/restorePet 同根因同方案）。假设 interview 为纯 JSON 数据。
 */
const toPlainDeep = (interview: Interview): Interview =>
  JSON.parse(JSON.stringify(interview))

export const useInterviewStore = defineStore('interview', () => {
  // 按 updatedAt 降序排列的面试记录列表
  const interviews = shallowRef<Interview[]>([])

  // ========== 初始化就绪 Promise ==========

  let _readyResolve!: () => void
  const ready = new Promise<void>(resolve => { _readyResolve = resolve })

  // ========== Computed（三段分区，段内按 updatedAt 降序） ==========

  const upcomingInterviews = computed<Interview[]>(() =>
    interviews.value
      .filter(i => inferInterviewSegment(i) === 'upcoming')
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
  )

  const ongoingInterviews = computed<Interview[]>(() =>
    interviews.value
      .filter(i => inferInterviewSegment(i) === 'ongoing')
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
  )

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
      saveInterview(toPlainDeep(interview)).catch(e => {
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
    const timer = _saveTimer.get(id)
    if (timer) {
      clearTimeout(timer)
      _saveTimer.delete(id)
    }
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
      const all = await getAllInterviews()
      // 按 updatedAt 降序（ISO 字符串 localeCompare 降序）
      all.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      interviews.value = all
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
    saveInterview(toPlainDeep(interview)).catch(e => {
      console.error('[interviewStore] createInterview persist failed:', e)
    })
    return interview.id
  }

  /** 更新面试记录（整体替换 + 更新时间戳 + 防抖持久化） */
  const updateInterview = (interview: Interview) => {
    interview.updatedAt = new Date().toISOString()
    const next = commitInterview(interview)
    persistInterview(next)
  }

  /** 删除面试记录：取消 pending 定时器 + 从列表移除 + 删除存储 */
  const deleteInterview = async (id: string) => {
    cancelPendingPersist(id)
    interviews.value = interviews.value.filter(i => i.id !== id)
    await deleteInterviewFromStorage(id)
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

  // ========== 页面隐藏/关闭 flush ==========
  // ponytail: beforeunload 的 async 不可靠；visibilitychange（hidden 时）时机更早，
  //           pagehide 在页面卸载时兜底。两者配合最大化落盘概率。
  //           visibilitychange 在 visible 时也会触发，但重复 flush 无害（内部已 clearTimeout）
  const flushCurrentInterviews = () => {
    _saveTimer.forEach((_t, id) => {
      flushInterview(id)
    })
  }
  if (typeof window !== 'undefined') {
    const onVisibility = () => { if (document.hidden) flushCurrentInterviews() }
    window.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pagehide', flushCurrentInterviews)
    onScopeDispose(() => {
      window.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pagehide', flushCurrentInterviews)
    })
  }

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
      const all = await getAllInterviews()
      all.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      interviews.value = all
    } catch (e) {
      console.error('[interviewStore] reloadFromStorage 失败:', e)
    }
  }

  return {
    interviews,
    ready,
    upcomingInterviews,
    ongoingInterviews,
    endedInterviews,
    createInterview,
    updateInterview,
    deleteInterview,
    addRound,
    updateRound,
    removeRound,
    reloadFromStorage,
  }
})
