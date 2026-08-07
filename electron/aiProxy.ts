/**
 * AI 代理服务 — 主进程内置 SSE 转发。
 * 对应 vite.config.ts 的 sseProxy：把 /api/ai/{provider} 前缀请求转发到对应服务商，
 * 解决非 CORS 友好服务商在桌面端无法直调的问题。纯 Node stdlib，零额外依赖。
 */
import http from 'node:http'
import https from 'node:https'
import type { IncomingMessage, ServerResponse } from 'node:http'

/**
 * 路由表：前缀 -> 服务商 origin。
 * 注意：需与 vite.config.ts 的 server.proxy sseProxy 配置保持一致——新增/修改服务商时两处同步改。
 */
const ROUTES: ReadonlyArray<{ prefix: string; target: string }> = [
  { prefix: '/api/ai/openai', target: 'https://api.openai.com' },
  { prefix: '/api/ai/zhipu', target: 'https://open.bigmodel.cn' },
  { prefix: '/api/ai/qwen', target: 'https://dashscope.aliyuncs.com' },
  { prefix: '/api/ai/minimax', target: 'https://api.minimax.chat' },
  { prefix: '/api/ai/baichuan', target: 'https://api.baichuan-ai.com' },
  { prefix: '/api/ai/yi', target: 'https://api.lingyiwanwu.com' },
  { prefix: '/api/ai/xy', target: 'https://ai2.e-xy.com' },
]

/** 按前缀匹配路由（数组遍历，7 条无性能 concern） */
function matchRoute(pathname: string): { prefix: string; target: string } | null {
  for (const r of ROUTES) {
    if (pathname === r.prefix || pathname.startsWith(r.prefix + '/') || pathname.startsWith(r.prefix + '?')) {
      return r
    }
  }
  return null
}

/** 转发请求到上游，流式回写响应 */
function proxyRequest(req: IncomingMessage, res: ServerResponse, route: { prefix: string; target: string }): void {
  const url = new URL(route.target)
  // 剥前缀，保留剩余 path + query
  const stripped = req.url ?? ''
  const upstreamPath = stripped.replace(new RegExp(`^${route.prefix}`), '') || '/'
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
      path: upstreamPath,
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
      res.writeHead(upstreamRes.statusCode ?? 502, respHeaders)
      // ponytail: pipe 足够，等价于 data->write + end->end，上游压缩已禁用无需 transform
      upstreamRes.pipe(res)
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
      // CORS：渲染进程 origin 为 app://，跨协议到 http://127.0.0.1 必触发预检；
      // 放行所有响应头，OPTIONS 短路。代理绑定 127.0.0.1 且仅转发固定上游，放开 origin 可接受。
      res.setHeader('access-control-allow-origin', '*')
      res.setHeader('access-control-allow-headers', 'authorization, content-type')
      res.setHeader('access-control-allow-methods', 'POST, OPTIONS')
      if (req.method === 'OPTIONS') {
        res.writeHead(204)
        res.end()
        return
      }

      const pathname = (req.url ?? '').split('?')[0]
      const route = matchRoute(pathname)
      if (!route) {
        res.writeHead(404, { 'content-type': 'application/json; charset=utf-8' })
        res.end(JSON.stringify({ error: 'no_route', message: `no proxy route for ${pathname}` }))
        return
      }
      proxyRequest(req, res, route)
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
