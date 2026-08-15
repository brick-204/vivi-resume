/**
 * 目录模式 IPC 通道 payload 类型。
 * electron/ 与 src/ 的 tsconfig 隔离（无 paths 别名），此处本地定义，
 * 与渲染进程侧 directoryStorageElectron.ts 的调用参数保持结构一致（TS 结构类型自动兼容）。
 */

export interface EnsureDirArgs {
  root: string
  name: string
}

export interface ListJsonArgs {
  dir: string
}

export interface ReadJsonArgs {
  root: string
  path: string
}

export interface WriteJsonArgs {
  root: string
  path: string
  data: unknown
}

export interface ReadAllJsonArgs {
  root: string
  subdir: string
}

export interface DeleteFileArgs {
  dir: string
  fileName: string
}

export interface DeleteByPrefixArgs {
  root: string
  subdir: string
  prefix: string
}

export interface ReadDataUrlArgs {
  root: string
  path: string
  mimeType: string
}

export interface WriteDataUrlArgs {
  root: string
  path: string
  dataUrl: string
}

export interface ClearDirArgs {
  root: string
  subdir: string
}
