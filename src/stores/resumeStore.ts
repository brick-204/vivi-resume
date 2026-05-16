import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Resume } from '@/types/resume'
import { createEmptyResume, generateId, DEFAULT_SECTION_ORDER } from '@/types/resume'

const STORAGE_KEY = 'vivi-resume-list'
const CURRENT_RESUME_KEY = 'vivi-resume-current'

export const useResumeStore = defineStore('resume', () => {
  // 简历列表
  const resumeList = ref<Resume[]>([])

  // 当前编辑的简历
  const currentResume = ref<Resume | null>(null)

  // 计算属性：简历数量
  const resumeCount = computed(() => resumeList.value.length)

  // 初始化：从 localStorage 加载数据
  const init = () => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        resumeList.value = JSON.parse(saved)
      } catch (e) {
        console.error('Failed to load resume list:', e)
        resumeList.value = []
      }
    }
  }

  // 保存到 localStorage
  const saveToStorage = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(resumeList.value))
    if (currentResume.value) {
      localStorage.setItem(CURRENT_RESUME_KEY, JSON.stringify(currentResume.value))
    }
  }

  // 创建新简历
  const createResume = (): string => {
    const newResume = createEmptyResume()
    resumeList.value.push(newResume)
    currentResume.value = newResume
    saveToStorage()
    return newResume.id
  }

  // 获取简历
  const getResume = (id: string): Resume | undefined => {
    return resumeList.value.find(r => r.id === id)
  }

  // 加载简历到编辑器
  const loadResume = (id: string): boolean => {
    const resume = getResume(id)
    if (resume) {
      currentResume.value = JSON.parse(JSON.stringify(resume))
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

  // 保存当前简历到列表
  const saveCurrentResume = () => {
    if (!currentResume.value) return

    const index = resumeList.value.findIndex(r => r.id === currentResume.value!.id)
    if (index !== -1) {
      currentResume.value.updatedAt = new Date().toISOString()
      resumeList.value[index] = JSON.parse(JSON.stringify(currentResume.value))
      saveToStorage()
    }
  }

  // 删除简历
  const deleteResume = (id: string) => {
    const index = resumeList.value.findIndex(r => r.id === id)
    if (index !== -1) {
      resumeList.value.splice(index, 1)
      if (currentResume.value?.id === id) {
        currentResume.value = null
      }
      saveToStorage()
    }
  }

  // 导出 JSON
  const exportToJSON = (): string | null => {
    if (!currentResume.value) return null
    return JSON.stringify(currentResume.value, null, 2)
  }

  // 导入 JSON
  const importFromJSON = (json: string): boolean => {
    try {
      const data = JSON.parse(json) as Resume
      data.id = generateId()
      data.createdAt = new Date().toISOString()
      data.updatedAt = new Date().toISOString()
      resumeList.value.push(data)
      saveToStorage()
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

  // 删除/隐藏模块
  const removeSection = (sectionId: string) => {
    if (!currentResume.value || sectionId === 'basic') return

    const currentOrder = currentResume.value.sectionOrder || [...DEFAULT_SECTION_ORDER]

    updateCurrentResume({
      sectionOrder: currentOrder.filter(id => id !== sectionId)
    })
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

  // 初始化
  init()

  return {
    resumeList,
    currentResume,
    resumeCount,
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
    getHiddenSections
  }
})