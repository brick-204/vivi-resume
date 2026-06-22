/**
 * 存储抽象层
 * 与 storage.ts 完全相同的函数签名，根据 settingsStore.isDirectoryMode
 * 分发到 IndexedDB（storage.ts）或本地目录（directoryStorage.ts）。
 *
 * 两个 store（resumeStore、aiConfigStore）只需将 import 从
 * `@/utils/storage` 改为 `@/utils/storageAdapter`，无需修改任何逻辑。
 */

import { toRaw } from 'vue'
import type { Resume } from '@/types/resume'
import type { AIServiceConfig } from '@/types/aiConfig'
import * as idb from './storage'
import * as dir from './directoryStorage'
import { useSettingsStore } from '@/stores/settingsStore'
import { extractPhotos, injectPhotos, isPhotoRef, parsePhotoRef } from './photoFileRef'

// ========== 工具函数 ==========

/** 当前是否处于目录模式 */
function isDirectoryMode(): boolean {
  try {
    const settings = useSettingsStore()
    return settings.isDirectoryMode && settings.directoryHandle !== null
  } catch {
    // settingsStore 尚未初始化（store 循环依赖保护）
    return false
  }
}

/** 获取当前目录句柄（目录模式下保证非 null） */
function getHandle(): FileSystemDirectoryHandle {
  const settings = useSettingsStore()
  const handle = settings.directoryHandle
  if (!handle) throw new Error('[storageAdapter] directoryHandle is null in directory mode')
  return handle
}

/** 剥离 Vue Proxy */
function toPlain<T>(value: T): T {
  return structuredClone(toRaw(value as object)) as T
}

// ========== Resume 操作 ==========

export async function getAllResumes(): Promise<Resume[]> {
  if (isDirectoryMode()) {
    const handle = getHandle()
    const resumes = await dir.readAllJsonFiles<Resume>(handle, 'resumes')

    // 收集所有需要加载的照片引用，并行读取
    const photoTasks: { resumeIndex: number; field: 'photo' | 'photoOriginal'; relPath: string; mimeType: string }[] = []

    for (let ri = 0; ri < resumes.length; ri++) {
      const basicInfo = resumes[ri].basicInfo as unknown as Record<string, unknown>
      for (const field of ['photo', 'photoOriginal'] as const) {
        const value = basicInfo?.[field] as string | undefined
        if (value && isPhotoRef(value)) {
          const relPath = parsePhotoRef(value)
          const mimeType = relPath.endsWith('.png') ? 'image/png' : 'image/jpeg'
          photoTasks.push({ resumeIndex: ri, field, relPath, mimeType })
        }
      }
    }

    // 并行读取所有照片文件
    if (photoTasks.length > 0) {
      const photoDataUrls = await Promise.all(
        photoTasks.map(task => dir.readDataUrlFile(handle, task.relPath, task.mimeType)),
      )

      // 按简历分组注入照片数据
      const photoDataByResume = new Map<number, Map<string, string>>()
      for (let i = 0; i < photoTasks.length; i++) {
        const dataUrl = photoDataUrls[i]
        if (!dataUrl) continue
        const { resumeIndex, relPath } = photoTasks[i]
        if (!photoDataByResume.has(resumeIndex)) {
          photoDataByResume.set(resumeIndex, new Map())
        }
        photoDataByResume.get(resumeIndex)!.set(relPath, dataUrl)
      }

      for (const [ri, photoData] of photoDataByResume) {
        const restored = injectPhotos(resumes[ri] as unknown as Record<string, unknown>, photoData)
        Object.assign(resumes[ri], restored)
      }
    }

    return resumes
  }
  return idb.getAllResumes()
}

export async function saveResumeList(resumes: Resume[]): Promise<void> {
  if (isDirectoryMode()) {
    const handle = getHandle()
    const resumesDir = await dir.ensureDir(handle, 'resumes')
    await dir.ensureDir(handle, 'photos')

    // 差异删除：删除目录中存在但列表中不存在的文件
    const existingIds = await dir.listJsonFiles(resumesDir)
    const newIds = new Set(resumes.map(r => r.id))
    for (const id of existingIds) {
      if (!newIds.has(id)) {
        await dir.deleteFile(resumesDir, `${id}.json`)
        // 同时删除关联的照片文件（遍历匹配，兼容任意扩展名）
        await dir.deleteFilesByPrefix(handle, 'photos', `${id}.`)
        await dir.deleteFilesByPrefix(handle, 'photos', `${id}_original.`)
      }
    }

    // 逐个写入：提取照片为独立文件，JSON 中存储引用路径
    for (const resume of resumes) {
      const plain = toPlain(resume) as unknown as Record<string, unknown>
      const { resume: refResume, photos } = extractPhotos(plain, resume.id)

      // 写入照片文件
      for (const photo of photos) {
        await dir.writeDataUrlFile(handle, photo.relativePath, photo.dataUrl)
      }

      // 写入 JSON（含照片引用路径，不含 base64 数据）
      await dir.writeJsonFile(resumesDir, `${resume.id}.json`, refResume)
    }
  } else {
    return idb.saveResumeList(resumes)
  }
}

