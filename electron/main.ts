/**
 * Electron 主进程入口。
 * 职责：注册 app:// 协议加载 dist 产物、启动内置 AI 代理、创建主窗口、
 * 注册目录模式 IPC（主进程 Node fs 替代 web 端 File System Access API）。
 */
import { app, BrowserWindow, protocol, net, Menu, session, shell, ipcMain, dialog } from 'electron'
import path from 'node:path'
import { promises as fs } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { startAiProxy, registerProxy, unregisterProxy, clearProxies } from './aiProxy'
import type {
  EnsureDirArgs,
  ListJsonArgs,
  ReadJsonArgs,
  WriteJsonArgs,
  ReadAllJsonArgs,
  DeleteFileArgs,
  DeleteByPrefixArgs,
  ReadDataUrlArgs,
  WriteDataUrlArgs,
  ClearDirArgs,
} from './ipcTypes'

/** dist 产物目录（主进程编译后位于 dist-electron/，dist 在上一级） */
const DIST_ROOT = path.join(__dirname, '../dist')

/** 将 app:// 请求的 pathname 映射到 dist 目录文件，越界（路径穿越）返回 null */
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
        // 路径越界：返回 404，不暴露文件系统，也不回退 index.html（hash 路由无需 SPA history 回退）
        return new Response('Forbidden', { status: 403, headers: { 'content-type': 'text/plain' } })
      }
      filePath = resolved
    }
    return net.fetch(pathToFileURL(filePath).toString())
  })
}

// ========== 目录模式 IPC ==========
// 主进程 Node fs 替代 web 端 File System Access API。
// 渲染进程通过 electronAPI.fs.* 调用，主进程在此做实际磁盘 IO。

/**
 * 当前绑定目录绝对路径。仅 dir:pick / dir:rebind 写入，其他通道只读校验。
 * ponytail: 单一绑定根，多目录需 unbind+rebind。per-operation root 校验防越界。
 * app 重启后为 null，由渲染进程 init 时调 dir:rebind(path) 恢复（路径字符串持久化在 IndexedDB meta）。
 */
let boundRoot: string | null = null

/**
 * 用户曾通过 dir:pick 选过的路径白名单（持久化在 userData/dir-whitelist.json）。
 * dir:rebind 只接受白名单内路径——rebind 绕过原生选择器直接信任渲染进程传入的路径，
 * 若渲染进程被 XSS 攻陷，无白名单则可 rebind 任意目录后用 readDataUrl 读任意文件。
 * 白名单把"可绑定目录"收敛到"用户曾手动选过的路径"。
 */
const whitelistPath = () => path.join(app.getPath('userData'), 'dir-whitelist.json')
let pickedPaths: Set<string> = new Set()

async function loadWhitelist(): Promise<void> {
  try {
    const text = await fs.readFile(whitelistPath(), 'utf8')
    const arr = JSON.parse(text)
    if (Array.isArray(arr)) pickedPaths = new Set(arr.filter((x): x is string => typeof x === 'string'))
  } catch { /* 不存在或损坏，空集合起步 */ }
}

async function saveWhitelist(): Promise<void> {
  try {
    await atomicWrite(whitelistPath(), JSON.stringify([...pickedPaths], null, 2))
  } catch (e) {
    console.warn('[dirIpc] 持久化白名单失败:', e)
  }
}

/** 校验 root 是当前绑定目录，且 rel 解析后仍在 boundRoot 内（防路径穿越）。越界返回 null */
function safeResolve(root: string, rel: string): string | null {
  if (!boundRoot || root !== boundRoot) return null
  const abs = path.resolve(root, rel)
  if (abs !== root && !abs.startsWith(root + path.sep)) return null
  return abs
}

/**
 * 校验 root 在 boundRoot 内（root 可为 boundRoot 自身或其子目录），且 rel 解析后仍在 root 内。
 * 用于 writeJson/readJson/readDataUrl/writeDataUrl——这些通道收到 storageAdapter 传来的子目录路径作 root
 * （ensureDir 返回的子目录绝对路径），不能要求 root===boundRoot。越界返回 null。
 */
function safeResolveUnder(root: string, rel: string): string | null {
  if (!isUnderBound(root)) return null
  const abs = path.resolve(root, rel)
  if (abs !== root && !abs.startsWith(root + path.sep)) return null
  return abs
}

