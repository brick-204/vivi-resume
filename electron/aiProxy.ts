/**
 * AI 代理服务 — 主进程内置动态 SSE 转发。
 *
 * 桌面端（dev + prod 统一）走本模块：渲染进程把 useProxy=true 的 AI 配置通过 IPC 注册进来，
 * 主进程按 configId 维护动态路由表，校验 endpoint 合法后转发。纯 Node stdlib，零额外依赖。
 *
 * 路由形式：/api/ai/dynamic/{configId}/... → 查表得 origin → origin + 剩余 path 转发上游。
 * 安全：target 来自主进程校验过的 origin（必须 HTTPS 公网），渲染端无法让代理请求任意地址。
 *
 * web 端不走本模块（dev 用 Vite sseProxy 写死路由，prod 直连无代理）。
 */
import http from 'node:http'
import https from 'node:https'
import type { IncomingMessage, ServerResponse } from 'node:http'

/** 动态代理前缀，渲染端请求改写到此形式 */
const DYNAMIC_PREFIX = '/api/ai/dynamic/'

/**
 * 动态路由表：configId → { origin }。
 * 内存态，不持久化——真相源是 aiConfigStore（已持久化），app 启动后由渲染进程重新注册。
 */
const dynamicRoutes = new Map<string, { origin: string }>()

/**
 * 校验代理 endpoint 是否合法：必须 HTTPS 公网地址。
 * 拒绝 localhost、127.0.0.1、内网网段（10./172.16-31./192.168.）、非 https。
 * 返回 origin（protocol://host[:port]）或抛错。
 */
function validateAndExtractOrigin(endpoint: string): string {
  let url: URL
  try {
    url = new URL(endpoint)
  } catch {
    throw new Error('地址格式无效')
  }
  if (url.protocol !== 'https:') {
    throw new Error('仅支持 HTTPS 地址')
  }
  // WHATWG URL 对 IPv6 hostname 保留方括号（如 [fd00::1]），剥后方括号统一判断
  const rawHost = url.hostname.toLowerCase()
  const host = rawHost.startsWith('[') && rawHost.endsWith(']') ? rawHost.slice(1, -1) : rawHost
  // 拒绝 localhost / 环回
  if (host === 'localhost' || host === '127.0.0.1' || host === '::1') {
    throw new Error('不支持本地地址')
  }
  // 拒绝任意地址绑定（0.0.0.0 / ::）及 IPv4 映射地址（::ffff:127.0.0.1 等可绕过上面的环回检查）
  if (host === '0.0.0.0' || host === '::' || host.startsWith('::ffff:')) {
    throw new Error('不支持本地地址')
  }
  // 拒绝内网 IPv4 网段
  if (/^10\./.test(host) || /^192\.168\./.test(host)) {
    throw new Error('不支持内网地址')
  }
  const m172 = /^172\.(\d+)\./.exec(host)
  if (m172 && Number(m172[1]) >= 16 && Number(m172[1]) <= 31) {
    throw new Error('不支持内网地址')
  }
  // 拒绝 IPv6 内网（fc00::/7 唯一本地地址）。URL.hostname 对 IPv6 已剥方括号，直接匹配前缀
  if (host.startsWith('fc') || host.startsWith('fd')) {
    throw new Error('不支持内网地址')
  }
  // 返回 origin（含端口，若有）
  return url.origin
}

/** 注册/更新动态路由。校验失败抛错（IPC 层捕获返回渲染端提示）。 */
export function registerProxy(id: string, endpoint: string): void {
  const origin = validateAndExtractOrigin(endpoint)
  dynamicRoutes.set(id, { origin })
}

/** 注销动态路由（配置删除/关闭代理时调用）。不存在则无操作。 */
export function unregisterProxy(id: string): void {
  dynamicRoutes.delete(id)
}

/** 清空全部动态路由（reloadFromStorage 全量重同步前调用）。 */
export function clearProxies(): void {
  dynamicRoutes.clear()
}

/**
 * 从请求路径解析 configId 并查表。
 * 路径形如 /api/ai/dynamic/{configId}/v1/chat/completions 或 /api/ai/dynamic/{configId}?...
 * 返回 { id, origin, restPath } 或 null（不匹配 / 非法）。
 */
function matchDynamic(pathname: string, fullUrl: string): { id: string; origin: string; restPath: string } | null {
  // fullUrl 含 query，用原始 url 取 configId（configId 不含 /，取前缀后到下一个 / 之前）
  const afterPrefix = fullUrl.slice(fullUrl.indexOf(DYNAMIC_PREFIX) + DYNAMIC_PREFIX.length)
  if (!afterPrefix) return null
  const slashIdx = afterPrefix.indexOf('/')
  // configId = 第一个 / 之前的部分；若无 / 则整段是 configId（restPath 为空）
  const id = slashIdx === -1 ? afterPrefix : afterPrefix.slice(0, slashIdx)
  if (!id) return null
  const route = dynamicRoutes.get(id)
  if (!route) return null
  const restPath = slashIdx === -1 ? '/' : afterPrefix.slice(slashIdx)
  return { id, origin: route.origin, restPath }
}

