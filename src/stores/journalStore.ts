/**
 * 「求职手账」Store
 *
 * 手账条目（记事本 + 笔记）持久化（IndexedDB / 目录模式双后端）。
 * 与 interviewStore 同骨架：shallowRef + 不可变 commit + 300ms 防抖持久化 +
 * visibilitychange/pagehide flush + 软删回收站。
 *
 * 两类实体共用 entries 数组靠 type 区分（见 types/journal.ts）：
 * - notebook（记事本）：目录容器，parentId 永远 null，content 为空
 * - note（笔记）：富文本，可在记事本内（parentId=记事本id）或根级（parentId=null）
 *
 * 回收站以记事本为单位显示：删记事本时连带其下所有 notes 一起软删（同 deletedAt），
 * trash 数组里 notebook 和 notes 混存，UI 只渲染 type==='notebook' 条目。
 */

import { defineStore } from 'pinia'
import { computed, shallowRef, ref } from 'vue'
import { useSettingsStore } from '@/stores/settingsStore'
import { usePetStore } from '@/stores/petStore'
import { registerFlush, trackPending } from '@/composables/useFlushGuard'
import {
  getAllJournals,
  saveJournal,
  deleteJournal as deleteJournalFromStorage,
  getJournalTrash,
  saveJournalTrash,
  getTrashRetentionDays,
} from '@/utils/storageAdapter'
import type { JournalEntry } from '@/types/journal'
import { createEmptyNotebook, createEmptyNote } from '@/types/journal'
import { message as naiveMessage } from '@/plugins/naive-ui'

/** 深度脱 Vue Proxy：JSON 往返彻底脱代理（与 interviewStore.toPlainDeep 同根因同方案） */
const toPlainDeep = (entry: JournalEntry): JournalEntry =>
  JSON.parse(JSON.stringify(entry))

