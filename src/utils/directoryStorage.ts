/**
 * 本地目录存储模块
 * 基于 File System Access API，将简历数据以 JSON 文件形式存储在用户指定的本地目录中
 *
 * 目录结构约定：
 * {bound-dir}/
 *   resumes/{id}.json       — 每份简历一个 JSON 文件
 *   ai-configs/{id}.json    — 每个 AI 配置一个 JSON 文件
 *   meta.json               — { currentId, activeAIConfigId }
 *
 * 注意：
 * - File System Access API 仅在 Chrome/Edge 等 Chromium 浏览器中可用
 * - 目录句柄（FileSystemDirectoryHandle）可存入 IndexedDB（structured-cloneable）
 * - 权限需在用户手势下获取（requestPermission），刷新后需重新检查/请求
 */

// ========== File System Access API 类型扩展 ==========

interface ShowDirectoryPickerOptions {
  mode?: 'read' | 'readwrite'
}

interface FileSystemDirectoryHandleWithPermission extends FileSystemDirectoryHandle {
  queryPermission(descriptor: { mode: 'read' | 'readwrite' }): Promise<PermissionState>
  requestPermission(descriptor: { mode: 'read' | 'readwrite' }): Promise<PermissionState>
  values(): AsyncIterableIterator<FileSystemHandle>
}

declare global {
  interface Window {
    showDirectoryPicker(options?: ShowDirectoryPickerOptions): Promise<FileSystemDirectoryHandle>
  }
}

// ========== 浏览器支持检测 ==========

/** 检测浏览器是否支持 File System Access API */
export function isFileSystemAccessSupported(): boolean {
  return typeof window !== 'undefined'
    && typeof window.showDirectoryPicker === 'function'
}

// ========== 目录选择与权限 ==========

/** 弹出目录选择器，返回用户选择的目录句柄 */
export async function pickDirectory(): Promise<FileSystemDirectoryHandle> {
  return await window.showDirectoryPicker({ mode: 'readwrite' })
}

/** 查询目录的读写权限状态（不触发浏览器弹窗） */
export async function queryPermission(
  handle: FileSystemDirectoryHandle,
): Promise<PermissionState> {
  return await (handle as FileSystemDirectoryHandleWithPermission).queryPermission({ mode: 'readwrite' })
}

/** 请求目录的读写权限（触发浏览器弹窗，需在用户手势下调用） */
export async function requestPermission(
  handle: FileSystemDirectoryHandle,
): Promise<PermissionState> {
  return await (handle as FileSystemDirectoryHandleWithPermission).requestPermission({ mode: 'readwrite' })
}

// ========== 子目录操作 ==========

/** 确保子目录存在，返回其句柄（不存在则创建） */
export async function ensureDir(
  parentHandle: FileSystemDirectoryHandle,
  name: string,
): Promise<FileSystemDirectoryHandle> {
  return await parentHandle.getDirectoryHandle(name, { create: true })
}

/** 列出子目录中所有 .json 文件的主文件名（不含 .json 后缀） */
export async function listJsonFiles(
  dirHandle: FileSystemDirectoryHandle,
): Promise<string[]> {
  const ids: string[] = []
  for await (const entry of (dirHandle as FileSystemDirectoryHandleWithPermission).values()) {
    if (entry.kind === 'file' && entry.name.endsWith('.json')) {
      ids.push(entry.name.replace(/\.json$/, ''))
    }
  }
  return ids
}

// ========== 文件读写 ==========

/** 从目录中读取 JSON 文件，解析并返回 */
export async function readJsonFile<T>(
  rootHandle: FileSystemDirectoryHandle,
  path: string,
): Promise<T | undefined> {
  try {
    const parts = path.split('/')
    let handle: FileSystemDirectoryHandle | FileSystemFileHandle = rootHandle

    // 逐级遍历路径（除最后一级是文件）
    for (let i = 0; i < parts.length - 1; i++) {
      handle = await (handle as FileSystemDirectoryHandle).getDirectoryHandle(parts[i])
    }

    const fileHandle = await (handle as FileSystemDirectoryHandle).getFileHandle(parts[parts.length - 1])
    const file = await fileHandle.getFile()
    const text = await file.text()
    let parsed: unknown = JSON.parse(text)
    // 防御双重序列化：如果 parse 结果仍是字符串，再 parse 一次
    if (typeof parsed === 'string') {
      try { parsed = JSON.parse(parsed) } catch { /* 保持原值 */ }
    }
    return parsed as T
  } catch {
    return undefined
  }
}

/** 将数据以 JSON 格式写入目录中的文件 */
export async function writeJsonFile(
  rootHandle: FileSystemDirectoryHandle,
  path: string,
  data: unknown,
): Promise<void> {
  const parts = path.split('/')
  let dirHandle = rootHandle

  // 逐级创建/进入子目录（除最后一级是文件）
  for (let i = 0; i < parts.length - 1; i++) {
    dirHandle = await dirHandle.getDirectoryHandle(parts[i], { create: true })
  }

  const fileName = parts[parts.length - 1]
  const fileHandle = await dirHandle.getFileHandle(fileName, { create: true })
  const writable = await fileHandle.createWritable()
  try {
    // 如果 data 已经是 JSON 字符串则直接写入，否则序列化
    const content = typeof data === 'string' ? data : JSON.stringify(data, null, 2)
    await writable.write(content)
  } finally {
    await writable.close()
  }
}

