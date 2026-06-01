/**
 * IndexedDB 存储适配器
 * 替代 localStorage，突破 5MB 容量限制，照片存储为 Blob 节省 ~33% 空间
 *
 * 存储边界策略：内存中 Resume 对象仍使用 Base64 字符串（兼容现有组件），
 * 仅在写入 IndexedDB 时转为 Blob，读取时转回 Base64。
 */

import { openDB, type IDBPDatabase } from 'idb'
import type { Resume, BasicInfo } from '@/types/resume'

const DB_NAME = 'vivi-resume-db'
const DB_VERSION = 1
const RESUMES_STORE = 'resumes'
const META_STORE = 'meta'

// localStorage 旧 key（用于迁移检测）
const LEGACY_LIST_KEY = 'vivi-resume-list'
const LEGACY_CURRENT_KEY = 'vivi-resume-current'

// IndexedDB 中的存储格式：photo/photoOriginal 为 Blob
interface StoredBasicInfo extends Omit<BasicInfo, 'photo' | 'photoOriginal'> {
  photo: Blob | string
  photoOriginal: Blob | string
}

interface StoredResume extends Omit<Resume, 'basicInfo'> {
  basicInfo: StoredBasicInfo
}

let dbInstance: IDBPDatabase | null = null

async function getDB(): Promise<IDBPDatabase> {
  if (dbInstance) return dbInstance

  dbInstance = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(RESUMES_STORE)) {
        db.createObjectStore(RESUMES_STORE, { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE, { keyPath: 'key' })
      }
    },
  })

  return dbInstance
}

// ========== Base64 ↔ Blob 转换 ==========

/** Base64 data URL → Blob（同步，无需 FileReader）
 *  非 data: URL（如 Vite 静态资源路径）不转换，原样返回字符串 */
export function base64ToBlob(dataUrl: string): Blob | string {
  if (!dataUrl.startsWith('data:')) return dataUrl  // 保留原始 URL，不做 Blob 转换
  const [header, data] = dataUrl.split(',')
  const mimeMatch = header.match(/:(.*?);/)
  const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg'
  const binary = atob(data)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return new Blob([bytes], { type: mime })
}

/** Blob → Base64 data URL（异步，使用 FileReader） */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Failed to convert Blob to Base64'))
    reader.readAsDataURL(blob)
  })
}

// ========== Vue Proxy 剥离 ==========
// Vue 3 的 reactive/ref 会给对象附加 Proxy，IndexedDB 的 structured clone
// 无法克隆 Proxy 上的内部属性（__v_skip、__v_raw 等），必须先转为普通对象。

/** 递归剥离 Vue Proxy，返回可被 structured clone 的纯对象 */
function toPlain<T>(value: T): T {
  return JSON.parse(JSON.stringify(value))
}

// ========== Resume ↔ StoredResume 转换 ==========

async function storedToResume(stored: StoredResume): Promise<Resume> {
  const photo = stored.basicInfo.photo instanceof Blob
    ? await blobToBase64(stored.basicInfo.photo)
    : stored.basicInfo.photo as string
  const photoOriginal = stored.basicInfo.photoOriginal instanceof Blob
    ? await blobToBase64(stored.basicInfo.photoOriginal)
    : stored.basicInfo.photoOriginal as string

  return {
    ...stored,
    basicInfo: {
      ...stored.basicInfo,
      photo,
      photoOriginal,
    },
  } as Resume
}

function resumeToStored(resume: Resume): StoredResume {
  // 先剥离 Vue Proxy，再转换 photo 字段
  const plain = toPlain(resume)
  const photo = plain.basicInfo.photo ? base64ToBlob(plain.basicInfo.photo) : ''
  const photoOriginal = plain.basicInfo.photoOriginal ? base64ToBlob(plain.basicInfo.photoOriginal) : ''

  return {
    ...plain,
    basicInfo: {
      ...plain.basicInfo,
      photo,
      photoOriginal,
    },
  } as StoredResume
}

// ========== 迁移：localStorage → IndexedDB ==========

/**
 * 检测 localStorage 旧数据并迁移到 IndexedDB
 * - 逐条转换 photo Base64 → Blob 写入 IndexedDB
 * - 成功后删除 localStorage 旧数据
 * - 幂等：如果 IndexedDB 已有数据则跳过
 */
export async function migrateFromLocalStorage(): Promise<boolean> {
  const saved = localStorage.getItem(LEGACY_LIST_KEY)
  if (!saved) return false // 无旧数据，无需迁移

  try {
    const db = await getDB()
    const list: Resume[] = JSON.parse(saved)

    const tx = db.transaction(RESUMES_STORE, 'readwrite')
    for (const resume of list) {
      // 检查是否已存在（防止重复迁移）
      const existing = await tx.store.get(resume.id)
      if (existing) continue

      const stored = resumeToStored(resume)
      await tx.store.put(stored)
    }
    await tx.done

    // 迁移 currentId
    const currentJson = localStorage.getItem(LEGACY_CURRENT_KEY)
    if (currentJson) {
      try {
        const currentResume: Resume = JSON.parse(currentJson)
        await db.put(META_STORE, { key: 'currentId', value: currentResume.id })
      } catch {
        // currentResume JSON 解析失败，忽略
      }
    }

    // 迁移成功，删除旧数据
    localStorage.removeItem(LEGACY_LIST_KEY)
    localStorage.removeItem(LEGACY_CURRENT_KEY)

    console.log('[storage] 已从 localStorage 迁移到 IndexedDB')
    return true
  } catch (e) {
    console.error('[storage] 迁移失败:', e)
    return false
  }
}

// ========== CRUD 操作 ==========

/** 获取所有简历（Blob → Base64） */
export async function getAllResumes(): Promise<Resume[]> {
  const db = await getDB()
  const stored = await db.getAll(RESUMES_STORE) as StoredResume[]
  const resumes: Resume[] = []
  for (const sr of stored) {
    resumes.push(await storedToResume(sr))
  }
  return resumes
}

/** 获取单个简历（Blob → Base64） */
export async function getResume(id: string): Promise<Resume | undefined> {
  const db = await getDB()
  const stored = await db.get(RESUMES_STORE, id) as StoredResume | undefined
  if (!stored) return undefined
  return storedToResume(stored)
}

/** 批量保存简历列表（差异写入：upert + 删除已移除的） */
export async function saveResumeList(resumes: Resume[]): Promise<void> {
  const db = await getDB()
  const tx = db.transaction(RESUMES_STORE, 'readwrite')
  // 找出需要删除的旧简历
  const existingKeys = await tx.store.getAllKeys()
  const newIds = new Set(resumes.map(r => r.id))
  for (const key of existingKeys) {
    if (!newIds.has(key as string)) {
      await tx.store.delete(key as IDBValidKey)
    }
  }
  // 写入所有简历（IDB 对同 key 自动原地更新）
  for (const resume of resumes) {
    await tx.store.put(resumeToStored(resume))
  }
  await tx.done
}

/** 删除简历 */
export async function deleteResume(id: string): Promise<void> {
  const db = await getDB()
  await db.delete(RESUMES_STORE, id)
}

/** 获取当前编辑的简历 ID */
export async function getCurrentId(): Promise<string | null> {
  const db = await getDB()
  const record = await db.get(META_STORE, 'currentId')
  return record?.value ?? null
}

/** 设置当前编辑的简历 ID */
export async function setCurrentId(id: string | null): Promise<void> {
  const db = await getDB()
  if (id) {
    await db.put(META_STORE, { key: 'currentId', value: id })
  } else {
    await db.delete(META_STORE, 'currentId')
  }
}
