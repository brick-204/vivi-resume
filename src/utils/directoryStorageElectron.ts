/**
 * 桌面端目录存储模块 — 通过 IPC 调主进程 Node fs，与 web 端 directoryStorage.ts 对偶。
 *
 * 函数签名与 directoryStorage.ts 一一对应，handle 参数类型从 FileSystemDirectoryHandle
 * 改为 string（绑定目录绝对路径，不透明 token）。storageAdapter 的 ensureDir 返回子目录路径
 * 字符串，后续 writeJsonFile 收到该字符串当根再拼文件名，与 web 端 subHandle 语义对偶，调用代码零改动。
 *
 * 权限模型：桌面端主进程持路径即有 fs 权限，无 queryPermission/requestPermission 概念。
 * 但 settingsStore 的 init/bind/reauthorize 都调这两个函数，删除会破坏调用链，故保留空壳。
 * queryPermission/requestPermission 顺带调 fs.rebind 恢复主进程 boundRoot（app 重启后主进程状态丢失，需重新建立），
 * rebind 失败（绑定目录已被删除/移动）时返回 'denied'，让 init 走"权限丢失/重新绑定"分支而非进入无效目录模式。
 */

// electronAPI.fs 的最小类型声明（与 electron/preload.ts 暴露的方法结构一致）
interface ElectronFsApi {
  pick(): Promise<string | null>
  rebind(dirPath: string): Promise<boolean>
  ensureDir(args: { root: string; name: string }): Promise<string>
  listJson(args: { dir: string }): Promise<string[]>
  readJson(args: { root: string; path: string }): Promise<unknown | undefined>
  writeJson(args: { root: string; path: string; data: unknown }): Promise<void>
  readAllJson(args: { root: string; subdir: string }): Promise<unknown[]>
  deleteFile(args: { dir: string; fileName: string }): Promise<void>
  deleteByPrefix(args: { root: string; subdir: string; prefix: string }): Promise<void>
  readDataUrl(args: { root: string; path: string; mimeType: string }): Promise<string | undefined>
  writeDataUrl(args: { root: string; path: string; dataUrl: string }): Promise<void>
  clearDir(args: { root: string; subdir: string }): Promise<void>
}

function fsApi(): ElectronFsApi {
  return (window as unknown as { electronAPI: { fs: ElectronFsApi } }).electronAPI.fs
}

// ========== 浏览器支持检测 ==========

/** 桌面端恒支持目录模式（IPC 走主进程 fs，不依赖 File System Access API） */
export function isFileSystemAccessSupported(): boolean {
  return true
}

// ========== 目录选择与权限 ==========

/** 调主进程原生目录选择器，返回绝对路径；用户取消返回空字符串（由调用方判空） */
export async function pickDirectory(): Promise<string> {
  const p = await fsApi().pick()
  return p ?? ''
}

/**
 * 查询权限：调 rebind 恢复主进程 boundRoot，rebind 成功返回 granted，失败（目录已删/移动）返回 denied。
 * （app 重启后主进程 boundRoot 丢失，渲染进程 init 时调此隐式恢复，复用现有调用点不加 init 分支）。
 * ponytail: rebind 副作用藏在 queryPermission，比新增 init 分支省 20 行；失败返 denied 让 UI 走重绑定分支
 */
export async function queryPermission(handle: string): Promise<PermissionState> {
  const ok = await fsApi().rebind(handle)
  return ok ? 'granted' : 'denied'
}

/** 请求权限：同 queryPermission，调 rebind 恢复 boundRoot，失败返 denied（reauthorize 流程覆盖"目录已删"场景） */
export async function requestPermission(handle: string): Promise<PermissionState> {
  const ok = await fsApi().rebind(handle)
  return ok ? 'granted' : 'denied'
}

// ========== 子目录操作 ==========

/** 确保子目录存在，返回子目录绝对路径（web 端返回 subHandle，此处返回路径字符串，语义对偶） */
export async function ensureDir(parentPath: string, name: string): Promise<string> {
  return await fsApi().ensureDir({ root: parentPath, name })
}

/** 列出子目录中所有 .json 文件的主文件名（不含 .json 后缀） */
export async function listJsonFiles(dirPath: string): Promise<string[]> {
  return await fsApi().listJson({ dir: dirPath })
}

// ========== 文件读写 ==========

/** 从目录读取 JSON 文件，解析并返回；不存在或解析失败返回 undefined */
export async function readJsonFile<T>(rootPath: string, relPath: string): Promise<T | undefined> {
  const result = await fsApi().readJson({ root: rootPath, path: relPath })
  return result as T | undefined
}

/** 将数据以 JSON 格式原子写入目录中的文件（主进程 .tmp + rename） */
export async function writeJsonFile(rootPath: string, relPath: string, data: unknown): Promise<void> {
  await fsApi().writeJson({ root: rootPath, path: relPath, data })
}

/** 读取子目录中的所有 JSON 文件，返回解析后的对象数组 */
export async function readAllJsonFiles<T>(rootPath: string, subdir: string): Promise<T[]> {
  const results = await fsApi().readAllJson({ root: rootPath, subdir })
  return results as T[]
}

/** 删除子目录中的一个文件（不存在静默忽略） */
export async function deleteFile(dirPath: string, fileName: string): Promise<void> {
  await fsApi().deleteFile({ dir: dirPath, fileName })
}

// ========== 二进制文件读写（照片独立存储） ==========

/** 将 data URL 写入为二进制文件（主进程 Buffer.from(base64) + 原子写） */
export async function writeDataUrlFile(rootPath: string, relPath: string, dataUrl: string): Promise<void> {
  await fsApi().writeDataUrl({ root: rootPath, path: relPath, dataUrl })
}

/** 读取二进制文件并返回 data URL；mimeType 由调用方按扩展名传入（与 web 端约定一致） */
export async function readDataUrlFile(
  rootPath: string,
  relPath: string,
  mimeType: string = 'image/jpeg',
): Promise<string | undefined> {
  return await fsApi().readDataUrl({ root: rootPath, path: relPath, mimeType })
}

// ========== 文件删除 ==========

/** 删除子目录中所有以指定前缀开头的文件（前缀带点防 id 前缀误匹配，与 web 端约定一致） */
export async function deleteFilesByPrefix(rootPath: string, subdir: string, prefix: string): Promise<void> {
  await fsApi().deleteByPrefix({ root: rootPath, subdir, prefix })
}

/** 清空子目录下所有文件（仅文件，不递归删子目录），用于桌宠回收站清空 */
export async function clearDir(rootPath: string, subdir: string): Promise<void> {
  await fsApi().clearDir({ root: rootPath, subdir })
}
