/**
 * 统一文件保存：桌面端走主进程 showSaveDialog（用户选位置 + 完成回调可感知），
 * web 端走 <a download> 触发浏览器下载。
 *
 * 桌面端 Electron 默认把 blob 下载静默存进「下载」目录且无应用内反馈，故改走主进程
 * 保存对话框：用户选位置、完成后回调。blob → base64 经 IPC 传主进程写盘。
 */
import { isElectron } from '@/utils/runtime'

interface ElectronSaveApi {
  saveFile: (args: {
    defaultName: string
    filters: { name: string; extensions: string[] }[]
    content: string
    encoding: 'base64' | 'utf8'
  }) => Promise<{ saved: boolean; error?: string }>
}

function getSaveApi(): ElectronSaveApi {
  return (window as unknown as { electronAPI: ElectronSaveApi }).electronAPI
}

/** Blob → 纯 base64 字符串（不含 data: 前缀），经 FileReader 读 */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      resolve(dataUrl.slice(dataUrl.indexOf(',') + 1))
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

/**
 * 保存 Blob 为文件。
 * @returns 桌面端：用户在保存框取消返回 false；web 端：恒 true（浏览器下载无取消概念）
 */
export async function saveBlob(
  blob: Blob,
  filename: string,
  filters: { name: string; extensions: string[] }[],
): Promise<boolean> {
  if (isElectron) {
    const base64 = await blobToBase64(blob)
    const res = await getSaveApi().saveFile({ defaultName: filename, filters, content: base64, encoding: 'base64' })
    return res.saved
  }
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  setTimeout(() => URL.revokeObjectURL(url), 5000)
  return true
}
