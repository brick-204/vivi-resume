/**
 * Electron 主进程入口。
 * 职责：注册 app:// 协议加载 dist 产物、启动内置 AI 代理、创建主窗口。
 * 目录模式（File System Access API 替代）属阶段 2，本阶段不实现。
 */
import { app, BrowserWindow, protocol, net } from 'electron'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { startAiProxy } from './aiProxy'

/** dist 产物目录（主进程编译后位于 dist-electron/，dist 在上一级） */
const DIST_ROOT = path.join(__dirname, '../dist')

/** 将 app:// 请求映射到 dist 目录文件，找不到或越界则回退 index.html（SPA history 模式） */
function resolveDistFile(pathname: string): string | null {
  const rel = decodeURIComponent(pathname.replace(/^\/+/, ''))
  // 路径穿越防护：path.join 会解析 ..，需校验解析后仍在 dist 目录内
  const candidate = path.resolve(DIST_ROOT, rel)
  if (candidate !== DIST_ROOT && !candidate.startsWith(DIST_ROOT + path.sep)) {
    return null
  }
  return candidate
}

/** 注册 app:// 自定义协议，加载本地 dist 产物（避免 file:// 下 fetch CSS 受限） */
function registerAppProtocol(): void {
  protocol.handle('app', async (request) => {
    const url = new URL(request.url)
    let filePath: string
    if (!url.pathname || url.pathname === '/' || url.pathname === '/index.html') {
      filePath = path.join(DIST_ROOT, 'index.html')
    } else {
      const resolved = resolveDistFile(url.pathname)
      if (!resolved) {
        // 越界路径回退 index.html，不暴露文件系统
        filePath = path.join(DIST_ROOT, 'index.html')
      } else {
        filePath = resolved
      }
    }
    return net.fetch(pathToFileURL(filePath).toString())
  })
}

app.whenReady().then(async () => {
  registerAppProtocol()

  // 启动内置 AI 代理，拿动态端口注入渲染进程。
  // 失败时降级：不阻塞窗口创建，AI 功能会失败但 UI 仍可用。
  let proxyBase = ''
  try {
    const { port } = await startAiProxy()
    proxyBase = `http://127.0.0.1:${port}`
  } catch (e) {
    console.error('[main] startAiProxy failed, AI proxy unavailable:', e)
  }

  const win = new BrowserWindow({
    title: 'Vivi Resume',
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      // sandbox:false —— preload 用 ipcRenderer/contextBridge，sandbox 限制多，先稳妥关
      sandbox: false,
    },
  })

  const devServerUrl = process.env.VITE_DEV_SERVER_URL
  if (devServerUrl) {
    await win.loadURL(devServerUrl)
  } else {
    await win.loadURL(`app://index.html?proxyBase=${encodeURIComponent(proxyBase)}`)
  }
}).catch((e) => {
  console.error('[main] startup failed:', e)
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
