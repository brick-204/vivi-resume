/**
 * 导出工具函数
 */

import { formatTimestamp } from '@/utils/timestamp'

/**
 * 将 JSON 字符串下载为文件
 * 文件名格式：简历名称_vivi-resume_时间戳.json
 * @param json 已序列化的 JSON 字符串
 * @param title 简历标题（不含扩展名和后缀）
 */
export const downloadJSON = (json: string, title: string = 'resume') => {
  const filename = `${title}_vivi-resume_${formatTimestamp()}.json`
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export const readJSONFile = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      resolve(e.target?.result as string)
    }
    reader.onerror = () => {
      reject(new Error('Failed to read file'))
    }
    reader.readAsText(file)
  })
}
