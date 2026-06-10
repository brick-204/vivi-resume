/**
 * AI 服务配置 Store
 * 管理 AI 服务配置的 CRUD + 激活态
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { AIServiceConfig } from '@/types/aiConfig'
import { generateId } from '@/types/resume'
import { useSyncLock } from '@/composables/useSyncLock'
import { useSettingsStore } from '@/stores/settingsStore'
import {
  getAllAIConfigs,
  saveAIConfig,
  deleteAIConfig as deleteAIConfigFromStorage,
  getActiveAIConfigId,
  setActiveAIConfigId,
} from '@/utils/storageAdapter'

export const useAIConfigStore = defineStore('aiConfig', () => {
  const configs = ref<AIServiceConfig[]>([])
  const activeConfigId = ref<string | null>(null)

  // 同步锁
  const { isLocked } = useSyncLock()

  // ========== 初始化就绪 Promise（与 resumeStore 一致）==========
  let _readyResolve!: () => void
  const ready = new Promise<void>(resolve => { _readyResolve = resolve })

  // ========== Computed ==========

  const activeConfig = computed(() =>
    configs.value.find(c => c.id === activeConfigId.value),
  )

  const hasConfigs = computed(() => configs.value.length > 0)

  // ========== 初始化 ==========

  const init = async () => {
    // 等待 settingsStore 就绪（确保 isDirectoryMode 已正确设置）
    const settingsStore = useSettingsStore()
    await settingsStore.ready

    try {
      const [allConfigs, savedActiveId] = await Promise.all([
        getAllAIConfigs(),
        getActiveAIConfigId(),
      ])
      configs.value = allConfigs
      // 恢复激活配置（如果还存在的话）
      if (savedActiveId && allConfigs.some(c => c.id === savedActiveId)) {
        activeConfigId.value = savedActiveId
      } else if (allConfigs.length > 0) {
        // 默认激活第一个
        activeConfigId.value = allConfigs[0].id
        await setActiveAIConfigId(allConfigs[0].id)
      }
    } catch (e) {
      console.error('[aiConfigStore] 初始化失败:', e)
    } finally {
      _readyResolve()
    }
  }

  // ========== CRUD ==========

  /** 添加新配置 */
  const addConfig = async (data: Omit<AIServiceConfig, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (isLocked.value) return undefined

    const now = new Date().toISOString()
    const config: AIServiceConfig = {
      ...data,
      id: generateId(),
      createdAt: now,
      updatedAt: now,
    }
    await saveAIConfig(config)
    configs.value.push(config)

    // 如果是第一个配置，自动激活
    if (configs.value.length === 1) {
      await setActiveConfig(config.id)
    }

    return config
  }

  /** 更新配置 */
  const updateConfig = async (id: string, updates: Partial<Omit<AIServiceConfig, 'id' | 'createdAt'>>) => {
    if (isLocked.value) return

    const index = configs.value.findIndex(c => c.id === id)
    if (index === -1) return

    const updated: AIServiceConfig = {
      ...configs.value[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    }
    await saveAIConfig(updated)
    configs.value[index] = updated
  }

  /** 删除配置 */
  const deleteConfig = async (id: string) => {
    if (isLocked.value) return

    await deleteAIConfigFromStorage(id)
    configs.value = configs.value.filter(c => c.id !== id)

    // 如果删除的是当前激活的配置
    if (activeConfigId.value === id) {
      if (configs.value.length > 0) {
        await setActiveConfig(configs.value[0].id)
      } else {
        activeConfigId.value = null
        await setActiveAIConfigId(null)
      }
    }
  }

  /** 复制配置（API Key 需重新输入） */
  const duplicateConfig = async (id: string) => {
    if (isLocked.value) return undefined

    const source = configs.value.find(c => c.id === id)
    if (!source) return

    const now = new Date().toISOString()
    const duplicated: AIServiceConfig = {
      ...source,
      id: generateId(),
      name: `${source.name} (副本)`,
      apiKey: '',
      createdAt: now,
      updatedAt: now,
    }
    await saveAIConfig(duplicated)
    configs.value.push(duplicated)
    return duplicated
  }

  /** 设置激活配置 */
  const setActiveConfig = async (id: string | null) => {
    activeConfigId.value = id
    await setActiveAIConfigId(id)
  }

  // 初始化
  init()

  // ========== 重新加载（目录模式切换后调用） ==========

  /** 从当前存储后端重新加载全部数据 */
  const reloadFromStorage = async () => {
    try {
      const [allConfigs, savedActiveId] = await Promise.all([
        getAllAIConfigs(),
        getActiveAIConfigId(),
      ])
      configs.value = allConfigs
      if (savedActiveId && allConfigs.some(c => c.id === savedActiveId)) {
        activeConfigId.value = savedActiveId
      } else if (allConfigs.length > 0) {
        activeConfigId.value = allConfigs[0].id
        await setActiveAIConfigId(allConfigs[0].id)
      } else {
        activeConfigId.value = null
      }
    } catch (e) {
      console.error('[aiConfigStore] reloadFromStorage 失败:', e)
    }
  }

  return {
    configs,
    activeConfigId,
    activeConfig,
    hasConfigs,
    ready,
    addConfig,
    updateConfig,
    deleteConfig,
    duplicateConfig,
    setActiveConfig,
    reloadFromStorage,
  }
})
