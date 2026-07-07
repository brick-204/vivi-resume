import { defineStore } from 'pinia'
import { ref, computed, shallowRef, toRaw } from 'vue'
import type { Resume, CustomTextSection, CustomCardSection, HeaderTextColor, HeaderIconColor, EvaluationResult, JdScanResult, InterviewResult, DeletedItems, DeletedSections, WorkItem, EducationItem, ProjectItem, SkillItem, CustomCardItem, FieldConflict, ConflictDetectionResult } from '@/types/resume'
import { validateResumeJSON, type ValidationError } from '@/schemas/resumeSchema'

/** 导入结果 */
export interface ImportResult {
  success: boolean
  errors?: ValidationError[]
}
import {
  generateId,
  DEFAULT_SECTION_ORDER,
  getCustomSectionType,
  getCustomSectionIndex,
  generateCustomSectionId,
  getSectionTitle,
} from '@/types/resume'
import {
  isTextSection,
  isArraySection,
  getArraySectionConfig,
  getTextSectionConfig,
} from '@/utils/trashConfig'
import { useSyncLock } from '@/composables/useSyncLock'
import { useSettingsStore } from '@/stores/settingsStore'
import { message as naiveMessage } from '@/plugins/naive-ui'
import {
  migrateFromLocalStorage,
  getAllResumes,
  saveResumeList,
  getCurrentId,
  setCurrentId,
  getTrash,
  saveTrash,
  getTrashRetentionDays,
  setTrashRetentionDays,
  getTrashBinRetentionDays,
  setTrashBinRetentionDays,
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
  const resumeList = shallowRef<Resume[]>([])

  // 回收站
  const trash = shallowRef<Resume[]>([])
  const trashRetentionDays = ref(30)

  // 回收箱（卡片/模块暂存）
  const trashBinRetentionDays = ref(7)

  // 当前编辑的简历
  const currentResume = ref<Resume | null>(null)

  // 脏标记：updateCurrentResume 时置 true，保存后置 false
  const isDirty = ref(false)

  // 计算属性：简历数量
  const resumeCount = computed(() => resumeList.value.length)

  // ponytail: 深拷贝简历——structuredClone(toRaw) 剥离 Vue Proxy 并递归克隆，替代 Worker 序列化
  // ponytail: structuredClone 对当前纯 JSON 兼容的 Resume 不会抛错，但保留 JSON 往返兜底，
  // 防御未来可能新增的不可克隆字段（函数/DOM节点/类实例），与原 Worker fallback 等价
  const cloneResume = <T>(data: T): T => {
    const raw = toRaw(data)
    try {
      return structuredClone(raw) as T
    } catch {
      return JSON.parse(JSON.stringify(raw)) as T
    }
  }

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
        currentResume.value = cloneResume(resume)
      }
    }

    // Step 4: 加载回收站
    try {
      const [trashData, retentionDays, trashBinDays] = await Promise.all([
        getTrash(),
        getTrashRetentionDays(),
        getTrashBinRetentionDays(),
      ])
      trash.value = trashData
      trashRetentionDays.value = retentionDays
      trashBinRetentionDays.value = trashBinDays

      // 自动清理过期简历
      await cleanupTrash()
    } catch (e) {
      console.error('Failed to load trash:', e)
      trash.value = []
    }

    // 标记初始化完成
    _readyResolve()
  }

  // 防抖写入
  let saveTimer: ReturnType<typeof setTimeout> | null = null
  // 防止并发写入的锁
  let _savePromise: Promise<void> | null = null
  // 自动保存防抖延迟
  const AUTO_SAVE_DELAY = 1000

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

  /** 防抖自动保存：1s 内无新变更时执行深拷贝 + 写入 */
  const scheduleAutoSave = () => {
    if (isLocked.value) return
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = setTimeout(async () => {
      saveTimer = null
      if (!currentResume.value) return
      const index = resumeList.value.findIndex(r => r.id === currentResume.value!.id)
      if (index !== -1) {
        currentResume.value.updatedAt = new Date().toISOString()
        const parsed = cloneResume(currentResume.value)
        const newList = [...resumeList.value]
        newList[index] = parsed
        resumeList.value = newList
        // 串行化写入，避免并发覆盖
        _savePromise = (_savePromise || Promise.resolve()).then(async () => {
          await saveToStorageNow()
          // 写入成功后才清除脏标记，避免写入失败导致数据丢失
          isDirty.value = false
        })
      }
    }, AUTO_SAVE_DELAY)
  }

  /** 立即保存当前简历（标题修改、关键操作等场景） */
  const saveCurrentResumeNow = async () => {
    if (!currentResume.value) return

    // 先取消防抖计时器，避免重复保存
    if (saveTimer) { clearTimeout(saveTimer); saveTimer = null }

    const index = resumeList.value.findIndex(r => r.id === currentResume.value!.id)
    if (index !== -1) {
      currentResume.value.updatedAt = new Date().toISOString()
      const parsed = cloneResume(currentResume.value)
      const newList = [...resumeList.value]
      newList[index] = parsed
      resumeList.value = newList
      await saveToStorageNow()
      // 写入成功后才清除脏标记
      isDirty.value = false
    }
  }

  /** 使用预构建数据创建简历（一步到位，避免中间"空简历"状态触发响应式更新） */
  const createResumeWithData = async (data: Resume): Promise<string> => {
    resumeList.value = [...resumeList.value, data]
    currentResume.value = data
    await saveToStorageNow()
    return data.id
  }

  /** 仅将简历写入内存（同步），不等待持久化。调用方需自行安排 saveToStorageNow() */
  const addResumeInMemory = (data: Resume): string => {
    resumeList.value = [...resumeList.value, data]
    currentResume.value = data
    return data.id
  }

  // 获取简历
  const getResume = (id: string): Resume | undefined => {
    return resumeList.value.find(r => r.id === id)
  }

  // 加载简历到编辑器
  const loadResume = async (id: string): Promise<boolean> => {
    // ponytail: 复用 currentResume，避免从 resumeList 克隆覆盖 updateCurrentResume 的同步修改（防抖保存前 resumeList 未刷新，导致换模板跳转滞后一拍）
    if (currentResume.value?.id === id) return true
    const resume = getResume(id)
    if (resume) {
      currentResume.value = cloneResume(resume)
      return true
    }
    return false
  }

  // 更新当前简历
  const updateCurrentResume = (data: Partial<Resume>) => {
    if (!currentResume.value) return

    isDirty.value = true
    Object.assign(currentResume.value, data, {
      updatedAt: new Date().toISOString()
    })
    scheduleAutoSave()
  }


  // 批量移到回收站（软删除）
  const trashResumes = (ids: string[]) => {
    if (ids.length === 0) return
    const idSet = new Set(ids)
    const now = new Date().toISOString()
    const deleted = resumeList.value
      .filter(r => idSet.has(r.id))
      .map(r => ({ ...r, deletedAt: now }))

    if (deleted.length === 0) return

    resumeList.value = resumeList.value.filter(r => !idSet.has(r.id))
    if (currentResume.value && idSet.has(currentResume.value.id)) {
      currentResume.value = null
    }
    trash.value = [...trash.value, ...deleted]

    Promise.all([saveToStorageNow(), saveTrash(trash.value)]).catch(e => {
      console.error('[resumeStore] trashResumes persist failed:', e)
      naiveMessage.warning('删除未完全同步，刷新后可能恢复，请检查存储空间')
    })
  }

  // 移到回收站（软删除）
  const trashResume = (id: string) => {
    const resume = resumeList.value.find(r => r.id === id)
    if (!resume) return

    // 标记删除时间
    const deletedResume = { ...resume, deletedAt: new Date().toISOString() }

    // 从列表移除
    resumeList.value = resumeList.value.filter(r => r.id !== id)
    if (currentResume.value?.id === id) {
      currentResume.value = null
    }

    // 加入回收站
    trash.value = [...trash.value, deletedResume]

    // 持久化
    Promise.all([saveToStorageNow(), saveTrash(trash.value)]).catch(e => {
      console.error('[resumeStore] trashResume persist failed:', e)
      naiveMessage.warning('删除未完全同步，刷新后可能恢复，请检查存储空间')
    })
  }

  // 从回收站恢复
  const restoreResume = async (id: string) => {
    const resume = trash.value.find(r => r.id === id)
    if (!resume) return

    // 移除删除标记
    const restored = { ...resume, deletedAt: undefined }

    // 从回收站移除
    trash.value = trash.value.filter(r => r.id !== id)

    // 加入列表
    resumeList.value = [...resumeList.value, restored]

    // 持久化
    await Promise.all([saveToStorageNow(), saveTrash(trash.value)])
  }

  // 永久删除
  const permanentDeleteResume = async (id: string) => {
    trash.value = trash.value.filter(r => r.id !== id)
    await saveTrash(trash.value)
  }

  // 清空回收站
  const emptyTrash = async () => {
    trash.value = []
    await saveTrash([])
  }

  // 自动清理过期简历
  const cleanupTrash = async () => {
    const cutoff = Date.now() - trashRetentionDays.value * 24 * 60 * 60 * 1000
    const valid = trash.value.filter(r => {
      const deletedAt = r.deletedAt ? new Date(r.deletedAt).getTime() : Date.now()
      return deletedAt > cutoff
    })
    if (valid.length !== trash.value.length) {
      trash.value = valid
      await saveTrash(valid)
    }
  }

  // 更新保留天数（触发清理）
  const updateTrashRetentionDays = async (days: number) => {
    trashRetentionDays.value = days
    await setTrashRetentionDays(days)
    await cleanupTrash()
  }

  // 更新回收箱保留天数（触发清理）
  const updateTrashBinRetentionDays = async (days: number) => {
    trashBinRetentionDays.value = days
    await setTrashBinRetentionDays(days)
    cleanupDeletedData()
  }

  // 复制简历
  const copyResume = async (id: string): Promise<string> => {
    const source = resumeList.value.find(r => r.id === id)
    if (!source) return ''
    const copy = cloneResume(source)
    copy.id = generateId()
    copy.title = `${source.title} (副本)`
    copy.createdAt = new Date().toISOString()
    copy.updatedAt = new Date().toISOString()
    resumeList.value = [...resumeList.value, copy]
    await saveToStorageNow()
    return copy.id
  }

  // 导出 JSON（用户手动触发，不需要 Worker 优化；保留格式化输出提高可读性）
  const exportToJSON = (): string | null => {
    if (!currentResume.value) return null
    return JSON.stringify(currentResume.value, null, 2)
  }

  // 导入 JSON（Zod 校验 + JSON.parse）
  const importFromJSON = async (json: string): Promise<ImportResult> => {
    // 第一步：Zod 结构校验
    const validation = validateResumeJSON(json)
    if (!validation.success) {
      return { success: false, errors: validation.errors }
    }

    // 第二步：解析 JSON（Zod 已校验，直接 parse）
    try {
      const data = JSON.parse(json) as Resume
      data.id = generateId()
      data.createdAt = new Date().toISOString()
      data.updatedAt = new Date().toISOString()
      // 保留 JSON 中的 title，不使用文件名覆盖
      const migrated = migrateResumeColors(data)
      resumeList.value = [...resumeList.value, migrated]
      await saveToStorageNow()
      return { success: true }
    } catch (e) {
      console.error('Failed to import resume:', e)
      return { success: false, errors: [{ path: '', message: 'JSON 解析失败，请检查文件格式' }] }
    }
  }

  // 导入 AI 解析后的简历（已校验和归一化，直接入库）
  const importFromAIResult = async (resume: Resume): Promise<string> => {
    // 克隆后再修改，避免影响调用方持有的引用
    const clone = structuredClone(toRaw(resume))
    clone.id = generateId()
    clone.createdAt = new Date().toISOString()
    clone.updatedAt = new Date().toISOString()
    const migrated = migrateResumeColors(clone)
    resumeList.value = [...resumeList.value, migrated]
    await saveToStorageNow()
    return clone.id
  }

  // 清空当前简历
  const clearCurrentResume = async () => {
    currentResume.value = null
    await setCurrentId(null)
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
  }

  // 隐藏模块（保留排序位置）
  const hideSection = (sectionId: string) => {
    if (!currentResume.value || sectionId === 'basic') return
    const hidden = currentResume.value.hiddenSections || []
    if (!hidden.includes(sectionId)) {
      updateCurrentResume({ hiddenSections: [...hidden, sectionId] })
    }
  }

  // 显示模块
  const showSection = (sectionId: string) => {
    if (!currentResume.value) return
    const hidden = currentResume.value.hiddenSections || []
    updateCurrentResume({ hiddenSections: hidden.filter(id => id !== sectionId) })
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
  }

  // ========== Card/Section 暂存（保留天数可配置） ==========

  /** 暂存 card 到 deletedItems */
  const trashCard = (sectionId: string, item: WorkItem | EducationItem | ProjectItem | SkillItem | CustomCardItem, customSectionId?: string) => {
    if (!currentResume.value) return

    const deletedItems: DeletedItems = currentResume.value.deletedItems ? { ...currentResume.value.deletedItems } : {}
    const deletedAt = new Date().toISOString()

    // ponytail: 配置驱动消除重复分支
    if (sectionId === 'work') {
      if (!deletedItems.work) deletedItems.work = []
      deletedItems.work.push({ data: item as WorkItem, deletedAt })
    } else if (sectionId === 'education') {
      if (!deletedItems.education) deletedItems.education = []
      deletedItems.education.push({ data: item as EducationItem, deletedAt })
    } else if (sectionId === 'projects') {
      if (!deletedItems.projects) deletedItems.projects = []
      deletedItems.projects.push({ data: item as ProjectItem, deletedAt })
    } else if (sectionId === 'skills') {
      if (!deletedItems.skills) deletedItems.skills = []
      deletedItems.skills.push({ data: item as SkillItem, deletedAt })
    } else if (sectionId === 'customCard' && customSectionId) {
      if (!deletedItems.customCards) deletedItems.customCards = []
      deletedItems.customCards.push({ data: { ...(item as CustomCardItem), sectionId: customSectionId }, deletedAt })
    }

    updateCurrentResume({ deletedItems })
  }

  /** 从 deletedItems 恢复 card，返回 'ok' | 'duplicate' | 'notfound' | 'section_deleted' */
  const restoreCard = (sectionId: string, itemId: string): 'ok' | 'duplicate' | 'notfound' | 'section_deleted' => {
    if (!currentResume.value) return 'notfound'

    const deletedItems: DeletedItems = currentResume.value.deletedItems ? { ...currentResume.value.deletedItems } : {}
    const isFixed = ['work', 'education', 'projects', 'skills'].includes(sectionId)
    const key = isFixed ? sectionId as keyof DeletedItems : 'customCards'
    const items = deletedItems[key]
    if (!items) return 'notfound'

    const index = items.findIndex((d: any) => d.data.id === itemId)
    if (index === -1) return 'notfound'

    const item = items[index]

    // 检查目标 section 是否存在
    if (sectionId === 'customCard') {
      const sectionIdx = currentResume.value.customCards.findIndex(c => c.id === (item.data as any).sectionId)
      if (sectionIdx === -1) return 'section_deleted'
    } else if (!currentResume.value.sectionOrder.includes(sectionId)) {
      return 'section_deleted'
    }

    // 检查重复
    const targetArr = isFixed
      ? (currentResume.value as any)[sectionId === 'work' ? 'workExperience' : sectionId === 'education' ? 'education' : sectionId === 'projects' ? 'projects' : 'skills']
      : null
    if (targetArr && targetArr.some((c: any) => c.id === itemId)) return 'duplicate'

    // 移除 deletedItems
    const newItems = [...items]
    newItems.splice(index, 1)
    if (newItems.length === 0) delete deletedItems[key]
    else (deletedItems as any)[key] = newItems

    // 恢复到对应数组
    if (sectionId === 'work') {
      updateCurrentResume({ workExperience: [...currentResume.value.workExperience, item.data as WorkItem], deletedItems })
    } else if (sectionId === 'education') {
      updateCurrentResume({ education: [...currentResume.value.education, item.data as EducationItem], deletedItems })
    } else if (sectionId === 'projects') {
      updateCurrentResume({ projects: [...currentResume.value.projects, item.data as ProjectItem], deletedItems })
    } else if (sectionId === 'skills') {
      updateCurrentResume({ skills: [...currentResume.value.skills, item.data as SkillItem], deletedItems })
    } else if (sectionId === 'customCard') {
      const sectionIdx = currentResume.value.customCards.findIndex(c => c.id === (item.data as any).sectionId)
      if (sectionIdx !== -1) {
        const customCards = [...currentResume.value.customCards]
        customCards[sectionIdx] = { ...customCards[sectionIdx], items: [...customCards[sectionIdx].items, item.data as CustomCardItem] }
        updateCurrentResume({ customCards, deletedItems })
      }
    }

    return 'ok'
  }

  /** 恢复 card（处理重复：overwrite 覆盖现有，merge 追加到末尾） */
  const restoreCardWithMerge = (sectionId: string, itemId: string, merge: boolean) => {
    if (!currentResume.value) return

    const deletedItems: DeletedItems = currentResume.value.deletedItems ? { ...currentResume.value.deletedItems } : {}
    const isFixed = ['work', 'education', 'projects', 'skills'].includes(sectionId)
    const key = isFixed ? sectionId as keyof DeletedItems : 'customCards'
    const items = deletedItems[key]
    if (!items) return

    const index = items.findIndex((d: any) => d.data.id === itemId)
    if (index === -1) return

    const item = items[index]

    // 移除 deletedItems
    const newItems = [...items]
    newItems.splice(index, 1)
    if (newItems.length === 0) delete deletedItems[key]
    else (deletedItems as any)[key] = newItems

    // ponytail: 用 RESUME_KEY_MAP 消除重复
    const RESUME_KEY_MAP: Record<string, keyof Resume> = {
      work: 'workExperience',
      education: 'education',
      projects: 'projects',
      skills: 'skills',
    }

    if (sectionId in RESUME_KEY_MAP) {
      const resumeKey = RESUME_KEY_MAP[sectionId]
      const existing = currentResume.value[resumeKey] as any[]
      const newData = merge ? [...existing, item.data] : existing.map(c => c.id === itemId ? item.data : c)
      updateCurrentResume({ [resumeKey]: newData, deletedItems })
    } else if (sectionId === 'customCard') {
      const sectionIdx = currentResume.value.customCards.findIndex(c => c.id === (item.data as any).sectionId)
      if (sectionIdx !== -1) {
        const customCards = [...currentResume.value.customCards]
        const targetItems = customCards[sectionIdx].items
        const newItems = merge ? [...targetItems, item.data as CustomCardItem] : targetItems.map(c => c.id === itemId ? (item.data as CustomCardItem) : c)
        customCards[sectionIdx] = { ...customCards[sectionIdx], items: newItems }
        updateCurrentResume({ customCards, deletedItems })
      }
    }
  }

  /** 将 card 恢复到新创建的 section（处理原 section 被删除的情况） */
  const restoreCardToNewSection = (sectionId: string, itemId: string) => {
    if (!currentResume.value) return

    const deletedItems: DeletedItems = currentResume.value.deletedItems ? { ...currentResume.value.deletedItems } : {}
    const isFixed = ['work', 'education', 'projects', 'skills'].includes(sectionId)
    const key = isFixed ? sectionId as keyof DeletedItems : 'customCards'
    const items = deletedItems[key]
    if (!items) return

    const index = items.findIndex((d: any) => d.data.id === itemId)
    if (index === -1) return

    const item = items[index]

    // 移除 deletedItems
    const newItems = [...items]
    newItems.splice(index, 1)
    if (newItems.length === 0) delete deletedItems[key]
    else (deletedItems as any)[key] = newItems

    const RESUME_KEY_MAP: Record<string, keyof Resume> = {
      work: 'workExperience',
      education: 'education',
      projects: 'projects',
      skills: 'skills',
    }

    if (sectionId in RESUME_KEY_MAP) {
      addSection(sectionId)
      const resumeKey = RESUME_KEY_MAP[sectionId]
      const newData = [...(currentResume.value[resumeKey] as any[]), item.data]
      updateCurrentResume({ [resumeKey]: newData, deletedItems })
    } else if (sectionId === 'customCard') {
      const customCards = [...currentResume.value.customCards]
      customCards.push({ id: generateId(), items: [item.data as CustomCardItem] })
      const newSectionId = generateCustomSectionId('customCard', customCards.length - 1)
      updateCurrentResume({ customCards, sectionOrder: [...currentResume.value.sectionOrder, newSectionId], deletedItems })
    }
  }

  /** 永久删除暂存的 card */
  const permanentDeleteCard = (sectionId: string, itemId: string) => {
    if (!currentResume.value) return

    const deletedItems: DeletedItems = currentResume.value.deletedItems ? { ...currentResume.value.deletedItems } : {}
    const isFixed = ['work', 'education', 'projects', 'skills'].includes(sectionId)
    const key = isFixed ? sectionId as keyof DeletedItems : 'customCards'
    const items = deletedItems[key]
    if (!items) return

    const index = items.findIndex((d: any) => d.data.id === itemId)
    if (index === -1) return

    const newItems = [...items]
    newItems.splice(index, 1)
    if (newItems.length === 0) delete deletedItems[key]
    else (deletedItems as any)[key] = newItems

    updateCurrentResume({ deletedItems })
  }

  /** 清空暂存的 card */
  const clearDeletedCards = (sectionId?: string) => {
    if (!currentResume.value) return

    const deletedItems: DeletedItems = currentResume.value.deletedItems ? { ...currentResume.value.deletedItems } : {}

    if (sectionId) {
      const key = ['work', 'education', 'projects', 'skills'].includes(sectionId as any) ? sectionId as keyof DeletedItems : 'customCards'
      delete deletedItems[key]
    } else {
      // 清空所有
      Object.keys(deletedItems).forEach((k: string) => delete deletedItems[k as keyof DeletedItems])
    }

    updateCurrentResume({ deletedItems })
  }

  /** 暂存 section 到 deletedSections */
  const trashSection = (sectionId: string) => {
    if (!currentResume.value || sectionId === 'basic') return

    const deletedSections: DeletedSections = currentResume.value.deletedSections ? { ...currentResume.value.deletedSections } : {}
    const deletedAt = new Date().toISOString()
    const sectionTitle = currentResume.value.sectionTitles[sectionId]
    const type = getCustomSectionType(sectionId)

    // 固有数组模块
    if (isArraySection(sectionId)) {
      const config = getArraySectionConfig(sectionId)
      const arr = currentResume.value[config.resumeKey] as any[]
      if (arr.length > 0) {
        deletedSections[config.deletedKey] = { data: [...arr], deletedAt, sectionTitle }
      }
    } else if (isTextSection(sectionId)) {
      // 单富文本模块
      const config = getTextSectionConfig(sectionId)
      const content = currentResume.value[config.resumeKey]
      if (content) {
        deletedSections[config.deletedKey] = { data: content as string, deletedAt, sectionTitle }
      }
    } else if (type === 'customText') {
      // 自定义文本模块
      const index = getCustomSectionIndex(sectionId)
      if (index !== null && currentResume.value.customTexts[index]) {
        if (!deletedSections.customTexts) deletedSections.customTexts = {}
        deletedSections.customTexts[sectionId] = {
          data: { ...currentResume.value.customTexts[index] },
          deletedAt,
          sectionTitle,
        }
      }
    } else if (type === 'customCard') {
      // 自定义卡片模块
      const index = getCustomSectionIndex(sectionId)
      if (index !== null && currentResume.value.customCards[index]) {
        if (!deletedSections.customCards) deletedSections.customCards = {}
        deletedSections.customCards[sectionId] = {
          data: { ...currentResume.value.customCards[index], items: [...currentResume.value.customCards[index].items] },
          deletedAt,
          sectionTitle,
        }
      }
    }

    // 清空当前 section 数据
    removeSection(sectionId)
    updateCurrentResume({ deletedSections })
  }

  /** 从 deletedSections 恢复 section，返回 'ok' | 'duplicate' | 'notfound' */
  const restoreSection = (sectionId: string): 'ok' | 'duplicate' | 'notfound' => {
    if (!currentResume.value) return 'notfound'

    const deletedSections: DeletedSections = currentResume.value.deletedSections ? { ...currentResume.value.deletedSections } : {}
    const type = getCustomSectionType(sectionId)

    // 固定模块恢复
    if (!type) {
      const sectionData = deletedSections[sectionId as keyof DeletedSections] as { data: any; deletedAt: string; sectionTitle?: string } | undefined
      if (!sectionData) return 'notfound'

      // 检查目标是否已有数据（重复检测）
      const hasExisting = isArraySection(sectionId)
        ? currentResume.value[getArraySectionConfig(sectionId).resumeKey].length > 0
        : isTextSection(sectionId)
          ? (currentResume.value[getTextSectionConfig(sectionId).resumeKey]?.trim().length ?? 0) > 0
          : false
      if (hasExisting) return 'duplicate'

      // 恢复数据
      const updates: Partial<Resume> = { deletedSections }
      if (isArraySection(sectionId)) {
        const config = getArraySectionConfig(sectionId)
        ;(updates as any)[config.resumeKey] = sectionData.data
      } else if (isTextSection(sectionId)) {
        const config = getTextSectionConfig(sectionId)
        ;(updates as any)[config.resumeKey] = sectionData.data
      }

      // 恢复 sectionOrder
      updates.sectionOrder = currentResume.value.sectionOrder.includes(sectionId)
        ? currentResume.value.sectionOrder
        : [...currentResume.value.sectionOrder, sectionId]

      // 恢复 sectionTitle
      if (sectionData.sectionTitle) {
        updates.sectionTitles = { ...currentResume.value.sectionTitles, [sectionId]: sectionData.sectionTitle }
      }

      // 从 deletedSections 移除
      delete deletedSections[sectionId as keyof DeletedSections]

      updateCurrentResume(updates)
      return 'ok'
    }

    // 自定义模块恢复
    const index = getCustomSectionIndex(sectionId)
    if (index === null) return 'notfound'

    const recordKey = type === 'customText' ? 'customTexts' : 'customCards'
    const deletedRecord = deletedSections[recordKey as 'customTexts' | 'customCards']
    if (!deletedRecord || !deletedRecord[sectionId]) return 'notfound'

    const sectionData = deletedRecord[sectionId]
    // 检查是否已有该索引
    const targetArr = type === 'customText' ? currentResume.value.customTexts : currentResume.value.customCards
    if (targetArr[index]) return 'duplicate'

    // 恢复数据
    const newTargetArr = [...targetArr as any[]]
    while (newTargetArr.length < index) {
      newTargetArr.push(type === 'customText' ? { id: generateId(), content: '' } : { id: generateId(), items: [] })
    }
    newTargetArr[index] = sectionData.data

    const sectionOrder = currentResume.value.sectionOrder.includes(sectionId)
      ? currentResume.value.sectionOrder
      : [...currentResume.value.sectionOrder, sectionId]

    delete deletedRecord[sectionId]
    const restoreKey = type === 'customText' ? 'customTexts' : 'customCards'
    const finalUpdates: Partial<Resume> = { [restoreKey]: newTargetArr, sectionOrder, deletedSections }
    updateCurrentResume(finalUpdates as any)
    return 'ok'
  }

  /** 检测固有模块恢复时的字段冲突（仅用于合并模式前的二次确认） */
  const detectSectionConflicts = (sectionId: string): ConflictDetectionResult => {
    if (!currentResume.value) return { hasConflict: false, conflicts: [] }

    const deletedSections = currentResume.value.deletedSections
    if (!deletedSections) return { hasConflict: false, conflicts: [] }

    const sectionData = deletedSections[sectionId as keyof DeletedSections] as { data: any; deletedAt: string; sectionTitle?: string } | undefined
    if (!sectionData) return { hasConflict: false, conflicts: [] }

    const conflicts: FieldConflict[] = []

    // 1. 检测 sectionTitle 冲突
    const existingTitle = getSectionTitle(currentResume.value, sectionId)
    const trashTitle = sectionData.sectionTitle || getSectionTitle(null, sectionId)
    if (existingTitle && trashTitle && existingTitle !== trashTitle) {
      conflicts.push({
        key: 'sectionTitle',
        label: '模块标题',
        existingValue: existingTitle,
        trashValue: trashTitle,
        mergedValue: `${existingTitle} + ${trashTitle}`,
        choice: 'merged',
      })
    }

    // 2. 单富文本字段模块（evaluation）内容冲突
    if (isTextSection(sectionId)) {
      const config = getTextSectionConfig(sectionId)
      const existingContent = currentResume.value[config.resumeKey] || ''
      const trashContent = sectionData.data || ''
      if (existingContent && trashContent) {
        conflicts.push({
          key: 'content',
          label: '自我评价内容',
          existingValue: existingContent,
          trashValue: trashContent,
          mergedValue: `${existingContent}\n\n${trashContent}`,
          choice: 'merged',
        })
      }
    }

    return {
      hasConflict: conflicts.length > 0,
      conflicts,
    }
  }

  /** 恢复 section（处理重复：overwrite 覆盖现有，merge 追加；自定义模块始终追加为新模块到末尾） */
  const restoreSectionWithMerge = (sectionId: string, merge: boolean, conflicts?: FieldConflict[]) => {
    if (!currentResume.value) return

    const deletedSections: DeletedSections = currentResume.value.deletedSections ? { ...currentResume.value.deletedSections } : {}
    const type = getCustomSectionType(sectionId)

    // 固定模块恢复
    if (!type) {
      const sectionData = deletedSections[sectionId as keyof DeletedSections] as { data: any; deletedAt: string; sectionTitle?: string } | undefined
      if (!sectionData) return

      const updates: Partial<Resume> = { deletedSections }
      const incoming = sectionData.data

      // 应用字段级冲突结果（合并模式 + 有冲突时）
      let conflictHandledEvaluation = false
      if (merge && conflicts && conflicts.length > 0) {
        const newTitles = { ...currentResume.value.sectionTitles }
        conflicts.forEach(c => {
          if (c.key === 'sectionTitle') {
            newTitles[sectionId] = c.choice === 'current' ? c.existingValue
              : c.choice === 'trash' ? c.trashValue
              : c.mergedValue
          } else if (c.key === 'content' && isTextSection(sectionId)) {
            const config = getTextSectionConfig(sectionId)
            ;(updates as any)[config.resumeKey] = c.choice === 'current' ? c.existingValue
              : c.choice === 'trash' ? c.trashValue
              : c.mergedValue
            conflictHandledEvaluation = true
          }
        })
        updates.sectionTitles = newTitles
      }

      if (isArraySection(sectionId)) {
        const config = getArraySectionConfig(sectionId)
        const existing = currentResume.value[config.resumeKey]
        ;(updates as any)[config.resumeKey] = merge ? [...existing, ...incoming] : incoming
      } else if (isTextSection(sectionId) && !conflictHandledEvaluation) {
        const config = getTextSectionConfig(sectionId)
        const existing = currentResume.value[config.resumeKey] || ''
        ;(updates as any)[config.resumeKey] = merge ? (existing ? existing + '\n\n' + incoming : incoming) : incoming
      }

      // 恢复 sectionOrder
      updates.sectionOrder = currentResume.value.sectionOrder.includes(sectionId)
        ? currentResume.value.sectionOrder
        : [...currentResume.value.sectionOrder, sectionId]

      // 恢复 sectionTitle（无冲突时使用回收箱标题；有冲突时已在上方处理）
      if (!conflicts?.length && sectionData.sectionTitle) {
        updates.sectionTitles = { ...currentResume.value.sectionTitles, [sectionId]: sectionData.sectionTitle }
      }

      // 从 deletedSections 移除
      delete deletedSections[sectionId as keyof DeletedSections]

      updateCurrentResume(updates)
      return
    }

    // 自定义模块恢复：始终追加为新模块到末尾
    const recordKey = type === 'customText' ? 'customTexts' : 'customCards'
    const deletedRecord = deletedSections[recordKey as 'customTexts' | 'customCards']
    if (!deletedRecord || !deletedRecord[sectionId]) return

    const sectionData = deletedRecord[sectionId]
    const targetArr = type === 'customText'
      ? [...currentResume.value.customTexts, { ...sectionData.data, id: generateId() } as CustomTextSection]
      : [...currentResume.value.customCards, { ...sectionData.data, id: generateId(), items: [...(sectionData.data as CustomCardSection).items] } as CustomCardSection]

    const newCustomSectionId = generateCustomSectionId(type, targetArr.length - 1)
    const sectionOrder = [...currentResume.value.sectionOrder, newCustomSectionId]

    // 恢复 sectionTitles：优先使用回收箱保存的标题
    const newTitles = { ...currentResume.value.sectionTitles }
    const restoredTitle = sectionData.sectionTitle || currentResume.value.sectionTitles[sectionId]
    if (restoredTitle) {
      newTitles[newCustomSectionId] = restoredTitle
    }
    if (newTitles[sectionId]) {
      delete newTitles[sectionId]
    }

    delete deletedRecord[sectionId]
    const finalUpdates: Partial<Resume> = { [recordKey]: targetArr as any, sectionOrder, sectionTitles: newTitles, deletedSections }
    updateCurrentResume(finalUpdates as any)
  }

  /** 永久删除暂存的 section */
  const permanentDeleteSection = (sectionId: string) => {
    if (!currentResume.value) return

    const deletedSections: DeletedSections = currentResume.value.deletedSections ? { ...currentResume.value.deletedSections } : {}
    const type = getCustomSectionType(sectionId)

    if (!type) {
      // 固定模块
      delete deletedSections[sectionId as keyof DeletedSections]
    } else if (type === 'customText') {
      // 自定义文本模块
      if (deletedSections.customTexts) {
        delete deletedSections.customTexts[sectionId]
      }
    } else if (type === 'customCard') {
      // 自定义卡片模块
      if (deletedSections.customCards) {
        delete deletedSections.customCards[sectionId]
      }
    }

    updateCurrentResume({ deletedSections })
  }

  /** 自动清理过期 card/section */
  const cleanupDeletedData = () => {
    if (!currentResume.value) return

    const cutoff = Date.now() - trashBinRetentionDays.value * 24 * 60 * 60 * 1000
    let needsUpdate = false
    const deletedItems: DeletedItems = currentResume.value.deletedItems ? { ...currentResume.value.deletedItems } : {}
    const deletedSections: DeletedSections = currentResume.value.deletedSections ? { ...currentResume.value.deletedSections } : {}

    // 清理过期 card（ponytail: 用 any 绕过 union array 类型问题）
    for (const key of Object.keys(deletedItems) as (keyof DeletedItems)[]) {
      const items = deletedItems[key] as any[] | undefined
      if (!items) continue
      const valid = items.filter(item => new Date(item.deletedAt).getTime() > cutoff)
      if (valid.length !== items.length) {
        needsUpdate = true
        if (valid.length === 0) {
          delete deletedItems[key]
        } else {
          (deletedItems as any)[key] = valid
        }
      }
    }

    // 清理过期 section（ponytail: customTexts/customCards 是 Record，需要特殊处理）
    for (const key of Object.keys(deletedSections) as (keyof DeletedSections)[]) {
      const section = deletedSections[key]
      if (!section) continue
      // customTexts/customCards 是 Record，不能直接用 section.deletedAt
      const deletedAt = (section as any).deletedAt
      if (deletedAt && new Date(deletedAt).getTime() <= cutoff) {
        needsUpdate = true
        delete deletedSections[key]
      }
    }

    if (needsUpdate) {
      updateCurrentResume({ deletedItems, deletedSections })
    }
  }

  // ========== AI 评估结果 ==========

  /** 保存评估结果到当前简历（立即持久化，不走防抖） */
  const saveEvaluationResult = (resumeId: string, result: EvaluationResult) => {
    const idx = resumeList.value.findIndex(r => r.id === resumeId)
    if (idx !== -1) {
      const newList = [...resumeList.value]
      newList[idx] = { ...newList[idx], lastEvaluation: result }
      resumeList.value = newList
      // 同步到 currentResume
      if (currentResume.value?.id === resumeId) {
        currentResume.value.lastEvaluation = result
      }
      // 立即写入 IndexedDB，避免防抖期间数据丢失
      saveToStorageNow()
    }
  }

  /** 保存 JD 扫描结果到当前简历（立即持久化，不走防抖） */
  const saveJdScanResult = (resumeId: string, result: JdScanResult) => {
    const idx = resumeList.value.findIndex(r => r.id === resumeId)
    if (idx !== -1) {
      const newList = [...resumeList.value]
      newList[idx] = { ...newList[idx], lastJdScan: result }
      resumeList.value = newList
      if (currentResume.value?.id === resumeId) {
        currentResume.value.lastJdScan = result
      }
      saveToStorageNow()
    }
  }

  /** 保存面试准备结果到当前简历（立即持久化，不走防抖） */
  const saveInterviewResult = (resumeId: string, result: InterviewResult) => {
    const idx = resumeList.value.findIndex(r => r.id === resumeId)
    if (idx !== -1) {
      const newList = [...resumeList.value]
      newList[idx] = { ...newList[idx], lastInterview: result }
      resumeList.value = newList
      if (currentResume.value?.id === resumeId) {
        currentResume.value.lastInterview = result
      }
      saveToStorageNow()
    }
  }

  // ========== Undo/Redo 已移除 ==========

  // 初始化
  init()

  // ========== 重新加载（目录模式切换后调用） ==========

  /** 从当前存储后端重新加载全部数据 */
  const reloadFromStorage = async () => {
    try {
      const loaded = await getAllResumes()
      const migrated = loaded.map(r => migrateHighlights(migrateResumeColors(r)))
      resumeList.value = migrated

      const currentId = await getCurrentId()
      if (currentId) {
        const resume = resumeList.value.find(r => r.id === currentId)
        if (resume) {
          currentResume.value = cloneResume(resume)
        }
      } else {
        currentResume.value = null
      }

      // 补齐回收站加载：与 init() Step 4 对齐，避免模式切换后回收站显示停留在切换前的内存值
      const [trashData, retentionDays, trashBinDays] = await Promise.all([
        getTrash(),
        getTrashRetentionDays(),
        getTrashBinRetentionDays(),
      ])
      trash.value = trashData
      trashRetentionDays.value = retentionDays
      trashBinRetentionDays.value = trashBinDays
      await cleanupTrash()
    } catch (e) {
      console.error('[resumeStore] reloadFromStorage 失败:', e)
    }
  }

  return {
    resumeList,
    currentResume,
    isDirty,
    resumeCount,
    ready,
    createResumeWithData,
    addResumeInMemory,
    saveToStorageNow,
    getResume,
    loadResume,
    updateCurrentResume,
    saveCurrentResumeNow,
    deleteResume: trashResume, // 兼容旧接口
    trashResume,
    trashResumes,
    restoreResume,
    permanentDeleteResume,
    emptyTrash,
    cleanupTrash,
    updateTrashRetentionDays,
    trash,
    trashRetentionDays,
    updateTrashBinRetentionDays,
    trashBinRetentionDays,
    // Card/Section 暂存
    trashCard,
    restoreCard,
    restoreCardWithMerge,
    restoreCardToNewSection,
    permanentDeleteCard,
    clearDeletedCards,
    trashSection,
    restoreSection,
    restoreSectionWithMerge,
    detectSectionConflicts,
    permanentDeleteSection,
    cleanupDeletedData,
    copyResume,
    exportToJSON,
    importFromJSON,
    importFromAIResult,
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
    saveJdScanResult,
    saveInterviewResult,
    reloadFromStorage,
  }
})
