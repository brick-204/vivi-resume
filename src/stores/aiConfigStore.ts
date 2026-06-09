/**
 * AI 服务配置 Store
 * 管理 AI 服务配置的 CRUD + 激活态
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { AIServiceConfig } from '@/types/aiConfig'
import { generateId } from '@/types/resume'
import {
  getAllAIConfigs,
  saveAIConfig,
  deleteAIConfig as deleteAIConfigFromStorage,
  getActiveAIConfigId,
  setActiveAIConfigId,
} from '@/utils/storage'

export const useAIConfigStore = defineStore('aiConfig', () => {
  const configs = ref<AIServiceConfig[]>([])
  const activeConfigId = ref<string | null>(null)

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
  }
})
