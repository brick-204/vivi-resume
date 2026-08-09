/**
 * Electron 预加载脚本 — contextBridge 隔离环境下向渲染进程暴露最小 API。
 * 暴露：aiProxyBase（主进程内置代理地址）、ai.*（动态代理路由注册/注销）、fs.*（目录模式 IPC）。
 *
 * proxyBase 注入链路：main.ts 启动 AI 代理拿到动态端口后，通过 ipcMain.on('get-proxy-base')
 * 同步暴露；preload 用 sendSync 同步取回。曾用 URL query 注入，但 app:// 自定义协议下 query
 * 会破坏相对路径解析（./assets/*.js 解析失败），故改走 IPC。用 sendSync 而非 invoke：渲染层
 * aiService 同步读 aiProxyBase，invoke 异步拿不到静态值，sendSync 同步返回可直接赋值。
 * sandbox 下 ipcRenderer.sendSync + contextBridge 可用。
 *
 * fs.* 是目录模式的细粒度 fs 原语，与 src/utils/directoryStorage.ts 的函数一一对应。
 * 主进程 Node fs 操作磁盘，渲染进程通过这些方法间接调用，handle 对象无法跨 contextBridge，
 * 故桌面端用「路径字符串 + IPC」替代 web 端的 FileSystemDirectoryHandle。
 * sandbox 下 ipcRenderer.invoke + contextBridge 完全可用，fs.* 不受影响。
 */
import { contextBridge, ipcRenderer } from 'electron'

// 同步向主进程取 proxyBase（sendSync），赋值给静态 aiProxyBase 供渲染层同步读取
const proxyBase = ipcRenderer.sendSync('get-proxy-base') as string ?? ''

contextBridge.exposeInMainWorld('electronAPI', {
  aiProxyBase: proxyBase,
  ai: {
    registerProxy: (args: { id: string; endpoint: string }) =>
      ipcRenderer.invoke('ai:registerProxy', args) as Promise<{ ok: boolean; error?: string }>,
    unregisterProxy: (id: string) =>
      ipcRenderer.invoke('ai:unregisterProxy', id) as Promise<{ ok: boolean }>,
    clearProxies: () =>
      ipcRenderer.invoke('ai:clearProxies') as Promise<{ ok: boolean }>,
  },
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