export async function deleteResume(id: string): Promise<void> {
  if (isDirectoryMode()) {
    const handle = getHandle()
    const resumesDir = await dir.ensureDir(handle, 'resumes')
    await dir.deleteFile(resumesDir, `${id}.json`)
    // 同时删除关联的照片文件（遍历匹配，兼容任意扩展名）
    await dir.deleteFilesByPrefix(handle, 'photos', `${id}.`)
    await dir.deleteFilesByPrefix(handle, 'photos', `${id}_original.`)
  } else {
    return idb.deleteResume(id)
  }
}

// ========== Meta 操作 ==========

export async function getCurrentId(): Promise<string | null> {
  if (isDirectoryMode()) {
    const meta = await dir.readJsonFile<Record<string, unknown>>(getHandle(), 'meta.json')
    return (meta?.currentId as string) ?? null
  }
  return idb.getCurrentId()
}

export async function setCurrentId(id: string | null): Promise<void> {
  if (isDirectoryMode()) {
    const meta = (await dir.readJsonFile<Record<string, unknown>>(getHandle(), 'meta.json')) ?? {}
    if (id) {
      meta.currentId = id
    } else {
      delete meta.currentId
    }
    await dir.writeJsonFile(getHandle(), 'meta.json', meta)
  } else {
    return idb.setCurrentId(id)
  }
}

// ========== AI 配置操作 ==========

export async function getAllAIConfigs(): Promise<AIServiceConfig[]> {
  if (isDirectoryMode()) {
    return dir.readAllJsonFiles<AIServiceConfig>(getHandle(), 'ai-configs')
  }
  return idb.getAllAIConfigs()
}

export async function saveAIConfig(config: AIServiceConfig): Promise<void> {
  if (isDirectoryMode()) {
    const configsDir = await dir.ensureDir(getHandle(), 'ai-configs')
    await dir.writeJsonFile(configsDir, `${config.id}.json`, toPlain(config))
  } else {
    return idb.saveAIConfig(config)
  }
}

export async function deleteAIConfig(id: string): Promise<void> {
  if (isDirectoryMode()) {
    const configsDir = await dir.ensureDir(getHandle(), 'ai-configs')
    await dir.deleteFile(configsDir, `${id}.json`)
  } else {
    return idb.deleteAIConfig(id)
  }
}

export async function getActiveAIConfigId(): Promise<string | null> {
  if (isDirectoryMode()) {
    const meta = await dir.readJsonFile<Record<string, unknown>>(getHandle(), 'meta.json')
    return (meta?.activeAIConfigId as string) ?? null
  }
  return idb.getActiveAIConfigId()
}

export async function setActiveAIConfigId(id: string | null): Promise<void> {
  if (isDirectoryMode()) {
    const meta = (await dir.readJsonFile<Record<string, unknown>>(getHandle(), 'meta.json')) ?? {}
    if (id) {
      meta.activeAIConfigId = id
    } else {
      delete meta.activeAIConfigId
    }
    await dir.writeJsonFile(getHandle(), 'meta.json', meta)
  } else {
    return idb.setActiveAIConfigId(id)
  }
}

// ========== 转发 IndexedDB 专用方法（目录模式不需要） ==========

/** localStorage 迁移（仅 IndexedDB 模式需要） */
export async function migrateFromLocalStorage(): Promise<boolean> {
  return idb.migrateFromLocalStorage()
}

/** 读取 meta 数据 */
export async function getMeta<T = unknown>(key: string): Promise<T | undefined> {
  return idb.getMeta<T>(key)
}

/** 写入 meta 数据 */
export async function setMeta(key: string, value: unknown): Promise<void> {
  return idb.setMeta(key, value)
}