/** 读取子目录中的所有 JSON 文件，返回解析后的对象数组 */
export async function readAllJsonFiles<T>(
  rootHandle: FileSystemDirectoryHandle,
  subdir: string,
): Promise<T[]> {
  const results: T[] = []
  try {
    const dirHandle = await rootHandle.getDirectoryHandle(subdir)
    for await (const entry of (dirHandle as FileSystemDirectoryHandleWithPermission).values()) {
      if (entry.kind === 'file' && entry.name.endsWith('.json')) {
        try {
          const fileHandle = entry as FileSystemFileHandle
          const file = await fileHandle.getFile()
          const text = await file.text()
          let parsed: unknown = JSON.parse(text)
          // 防御双重序列化：如果 parse 结果仍是字符串，再 parse 一次
          if (typeof parsed === 'string') {
            try { parsed = JSON.parse(parsed) } catch { /* 保持原值 */ }
          }
          results.push(parsed as T)
        } catch {
          // 单个文件解析失败，跳过
          console.warn(`[directoryStorage] Failed to parse ${subdir}/${entry.name}`)
        }
      }
    }
  } catch {
    // 子目录不存在，返回空数组
  }
  return results
}

/** 删除子目录中的一个文件 */
export async function deleteFile(
  dirHandle: FileSystemDirectoryHandle,
  fileName: string,
): Promise<void> {
  try {
    await dirHandle.removeEntry(fileName)
  } catch {
    // 文件不存在，忽略
  }
}

// ========== 二进制文件读写（照片独立存储） ==========

/** ArrayBuffer → base64 字符串（分块处理，避免大数组逐字节拼接的 GC 压力） */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  const chunkSize = 8192
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.byteLength))
    binary += String.fromCharCode(...chunk)
  }
  return btoa(binary)
}

/** 将 data URL 写入为二进制文件（直接解析 base64，避免 fetch 开销） */
export async function writeDataUrlFile(
  rootHandle: FileSystemDirectoryHandle,
  path: string,
  dataUrl: string,
): Promise<void> {
  const parts = path.split('/')
  let dirHandle = rootHandle

  for (let i = 0; i < parts.length - 1; i++) {
    dirHandle = await dirHandle.getDirectoryHandle(parts[i], { create: true })
  }

  const fileName = parts[parts.length - 1]
  const fileHandle = await dirHandle.getFileHandle(fileName, { create: true })
  const writable = await fileHandle.createWritable()

  try {
    // data URL → 手动解析 base64 → Uint8Array → Blob → 写入
    const commaIdx = dataUrl.indexOf(',')
    const base64 = commaIdx !== -1 ? dataUrl.slice(commaIdx + 1) : ''
    const byteString = atob(base64)
    const bytes = new Uint8Array(byteString.length)
    for (let i = 0; i < byteString.length; i++) {
      bytes[i] = byteString.charCodeAt(i)
    }
    // 从 data URL 提取 MIME 类型
    const mimeMatch = dataUrl.match(/^data:([^;]+);/)
    const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg'
    const blob = new Blob([bytes], { type: mimeType })
    await writable.write(blob)
  } finally {
    await writable.close()
  }
}

/** 读取二进制文件并返回 data URL */
export async function readDataUrlFile(
  rootHandle: FileSystemDirectoryHandle,
  path: string,
  mimeType: string = 'image/jpeg',
): Promise<string | undefined> {
  try {
    const parts = path.split('/')
    let handle: FileSystemDirectoryHandle | FileSystemFileHandle = rootHandle

    for (let i = 0; i < parts.length - 1; i++) {
      handle = await (handle as FileSystemDirectoryHandle).getDirectoryHandle(parts[i])
    }

    const fileHandle = await (handle as FileSystemDirectoryHandle).getFileHandle(parts[parts.length - 1])
    const file = await fileHandle.getFile()
    const buffer = await file.arrayBuffer()
    const base64 = arrayBufferToBase64(buffer)
    return `data:${mimeType};base64,${base64}`
  } catch {
    return undefined
  }
}

/**
 * 删除目录中所有以指定前缀开头的文件
 * 替代硬编码扩展名（.jpg/.png/.webp…）的逐一尝试
 */
export async function deleteFilesByPrefix(
  rootHandle: FileSystemDirectoryHandle,
  subdir: string,
  prefix: string,
): Promise<void> {
  try {
    const dirHandle = await rootHandle.getDirectoryHandle(subdir)
    for await (const entry of (dirHandle as FileSystemDirectoryHandleWithPermission).values()) {
      if (entry.kind === 'file' && entry.name.startsWith(prefix)) {
        try { await dirHandle.removeEntry(entry.name) } catch { /* ignore */ }
      }
    }
  } catch {
    // 目录不存在，忽略
  }
}
