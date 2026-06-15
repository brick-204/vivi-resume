/**
 * 设置 Store
 * 管理本地目录绑定状态、权限检查、bind/unbind/reauthorize 流程。
 *
 * 初始化顺序：settingsStore 必须在 resumeStore/aiConfigStore 之前 ready，
 * 因为 storageAdapter 依赖 isDirectoryMode 来决定分发到哪个后端。
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getMeta, setMeta, deleteMeta, clearResumesStore, clearAIConfigsStore } from '@/utils/storage'
import * as idb from '@/utils/storage'
import {
  isFileSystemAccessSupported,
  pickDirectory,
  queryPermission,
  requestPermission,
  ensureDir,
  deleteDir,
  writeJsonFile,
  readAllJsonFiles,
  readJsonFile,
} from '@/utils/directoryStorage'
import { useSyncLock } from '@/composables/useSyncLock'
import { useSyncWorker } from '@/composables/useSyncWorker'
import type { Resume } from '@/types/resume'
import type { AIServiceConfig } from '@/types/aiConfig'
import { message as naiveMessage } from '@/plugins/naive-ui'

export const useSettingsStore = defineStore('settings', () => {
  // ========== 状态 ==========
  const isDirectoryMode = ref(false)
  const directoryHandle = ref<FileSystemDirectoryHandle | null>(null)
  const directoryName = ref('')
  const isSyncing = ref(false)
  const permissionStatus = ref<PermissionState>('prompt')

  // Worker + Lock
  const { prepareSync } = useSyncWorker({ persistent: true })
  const { acquire: acquireLock, updateProgress, release: releaseLock, isLocked, lockMessage, syncPercent } = useSyncLock()

  // ========== 就绪 Promise ==========
  let _readyResolve!: () => void
  const ready = new Promise<void>(resolve => { _readyResolve = resolve })

  // ========== 计算属性 ==========
  const isSupported = computed(() => isFileSystemAccessSupported())

  // ========== 初始化 ==========
  const init = async () => {
    try {
      // 从 IndexedDB meta store 读取目录模式标志和句柄
      const mode = await getMeta<boolean>('directoryMode')
      const handle = await getMeta<FileSystemDirectoryHandle>('directoryHandle')

      if (mode === true && handle) {
        directoryHandle.value = handle
        directoryName.value = handle.name

        // 检查权限
        const perm = await queryPermission(handle)
        permissionStatus.value = perm

        if (perm === 'granted') {
          isDirectoryMode.value = true
        }
        // 如果权限不是 granted，UI 会显示重授权按钮
      }
    } catch (e) {
      console.error('[settingsStore] 初始化失败:', e)
    } finally {
      _readyResolve()
    }
  }

  // ========== 绑定目录 ==========
  const bindDirectory = async () => {
    if (!isFileSystemAccessSupported()) {
      naiveMessage.error('当前浏览器不支持本地目录功能，请使用 Chrome 或 Edge')
      return
    }

    try {
      // 1. 选择目录
      const handle = await pickDirectory()
      directoryHandle.value = handle
      directoryName.value = handle.name

      // 2. 获取权限
      const perm = await requestPermission(handle)
      if (perm !== 'granted') {
        directoryHandle.value = null
        directoryName.value = ''
        naiveMessage.warning('需要授予目录读写权限才能绑定')
        return
      }
      permissionStatus.value = perm

      // 3. 获取同步锁
      isSyncing.value = true
      acquireLock('正在准备同步数据...')

      // 4. 从 IndexedDB 读取全部数据（直接用 storage.ts，不走 adapter）
      const [resumes, aiConfigs, currentId, activeAIConfigId] = await Promise.all([
        idb.getAllResumes(),
        idb.getAllAIConfigs(),
        idb.getCurrentId(),
        idb.getActiveAIConfigId(),
      ])

      updateProgress('正在序列化数据...', 5)

      // 5. 发送给 Worker 序列化
      const result = await prepareSync(resumes, aiConfigs, {
        currentId: currentId ?? undefined,
        activeAIConfigId: activeAIConfigId ?? undefined,
      })

      // 6. 主线程写入目录
      updateProgress('正在写入简历文件...', 50)

      // 创建子目录
      await ensureDir(handle, 'resumes')
      await ensureDir(handle, 'ai-configs')

      // 写入简历文件（content 已是格式化 JSON 字符串，直接传给 writeJsonFile）
      for (let i = 0; i < result.resumeFiles.length; i++) {
        const file = result.resumeFiles[i]
        await writeJsonFile(handle, `resumes/${file.filename}`, file.content)
        updateProgress(
          `正在写入简历 ${i + 1}/${result.resumeFiles.length}`,
          50 + Math.round(((i + 1) / result.resumeFiles.length) * 30),
        )
      }

      // 写入 AI 配置文件（同理）
      for (let i = 0; i < result.aiConfigFiles.length; i++) {
        const file = result.aiConfigFiles[i]
        await writeJsonFile(handle, `ai-configs/${file.filename}`, file.content)
      }

      // 写入 meta.json（metaContent 已是 JSON 字符串）
      await writeJsonFile(handle, 'meta.json', result.metaContent)

      updateProgress('正在清理旧数据...', 90)

      // 7. 存储 handle + directoryMode 到 IndexedDB meta
      await setMeta('directoryMode', true)
      await setMeta('directoryHandle', handle)

      // 8. 清除 IndexedDB 业务数据（保留 meta store）
      await clearResumesStore()
      await clearAIConfigsStore()

      // 9. 切换模式
      isDirectoryMode.value = true
      updateProgress('同步完成！', 100)

      // 10. 通知 stores 重新加载
      await notifyStoresReload()

      naiveMessage.success(`已绑定目录「${handle.name}」，数据同步完成`)
    } catch (e) {
      console.error('[settingsStore] 绑定目录失败:', e)
      // 回滚：不设置 isDirectoryMode，IndexedDB 数据保持不变
      directoryHandle.value = null
      directoryName.value = ''
      isDirectoryMode.value = false
      naiveMessage.error('绑定目录失败，请重试')
    } finally {
      isSyncing.value = false
      releaseLock()
    }
  }

  // ========== 解绑目录 ==========
  const unbindDirectory = async (deleteFiles: boolean = true) => {
    if (!directoryHandle.value) return
    if (isLocked.value) {
      naiveMessage.warning('请等待当前同步操作完成')
      return
    }

    try {
      isSyncing.value = true
      acquireLock('正在从目录读取数据...')

      const handle = directoryHandle.value

      // 1. 从目录读取全部数据
      const resumes = await readAllJsonFiles<Resume>(handle, 'resumes')
      const aiConfigs = await readAllJsonFiles<AIServiceConfig>(handle, 'ai-configs')
      const metaJson = await readJsonFile<Record<string, string>>(handle, 'meta.json')

      updateProgress('正在写入 IndexedDB...', 30)

      // 2. 写回 IndexedDB（直接用 storage.ts，不走 adapter）
      await idb.saveResumeList(resumes)

      for (const config of aiConfigs) {
        await idb.saveAIConfig(config)
      }

      if (metaJson?.currentId) {
        await idb.setCurrentId(metaJson.currentId)
      }
      if (metaJson?.activeAIConfigId) {
        await idb.setActiveAIConfigId(metaJson.activeAIConfigId)
      }

      updateProgress('正在清理目录模式...', 80)

      // 3. 按用户选择决定是否删除目录中的业务文件
      if (deleteFiles) {
        await deleteDir(handle, 'resumes')
        await deleteDir(handle, 'ai-configs')
        // 删除 meta.json
        try { await handle.removeEntry('meta.json') } catch { /* 忽略 */ }
      }

      // 4. 更新 IndexedDB meta
      await deleteMeta('directoryMode')
      await deleteMeta('directoryHandle')

      // 5. 切换模式
      isDirectoryMode.value = false
      directoryHandle.value = null
      directoryName.value = ''
      permissionStatus.value = 'prompt'

      updateProgress('解绑完成！', 100)

      // 6. 通知 stores 重新加载
      await notifyStoresReload()

      if (deleteFiles) {
        naiveMessage.success('已解绑目录，数据已恢复到浏览器存储，目录文件已清理')
      } else {
        naiveMessage.success('已解绑目录，数据已恢复到浏览器存储，目录文件已保留')
      }
    } catch (e) {
      console.error('[settingsStore] 解绑目录失败:', e)
      naiveMessage.error('解绑目录失败，请重试')
    } finally {
      isSyncing.value = false
      releaseLock()
    }
  }

  // ========== 重新授权 ==========
  const reauthorize = async () => {
    if (!directoryHandle.value) return

    try {
      const perm = await requestPermission(directoryHandle.value)
      permissionStatus.value = perm

      if (perm === 'granted') {
        isDirectoryMode.value = true
        await notifyStoresReload()
        naiveMessage.success('已重新获取目录权限')
      } else {
        naiveMessage.warning('未能获取目录权限')
      }
    } catch {
      naiveMessage.error('重新授权失败')
    }
  }

  // ========== 手动重新同步 ==========
  const resyncDirectory = async () => {
    if (!directoryHandle.value) return
    if (isLocked.value) {
      naiveMessage.warning('请等待当前同步操作完成')
      return
    }

    // 验证权限
    const perm = await queryPermission(directoryHandle.value)
    if (perm !== 'granted') {
      const newPerm = await requestPermission(directoryHandle.value)
      permissionStatus.value = newPerm
      if (newPerm !== 'granted') {
        naiveMessage.warning('需要目录读写权限才能重新同步')
        return
      }
    }

    try {
      isSyncing.value = true
      acquireLock('正在从目录读取数据...')

      const handle = directoryHandle.value

      // 1. 从目录读取全部数据
      const resumes = await readAllJsonFiles<Resume>(handle, 'resumes')
      const aiConfigs = await readAllJsonFiles<AIServiceConfig>(handle, 'ai-configs')
      const metaJson = await readJsonFile<Record<string, string>>(handle, 'meta.json')

      updateProgress('正在写入 IndexedDB...', 30)

      // 2. 写入 IndexedDB
      await idb.saveResumeList(resumes)

      for (const config of aiConfigs) {
        await idb.saveAIConfig(config)
      }

      if (metaJson?.currentId) {
        await idb.setCurrentId(metaJson.currentId)
      }
      if (metaJson?.activeAIConfigId) {
        await idb.setActiveAIConfigId(metaJson.activeAIConfigId)
      }

      updateProgress('正在刷新数据...', 80)

      // 3. 通知 stores 重新加载
      await notifyStoresReload()

      updateProgress('重新同步完成！', 100)
      naiveMessage.success('已从目录重新同步数据')
    } catch (e) {
      console.error('[settingsStore] 重新同步失败:', e)
      naiveMessage.error('重新同步失败，请重试')
    } finally {
      isSyncing.value = false
      releaseLock()
    }
  }

  // ========== 通知 stores 重新加载 ==========
  const notifyStoresReload = async () => {
    // 动态导入避免循环依赖
    const { useResumeStore } = await import('@/stores/resumeStore')
    const { useAIConfigStore } = await import('@/stores/aiConfigStore')

    const resumeStore = useResumeStore()
    const aiConfigStore = useAIConfigStore()

    // 两个 store 独立 reload，一个失败不影响另一个
    await Promise.allSettled([
      resumeStore.reloadFromStorage?.(),
      aiConfigStore.reloadFromStorage?.(),
    ])
  }

  // 初始化
  init()

  return {
    isDirectoryMode,
    directoryHandle,
    directoryName,
    isSyncing,
    isSupported,
    permissionStatus,
    isLocked,
    lockMessage,
    syncPercent,
    ready,
    bindDirectory,
    unbindDirectory,
    reauthorize,
    resyncDirectory,
  }
})
