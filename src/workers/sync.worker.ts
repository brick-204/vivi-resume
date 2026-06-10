/**
 * 同步 Worker
 * 将 IndexedDB 中的全部数据序列化为 JSON 文件内容，供主线程写入本地目录。
 *
 * Worker 只负责序列化（CPU 密集），文件 I/O 在主线程完成（File System Access API 不在 Worker 可用）。
 * 通过 postMessage 报告进度。
 */

import type { SyncWorkerMessage, SyncWorkerResponse } from './types'

self.onmessage = async (e: MessageEvent<SyncWorkerMessage>) => {
  const { type, id } = e.data

  try {
    if (type === 'prepare-sync') {
      const { resumes, aiConfigs, meta } = e.data

      const totalItems = resumes.length + aiConfigs.length + 1 // +1 for meta
      let completed = 0

      // Step 1: 序列化每份简历
      const resumeFiles: { filename: string; content: string }[] = []
      for (let i = 0; i < resumes.length; i++) {
        const resume = resumes[i] as Record<string, unknown>
        if (!resume.id) {
          self.postMessage({ type: 'error', id, error: `Resume at index ${i} missing id` } as SyncWorkerResponse)
          return
        }
        resumeFiles.push({
          filename: `${resume.id}.json`,
          content: JSON.stringify(resume, null, 2),
        })
        completed++
        self.postMessage({
          type: 'progress',
          id,
          message: `正在序列化简历 ${completed}/${totalItems}：${(resume as { title?: string }).title || '未命名'}`,
          percent: Math.round((completed / totalItems) * 100),
        } as SyncWorkerResponse)
      }

      // Step 2: 序列化每个 AI 配置
      const aiConfigFiles: { filename: string; content: string }[] = []
      for (let i = 0; i < aiConfigs.length; i++) {
        const config = aiConfigs[i] as Record<string, unknown>
        if (!config.id) {
          self.postMessage({ type: 'error', id, error: `AI config at index ${i} missing id` } as SyncWorkerResponse)
          return
        }
        aiConfigFiles.push({
          filename: `${config.id}.json`,
          content: JSON.stringify(config, null, 2),
        })
        completed++
        self.postMessage({
          type: 'progress',
          id,
          message: `正在序列化 AI 配置 ${aiConfigFiles.length}/${aiConfigs.length}`,
          percent: Math.round((completed / totalItems) * 100),
        } as SyncWorkerResponse)
      }

      // Step 3: 序列化 meta
      const metaContent = JSON.stringify(meta, null, 2)
      completed++

      self.postMessage({
        type: 'prepared',
        id,
        resumeFiles,
        aiConfigFiles,
        metaContent,
      } as SyncWorkerResponse)
    }
  } catch (err) {
    self.postMessage({
      type: 'error',
      id,
      error: err instanceof Error ? err.message : 'Unknown sync error',
    } as SyncWorkerResponse)
  }
}

export default {} as never
