/**
 * Electron 预加载脚本 — contextBridge 隔离环境下向渲染进程暴露最小 API。
 * 阶段 1 只暴露 aiProxyBase（主进程内置代理地址）和 platform；目录 fs.* 阶段 2 再加。
 */
import { contextBridge } from 'electron'

/** 从当前页 query 解析主进程注入的 proxyBase */
function readProxyBase(): string | undefined {
  try {
    const params = new URLSearchParams(location.search)
    return params.get('proxyBase') ?? undefined
  } catch {
    return undefined
  }
}

const proxyBase = readProxyBase()

contextBridge.exposeInMainWorld('electronAPI', {
  aiProxyBase: proxyBase,
  platform: process.platform,
})
