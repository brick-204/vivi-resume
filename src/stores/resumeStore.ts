import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Resume, CustomTextSection, CustomCardSection, HeaderTextColor, HeaderIconColor, EvaluationResult } from '@/types/resume'
import {
  createEmptyResume,
  generateId,
  DEFAULT_SECTION_ORDER,
  getCustomSectionType,
  getCustomSectionIndex,
  generateCustomSectionId,
} from '@/types/resume'
import { useWorkerSerializer } from '@/composables/useWorkerSerializer'
import { useSyncLock } from '@/composables/useSyncLock'
import { useSettingsStore } from '@/stores/settingsStore'
import {
  migrateFromLocalStorage,
  getAllResumes,
  saveResumeList,
  getCurrentId,
  setCurrentId,
} from '@/utils/storageAdapter'
// 颜色设置迁移 — 将旧的 boolean 字段迁移到新的三态枚举
const migrateResumeColors = (resume: Resume): Resume => {
  const updates: Partial<Resume> = {}
  if (resume.headerTextColor === undefined && resume.whiteHeaderText !== undefined) {
    updates.headerTextColor = (resume.whiteHeaderText ? 'white' : 'black') as HeaderTextColor
  }
  if (resume.headerIconColor === undefined && resume.iconFollowAccent !== undefined) {
    updates.headerIconColor = (resume.iconFollowAccent ? 'accent' : 'black') as HeaderIconColor
  }
  return Object.keys(updates).length > 0 ? { ...resume, ...updates } : resume
}

// highlights 迁移 — 将旧的 highlights[] 合并到 description 中
const migrateHighlights = (resume: Resume): Resume => {
  let changed = false
  const work = (resume.workExperience || []).map(item => {
    if (item.highlights?.length && !(item.description || '').includes(item.highlights[0])) {
      changed = true
      const merged = item.description
        ? item.description + '\n- ' + item.highlights.join('\n- ')
        : '- ' + item.highlights.join('\n- ')
      return { ...item, description: merged, highlights: undefined }
    }
    return item
  })
  const projects = (resume.projects || []).map(item => {
    if (item.highlights?.length && !(item.description || '').includes(item.highlights[0])) {
      changed = true
      const merged = item.description
        ? item.description + '\n- ' + item.highlights.join('\n- ')
        : '- ' + item.highlights.join('\n- ')
      return { ...item, description: merged, highlights: undefined }
    }
    return item
  })
  return changed ? { ...resume, workExperience: work, projects: projects } : resume
}

