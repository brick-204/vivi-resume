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
  getMeta,
  setMeta,
} from '@/utils/storageAdapter'
import { message as naiveMessage } from '@/plugins/naive-ui'

export interface TokenUsage {
  prompt: number
  completion: number
  total: number
}

export const useAIConfigStore = defineStore('aiConfig', () => {
  const configs = ref<AIServiceConfig[]>([])
  const activeConfigId = ref<string | null>(null)

  // 同步锁
  const { isLocked } = useSyncLock()

  // Token 用量追踪
  const totalTokens = ref<TokenUsage>({ prompt: 0, completion: 0, total: 0 })

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
      // 仅恢复已保存的激活配置；不再自动激活第一个
      // ponytail: 旧逻辑在 savedActiveId 为 null（用户主动停用所有 AI）时仍强制激活第一个，
      //           导致"停用 → 刷新 → 又自动启用"。激活态完全由用户控制，首配由 addConfig 自动激活
      if (savedActiveId && allConfigs.some(c => c.id === savedActiveId)) {
        activeConfigId.value = savedActiveId
      } else {
        activeConfigId.value = null
      }
    } catch (e) {
      console.error('[aiConfigStore] 初始化失败:', e)
    } finally {
      _readyResolve()
    }

    // 加载历史 token 用量
    try {
      const savedUsage = await getMeta<TokenUsage>('aiTokenUsage')
      if (savedUsage) {
        totalTokens.value = savedUsage
      }
    } catch {
      // token 用量加载失败不影响初始化
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
  const deleteConfig = (id: string) => {
    if (isLocked.value) return

    // 先同步移除内存数据，让 UI 立即响应
    const wasActive = activeConfigId.value === id
    configs.value = configs.value.filter(c => c.id !== id)

    // 后台持久化
    const persist = async () => {
      await deleteAIConfigFromStorage(id)

      // 如果删除的是当前激活的配置
      if (wasActive) {
        if (configs.value.length > 0) {
          await setActiveConfig(configs.value[0].id)
        } else {
          activeConfigId.value = null
          await setActiveAIConfigId(null)
        }
      }
    }
    persist().catch(e => {
      console.error('[aiConfigStore] deleteConfig persist failed:', e)
      naiveMessage.warning('删除未完全同步，请检查存储空间')
    })
  }

  /** 批量删除配置 */
  const deleteConfigs = (ids: string[]) => {
    if (isLocked.value || ids.length === 0) return

    const idSet = new Set(ids)
    const wasActive = activeConfigId.value ? idSet.has(activeConfigId.value) : false

    // 先同步移除内存数据，让 UI 立即响应
    configs.value = configs.value.filter(c => !idSet.has(c.id))

    // 后台持久化
    const persist = async () => {
      await Promise.all(ids.map(id => deleteAIConfigFromStorage(id)))

      // 如果删除的包含当前激活的配置
      if (wasActive) {
        if (configs.value.length > 0) {
          await setActiveConfig(configs.value[0].id)
        } else {
          activeConfigId.value = null
          await setActiveAIConfigId(null)
        }
      }
    }
    persist().catch(e => {
      console.error('[aiConfigStore] deleteConfigs persist failed:', e)
      naiveMessage.warning('删除未完全同步，请检查存储空间')
    })
  }

  /** 复制配置（含 API Key） */
  const duplicateConfig = (id: string) => {
    if (isLocked.value) return undefined

    const source = configs.value.find(c => c.id === id)
    if (!source) return

    const now = new Date().toISOString()
    const duplicated: AIServiceConfig = {
      ...source,
      id: generateId(),
      name: `${source.name} (副本)`,
      createdAt: now,
      updatedAt: now,
    }
    // 先入内存让 UI 立即响应，持久化后台执行（与 deleteConfig 一致，避免文件系统/IDB 写入阻塞）
    configs.value.push(duplicated)

    const persist = async () => {
      await saveAIConfig(duplicated)
    }
    persist().catch(e => {
      console.error('[aiConfigStore] duplicateConfig persist failed:', e)
      naiveMessage.warning('复制未完全同步，请检查存储空间')
    })
    return duplicated
  }

  /** 设置激活配置 */
  const setActiveConfig = async (id: string | null) => {
    activeConfigId.value = id
    await setActiveAIConfigId(id)
  }

  /** 累加 token 用量（内存），防抖持久化到 IndexedDB */
  let _usageSaveTimer: ReturnType<typeof setTimeout> | null = null

  const addUsage = (usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number }) => {
    totalTokens.value = {
      prompt: totalTokens.value.prompt + (usage.prompt_tokens || 0),
      completion: totalTokens.value.completion + (usage.completion_tokens || 0),
      total: totalTokens.value.total + (usage.total_tokens || 0),
    }
    // 防抖持久化：5 秒内不再有新 usage 才写入 IndexedDB
    if (_usageSaveTimer) clearTimeout(_usageSaveTimer)
    _usageSaveTimer = setTimeout(async () => {
      _usageSaveTimer = null
      try {
        await setMeta('aiTokenUsage', totalTokens.value)
      } catch {
        // 持久化失败不影响功能
      }
    }, 5000)
  }

  /** 立即持久化 token 用量（防抖窗口内关闭页面时调用） */
  const flushUsage = async () => {
    if (_usageSaveTimer) {
      clearTimeout(_usageSaveTimer)
      _usageSaveTimer = null
    }
    try {
      await setMeta('aiTokenUsage', totalTokens.value)
    } catch {
      // 持久化失败不影响功能
    }
  }

  // 页面关闭时 flush 未持久化的 token 用量
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
      if (_usageSaveTimer) flushUsage()
    })
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
      } else {
        // 不自动激活第一个（用户可能已主动停用所有）
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
    totalTokens,
    addUsage,
    flushUsage,
    addConfig,
    updateConfig,
    deleteConfig,
    deleteConfigs,
    duplicateConfig,
    setActiveConfig,
    reloadFromStorage,
  }
})