/** 校验 dir 路径在 boundRoot 内（用于 listJson/deleteFile 接收已解析的子目录绝对路径） */
function isUnderBound(dir: string): boolean {
  if (!boundRoot) return false
  return dir === boundRoot || dir.startsWith(boundRoot + path.sep)
}

/** 原子写：先写 .tmp 再 rename 覆盖（同目录 rename 原子，与 web 端 .tmp + move 对齐） */
async function atomicWrite(target: string, content: string | Buffer): Promise<void> {
  const tmp = target + '.tmp'
  try {
    await fs.writeFile(tmp, content)
    await fs.rename(tmp, target)
  } catch (e) {
    try { await fs.unlink(tmp) } catch { /* ignore */ }
    throw e
  }
}

/** data URL → Buffer（解析 base64，不用 Blob，Node 原生路径更快） */
function dataUrlToBuffer(dataUrl: string): Buffer {
  const commaIdx = dataUrl.indexOf(',')
  const base64 = commaIdx !== -1 ? dataUrl.slice(commaIdx + 1) : ''
  return Buffer.from(base64, 'base64')
}

/** 防御双重序列化：parse 结果仍是字符串则再 parse 一次（与 web 端 directoryStorage.ts 一致） */
function parseJsonDefensive(text: string): unknown {
  let parsed: unknown = JSON.parse(text)
  if (typeof parsed === 'string') {
    try { parsed = JSON.parse(parsed) } catch { /* 保持原值 */ }
  }
  return parsed
}

