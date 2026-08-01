/**
 * 设置 Store
 * 管理本地目录绑定状态、权限检查、bind/unbind/reauthorize 流程。
 *
 * 初始化顺序：settingsStore 必须在 resumeStore/aiConfigStore 之前 ready，
 * 因为 storageAdapter 依赖 isDirectoryMode 来决定分发到哪个后端。
 */

import { defineStore } from 'pinia'
import { ref, computed, nextTick, toRaw } from 'vue'
import {
  getMeta,
  setMeta,
  deleteMeta,
  clearResumesStore,
  clearAIConfigsStore,
  clearInterviewsStore,
} from '@/utils/storage'
import * as idb from '@/utils/storage'
import * as adapter from '@/utils/storageAdapter'
import { getDesktopPetId, setDesktopPetId, getAllDesktopPets, saveDesktopPet, deleteDesktopPet, getAllTrashPets, saveTrashPet, deleteTrashPet, clearAllTrashPets, getLegacyTrashPetsArray, clearLegacyTrashPetsMeta, getTrashRetentionDays, getRestReminderEnabled, setRestReminderEnabled, getRestReminderInterval, setRestReminderInterval, getPetAIChatEnabled, setPetAIChatEnabled, getIdleAiEnabled, setIdleAiEnabled, getIdleIntervalMinutes, setIdleIntervalMinutes } from '@/utils/storageAdapter'
import { DEFAULT_PET_ID, setCustomPetsCache, type CustomDesktopPet } from '@/config/desktopPets'
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
import type { Interview } from '@/types/interview'
import { getProviderInfo } from '@/types/aiConfig'
import { extractPhotos} from '@/utils/photoFileRef'
import { useSyncLock } from '@/composables/useSyncLock'
import { message as naiveMessage, dialog as naiveDialog } from '@/plugins/naive-ui'
import { h } from 'vue'
import { pickQuote } from '@/data/petQuotes'
import MergeConflictModal from '@/components/dashboard/MergeConflictModal.vue'

