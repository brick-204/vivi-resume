/**
 * Electron 预加载脚本 — contextBridge 隔离环境下向渲染进程暴露最小 API。
 * 暴露：aiProxyBase（主进程内置代理地址）、fs.*（目录模式 IPC）。
 *
 * proxyBase 注入链路：main.ts createWindow 把 proxyBase 拼 loadURL 的 query 参数，
 * preload 从 location.search 解析。sandbox:true 下 preload 无 process.env，URL query 是
 * sandbox 兼容的注入方式（contextBridge/location 均 sandbox 可用）。
 *
 * fs.* 是目录模式的细粒度 fs 原语，与 src/utils/directoryStorage.ts 的函数一一对应。
 * 主进程 Node fs 操作磁盘，渲染进程通过这些方法间接调用，handle 对象无法跨 contextBridge，
 * 故桌面端用「路径字符串 + IPC」替代 web 端的 FileSystemDirectoryHandle。
 * sandbox 下 ipcRenderer.invoke + contextBridge 完全可用，fs.* 不受影响。
 */
import { contextBridge, ipcRenderer } from 'electron'

// sandbox 下无 process.env，从 URL query 解析 proxyBase（main.ts createWindow 注入）
const params = new URLSearchParams(location.search)
const proxyBase = params.get('proxyBase') ?? ''

contextBridge.exposeInMainWorld('electronAPI', {
  aiProxyBase: proxyBase,
  fs: {
    pick: () => ipcRenderer.invoke('dir:pick'),
    rebind: (dirPath: string) => ipcRenderer.invoke('dir:rebind', dirPath),
    ensureDir: (args: { root: string; name: string }) => ipcRenderer.invoke('dir:ensureDir', args),
    listJson: (args: { dir: string }) => ipcRenderer.invoke('dir:listJson', args),
    readJson: (args: { root: string; path: string }) => ipcRenderer.invoke('dir:readJson', args),
    writeJson: (args: { root: string; path: string; data: unknown }) => ipcRenderer.invoke('dir:writeJson', args),
    readAllJson: (args: { root: string; subdir: string }) => ipcRenderer.invoke('dir:readAllJson', args),
    deleteFile: (args: { dir: string; fileName: string }) => ipcRenderer.invoke('dir:deleteFile', args),
    deleteByPrefix: (args: { root: string; subdir: string; prefix: string }) => ipcRenderer.invoke('dir:deleteByPrefix', args),
    readDataUrl: (args: { root: string; path: string; mimeType: string }) => ipcRenderer.invoke('dir:readDataUrl', args),
    writeDataUrl: (args: { root: string; path: string; dataUrl: string }) => ipcRenderer.invoke('dir:writeDataUrl', args),
    clearDir: (args: { root: string; subdir: string }) => ipcRenderer.invoke('dir:clearDir', args),
  },
})