/** 注册目录模式 IPC handler，须在 app.whenReady 内、创建窗口前调用 */
function registerDirIpc(): void {
  // 选择目录：弹原生选择器，设置 boundRoot，返回绝对路径或 null（取消）
  ipcMain.handle('dir:pick', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      title: '选择简历数据存储目录',
    })
    if (result.canceled || result.filePaths.length === 0) return null
    const chosen = path.resolve(result.filePaths[0])
    boundRoot = chosen
    // 记入白名单：用户手动选过的路径才允许后续 rebind 恢复
    if (!pickedPaths.has(chosen)) {
      pickedPaths.add(chosen)
      await saveWhitelist()
    }
    return chosen
  })

  // 恢复绑定：app 重启后渲染进程从 IndexedDB 读回路径，调此恢复主进程 boundRoot
  // 校验：路径须在白名单内（用户曾 pick 选过）且仍存在是目录；否则返回 false，渲染进程提示重新绑定
  // 兼容兜底：白名单为空（旧版无白名单机制升级上来）时，路径真实存在且是目录则补录白名单并放行，
  // 避免旧版已绑定用户升级后卡在"权限丢失"。白名单非空时严格校验，保留对渲染进程被 XSS 后 rebind 任意目录的防护。
  ipcMain.handle('dir:rebind', async (_e, dirPath: string) => {
    const resolved = path.resolve(dirPath)
    try {
      const stat = await fs.stat(resolved)
      if (!stat.isDirectory()) return false
    } catch {
      return false
    }
    if (!pickedPaths.has(resolved)) {
      if (pickedPaths.size > 0) return false
      // 白名单为空：旧版升级场景，补录当前绑定路径
      pickedPaths.add(resolved)
      await saveWhitelist()
    }
    boundRoot = resolved
    return true
  })

  ipcMain.handle('dir:ensureDir', async (_e, { root, name }: EnsureDirArgs) => {
    const abs = safeResolve(root, name)
    if (!abs) throw new Error('path escape')
    await fs.mkdir(abs, { recursive: true })
    return abs
  })

  ipcMain.handle('dir:listJson', async (_e, { dir }: ListJsonArgs) => {
    if (!isUnderBound(dir)) throw new Error('path escape')
    const entries = await fs.readdir(dir)
    return entries.filter(n => n.endsWith('.json')).map(n => n.replace(/\.json$/, ''))
  })

  ipcMain.handle('dir:readJson', async (_e, { root, path: relPath }: ReadJsonArgs) => {
    const abs = safeResolveUnder(root, relPath)
    if (!abs) throw new Error('path escape')
    try {
      const text = await fs.readFile(abs, 'utf8')
      return parseJsonDefensive(text)
    } catch {
      return undefined
    }
  })

  ipcMain.handle('dir:writeJson', async (_e, { root, path: relPath, data }: WriteJsonArgs) => {
    const abs = safeResolveUnder(root, relPath)
    if (!abs) throw new Error('path escape')
    // data 已是 JSON 字符串时直接写，避免双重序列化（与 web 端 writeJsonFile 对齐）
    const content = typeof data === 'string' ? data : JSON.stringify(data, null, 2)
    await atomicWrite(abs, content)
  })

  ipcMain.handle('dir:readAllJson', async (_e, { root, subdir }: ReadAllJsonArgs) => {
    const dirAbs = safeResolve(root, subdir)
    if (!dirAbs) throw new Error('path escape')
    const results: unknown[] = []
    try {
      const entries = await fs.readdir(dirAbs)
      for (const name of entries) {
        if (!name.endsWith('.json')) continue
        try {
          const text = await fs.readFile(path.join(dirAbs, name), 'utf8')
          results.push(parseJsonDefensive(text))
        } catch {
          console.warn(`[dir:readAllJson] Failed to parse ${subdir}/${name}`)
        }
      }
    } catch {
      // 子目录不存在，返回空数组
    }
    return results
  })

  ipcMain.handle('dir:deleteFile', async (_e, { dir, fileName }: DeleteFileArgs) => {
    if (!isUnderBound(dir)) throw new Error('path escape')
    // fileName 不含路径分隔，但仍校验拼接后未越界
    const abs = path.resolve(dir, fileName)
    if (!isUnderBound(abs)) throw new Error('path escape')
    try { await fs.unlink(abs) } catch { /* 不存在，忽略 */ }
  })

  ipcMain.handle('dir:deleteByPrefix', async (_e, { root, subdir, prefix }: DeleteByPrefixArgs) => {
    const dirAbs = safeResolve(root, subdir)
    if (!dirAbs) throw new Error('path escape')
    try {
      const entries = await fs.readdir(dirAbs)
      // 前缀带点（如 `${id}.`）防 r1 误删 r10，与 web 端约定一致
      for (const name of entries) {
        if (name.startsWith(prefix)) {
          try { await fs.unlink(path.join(dirAbs, name)) } catch { /* 忽略单个失败 */ }
        }
      }
    } catch {
      // 目录不存在，忽略
    }
  })

  ipcMain.handle('dir:readDataUrl', async (_e, { root, path: relPath, mimeType }: ReadDataUrlArgs) => {
    const abs = safeResolveUnder(root, relPath)
    if (!abs) throw new Error('path escape')
    try {
      const buf = await fs.readFile(abs)
      return `data:${mimeType};base64,${buf.toString('base64')}`
    } catch {
      return undefined
    }
  })

  ipcMain.handle('dir:writeDataUrl', async (_e, { root, path: relPath, dataUrl }: WriteDataUrlArgs) => {
    const abs = safeResolveUnder(root, relPath)
    if (!abs) throw new Error('path escape')
    // 确保父目录存在（photos/ 等子目录可能尚未创建）
    await fs.mkdir(path.dirname(abs), { recursive: true })
    await atomicWrite(abs, dataUrlToBuffer(dataUrl))
  })

  // 清空子目录下所有文件（仅文件，不递归删子目录），用于桌宠回收站清空
  ipcMain.handle('dir:clearDir', async (_e, { root, subdir }: ClearDirArgs) => {
    const dirAbs = safeResolve(root, subdir)
    if (!dirAbs) throw new Error('path escape')
    try {
      const entries = await fs.readdir(dirAbs)
      for (const name of entries) {
        const abs = path.join(dirAbs, name)
        try {
          const stat = await fs.stat(abs)
          if (stat.isFile()) await fs.unlink(abs)
        } catch { /* 忽略单个失败 */ }
      }
    } catch {
      // 目录不存在，忽略
    }
  })
}


// 单实例锁：防止多开导致 IndexedDB/目录数据写冲突。第二个实例直接聚焦已有窗口并退出。
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    // 用户再次启动：聚焦已有窗口而非开新实例
    const wins = BrowserWindow.getAllWindows()
    if (wins[0]) {
      if (wins[0].isMinimized()) wins[0].restore()
      wins[0].focus()
    }
  })
}