/** 转发请求到上游，流式回写响应 */
function proxyRequest(req: IncomingMessage, res: ServerResponse, origin: string, restPath: string): void {
  const url = new URL(origin)
  const isHttps = url.protocol === 'https:'
  const port = url.port || (isHttps ? 443 : 80)

  // 构造转发 headers：移除 host（避免上游校验失败）和 accept-encoding（避免 gzip，省去解压）
  const headers: Record<string, string | string[]> = {}
  for (const [key, val] of Object.entries(req.headers)) {
    if (val == null) continue
    const lower = key.toLowerCase()
    if (lower === 'host' || lower === 'accept-encoding') continue
    headers[key] = val
  }

  const upstreamReq = https.request(
    {
      protocol: url.protocol,
      hostname: url.hostname,
      port,
      method: req.method ?? 'GET',
      path: restPath,
      headers,
    },
    (upstreamRes) => {
      // 透传 status + 响应头，禁用缓冲以支持 SSE 流式。
      // 剔除上游的 access-control-allow-*，统一由代理控制（上游 CORS 头不可控，
      // 可能返回不匹配 app:// 的 origin 导致浏览器拦截 POST 响应）。
      const respHeaders: Record<string, string | string[]> = {}
      for (const [key, val] of Object.entries(upstreamRes.headers)) {
        if (val == null) continue
        const lower = key.toLowerCase()
        if (lower.startsWith('access-control-allow-')) continue
        respHeaders[key] = val
      }
      respHeaders['x-accel-buffering'] = 'no'
      // ponytail: 显式禁缓存——POST 响应通常不缓存，但显式声明避免某些中间层/边缘行为
      respHeaders['cache-control'] = 'no-store'
      res.writeHead(upstreamRes.statusCode ?? 502, respHeaders)
      // ponytail: pipe 足够，等价于 data->write + end->end，上游压缩已禁用无需 transform
      upstreamRes.pipe(res)
      // res 端写失败时销毁上游流，避免 socket/fd 泄漏（Node pipe 不会自动销毁源流）
      res.on('error', () => upstreamRes.destroy())
    },
  )

  // 客户端中途断开（取消 AI / 关窗口）时销毁上游连接，避免 socket 泄漏
  res.on('close', () => upstreamReq.destroy())
  // 上游超时兜底，防永久挂起（AI 流式单次请求 60s 上限足够）
  upstreamReq.setTimeout(60_000, () => upstreamReq.destroy(new Error('upstream_timeout')))

  upstreamReq.on('error', (err) => {
    if (!res.headersSent) {
      res.writeHead(502, { 'content-type': 'application/json; charset=utf-8' })
    }
    res.end(JSON.stringify({ error: 'upstream_connect_failed', message: err.message }))
  })

  // 客户端 body 流式转发到上游
  req.pipe(upstreamReq)
}

/** 启动 AI 代理，监听动态端口，返回实际端口 */
export function startAiProxy(): Promise<{ port: number }> {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      // CORS：渲染进程 origin 为 app://（prod）或 http://localhost:5173（dev server）。
      // 仅放行已知 origin，挡住同机恶意网页猜到动态端口后借用用户 API Key。
      // 注：浏览器请求必带 Origin，此校验对"网页"有效；对"同机原生进程"无效（不带 Origin）——
      // 主要防线是 127.0.0.1 绑定 + 动态端口随机，Origin 校验是补充。
      const origin = req.headers.origin ?? ''
      const allowed = origin.startsWith('app://') || /^http:\/\/localhost(:\d+)?$/.test(origin)
      if (origin && allowed) {
        res.setHeader('access-control-allow-origin', origin)
        res.setHeader('access-control-allow-credentials', 'true')
        res.setHeader('access-control-allow-headers', 'authorization, content-type')
        res.setHeader('access-control-allow-methods', 'POST, OPTIONS')
      }
      // 预检：非白名单 origin 直接拒，不返回 204 放行（纵深防御，真正防线仍是 127.0.0.1 绑定）
      if (req.method === 'OPTIONS') {
        if (origin && !allowed) {
          res.writeHead(403)
          res.end()
          return
        }
        res.writeHead(204)
        res.end()
        return
      }

      const fullUrl = req.url ?? ''
      // 仅处理动态前缀；非动态前缀一律 404
      if (!fullUrl.startsWith(DYNAMIC_PREFIX)) {
        res.writeHead(404, { 'content-type': 'application/json; charset=utf-8' })
        res.end(JSON.stringify({ error: 'no_route', message: `no proxy route for ${fullUrl.split('?')[0]}` }))
        return
      }
      const match = matchDynamic(fullUrl.split('?')[0], fullUrl)
      if (!match) {
        res.writeHead(404, { 'content-type': 'application/json; charset=utf-8' })
        res.end(JSON.stringify({ error: 'no_route', message: 'proxy route not registered or invalid' }))
        return
      }
      proxyRequest(req, res, match.origin, match.restPath)
    })

    server.on('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address()
      if (addr && typeof addr === 'object') {
        resolve({ port: addr.port })
      } else {
        reject(new Error('failed to bind proxy port'))
      }
    })
  })
}
