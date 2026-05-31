import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Resume, CustomTextSection, CustomCardSection, HeaderTextColor, HeaderIconColor } from '@/types/resume'
import {
  createEmptyResume,
  generateId,
  DEFAULT_SECTION_ORDER,
  getCustomSectionType,
  getCustomSectionIndex,
  generateCustomSectionId,
} from '@/types/resume'
import { useWorkerSerializer } from '@/composables/useWorkerSerializer'

const STORAGE_KEY = 'vivi-resume-list'
const CURRENT_RESUME_KEY = 'vivi-resume-current'

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

export const useResumeStore = defineStore('resume', () => {
  // 简历列表
  const resumeList = ref<Resume[]>([])

  // 当前编辑的简历
  const currentResume = ref<Resume | null>(null)

  // 计算属性：简历数量
  const resumeCount = computed(() => resumeList.value.length)

  // 序列化 Worker（persistent 模式：store 生命周期内持续存在，不依赖 onUnmounted）
  const { serialize, parse } = useWorkerSerializer({ persistent: true })

  // ========== 初始化就绪 Promise ==========
  // init() 改为异步后，组件需要等待数据加载完成才能安全访问 resumeList
  let _readyResolve!: () => void
  const ready = new Promise<void>(resolve => { _readyResolve = resolve })

  // 初始化：从 localStorage 加载数据（异步，使用 Worker 解析 JSON）
  const init = async () => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        const loaded = await parse<Resume[]>(saved)
        const migrated = loaded.map(migrateResumeColors)
        resumeList.value = migrated
        // 如果迁移产生了变化，立即保存更新后的数据
        const migratedJson = await serialize(migrated)
        if (migratedJson !== saved) {
          localStorage.setItem(STORAGE_KEY, migratedJson)
        }
      } catch (e) {
        console.error('Failed to load resume list:', e)
        resumeList.value = []
      }
    }
    // 标记初始化完成
    _readyResolve()
  }

  // 防抖写入
  let saveTimer: ReturnType<typeof setTimeout> | null = null
  // 防止并发写入的锁
  let _savePromise: Promise<void> | null = null

  // 立即写入 localStorage（用于创建/删除等不可丢失操作）
  // 使用 Promise.all 并行序列化，确保基于同一快照写入，避免中间状态不一致
  const saveToStorageNow = async (): Promise<void> => {
    if (saveTimer) { clearTimeout(saveTimer); saveTimer = null }
    const [listJson, currentJson] = await Promise.all([
      serialize(resumeList.value),
      currentResume.value ? serialize(currentResume.value) : Promise.resolve(null),
    ])
    localStorage.setItem(STORAGE_KEY, listJson)
    if (currentJson) {
      localStorage.setItem(CURRENT_RESUME_KEY, currentJson)
    }
  }

  // 防抖写入 localStorage（用于拖拽等高频操作）
  // 使用串行化确保不会出现并发写入导致旧数据覆盖新数据
  const saveToStorage = () => {
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
      return true
    }
    return false
  }

  // 更新当前简历
  const updateCurrentResume = (data: Partial<Resume>) => {
    if (!currentResume.value) return

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
  const clearCurrentResume = () => {
    currentResume.value = null
    localStorage.removeItem(CURRENT_RESUME_KEY)
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

  // 初始化
  init()

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
    removeCustomSection
  }
})