export const useSettingsStore = defineStore('settings', () => {
  // ========== 状态 ==========
  const isDirectoryMode = ref(false)
  const directoryHandle = ref<FileSystemDirectoryHandle | null>(null)
  const directoryName = ref('')
  const isSyncing = ref(false)
  const permissionStatus = ref<PermissionState>('prompt')

  // 桌宠偏好
  const currentPetId = ref(DEFAULT_PET_ID)
  const customPets = ref<CustomDesktopPet[]>([])
  // 桌宠回收站（复用简历回收站保留天数，到期自动清理）
  const trashPets = ref<CustomDesktopPet[]>([])
  // 休息提醒：默认开，默认 25 分钟，下限 10
  const restReminderEnabled = ref(true)
  const restReminderInterval = ref(25)
  // 桌宠 AI 动态话术：默认关（需用户主动开启 + 配置 AI 服务商）
  const petAIChatEnabled = ref(false)
  // idle/rest 也走 AI 子开关：依赖主开关，默认关
  const idleAiEnabled = ref(false)
  // 空闲冒泡间隔（分钟），默认 1，下限 1 上限 60
  const idleIntervalMinutes = ref(1)

  // Lock
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
      // 桌宠偏好：两种存储模式都走 adapter 分发读取
      try {
        currentPetId.value = await getDesktopPetId()
      } catch (e) {
        console.error('[settingsStore] 读取桌宠偏好失败:', e)
      }
      try {
        restReminderEnabled.value = await getRestReminderEnabled()
        restReminderInterval.value = await getRestReminderInterval()
      } catch (e) {
        console.error('[settingsStore] 读取休息提醒设置失败:', e)
      }
      try {
        petAIChatEnabled.value = await getPetAIChatEnabled()
      } catch (e) {
        console.error('[settingsStore] 读取桌宠 AI 话术开关失败:', e)
      }
      try {
        idleAiEnabled.value = await getIdleAiEnabled()
        idleIntervalMinutes.value = await getIdleIntervalMinutes()
      } catch (e) {
        console.error('[settingsStore] 读取 idle AI 开关/间隔失败:', e)
      }
      try {
        customPets.value = await getAllDesktopPets()
        setCustomPetsCache(customPets.value)
      } catch (e) {
        console.error('[settingsStore] 读取自定义桌宠失败:', e)
      }
      try {
        // 一次性迁移：旧 meta.trashPets 数组 → 每条独立存储（幂等，迁移过则跳过）
        await migrateTrashPets()
        trashPets.value = await getAllTrashPets()
        await cleanupTrashPets()
      } catch (e) {
        console.error('[settingsStore] 读取桌宠回收站失败:', e)
      }
      // 休息提醒配置注入 petStore（桌宠组件可能已 start 用默认值，这里覆盖为用户配置）
      try {
        const { usePetStore } = await import('@/stores/petStore')
        const petStore = usePetStore()
        petStore.setRestEnabled(restReminderEnabled.value)
        petStore.setRestIntervalMs(restReminderInterval.value * 60 * 1000)
        petStore.setAIChatEnabled(petAIChatEnabled.value)
        petStore.setIdleAiEnabled(idleAiEnabled.value)
        petStore.setIdleIntervalMs(idleIntervalMinutes.value * 60 * 1000)
      } catch { /* petStore 未初始化，忽略 */ }
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
      const [idbResumes, idbAIConfigs, currentId, activeAIConfigId, idbInterviews] = await Promise.all([
        idb.getAllResumes(),
        idb.getAllAIConfigs(),
        idb.getCurrentId(),
        idb.getActiveAIConfigId(),
        idb.getAllInterviews(),
      ])
      // IndexedDB 的回收站设置（meta store），需一并迁移到目录 meta.json
      const [idbTrash, trashRetentionDays, trashBinRetentionDays, idbTrashPets] = await Promise.all([
        idb.getMeta<Resume[]>('trash'),
        idb.getMeta<number>('trashRetentionDays'),
        idb.getMeta<number>('trashBinRetentionDays'),
        idb.getAllTrashPets(),
      ])

      // 5. 读取目录现有数据（用于冲突检测与合并）
      const dirResumesRaw = await readAllJsonFiles<Resume>(handle, 'resumes')
      const dirAiConfigs = await readAllJsonFiles<AIServiceConfig>(handle, 'ai-configs')
      let dirTrash: Resume[] = []
      let dirTrashRetentionDays = trashRetentionDays ?? 30
      let dirTrashBinRetentionDays = trashBinRetentionDays ?? 7
      let dirTrashPets: CustomDesktopPet[] = []
      // 目录现有选中态（重新绑定时应保留，而非用陈旧的 IndexedDB 值覆盖）
      let dirCurrentId: string | null = null
      let dirActiveAIConfigId: string | null = null
      let dirDesktopPetId: string | null = null
      try {
        const dirMeta = await readJsonFile<Record<string, unknown>>(handle, 'meta.json')
        if (dirMeta) {
          dirTrash = (dirMeta.trash as Resume[]) ?? []
          if (typeof dirMeta.trashRetentionDays === 'number') dirTrashRetentionDays = dirMeta.trashRetentionDays
          if (typeof dirMeta.trashBinRetentionDays === 'number') dirTrashBinRetentionDays = dirMeta.trashBinRetentionDays
          if (typeof dirMeta.currentId === 'string') dirCurrentId = dirMeta.currentId
          if (typeof dirMeta.activeAIConfigId === 'string') dirActiveAIConfigId = dirMeta.activeAIConfigId
          if (typeof dirMeta.desktopPetId === 'string') dirDesktopPetId = dirMeta.desktopPetId
        }
      } catch { /* meta.json 不存在或解析失败，用默认值 */ }
      // 桌宠回收站：从 trash-pets/ 子目录读取（每条独立存储，不再走 meta.json）
      try {
        dirTrashPets = await readAllJsonFiles<CustomDesktopPet>(handle, 'trash-pets')
      } catch { /* 目录不存在，用空数组 */ }

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

      // 6.5 合并后的 meta：选中态优先用目录现有值（重新绑定场景），
      //     IndexedDB 值次之（首次绑定迁移场景），最后回退到第一个
      // ponytail: 目录值优先——目录模式下 activeAIConfigId 只写目录 meta.json，
      //           IndexedDB 该字段陈旧，用作首选会覆盖目录正确状态
      const candidateCurrentId = dirCurrentId ?? currentId ?? null
      const resolvedCurrentId = candidateCurrentId && mergedResumes.some(r => r.id === candidateCurrentId)
        ? candidateCurrentId
        : (mergedResumes[0]?.id ?? '')
      const rawActiveId = dirActiveAIConfigId ?? activeAIConfigId ?? null
      const mappedActiveId = rawActiveId
        ? (aiIdMapping.get(rawActiveId) ?? rawActiveId)
        : null
      const resolvedActiveId = mappedActiveId && mergedAiConfigs.some(c => c.id === mappedActiveId)
        ? mappedActiveId
        : (dirAiConfigs[0]?.id ?? mergedAiConfigs[0]?.id ?? '')
      // 桌宠回收站合并：按 id 去重，目录已有保留，IndexedDB 独有追加（与 customPets 迁移策略一致）
      // 写入阶段仅把 IndexedDB 独有的写入目录 trash-pets/，目录已有的不重写
      const dirTrashPetIds = new Set(dirTrashPets.map(p => p.id))
      const mergedMeta = {
        currentId: resolvedCurrentId,
        activeAIConfigId: resolvedActiveId,
        trash: mergedTrash,
        trashRetentionDays: trashRetentionDays ?? dirTrashRetentionDays,
        trashBinRetentionDays: trashBinRetentionDays ?? dirTrashBinRetentionDays,
        desktopPetId: dirDesktopPetId ?? currentPetId.value,
      }

      updateProgress('正在序列化数据...', 20)

      // 7. 序列化为目录文件内容（meta 已含 trash + retentionDays，纯 JSON.stringify）
      // ponytail: 数据 KB 级，原 Worker 序列化无收益，改为同步 map + stringify
      const toFile = (item: { id: string }) => ({
        filename: `${item.id}.json`,
        content: JSON.stringify(structuredClone(toRaw(item)), null, 2),
      })
      const result = {
        resumeFiles: mergedResumes.map(toFile),
        aiConfigFiles: mergedAiConfigs.map(toFile),
        metaContent: JSON.stringify(structuredClone(toRaw(mergedMeta)), null, 2),
      }

      // 8. 主线程写入目录
      updateProgress('正在写入简历文件...', 50)

      // 创建子目录
      await ensureDir(handle, 'resumes')
      await ensureDir(handle, 'ai-configs')
      await ensureDir(handle, 'photos')
      await ensureDir(handle, 'desktop-pets')
      await ensureDir(handle, 'interviews')

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

      // 写入自定义桌宠文件（从 IndexedDB 迁移到目录）
      // ponytail: 目录已有同 id 的自定义桌宠优先保留（跨设备目录共享场景），
      //           仅把 IndexedDB 独有的写入目录，避免静默覆盖目录版。与 desktopPetId 的目录优先策略一致。
      const dirCustomPets = await readAllJsonFiles<CustomDesktopPet>(handle, 'desktop-pets')
      const dirCustomPetIds = new Set(dirCustomPets.map(p => p.id))
      const idbCustomPets = await idb.getAllDesktopPets()
      for (const pet of idbCustomPets) {
        if (dirCustomPetIds.has(pet.id)) continue
        await writeJsonFile(handle, `desktop-pets/${pet.id}.json`, idb.toPlain(pet))
      }

      // 写入桌宠回收站文件（从 IndexedDB 迁移到目录，每条独立存储）
      // ponytail: 同 customPets 策略，目录已有的不重写，仅写 IndexedDB 独有的
      await ensureDir(handle, 'trash-pets')
      for (const pet of (idbTrashPets ?? [])) {
        if (dirTrashPetIds.has(pet.id)) continue
        await writeJsonFile(handle, `trash-pets/${pet.id}.json`, idb.toPlain(pet))
      }

      // 写入面试记录文件（从 IndexedDB 迁移到目录）
      // ponytail: 同 customPets 策略，目录已有的不重写，仅写 IndexedDB 独有的
      const dirInterviews = await readAllJsonFiles<Interview>(handle, 'interviews')
      const dirInterviewIds = new Set(dirInterviews.map(i => i.id))
      for (const iv of idbInterviews) {
        if (dirInterviewIds.has(iv.id)) continue
        await writeJsonFile(handle, `interviews/${iv.id}.json`, idb.toPlain(iv))
      }

      // 写入 meta.json（metaContent 已是 JSON 字符串）
      await writeJsonFile(handle, 'meta.json', result.metaContent)

      updateProgress('正在清理旧数据...', 90)

      // 9. 存储 handle + directoryMode 到 IndexedDB meta
      await setMeta('directoryMode', true)
      await setMeta('directoryHandle', handle)

      // 11. 切换模式（提前到 clear 之前：清空 IndexedDB 业务数据期间，
      // 任何绕过 isLocked 的写入会路由到目录而非已清空的 IndexedDB，避免数据丢失）
      isDirectoryMode.value = true

      // 10. 清除 IndexedDB 业务数据（保留 meta store）
      await clearResumesStore()
      await clearAIConfigsStore()
      await idb.clearTrashPetsStore()
      await clearInterviewsStore()

      updateProgress('同步完成！', 100)

      // 12. 通知 stores 重新加载
      await notifyStoresReload()

      // 13. 同步桌宠偏好到内存（目录值优先时需覆盖内存旧值）
      currentPetId.value = dirDesktopPetId ?? currentPetId.value
      customPets.value = await adapter.getAllDesktopPets()
      setCustomPetsCache(customPets.value)
      trashPets.value = await getAllTrashPets()
      await cleanupTrashPets()

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
        if (typeof metaJson?.desktopPetId === 'string') {
          await idb.setMeta('desktopPetId', metaJson.desktopPetId)
        }
        // 自定义桌宠：从目录读取并写入 IndexedDB
        const dirCustomPets = await adapter.getAllDesktopPets()
        for (const pet of dirCustomPets) {
          await idb.saveDesktopPet(pet)
        }
        // 桌宠回收站：从目录 trash-pets/ 读取并逐条写入 IndexedDB（每条独立存储）
        const dirTrashPets = await adapter.getAllTrashPets()
        for (const pet of dirTrashPets) {
          await idb.saveTrashPet(pet)
        }
        // 面试记录：从目录 interviews/ 读取，以目录为权威刷新 IndexedDB（先清空再写，避免目录已删条目残留）
        const dirInterviews = await adapter.getAllInterviews()
        await clearInterviewsStore()
        for (const iv of dirInterviews) {
          await idb.saveInterview(iv)
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

      // 6. 刷新桌宠偏好到内存（已切回 IndexedDB）
      customPets.value = await adapter.getAllDesktopPets()
      setCustomPetsCache(customPets.value)
      trashPets.value = await getAllTrashPets()
      await cleanupTrashPets()

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
        // 权限恢复后重读桌宠偏好（目录内容可能在权限丢失期间被外部改动）
        currentPetId.value = await getDesktopPetId()
        customPets.value = await adapter.getAllDesktopPets()
        setCustomPetsCache(customPets.value)
        trashPets.value = await getAllTrashPets()
        await cleanupTrashPets()
        naiveMessage.success('已重新获取目录权限')
      } else {
        naiveMessage.warning('未能获取目录权限')
      }
    } catch {
      naiveMessage.error('重新授权失败')
    }
  }

  // ========== 更新桌宠偏好 ==========
  const updateDesktopPetId = async (petId: string) => {
    currentPetId.value = petId
    await setDesktopPetId(petId)
  }

  // ========== 休息提醒设置 ==========
  /** 切换休息提醒开关：同步 petStore 计时 + 持久化 + 桌宠说话反馈 */
  const updateRestReminderEnabled = async (enabled: boolean) => {
    restReminderEnabled.value = enabled
    const { usePetStore } = await import('@/stores/petStore')
    const petStore = usePetStore()
    petStore.setRestEnabled(enabled)
    // 抽屉打开时桌宠隐藏，气泡看不见 → 改用 naiveMessage 顶替（静态文本，与 triggerRest 同策略）；
    // 桌宠可见时走 sayCategory：开关开则 AI 现编 restOn/restOff，否则静态
    if (petStore.paused) {
      naiveMessage.info(pickQuote(enabled ? 'restOn' : 'restOff', petStore.petName))
    } else {
      void petStore.sayCategory(enabled ? 'restOn' : 'restOff', petStore.petName)
    }
    await setRestReminderEnabled(enabled)
  }

  /** 修改休息提醒间隔（分钟）：同步 petStore + 持久化 */
  const updateRestReminderInterval = async (minutes: number) => {
    restReminderInterval.value = minutes
    const { usePetStore } = await import('@/stores/petStore')
    usePetStore().setRestIntervalMs(minutes * 60 * 1000)
    await setRestReminderInterval(minutes)
  }

  /** 切换桌宠 AI 动态话术开关：注入 petStore + 持久化 + 桌宠静态反馈（fire-and-forget）
   *  开关反馈本身用静态话术（不等 AI，即时反馈）；后续业务动作才走 AI 动态 */
  const updatePetAIChatEnabled = async (enabled: boolean) => {
    petAIChatEnabled.value = enabled
    const { usePetStore } = await import('@/stores/petStore')
    const petStore = usePetStore()
    petStore.setAIChatEnabled(enabled)
    // 抽屉打开时桌宠隐藏，气泡看不见 → 改用 naiveMessage 顶替（与 restOn/restOff 同策略）
    const text = pickQuote(enabled ? 'aiChatOn' : 'aiChatOff', petStore.petName)
    if (petStore.paused) naiveMessage.info(text)
    else petStore.say(text)
    setPetAIChatEnabled(enabled).catch(e => console.error('[settingsStore] 桌宠 AI 话术开关写盘失败:', e))
  }

  /** 切换 idle/rest 也走 AI 子开关：注入 petStore + 持久化（fire-and-forget） */
  const updateIdleAiEnabled = async (enabled: boolean) => {
    idleAiEnabled.value = enabled
    const { usePetStore } = await import('@/stores/petStore')
    usePetStore().setIdleAiEnabled(enabled)
    setIdleAiEnabled(enabled).catch(e => console.error('[settingsStore] idle AI 开关写盘失败:', e))
  }

  /** 修改空闲冒泡间隔（分钟）：注入 petStore（重启定时器）+ 持久化；下限 1 上限 60 */
  const updateIdleIntervalMinutes = async (minutes: number) => {
    const clamped = Math.min(60, Math.max(1, minutes))
    idleIntervalMinutes.value = clamped
    const { usePetStore } = await import('@/stores/petStore')
    usePetStore().setIdleIntervalMs(clamped * 60 * 1000)
    setIdleIntervalMinutes(clamped).catch(e => console.error('[settingsStore] idle 间隔写盘失败:', e))
  }

  // ========== 自定义桌宠管理 ==========
  const addCustomPet = async (
    name: string,
    data: { type?: 'lottie' | 'img'; lottie?: unknown; src?: string },
  ): Promise<string> => {
    // ponytail: 复用 generateId（已处理非安全上下文 crypto.randomUUID 缺失的降级），
    //           避免裸调 crypto.randomUUID 在 file:// 等环境返回 undefined 导致 id 重复
    const id = `custom-${generateId()}`
    // data 经 ref 包裹后 lottie 对象是 reactive proxy，toPlain(toRaw) 只剥外层，
    // 嵌套的 lottie 仍带 proxy → structuredClone 失败。JSON 深拷贝彻底脱代理。
    // ponytail: 假设 lottie 为纯 JSON 数据（无 Date/undefined），JSON 往返无损；
    //           根因是 toPlain 不递归剥 proxy，此处局部修复，未改 toPlain 以控影响面。
    const plainData = JSON.parse(JSON.stringify(data)) as typeof data
    const pet: CustomDesktopPet = { id, name, ...plainData }
    await saveDesktopPet(pet)
    customPets.value = [...customPets.value, pet]
    setCustomPetsCache(customPets.value)
    return id
  }

  const removeCustomPet = async (id: string): Promise<void> => {
    // ponytail: 防御内置 id 误传（内置桌宠不在 customPets 里，删了无意义却会触发多余回退）
    if (!id.startsWith('custom-')) return
    const pet = customPets.value.find(p => p.id === id)
    if (!pet) return
    // 软删：移到桌宠回收站（复用简历回收站保留天数，到期自动清理），不物理删除
    const trashed: CustomDesktopPet = { ...pet, deletedAt: new Date().toISOString() }
    // ponytail: 脱代理后单条写入回收站（toPlain 不递归剥 proxy，JSON 往返彻底脱代理，与 addCustomPet 同根因）
    const plainTrashed = JSON.parse(JSON.stringify(trashed)) as CustomDesktopPet
    // ponytail: 先更新内存（INP 友好，对齐 resumeStore.restoreResume），持久化 fire-and-forget。
    //           同一 pet 的写盘竞态见根目录 TECH_NOTES.md（不加队列，接受理论竞态）。
    trashPets.value = [...trashPets.value, plainTrashed]
    customPets.value = customPets.value.filter(p => p.id !== id)
    setCustomPetsCache(customPets.value)
    // 删除的是当前选中的桌宠 → 同步回退内存，写盘 fire-and-forget（避免 message 滞后）
    if (currentPetId.value === id) {
      currentPetId.value = DEFAULT_PET_ID
      setDesktopPetId(DEFAULT_PET_ID).catch(e => console.error('[settingsStore] 回退默认桌宠写盘失败:', e))
    }
    // 后台持久化：先写回收站再删源数据，写盘失败仅 console.error 不回滚（与简历同策略）
    saveTrashPet(plainTrashed)
      .then(() => deleteDesktopPet(id))
      .catch(e => console.error('[settingsStore] removeCustomPet 持久化失败:', e))
  }

  // ========== 重命名自定义桌宠 ==========
  const renameCustomPet = async (id: string, newName: string): Promise<void> => {
    // ponytail: 内置桌宠不在 customPets 里，改名无意义
    if (!id.startsWith('custom-')) return
    const name = newName.trim()
    if (!name) return
    const pet = customPets.value.find(p => p.id === id)
    if (!pet || pet.name === name) return
    // ponytail: 先更新内存 + 缓存（INP 友好），持久化 fire-and-forget（与 removeCustomPet 同策略）
    const renamed: CustomDesktopPet = { ...pet, name }
    customPets.value = customPets.value.map(p => (p.id === id ? renamed : p))
    setCustomPetsCache(customPets.value)
    // 改的是当前选中桌宠 → 同步 petStore.petName，让 idle/rest 话术 {name} 用新名
    if (currentPetId.value === id) {
      const { usePetStore } = await import('@/stores/petStore')
      usePetStore().petName = name
    }
    saveDesktopPet(renamed).catch(e => console.error('[settingsStore] renameCustomPet 持久化失败:', e))
  }

  /** 从回收站恢复桌宠（移回 customPets，去掉 deletedAt） */
  const restorePet = async (id: string): Promise<void> => {
    const pet = trashPets.value.find(p => p.id === id)
    if (!pet) return
    const { deletedAt: _deletedAt, ...rest } = pet
    void _deletedAt
    // ponytail: restored.lottie 仍是 reactive proxy，saveDesktopPet 内部 toPlain 会抛 DataCloneError；
    //           JSON 往返彻底脱代理（与 addCustomPet 同根因），再持久化
    const restored: CustomDesktopPet = JSON.parse(JSON.stringify(rest))
    // ponytail: 先更新内存（INP 友好），持久化 fire-and-forget。先写 customPets 再删回收站，写盘顺序见 TECH_NOTES.md。
    customPets.value = [...customPets.value, restored]
    setCustomPetsCache(customPets.value)
    trashPets.value = trashPets.value.filter(p => p.id !== id)
    saveDesktopPet(restored)
      .then(() => deleteTrashPet(id))
      .catch(e => console.error('[settingsStore] restorePet 持久化失败:', e))
  }

  /** 彻底删除回收站中的桌宠（不可恢复） */
  const purgePet = async (id: string): Promise<void> => {
    trashPets.value = trashPets.value.filter(p => p.id !== id)
    deleteTrashPet(id).catch(e => console.error('[settingsStore] purgePet 持久化失败:', e))
  }

  /** 清空桌宠回收站 */
  const emptyTrashPets = async (): Promise<void> => {
    trashPets.value = []
    clearAllTrashPets().catch(e => console.error('[settingsStore] emptyTrashPets 持久化失败:', e))
  }

  /** 自动清理过期桌宠回收站（复用简历回收站保留天数） */
  const cleanupTrashPets = async (): Promise<void> => {
    if (trashPets.value.length === 0) return
    const days = await getTrashRetentionDays()
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000
    const expired = trashPets.value.filter(p => {
      const deletedAt = p.deletedAt ? new Date(p.deletedAt).getTime() : Date.now()
      return deletedAt <= cutoff
    })
    if (expired.length === 0) return
    await Promise.all(expired.map(p => deleteTrashPet(p.id)))
    const expiredIds = new Set(expired.map(p => p.id))
    trashPets.value = trashPets.value.filter(p => !expiredIds.has(p.id))
  }

  /**
   * 一次性迁移：旧 meta.trashPets 数组 → 每条独立存储。
   * 幂等：旧 meta 字段不存在或非数组时跳过；迁移成功后清除 meta 字段，再次调用直接 return。
   * 中途失败时 meta 字段未清，下次启动重跑，put 是 upsert 不会重复。
   */
  const migrateTrashPets = async (): Promise<void> => {
    const legacy = await getLegacyTrashPetsArray()
    if (legacy === undefined) return
    // 空数组也需清除 meta 字段，保证幂等
    for (const pet of legacy) {
      await saveTrashPet(pet)
    }
    await clearLegacyTrashPetsMeta()
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
      if (typeof metaJson?.desktopPetId === 'string') {
        await idb.setMeta('desktopPetId', metaJson.desktopPetId)
        currentPetId.value = metaJson.desktopPetId
      }

      // 自定义桌宠：从目录读取并刷新内存（目录数据为权威）
      customPets.value = await adapter.getAllDesktopPets()
      setCustomPetsCache(customPets.value)
      // 桌宠回收站：从目录 trash-pets/ 读取，以目录为权威刷新 IndexedDB（先清空再写，避免目录已删条目残留）
      const dirTrashPets = await adapter.getAllTrashPets()
      await idb.clearTrashPetsStore()
      for (const pet of dirTrashPets) {
        await idb.saveTrashPet(pet)
      }
      trashPets.value = await getAllTrashPets()
      await cleanupTrashPets()
      // 面试记录：从目录 interviews/ 读取，以目录为权威刷新 IndexedDB（先清空再写，避免目录已删条目残留）
      const dirInterviews = await adapter.getAllInterviews()
      await clearInterviewsStore()
      for (const iv of dirInterviews) {
        await idb.saveInterview(iv)
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
    const { useConsultStore } = await import('@/stores/consultStore')
    const { useInterviewStore } = await import('@/stores/interviewStore')

    const resumeStore = useResumeStore()
    const aiConfigStore = useAIConfigStore()
    const consultStore = useConsultStore()
    const interviewStore = useInterviewStore()

    // 各 store 独立 reload，一个失败不影响另一个
    await Promise.allSettled([
      resumeStore.reloadFromStorage?.(),
      aiConfigStore.reloadFromStorage?.(),
      consultStore.reloadFromStorage?.(),
      interviewStore.reloadFromStorage?.(),
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
    currentPetId,
    updateDesktopPetId,
    restReminderEnabled,
    restReminderInterval,
    updateRestReminderEnabled,
    updateRestReminderInterval,
    petAIChatEnabled,
    updatePetAIChatEnabled,
    idleAiEnabled,
    updateIdleAiEnabled,
    idleIntervalMinutes,
    updateIdleIntervalMinutes,
    customPets,
    addCustomPet,
    removeCustomPet,
    renameCustomPet,
    trashPets,
    restorePet,
    purgePet,
    emptyTrashPets,
    cleanupTrashPets,
  }
})
