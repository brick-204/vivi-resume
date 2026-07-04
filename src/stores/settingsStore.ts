/**
 * 设置 Store
 * 管理本地目录绑定状态、权限检查、bind/unbind/reauthorize 流程。
 *
 * 初始化顺序：settingsStore 必须在 resumeStore/aiConfigStore 之前 ready，
 * 因为 storageAdapter 依赖 isDirectoryMode 来决定分发到哪个后端。
 */

import { defineStore } from 'pinia'
import { ref, computed, nextTick } from 'vue'
import {
  getMeta,
  setMeta,
  deleteMeta,
  clearResumesStore,
  clearAIConfigsStore,
} from '@/utils/storage'
import * as idb from '@/utils/storage'
import * as adapter from '@/utils/storageAdapter'
import {
  isFileSystemAccessSupported,
  pickDirectory,
  queryPermission,
  requestPermission,
  ensureDir,
  writeJsonFile,
  writeDataUrlFile,
  readAllJsonFiles,
  readJsonFile,
} from '@/utils/directoryStorage'
import { generateId } from '@/types/resume'
import type { Resume } from '@/types/resume'
import type { AIServiceConfig } from '@/types/aiConfig'
import { getProviderInfo } from '@/types/aiConfig'
import { extractPhotos} from '@/utils/photoFileRef'
import { useSyncLock } from '@/composables/useSyncLock'
import { useSyncWorker } from '@/composables/useSyncWorker'
import { message as naiveMessage, dialog as naiveDialog } from '@/plugins/naive-ui'
import { h } from 'vue'
import MergeConflictModal from '@/components/dashboard/MergeConflictModal.vue'

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

      // 4. 从 IndexedDB 读取全部业务数据（直接用 storage.ts，不走 adapter）
      const [idbResumes, idbAIConfigs, currentId, activeAIConfigId] = await Promise.all([
        idb.getAllResumes(),
        idb.getAllAIConfigs(),
        idb.getCurrentId(),
        idb.getActiveAIConfigId(),
      ])
      // IndexedDB 的回收站设置（meta store），需一并迁移到目录 meta.json
      const [idbTrash, trashRetentionDays, trashBinRetentionDays] = await Promise.all([
        idb.getMeta<Resume[]>('trash'),
        idb.getMeta<number>('trashRetentionDays'),
        idb.getMeta<number>('trashBinRetentionDays'),
      ])

      // 5. 读取目录现有数据（用于冲突检测与合并）
      const dirResumesRaw = await readAllJsonFiles<Resume>(handle, 'resumes')
      const dirAiConfigs = await readAllJsonFiles<AIServiceConfig>(handle, 'ai-configs')
      let dirTrash: Resume[] = []
      let dirTrashRetentionDays = trashRetentionDays ?? 30
      let dirTrashBinRetentionDays = trashBinRetentionDays ?? 7
      try {
        const dirMeta = await readJsonFile<Record<string, unknown>>(handle, 'meta.json')
        if (dirMeta) {
          dirTrash = (dirMeta.trash as Resume[]) ?? []
          if (typeof dirMeta.trashRetentionDays === 'number') dirTrashRetentionDays = dirMeta.trashRetentionDays
          if (typeof dirMeta.trashBinRetentionDays === 'number') dirTrashBinRetentionDays = dirMeta.trashBinRetentionDays
        }
      } catch { /* meta.json 不存在或解析失败，用默认值 */ }

      // 6. 冲突检测 + 合并
      updateProgress('正在合并数据...', 10)

      // 6.1 回收站合并：IndexedDB 的回收站逐条与目录（resume 列表 + 目录回收站）ID 去重
      //      冲突项静默生成新 id + 改名 "原名字(N)"，不弹窗
      const idbTrashList = idbTrash ?? []
      const dirAllIds = new Set<string>([
        ...dirResumesRaw.map(r => r.id),
        ...dirTrash.map(r => r.id),
      ])
      let trashCounter = 0
      const mergedTrash: Resume[] = [...dirTrash]
      for (const t of idbTrashList) {
        if (!dirAllIds.has(t.id)) {
          mergedTrash.push(t)
        } else {
          trashCounter++
          mergedTrash.push({
            ...t,
            id: generateId(),
            title: t.title ? `${t.title} (${trashCounter})` : `未命名简历 (${trashCounter})`,
          })
        }
      }

      // 6.2 收集简历与 AI 配置的 ID 冲突项
      const dirResumeById = new Map(dirResumesRaw.map(r => [r.id, r]))
      const noConflictIdbResumes = idbResumes.filter(r => !dirResumeById.has(r.id))
      const resumeConflicts = idbResumes
        .filter(r => dirResumeById.has(r.id))
        .map(r => ({
          key: `resume:${r.id}`,
          type: 'resume' as const,
          typeLabel: '简历',
          idbVersion: { title: r.title || '未命名简历', updatedAt: r.updatedAt },
          dirVersion: { title: dirResumeById.get(r.id)!.title || '未命名简历', updatedAt: dirResumeById.get(r.id)!.updatedAt },
        }))

      const dirAiById = new Map(dirAiConfigs.map(c => [c.id, c]))
      const noConflictIdbAiConfigs = idbAIConfigs.filter(c => !dirAiById.has(c.id))
      const aiConfigSubtitle = (c: AIServiceConfig) => getProviderInfo(c.provider)?.name ?? c.provider
      const aiConfigConflicts = idbAIConfigs
        .filter(c => dirAiById.has(c.id))
        .map(c => ({
          key: `aiConfig:${c.id}`,
          type: 'aiConfig' as const,
          typeLabel: 'AI 配置',
          idbVersion: { title: c.name || '未命名配置', subtitle: aiConfigSubtitle(c), updatedAt: c.updatedAt },
          dirVersion: { title: dirAiById.get(c.id)!.name || '未命名配置', subtitle: aiConfigSubtitle(dirAiById.get(c.id)!), updatedAt: dirAiById.get(c.id)!.updatedAt },
        }))

      const allConflicts = [...resumeConflicts, ...aiConfigConflicts]

      let perChoice: Record<string, 'idb' | 'dir' | 'both'> = {}
      if (allConflicts.length > 0) {
        // ponytail: 弹出冲突选择前，临时释放同步锁，避免 SyncOverlay 遮罩盖住冲突弹窗
        releaseLock()
        await nextTick() // 等待 SyncOverlay 完全隐藏

        // 复用 naive-ui 离散 dialog 承载 MergeConflictModal 组件
        const result = await new Promise<Record<string, 'idb' | 'dir' | 'both'> | null>((resolve) => {
          const onConfirm = (choices: Record<string, 'idb' | 'dir' | 'both'>) => {
            naiveDialogInst?.destroy()
            resolve(choices)
          }
          const onCancel = () => {
            naiveDialogInst?.destroy()
            resolve(null)
          }
          const naiveDialogInst = naiveDialog.create({
            title: `检测到 ${allConflicts.length} 项数据 ID 冲突`,
            content: () => h(MergeConflictModal, {
              conflicts: allConflicts,
              onMerge: onConfirm,
              onClose: onCancel,
            }),
            showIcon: false,
            maskClosable: false,
            closable: false,
            onClose: onCancel,
          })
        })

        // 选择完成，重新加锁继续后续同步
        acquireLock('正在写入目录...')
        if (result === null) {
          // 用户取消：重置绑定状态（directoryHandle/directoryName 在选目录后已设置），
          // 释放锁、退出，不写目录、不清 IndexedDB
          directoryHandle.value = null
          directoryName.value = ''
          permissionStatus.value = 'prompt'
          naiveMessage.info('已取消绑定目录')
          return
        }
        perChoice = result
      }

      // 6.3 根据逐项选择构建合并后的简历列表
      let bothCounter = 0
      const mergedResumes: Resume[] = [...dirResumesRaw]          // 先放全部目录简历（含孤儿）
      for (const r of noConflictIdbResumes) mergedResumes.push(r) // 无冲突的 IndexedDB 简历直接合并
      for (const c of resumeConflicts) {
        const resumeId = c.key.replace('resume:', '')
        const choice = perChoice[c.key] ?? 'both'
        if (choice === 'idb') {
          // 保留 IndexedDB 版，替换目录版
          const idx = mergedResumes.findIndex(x => x.id === resumeId)
          if (idx >= 0) mergedResumes.splice(idx, 1, idbResumes.find(r => r.id === resumeId)!)
        } else if (choice === 'dir') {
          // 保留目录版，已在 mergedResumes 里，无需操作
        } else {
          // 两个都要：IndexedDB 版重新生成 id + 改名 "原名字(N)"
          bothCounter++
          const idbResume = idbResumes.find(r => r.id === resumeId)!
          mergedResumes.push({
            ...idbResume,
            id: generateId(),
            title: idbResume.title
              ? `${idbResume.title} (${bothCounter})`
              : `未命名简历 (${bothCounter})`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          })
        }
      }

      // 6.4 根据逐项选择构建合并后的 AI 配置列表
      let aiBothCounter = 0
      const aiIdMapping = new Map<string, string>()   // 旧 id → 新 id（用于 activeAIConfigId 映射）
      const mergedAiConfigs: AIServiceConfig[] = [...dirAiConfigs] // 先放全部目录配置
      for (const c of noConflictIdbAiConfigs) mergedAiConfigs.push(c) // 无冲突的 IndexedDB 配置直接合并
      for (const c of aiConfigConflicts) {
        const aiConfigId = c.key.replace('aiConfig:', '')
        const choice = perChoice[c.key] ?? 'both'
        if (choice === 'idb') {
          // 保留 IndexedDB 版，替换目录版
          const idx = mergedAiConfigs.findIndex(x => x.id === aiConfigId)
          if (idx >= 0) mergedAiConfigs.splice(idx, 1, idbAIConfigs.find(cfg => cfg.id === aiConfigId)!)
        } else if (choice === 'dir') {
          // 保留目录版，已在 mergedAiConfigs 里，无需操作
        } else {
          // 两个都要：IndexedDB 版重新生成 id + 改名 "原名字(N)"
          aiBothCounter++
          const idbConfig = idbAIConfigs.find(cfg => cfg.id === aiConfigId)!
          const newId = generateId()
          aiIdMapping.set(aiConfigId, newId)
          mergedAiConfigs.push({
            ...idbConfig,
            id: newId,
            name: idbConfig.name
              ? `${idbConfig.name} (${aiBothCounter})`
              : `未命名配置 (${aiBothCounter})`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          })
        }
      }

      // 6.5 合并后的 meta：IndexedDB 设置优先，currentId/activeAIConfigId 失效则回退
      const resolvedCurrentId = currentId && mergedResumes.some(r => r.id === currentId)
        ? currentId
        : (mergedResumes[0]?.id ?? '')
      const mappedActiveId = activeAIConfigId
        ? (aiIdMapping.get(activeAIConfigId) ?? activeAIConfigId)
        : activeAIConfigId
      const resolvedActiveId = mappedActiveId && mergedAiConfigs.some(c => c.id === mappedActiveId)
        ? mappedActiveId
        : (dirAiConfigs[0]?.id ?? mergedAiConfigs[0]?.id ?? '')
      const mergedMeta = {
        currentId: resolvedCurrentId,
        activeAIConfigId: resolvedActiveId,
        trash: mergedTrash,
        trashRetentionDays: trashRetentionDays ?? dirTrashRetentionDays,
        trashBinRetentionDays: trashBinRetentionDays ?? dirTrashBinRetentionDays,
      }

      updateProgress('正在序列化数据...', 20)

      // 7. 发送给 Worker 序列化（meta 已含 trash + retentionDays，worker 只 JSON.stringify）
      const result = await prepareSync(mergedResumes, mergedAiConfigs, mergedMeta)

      // 8. 主线程写入目录
      updateProgress('正在写入简历文件...', 50)

      // 创建子目录
      await ensureDir(handle, 'resumes')
      await ensureDir(handle, 'ai-configs')
      await ensureDir(handle, 'photos')

      // 写入简历文件（content 已是格式化 JSON 字符串，直接传给 writeJsonFile）
      // 同时提取照片为独立文件
      for (let i = 0; i < result.resumeFiles.length; i++) {
        const file = result.resumeFiles[i]
        // 解析 JSON，提取照片，重写 JSON
        let resumeObj: Record<string, unknown>
        try {
          resumeObj = JSON.parse(file.content) as Record<string, unknown>
        } catch (e) {
          console.warn('[settingsStore] 简历 JSON 解析失败，跳过:', file.filename, e)
          continue
        }
        const resumeId = resumeObj.id as string || file.filename.replace('.json', '')
        const { resume: refResume, photos } = await extractPhotos(resumeObj, resumeId)

        // 写入照片文件
        for (const photo of photos) {
          await writeDataUrlFile(handle, photo.relativePath, photo.dataUrl)
        }

        // 写入 JSON（含照片引用路径）
        await writeJsonFile(handle, `resumes/${file.filename}`, refResume)
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

      // 9. 存储 handle + directoryMode 到 IndexedDB meta
      await setMeta('directoryMode', true)
      await setMeta('directoryHandle', handle)

      // 10. 清除 IndexedDB 业务数据（保留 meta store）
      await clearResumesStore()
      await clearAIConfigsStore()

      // 11. 切换模式
      isDirectoryMode.value = true
      updateProgress('同步完成！', 100)

      // 12. 通知 stores 重新加载
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
  const unbindDirectory = async (copyToBrowser: boolean = false) => {
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
      const resumes = await adapter.getAllResumes()
      const aiConfigs = await readAllJsonFiles<AIServiceConfig>(handle, 'ai-configs')
      const metaJson = await readJsonFile<Record<string, string>>(handle, 'meta.json')

      // 2. 根据用户选择决定是否写回 IndexedDB
      updateProgress('正在写入 IndexedDB...', 30)

      if (copyToBrowser) {
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
      }

      updateProgress('正在清理目录模式...', 80)

      // 3. 清理 IndexedDB 的目录模式元数据（目录文件永远保留）
      await deleteMeta('directoryMode')
      await deleteMeta('directoryHandle')

      // 4. 切换模式
      isDirectoryMode.value = false
      directoryHandle.value = null
      directoryName.value = ''
      permissionStatus.value = 'prompt'

      updateProgress('解绑完成！', 100)

      // 5. 通知 stores 重新加载
      await notifyStoresReload()

      if (copyToBrowser) {
        naiveMessage.success('已解绑目录，数据已复制到浏览器存储')
      } else {
        naiveMessage.success('已解绑目录，应用已切换到浏览器存储模式')
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
      const resumes = await adapter.getAllResumes()
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
  // ponytail: 动态 import resumeStore/aiConfigStore 用于 notifyStoresReload，
  // 但这些模块也被其他 29 个文件静态 import，Vite 会警告动态导入无法移入独立 chunk。
  // 这是架构设计的副作用（settingsStore 必须先 ready，resumeStore 等 await 后才初始化），
  // 若要彻底解决需将 reloadFromStorage 路径抽到独立模块，但收益低（仅影响首次加载时的 chunk 划分）。
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