// 把 app:// 声明为特权协议：standard（有标准 origin，localStorage/IndexedDB 可用）、
// secure（https 等价，storage API 不被拒）、supportFetchAPI（fetch 可用）、corsEnabled。
// 必须在 app.whenReady 之前调用，否则不生效——这是 app:// 下 localStorage Access is denied 的根因。
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } },
])

app.whenReady().then(async () => {
  // 去掉默认菜单栏：默认菜单含 View→Reload/Force Reload，会重载页面丢未保存的编辑数据。
  // 桌面应用按需自定义菜单，不用 Electron 默认那一套。
  Menu.setApplicationMenu(null)

  registerAppProtocol()
  // 加载目录白名单 + 注册目录模式 IPC（须在窗口加载页面前就位，避免渲染进程首次调用时 handler 未注册）
  await loadWhitelist()
  registerDirIpc()

  // CSP：仅 prod 注入（dev 模式注入会拦 Vite HMR 的 ws://localhost，开发态无威胁模型收益）。
  // app:// 本地资源为 self；AI 代理走 127.0.0.1 动态端口需放开 connect-src；
  // CORS 友好服务商直调 + endpointComplete 用户自配 endpoint 需放开 https。
  // script-src 收紧为 'self'（index.html 无内联脚本）；放行高德 JS API 域名（webapi.amap.com 主脚本 + 插件动态加载的子域）；
  // style-src 放开 unsafe-inline（Vue/Naive UI 内联样式）。
  // img-src/font-src 补 app: —— 自定义协议下 'self' 对 app:// 资源的判定不稳，显式 scheme 更可靠。
  if (!process.env.VITE_DEV_SERVER_URL) {
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      // 只对 app:// 主文档/资源注入；跳过 AI 代理(127.0.0.1)和外部 https 响应（给流式响应注入 CSP 是无意义噪声）
      if (!details.url.startsWith('app://')) {
        callback({})
        return
      }
      const csp = [
        "default-src 'self' app:",
        // app: 必补——'self' 对 app:// 脚本/样式的判定不稳，会拦掉 ./assets/* 导致加载失败。
        // unsafe-eval：高德 JS SDK 2.0 内部用 eval 动态执行插件代码，必须放行（web 端同理）。
        "script-src 'self' app: 'unsafe-eval' https://*.amap.com",
        "style-src 'self' 'unsafe-inline' app:",
        "img-src 'self' app: data: blob: https:",
        "font-src 'self' app: data:",
        // worker-src blob:：高德地图用 blob worker 渲染，未设则 fallback 到 script-src 拦截
        "worker-src 'self' blob:",
        "connect-src 'self' http://127.0.0.1:* https:",
        "frame-ancestors 'none'",
      ].join('; ')
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': [csp],
        },
      })
    })
  }

  // 启动内置 AI 代理，拿动态端口注入渲染进程。
  // 失败时降级：不阻塞窗口创建，AI 功能会失败但 UI 仍可用。
  let proxyBase = ''
  try {
    const { port } = await startAiProxy()
    proxyBase = `http://127.0.0.1:${port}`
  } catch (e) {
    console.error('[main] startAiProxy failed, AI proxy unavailable:', e)
  }

  // proxyBase 通过同步 IPC 暴露给 preload（sendSync）。用同步而非 invoke：
  // preload 需在 contextBridge 暴露静态 aiProxyBase（渲染层 aiService 同步读取），
  // invoke 是异步的拿不到静态值；sendSync 同步返回，preload 可直接赋值。
  // 不走 URL query 是因 app:// 自定义协议下 query 会破坏相对路径解析。
  ipcMain.on('get-proxy-base', (e) => { e.returnValue = proxyBase })

  // 动态代理路由注册：渲染进程把 useProxy=true 的 AI 配置报给主进程，主进程校验 endpoint 后加入路由表。
  // 校验失败（非 HTTPS / 内网地址）返回 {ok:false, error} 供渲染端提示用户。
  // target 由主进程校验掌控，渲染端无法让代理请求任意地址（防 SSRF）。
  ipcMain.handle('ai:registerProxy', async (_e, args: { id: string; endpoint: string }) => {
    try {
      registerProxy(args.id, args.endpoint)
      return { ok: true }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : '注册失败' }
    }
  })
  ipcMain.handle('ai:unregisterProxy', async (_e, id: string) => {
    unregisterProxy(id)
    return { ok: true }
  })
  // 清空全部动态路由（目录模式切换 reloadFromStorage 前全量重同步用）
  ipcMain.handle('ai:clearProxies', async () => {
    clearProxies()
    return { ok: true }
  })

  await createWindow()
}).catch((e) => {
  console.error('[main] startup failed:', e)
})

