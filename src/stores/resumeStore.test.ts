import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

// ponytail: vi.hoisted 让 mock 引用的 spy 在 mock factory 提升时已就绪
const { saveResumeList, setCurrentId } = vi.hoisted(() => ({
  saveResumeList: vi.fn(() => Promise.resolve()),
  setCurrentId: vi.fn(() => Promise.resolve()),
}))

vi.mock('@/utils/storageAdapter', () => ({
  saveResumeList,
  setCurrentId,
  migrateFromLocalStorage: vi.fn(() => Promise.resolve()),
  getAllResumes: vi.fn(() => Promise.resolve([])),
  getCurrentId: vi.fn(() => Promise.resolve(null)),
  getResumes: vi.fn(() => Promise.resolve([])),
  getMeta: vi.fn(() => Promise.resolve({})),
  setMeta: vi.fn(() => Promise.resolve()),
  getTrash: vi.fn(() => Promise.resolve([])),
  saveTrash: vi.fn(() => Promise.resolve()),
  getTrashRetentionDays: vi.fn(() => Promise.resolve(7)),
  setTrashRetentionDays: vi.fn(() => Promise.resolve()),
  getTrashBinRetentionDays: vi.fn(() => Promise.resolve(7)),
  setTrashBinRetentionDays: vi.fn(() => Promise.resolve()),
}))

vi.mock('@/plugins/naive-ui', () => ({
  message: { success: vi.fn(), warning: vi.fn(), error: vi.fn() },
}))

vi.mock('@/stores/settingsStore', () => ({
  useSettingsStore: () => ({
    isDirectoryMode: { value: false },
    ready: Promise.resolve(),
    notifyStoresReload: vi.fn(),
    isLocked: { value: false },
  }),
}))

import { useResumeStore } from '@/stores/resumeStore'

/**
 * P0-3 死锁回归保护：updateCurrentResume 触发 scheduleAutoSave（1s 防抖）后，
 * 保存链不应死锁——isDirty 最终清零、saveResumeList 被调用。
 * 历史缺陷：saveToStorageNow 内 await _savePromise 与 scheduleAutoSave 链回调
 * 形成循环 await，首次编辑后保存链永久挂起。
 */
describe('resumeStore 保存链路（P0-3 死锁回归）', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    saveResumeList.mockClear()
    setCurrentId.mockClear()
  })

  it('编辑后防抖触发保存，isDirty 清零且写盘被调用', async () => {
    const store = useResumeStore()
    await store.ready

    // 建一份简历并设为 current
    await store.createResumeWithData({
      id: 'r1',
      title: '测试简历',
      templateId: 'sidebar',
      basicInfo: {
        name: '', title: '', photo: '', email: '', phone: '', location: '',
        website: '', summary: '', gender: '', birthday: '', age: '',
        expectedCity: '', workExperience: '', wechat: '', qq: '', salaryRange: '',
        hiddenFields: {}, customFields: [], fieldOrder: [], fieldDisplayMode: {},
      },
      workExperience: [], education: [], projects: [], skills: [],
      selfEvaluation: '', customTexts: [], customCards: [],
      sectionOrder: [], sectionTitles: {}, hiddenSections: [],
      createdAt: '', updatedAt: '',
    })

    // 触发一次编辑 → scheduleAutoSave 设 1s 防抖
    store.updateCurrentResume({ basicInfo: { ...store.currentResume!.basicInfo, name: '改后' } })
    expect(store.isDirty).toBe(true)

    // 等待防抖（1s）+ 写盘完成
    await new Promise(r => setTimeout(r, 1300))

    expect(store.isDirty).toBe(false)
    expect(saveResumeList).toHaveBeenCalled()
  })
})
