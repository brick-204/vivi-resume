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

// ========== 导出 IPC ==========
// 桌面端 PDF 导出：渲染进程把完整简历 HTML（含样式 + <base>）传主进程，主进程开隐藏窗口渲染后
// printToPDF 生成 PDF buffer，showSaveDialog 写盘。无需渲染进程传数据，主进程内完成。

export interface ExportPdfArgs {
  /** 完整 HTML 文档字符串（含内联样式与 <base href>） */
  html: string
  /** 默认文件名（含 .pdf） */
  defaultName: string
}