/**
 * 创建主窗口。proxyBase 由 preload 通过 IPC（get-proxy-base）向主进程取，不经 URL query。
 * app 级配置（协议/CSP/IPC）不在此函数内。
 */
async function createWindow(): Promise<BrowserWindow> {
  const win = new BrowserWindow({
    title: 'Vivi Resume',
    width: 1280,
    height: 800,
    // show:false + 启动后 maximize+show：避免先闪小窗口再最大化的视觉跳动
    show: false,
    // 任务栏/标题栏图标。vite build 把 public/favicon.ico 复制进 dist/，打包后从此处取。
    // dev 模式下 dist 可能不存在，icon 找不到会静默降级默认图标，不影响功能。
    icon: path.join(__dirname, '../dist/favicon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      // sandbox:true —— 收紧 preload 能力（无 process/node），仅留 ipcRenderer/contextBridge。
      // proxyBase 改走 URL query 注入（sandbox 下 process.env 不可用），见 loadURL。
      sandbox: true,
    },
  })

  // 默认最大化启动（保留标题栏/任务栏，可手动还原）
  win.maximize()
  win.show()

  // 外链（target=_blank / window.open）走系统浏览器，不在 Electron 开新窗口（新窗口无 preload/安全配置）。
  // 仅放行 http(s)，防 javascript:/file: 等协议被 openExternal 执行。
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) shell.openExternal(url)
    return { action: 'deny' }
  })
  // 防页面内导航到外部 URL（保留应用内 hash 路由，hash 变化不触发 will-navigate）
  win.webContents.on('will-navigate', (e, url) => {
    const isDev = !!process.env.VITE_DEV_SERVER_URL
    // dev 允许 localhost 导航（Vite），prod 仅允许 app://
    if (isDev ? url.startsWith('http://localhost') : url.startsWith('app://')) return
    e.preventDefault()
  })

  const devServerUrl = process.env.VITE_DEV_SERVER_URL
  // proxyBase 不再拼 URL query——app:// 自定义协议下 query 会破坏相对路径解析，
  // 导致 ./assets/*.js 解析成 app://index.html?query/assets/*.js 加载失败。
  // 改由 preload 通过 IPC（get-proxy-base）向主进程取。
  if (devServerUrl) {
    await win.loadURL(devServerUrl).catch((e) => console.error('[main] load dev URL failed:', e))
  } else {
    await win.loadURL('app://index.html').catch((e) => {
      console.error('[main] load app:// failed:', e)
      win.loadURL('data:text/html;charset=utf-8,<h1>加载失败</h1><p>请重新安装应用</p>')
    })
  }

  // 桌面端隐藏所有滚动条（保留滚动能力）。web 端不跑 main.ts，滚动条照常显示。
  // 用 webContents.insertCSS 而非 preload 操作 DOM——sandbox 模式下 preload 访问 documentElement 不可靠。
  // !important 盖过各组件 @include scrollbar 的 width 规则。
  win.webContents.insertCSS(
    '::-webkit-scrollbar { display: none !important; }'
  ).catch((e) => console.warn('[main] insertCSS failed:', e))

  // F12 开关 DevTools。默认菜单已删（accelerator 跟着没了），手动补。
  // ponytail: 用 before-input-event 页面级拦截而非 globalShortcut——只 app 聚焦时生效，
  //           不抢占系统快捷键、不与其他程序 F12 冲突。仅 dev 生效。
  if (devServerUrl) {
    win.webContents.on('before-input-event', (e, input) => {
      if (input.key === 'F12') {
        win.webContents.toggleDevTools()
        e.preventDefault()
      }
    })
  }
  return win
}

// macOS：关掉所有窗口后 app 不退出（见下方 window-all-closed），dock 点击/重开需重建窗口。
// 无此 handler 则关窗后 app 残留无界面，只能强杀进程。
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    // 重建时 proxyBase 由 preload 经 IPC 自取（get-proxy-base handler 仍注册着，返回上次启动的值）；
    // 若代理进程已退出则 aiService 会降级，这里不再重启代理（重建窗口是低频路径，保持简单）。
    createWindow()
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