export const useResumeStore = defineStore('resume', () => {
  // 简历列表
  const resumeList = ref<Resume[]>([])

  // 当前编辑的简历
  const currentResume = ref<Resume | null>(null)

  // 计算属性：简历数量
  const resumeCount = computed(() => resumeList.value.length)

  // 序列化 Worker（persistent 模式：store 生命周期内持续存在，不依赖 onUnmounted）
  const { serialize, parse } = useWorkerSerializer({ persistent: true })

  // 同步锁（模块级单例）
  const { isLocked } = useSyncLock()

  // ========== 初始化就绪 Promise ==========
  // init() 改为异步后，组件需要等待数据加载完成才能安全访问 resumeList
  let _readyResolve!: () => void
  const ready = new Promise<void>(resolve => { _readyResolve = resolve })

  // 初始化：从 IndexedDB 加载数据（首次使用时自动从 localStorage 迁移）
  const init = async () => {
    // Step 0: 等待 settingsStore 就绪（确保 isDirectoryMode 已正确设置）
    const settingsStore = useSettingsStore()
    await settingsStore.ready

    // Step 1: 检测并执行 localStorage → IndexedDB 迁移（一次性）
    await migrateFromLocalStorage()

    // Step 2: 从当前存储后端加载所有简历
    try {
      const loaded = await getAllResumes()
      const migrated = loaded.map(r => migrateHighlights(migrateResumeColors(r)))
      resumeList.value = migrated

      // 如果迁移产生了变化，保存回存储
      const needsSave = loaded.some(r =>
        (r.headerTextColor === undefined && r.whiteHeaderText !== undefined)
        || r.workExperience?.some(w => (w as any).highlights?.length)
        || r.projects?.some(p => (p as any).highlights?.length)
      )
      if (needsSave) {
        await saveResumeList(migrated)
      }
    } catch (e) {
      console.error('Failed to load resume list:', e)
      resumeList.value = []
    }

    // Step 3: 加载当前编辑的简历
    const currentId = await getCurrentId()
    if (currentId) {
      const resume = resumeList.value.find(r => r.id === currentId)
      if (resume) {
        const json = await serialize(resume)
        currentResume.value = await parse<Resume>(json)
      }
    }

    // 标记初始化完成
    _readyResolve()
  }

  // 防抖写入
  let saveTimer: ReturnType<typeof setTimeout> | null = null
  // 防止并发写入的锁
  let _savePromise: Promise<void> | null = null

  // 立即写入 IndexedDB（用于创建/删除等不可丢失操作）
  const saveToStorageNow = async (): Promise<void> => {
    // 同步期间禁止写入
    if (isLocked.value) return

    if (saveTimer) { clearTimeout(saveTimer); saveTimer = null }

    // 先保存完整列表（包含当前简历的最新状态）
    // 再单独更新 currentId 元数据
    // 避免并行 clear+put 导致竞态条件
    await saveResumeList(resumeList.value)
    if (currentResume.value) {
      await setCurrentId(currentResume.value.id)
    }
  }

  // 防抖写入 IndexedDB（用于拖拽等高频操作）
  // 使用串行化确保不会出现并发写入导致旧数据覆盖新数据
  const saveToStorage = () => {
    // 同步期间禁止写入
    if (isLocked.value) return

    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = setTimeout(() => {
      // 串行化：等待上一次保存完成后再执行本次保存
      _savePromise = (_savePromise || Promise.resolve()).then(() => saveToStorageNow())
    }, 300)
  }

  // 创建新简历
  const createResume = async (): Promise<string> => {
    const newResume = createEmptyResume()
    resumeList.value.push(newResume)
    currentResume.value = newResume
    // 创建操作不可丢失，await 确保写入完成
    await saveToStorageNow()
    return newResume.id
  }

  // 获取简历
  const getResume = (id: string): Resume | undefined => {
    return resumeList.value.find(r => r.id === id)
  }

  // 加载简历到编辑器（使用 Worker 深拷贝，避免主线程阻塞）
  const loadResume = async (id: string): Promise<boolean> => {
    const resume = getResume(id)
    if (resume) {
      const json = await serialize(resume)
      currentResume.value = await parse<Resume>(json)
      // 切换简历时清空撤销/重做历史
      clearHistory()
      return true
    }
    return false
  }

  // 更新当前简历
  const updateCurrentResume = (data: Partial<Resume>) => {
    if (!currentResume.value) return

    // 推入防抖快照（捕获编辑前状态）
    pushHistoryDebounced()

    Object.assign(currentResume.value, data, {
      updatedAt: new Date().toISOString()
    })
  }

  // 保存当前简历到列表（使用 Worker 深拷贝 + 序列化）
  const saveCurrentResume = async () => {
    if (!currentResume.value) return

    const index = resumeList.value.findIndex(r => r.id === currentResume.value!.id)
    if (index !== -1) {
      currentResume.value.updatedAt = new Date().toISOString()
      const json = await serialize(currentResume.value)
      resumeList.value[index] = await parse<Resume>(json)
      saveToStorage()
    }
  }

  // 删除简历
  const deleteResume = async (id: string) => {
    const index = resumeList.value.findIndex(r => r.id === id)
    if (index !== -1) {
      resumeList.value.splice(index, 1)
      if (currentResume.value?.id === id) {
        currentResume.value = null
      }
      // 删除操作不可丢失，await 确保写入完成
      await saveToStorageNow()
    }
  }

  // 复制简历
  const copyResume = async (id: string): Promise<string> => {
    const source = resumeList.value.find(r => r.id === id)
    if (!source) return ''
    const json = await serialize(source)
    const copy = await parse<Resume>(json)
    copy.id = generateId()
    copy.title = `${source.title} (副本)`
    copy.createdAt = new Date().toISOString()
    copy.updatedAt = new Date().toISOString()
    resumeList.value.push(copy)
    await saveToStorageNow()
    return copy.id
  }

  // 导出 JSON（用户手动触发，不需要 Worker 优化；保留格式化输出提高可读性）
  const exportToJSON = (): string | null => {
    if (!currentResume.value) return null
    return JSON.stringify(currentResume.value, null, 2)
  }

  // 导入 JSON（使用 Worker 解析）
  const importFromJSON = async (json: string): Promise<boolean> => {
    try {
      const data = await parse<Resume>(json)
      data.id = generateId()
      data.createdAt = new Date().toISOString()
      data.updatedAt = new Date().toISOString()
      // 保留 JSON 中的 title，不使用文件名覆盖
      const migrated = migrateResumeColors(data)
      resumeList.value.push(migrated)
      await saveToStorageNow()
      return true
    } catch (e) {
      console.error('Failed to import resume:', e)
      return false
    }
  }

  // 清空当前简历
  const clearCurrentResume = async () => {
    currentResume.value = null
    await setCurrentId(null)
    clearHistory()
  }

  // ========== 模块管理方法 ==========

  // 获取当前模块顺序（如果没有则使用默认顺序）
  const getSectionOrder = (): string[] => {
    const order = currentResume.value?.sectionOrder
    if (!order || order.length === 0) {
      return [...DEFAULT_SECTION_ORDER]
    }
    return [...order]
  }

  // 更新模块顺序
  const updateSectionOrder = (newOrder: string[]) => {
    if (!currentResume.value) return

    // 确保 basic 始终在第一位
    if (!newOrder.includes('basic')) {
      newOrder = ['basic', ...newOrder]
    } else if (newOrder[0] !== 'basic') {
      newOrder = newOrder.filter(id => id !== 'basic')
      newOrder = ['basic', ...newOrder]
    }

    updateCurrentResume({ sectionOrder: newOrder })
    saveCurrentResume()
  }

  // 隐藏模块（保留排序位置）
  const hideSection = (sectionId: string) => {
    if (!currentResume.value || sectionId === 'basic') return
    const hidden = currentResume.value.hiddenSections || []
    if (!hidden.includes(sectionId)) {
      updateCurrentResume({ hiddenSections: [...hidden, sectionId] })
      saveCurrentResume()
    }
  }

  // 显示模块
  const showSection = (sectionId: string) => {
    if (!currentResume.value) return
    const hidden = currentResume.value.hiddenSections || []
    updateCurrentResume({ hiddenSections: hidden.filter(id => id !== sectionId) })
    saveCurrentResume()
  }

  // 删除模块（清除数据，重新添加时为初始状态）
  const removeSection = (sectionId: string) => {
    if (!currentResume.value || sectionId === 'basic') return

    const currentOrder = currentResume.value.sectionOrder || [...DEFAULT_SECTION_ORDER]
    const titles = { ...currentResume.value.sectionTitles }
    delete titles[sectionId]

    const updates: Partial<Resume> = {
      sectionOrder: currentOrder.filter(id => id !== sectionId),
      sectionTitles: titles
    }

    // 清除该模块的数据
    switch (sectionId) {
      case 'summary':
        updates.basicInfo = { ...currentResume.value.basicInfo, summary: '' }
        break
      case 'work':
        updates.workExperience = []
        break
      case 'education':
        updates.education = []
        break
      case 'projects':
        updates.projects = []
        break
      case 'skills':
        updates.skills = []
        break
      case 'evaluation':
        updates.selfEvaluation = ''
        break
    }

    updateCurrentResume(updates)
    saveCurrentResume()
  }

  // 添加/恢复模块
  const addSection = (sectionId: string) => {
    if (!currentResume.value) return

    const currentOrder = currentResume.value.sectionOrder || [...DEFAULT_SECTION_ORDER]
    const hidden = currentResume.value.hiddenSections || []

    // 从隐藏列表移除
    const newHidden = hidden.filter(id => id !== sectionId)

    // 如果不在顺序列表中，添加到末尾
    if (!currentOrder.includes(sectionId)) {
      updateCurrentResume({
        sectionOrder: [...currentOrder, sectionId],
        hiddenSections: newHidden
      })
    } else {
      updateCurrentResume({ hiddenSections: newHidden })
    }
    saveCurrentResume()
  }

  // 检查模块是否可见
  const isSectionVisible = (sectionId: string): boolean => {
    const hidden = currentResume.value?.hiddenSections || []
    return !hidden.includes(sectionId)
  }

  // 获取已隐藏的模块列表
  const getHiddenSections = (): string[] => {
    return currentResume.value?.hiddenSections || []
  }

  // ========== 自定义模块管理 ==========

  // 添加自定义文本模块
  const addCustomTextSection = (): string => {
    if (!currentResume.value) return ''
    const texts = [...currentResume.value.customTexts]
    const index = texts.length
    const sectionId = generateCustomSectionId('customText', index)
    const newSection: CustomTextSection = { id: generateId(), content: '' }
    texts.push(newSection)
    const order = [...currentResume.value.sectionOrder]
    order.push(sectionId)
    updateCurrentResume({ customTexts: texts, sectionOrder: order })
    saveCurrentResume()
    return sectionId
  }

  // 添加自定义列表模块
  const addCustomCardSection = (): string => {
    if (!currentResume.value) return ''
    const cards = [...currentResume.value.customCards]
    const index = cards.length
    const sectionId = generateCustomSectionId('customCard', index)
    const newSection: CustomCardSection = { id: generateId(), items: [] }
    cards.push(newSection)
    const order = [...currentResume.value.sectionOrder]
    order.push(sectionId)
    updateCurrentResume({ customCards: cards, sectionOrder: order })
    saveCurrentResume()
    return sectionId
  }

  // 删除自定义模块
  const removeCustomSection = (sectionId: string) => {
    if (!currentResume.value) return
    const type = getCustomSectionType(sectionId)
    const index = getCustomSectionIndex(sectionId)
    if (!type || index === null) return

    const prefix = type === 'customText' ? 'customText_' : 'customCard_'
    const titles = { ...currentResume.value.sectionTitles }

    // 辅助：重编号 sectionId 并迁移 sectionTitles
    const remapId = (id: string): string => {
      if (id.startsWith(prefix)) {
        const oldIdx = getCustomSectionIndex(id)
        if (oldIdx !== null && oldIdx > index) {
          const newId = generateCustomSectionId(type, oldIdx - 1)
          if (titles[id] !== undefined) {
            titles[newId] = titles[id]
            delete titles[id]
          }
          return newId
        }
      }
      return id
    }

    if (type === 'customText') {
      const texts = [...currentResume.value.customTexts]
      texts.splice(index, 1)
      delete titles[sectionId]
      const order = currentResume.value.sectionOrder
        .filter(id => id !== sectionId)
        .map(remapId)
      updateCurrentResume({ customTexts: texts, sectionOrder: order, sectionTitles: titles })
    } else if (type === 'customCard') {
      const cards = [...currentResume.value.customCards]
      cards.splice(index, 1)
      delete titles[sectionId]
      const order = currentResume.value.sectionOrder
        .filter(id => id !== sectionId)
        .map(remapId)
      updateCurrentResume({ customCards: cards, sectionOrder: order, sectionTitles: titles })
    }
    saveCurrentResume()
  }

  // ========== AI 评估结果 ==========

  /** 保存评估结果到当前简历（立即持久化，不走防抖） */
  const saveEvaluationResult = (resumeId: string, result: EvaluationResult) => {
    const idx = resumeList.value.findIndex(r => r.id === resumeId)
    if (idx !== -1) {
      resumeList.value[idx].lastEvaluation = result
      // 同步到 currentResume
      if (currentResume.value?.id === resumeId) {
        currentResume.value.lastEvaluation = result
      }
      // 立即写入 IndexedDB，避免防抖期间数据丢失
      saveToStorageNow()
    }
  }

  // ========== Undo/Redo 历史 ==========

  const MAX_HISTORY = 50
  const undoStack: string[] = []   // JSON 字符串快照
  const redoStack: string[] = []

  const canUndo = ref(false)
  const canRedo = ref(false)

  // 防抖快照：首次变更捕获编辑前状态，500ms 无新变更后推入 undoStack
  let _historyTimer: ReturnType<typeof setTimeout> | null = null
  let _preEditSnapshot: string | null = null

  const pushHistoryDebounced = () => {
    if (!currentResume.value) return

    // 首次变更：同步捕获编辑前的状态快照
    if (!_preEditSnapshot) {
      _preEditSnapshot = JSON.stringify(currentResume.value)
    }

    if (_historyTimer) clearTimeout(_historyTimer)
    _historyTimer = setTimeout(() => {
      if (_preEditSnapshot) {
        undoStack.push(_preEditSnapshot)
        if (undoStack.length > MAX_HISTORY) {
          undoStack.shift()
        }
        redoStack.length = 0
        canUndo.value = true
        canRedo.value = false
        _preEditSnapshot = null
      }
      _historyTimer = null
    }, 500)
  }

  /** 清空历史栈（切换简历 / 清空当前简历时调用） */
  const clearHistory = () => {
    undoStack.length = 0
    redoStack.length = 0
    _preEditSnapshot = null
    if (_historyTimer) { clearTimeout(_historyTimer); _historyTimer = null }
    canUndo.value = false
    canRedo.value = false
  }

  const undo = () => {
    if (undoStack.length === 0) return

    // 当前状态推入 redo 栈
    if (currentResume.value) {
      redoStack.push(JSON.stringify(currentResume.value))
    }

    // 恢复上一个快照（快照已是纯 JSON 字符串，直接 JSON.parse 即可）
    const snapshot = undoStack.pop()!
    currentResume.value = JSON.parse(snapshot) as Resume

    // 同步更新列表中的对应条目
    const index = resumeList.value.findIndex(r => r.id === currentResume.value!.id)
    if (index !== -1) {
      resumeList.value[index] = currentResume.value!
    }

    canUndo.value = undoStack.length > 0
    canRedo.value = true
    saveToStorage()
  }

  const redo = () => {
    if (redoStack.length === 0) return

    // 当前状态推入 undo 栈
    if (currentResume.value) {
      undoStack.push(JSON.stringify(currentResume.value))
    }

    // 恢复下一个快照
    const snapshot = redoStack.pop()!
    currentResume.value = JSON.parse(snapshot) as Resume

    // 同步更新列表中的对应条目
    const index = resumeList.value.findIndex(r => r.id === currentResume.value!.id)
    if (index !== -1) {
      resumeList.value[index] = currentResume.value!
    }

    canUndo.value = true
    canRedo.value = redoStack.length > 0
    saveToStorage()
  }

  // 初始化
  init()

  // ========== 重新加载（目录模式切换后调用） ==========

  /** 从当前存储后端重新加载全部数据 */
  const reloadFromStorage = async () => {
    // 清除旧数据的撤销/重做历史
    clearHistory()
    try {
      const loaded = await getAllResumes()
      const migrated = loaded.map(r => migrateHighlights(migrateResumeColors(r)))
      resumeList.value = migrated

      const currentId = await getCurrentId()
      if (currentId) {
        const resume = resumeList.value.find(r => r.id === currentId)
        if (resume) {
          const json = await serialize(resume)
          currentResume.value = await parse<Resume>(json)
        }
      } else {
        currentResume.value = null
      }
    } catch (e) {
      console.error('[resumeStore] reloadFromStorage 失败:', e)
    }
  }

  return {
    resumeList,
    currentResume,
    resumeCount,
    ready,
    createResume,
    getResume,
    loadResume,
    updateCurrentResume,
    saveCurrentResume,
    deleteResume,
    copyResume,
    exportToJSON,
    importFromJSON,
    clearCurrentResume,
    getSectionOrder,
    updateSectionOrder,
    removeSection,
    addSection,
    hideSection,
    showSection,
    isSectionVisible,
    getHiddenSections,
    addCustomTextSection,
    addCustomCardSection,
    removeCustomSection,
    saveEvaluationResult,
    canUndo,
    canRedo,
    undo,
    redo,
    reloadFromStorage,
  }
})