export const useJournalStore = defineStore('journal', () => {
  // 按 updatedAt 降序排列的手账条目（记事本 + 笔记混存）
  const entries = shallowRef<JournalEntry[]>([])

  // 回收站：与 interviewStore.trash 同构，软删除 + deletedAt
  const trash = shallowRef<JournalEntry[]>([])
  const trashRetentionDays = ref(30)

  // ========== 初始化就绪 Promise ==========

  let _readyResolve!: () => void
  const ready = new Promise<void>(resolve => { _readyResolve = resolve })

  // ========== Computed ==========

  /** 所有记事本（根级，notebook 不可嵌套） */
  const notebooks = computed<JournalEntry[]>(() =>
    entries.value
      .filter(e => e.type === 'notebook')
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
  )

  /** 根级笔记（parentId === null） */
  const rootNotes = computed<JournalEntry[]>(() =>
    entries.value
      .filter(e => e.type === 'note' && e.parentId === null)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
  )

  /** 某记事本下的笔记 */
  const notesByParent = (parentId: string): JournalEntry[] =>
    entries.value
      .filter(e => e.type === 'note' && e.parentId === parentId)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))

  /** 某记事本下的笔记数（卡片角标用） */
  const notebookCount = (notebookId: string): number =>
    entries.value.filter(e => e.type === 'note' && e.parentId === notebookId).length

  // ========== 持久化（300ms 防抖） ==========

  let _saveTimer: Map<string, ReturnType<typeof setTimeout>> = new Map()

  const persistEntry = (entry: JournalEntry) => {
    const existing = _saveTimer.get(entry.id)
    if (existing) clearTimeout(existing)
    const timer = setTimeout(() => {
      _saveTimer.delete(entry.id)
      trackPending(saveJournal(toPlainDeep(entry))).catch(e => {
        console.error('[journalStore] persistEntry failed:', e)
      })
    }, 300)
    _saveTimer.set(entry.id, timer)
  }

  /** 取消某条目的 pending 持久化定时器（删除前必须调用，否则已删条目会被定时器写回） */
  const cancelPendingPersist = (id: string) => {
    const t = _saveTimer.get(id)
    if (t) {
      clearTimeout(t)
      _saveTimer.delete(id)
    }
  }

  const flushEntry = async (id: string) => {
    // ponytail: 无 pending 防抖定时器则早退，避免 flushAll 时无谓写（目录模式慢）
    const timer = _saveTimer.get(id)
    if (!timer) return
    clearTimeout(timer)
    _saveTimer.delete(id)
    const entry = entries.value.find(e => e.id === id)
    if (entry) {
      await saveJournal(toPlainDeep(entry))
    }
  }

  // ========== 初始化 ==========

  const init = async () => {
    const settingsStore = useSettingsStore()
    await settingsStore.ready

    try {
      const [all, trashData, retentionDays] = await Promise.all([
        getAllJournals(),
        getJournalTrash(),
        getTrashRetentionDays(),
      ])
      all.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      entries.value = all
      trash.value = trashData
      trashRetentionDays.value = retentionDays
      await cleanupTrash()
    } catch (e) {
      console.error('[journalStore] 初始化失败:', e)
    } finally {
      _readyResolve()
    }
  }

  // ========== 不可变更新 ==========

  /**
   * 用新对象替换 entries 中对应条目（不可变更新）。
   * shallowRef 下原地改字段不触发响应式，改任何字段后必须走这里整体替换。
   * 返回新对象供调用方继续使用。
   */
  const commitEntry = (entry: JournalEntry): JournalEntry => {
    const next = { ...entry }
    entries.value = entries.value.map(e => (e.id === entry.id ? next : e))
    return next
  }

  // ========== Actions ==========

  /** 新建记事本，unshift 到列表头部并立即落盘；返回新记事本 id */
  const createNotebook = (title: string): string => {
    const entry = createEmptyNotebook(title)
    entries.value = [entry, ...entries.value]
    trackPending(saveJournal(toPlainDeep(entry))).catch(e => {
      console.error('[journalStore] createNotebook persist failed:', e)
    })
    return entry.id
  }

  /** 新建笔记，unshift 到列表头部并立即落盘；落盘成功后桌宠说鼓励话术；返回新笔记 id */
  const createNote = (parentId: string | null = null): string => {
    const entry = createEmptyNote(parentId)
    entries.value = [entry, ...entries.value]
    trackPending(saveJournal(toPlainDeep(entry))).catch(e => {
      console.error('[journalStore] createNote persist failed:', e)
    })
    // 创建笔记是鼓励向事件 → 桌宠反馈（与 interviewStore.offerGot 同模式）
    try {
      void usePetStore().sayCategory('journalCreate')
    } catch { /* pinia 未就绪，静默 */ }
    return entry.id
  }

  /**
   * 更新手账条目（整体替换 + 更新时间戳 + 防抖持久化）。
   * 标题由调用方决定：编辑期间不动标题，退出时若标题为空才由 JournalPanel 补第一行前6字。
   */
  const updateEntry = (entry: JournalEntry) => {
    const next: JournalEntry = { ...entry }
    next.updatedAt = new Date().toISOString()
    commitEntry(next)
    persistEntry(next)
  }

  /** 移动笔记到另一记事本或根级（改 parentId + updatedAt + commit + persist；同 parentId 跳过） */
  const moveNote = (noteId: string, targetParentId: string | null) => {
    const note = entries.value.find(e => e.id === noteId)
    if (!note || note.type !== 'note') return
    if (note.parentId === targetParentId) return
    const next = { ...note, parentId: targetParentId, updatedAt: new Date().toISOString() }
    commitEntry(next)
    persistEntry(next)
  }

  /**
   * 物理删除一条活跃条目（不进回收站）：取消 pending 定时器 + 从 entries 移除 + 删源文件。
   * 用于「空笔记退出不创建」——内容为空时该笔记从未真正存在，不应污染回收站。
   */
  const deleteEntry = async (id: string) => {
    cancelPendingPersist(id)
    entries.value = entries.value.filter(e => e.id !== id)
    try {
      await trackPending(deleteJournalFromStorage(id))
    } catch (e) {
      console.error('[journalStore] deleteEntry persist failed:', e)
    }
  }

  /**
   * 移入回收站（软删除）：取消 pending 定时器 + 打 deletedAt + 推进 trash + 双写持久化。
   * 若删除的是记事本，连带其下所有 notes 一起软删（同 deletedAt）。
   */
  const trashEntry = async (id: string) => {
    const entry = entries.value.find(e => e.id === id)
    if (!entry) return
    const now = new Date().toISOString()
    // 收集要软删的条目：自身 +（若记事本）其下所有 notes
    const toDelete: JournalEntry[] = [entry]
    if (entry.type === 'notebook') {
      const childNotes = entries.value.filter(e => e.type === 'note' && e.parentId === id)
      toDelete.push(...childNotes)
    }
    const deleteIds = new Set(toDelete.map(e => e.id))
    deleteIds.forEach(cancelPendingPersist)
    const deleted = toDelete.map(e => ({ ...toPlainDeep(e), deletedAt: now }))
    entries.value = entries.value.filter(e => !deleteIds.has(e.id))
    trash.value = [...trash.value, ...deleted]
    try {
      await trackPending(Promise.all([
        Promise.all([...deleteIds].map(did => deleteJournalFromStorage(did))),
        saveJournalTrash(trash.value),
      ]))
    } catch (e) {
      console.error('[journalStore] trashEntry persist failed:', e)
      naiveMessage.warning('删除未完全同步，刷新后可能恢复，请检查存储空间')
    }
  }

  /**
   * 从回收站恢复：移除 deletedAt + 回到主列表 + 重新落盘源文件。
   * 若恢复的是记事本，连带恢复其下所有 notes（同 deletedAt 一起进 trash 的）。
   */
  const restoreEntry = async (id: string) => {
    const entry = trash.value.find(e => e.id === id)
    if (!entry) return
    // 收集要恢复的条目：自身 +（若记事本）trash 中随它一起软删的子 notes（deletedAt 相同）。
    // 早于记事本单独删的笔记不牵连——它有自己的回收站条目，单独恢复。
    const toRestore: JournalEntry[] = [entry]
    if (entry.type === 'notebook') {
      const childNotes = trash.value.filter(e => e.type === 'note' && e.parentId === id && e.deletedAt === entry.deletedAt)
      toRestore.push(...childNotes)
    }
    const restoreIds = new Set(toRestore.map(e => e.id))
    // ponytail: 恢复单条笔记时，若其原笔记本已不在活跃列表（也被删了），落到根目录而非指向已删笔记本。
    // 恢复记事本连带子笔记时，记事本在 toRestore 中，子笔记 parentId 合法、不改。
    const restoringIds = new Set(toRestore.map(e => e.id))
    const restored = toRestore.map(e => {
      if (
        e.type === 'note' &&
        e.parentId &&
        !restoringIds.has(e.parentId) &&
        !entries.value.some(n => n.id === e.parentId)
      ) {
        return { ...e, parentId: null, deletedAt: undefined }
      }
      return { ...e, deletedAt: undefined }
    })
    trash.value = trash.value.filter(e => !restoreIds.has(e.id))
    entries.value = [...restored, ...entries.value]
    await trackPending(Promise.all([
      Promise.all(restored.map(r => saveJournal(toPlainDeep(r)))),
      saveJournalTrash(trash.value),
    ]))
  }

  /** 永久删除（仅从回收站 meta 移除；源文件在 trashEntry 时已物理删除）。记事本连带删随它一起软删的子 notes（deletedAt 相同）；早于记事本单独删的笔记不牵连 */
  const permanentDeleteEntry = async (id: string) => {
    const entry = trash.value.find(e => e.id === id)
    if (!entry) return
    const deleteIds = new Set<string>([id])
    if (entry.type === 'notebook') {
      trash.value
        .filter(e => e.type === 'note' && e.parentId === id && e.deletedAt === entry.deletedAt)
        .forEach(e => deleteIds.add(e.id))
    }
    trash.value = trash.value.filter(e => !deleteIds.has(e.id))
    await trackPending(saveJournalTrash(trash.value))
  }

  /** 清空手账回收站 */
  // ponytail: 先清内存让 UI 立即响应，落盘后台执行
  const emptyTrash = () => {
    trash.value = []
    trackPending(saveJournalTrash([])).catch(e => {
      console.error('[journalStore] emptyTrash persist failed:', e)
      naiveMessage.warning('清空未完全同步，请检查存储空间')
    })
  }

  /** 自动清理过期手账条目（复用简历保留天数配置） */
  const cleanupTrash = async () => {
    const cutoff = Date.now() - trashRetentionDays.value * 24 * 60 * 60 * 1000
    const valid = trash.value.filter(e => {
      const deletedAt = e.deletedAt ? new Date(e.deletedAt).getTime() : Date.now()
      return deletedAt > cutoff
    })
    if (valid.length !== trash.value.length) {
      trash.value = valid
      await saveJournalTrash(valid)
    }
  }

  // ========== 页面隐藏/关闭 flush ==========
  const flushCurrentEntries = (): Promise<void> => {
    return Promise.all([..._saveTimer.keys()].map(id => flushEntry(id))).then(() => undefined)
  }
  registerFlush(() => _saveTimer.size > 0, () => flushCurrentEntries())

  // 初始化
  init()

  // ========== 重新加载（目录模式切换后调用） ==========

  const reloadFromStorage = async () => {
    await ready
    _saveTimer.forEach(t => clearTimeout(t))
    _saveTimer.clear()

    try {
      const [all, trashData, retentionDays] = await Promise.all([
        getAllJournals(),
        getJournalTrash(),
        getTrashRetentionDays(),
      ])
      all.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      entries.value = all
      trash.value = trashData
      trashRetentionDays.value = retentionDays
      await cleanupTrash()
    } catch (e) {
      console.error('[journalStore] reloadFromStorage 失败:', e)
    }
  }

  return {
    entries,
    trash,
    trashRetentionDays,
    ready,
    notebooks,
    rootNotes,
    notesByParent,
    notebookCount,
    createNotebook,
    createNote,
    updateEntry,
    deleteEntry,
    moveNote,
    trashEntry,
    restoreEntry,
    permanentDeleteEntry,
    emptyTrash,
    cleanupTrash,
    reloadFromStorage,
  }
})
