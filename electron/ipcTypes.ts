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
// 桌面端导出文件（图片/JSON/DOCX）走主进程 showSaveDialog，渲染进程把内容以 base64 或
// utf8 字符串形式传来，主进程写盘。content 类型由 encoding 决定，避免双重序列化。

export interface SaveFileArgs {
  /** 保存对话框默认文件名（含扩展名） */
  defaultName: string
  /** 文件类型过滤器，如 [{ name: 'PNG', extensions: ['png'] }] */
  filters: { name: string; extensions: string[] }[]
  /** 文件内容：base64 字符串（encoding='base64'）或 utf8 文本（encoding='utf8'） */
  content: string
  encoding: 'base64' | 'utf8'
}

export interface SaveFileResult {
  /** 用户取消或写入失败时为 false */
  saved: boolean
  error?: string
}

// PDF 导出：渲染进程把完整简历 HTML（含样式 + <base>）传主进程，主进程开隐藏窗口渲染后
// printToPDF 生成 PDF buffer，showSaveDialog 写盘。无需渲染进程传数据，主进程内完成。

export interface ExportPdfArgs {
  /** 完整 HTML 文档字符串（含内联样式与 <base href>） */
  html: string
  /** 默认文件名（含 .pdf） */
  defaultName: string
}
