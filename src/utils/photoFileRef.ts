/**
 * 照片文件引用工具
 * 用于目录模式下将照片从 JSON 中提取为独立文件存储
 *
 * 引用格式：__PHOTO_REF__:photos/{resumeId}.jpg
 * 目录模式下 JSON 中不再嵌入 base64 字符串，而是存储引用路径
 */

import { blobToBase64 } from '@/utils/storage'

const PHOTO_REF_PREFIX = '__PHOTO_REF__:'

/** 检查字符串是否为照片文件引用 */
export function isPhotoRef(value: string): boolean {
  return value.startsWith(PHOTO_REF_PREFIX)
}

/** 创建照片文件引用字符串 */
export function makePhotoRef(relativePath: string): string {
  return `${PHOTO_REF_PREFIX}${relativePath}`
}

/** 从引用中提取相对路径 */
export function parsePhotoRef(ref: string): string {
  return ref.slice(PHOTO_REF_PREFIX.length)
}

/** 从 data URL 推断文件扩展名 */
function inferExt(dataUrl: string): string {
  if (dataUrl.startsWith('data:image/png')) return 'png'
  return 'jpg'
}

/** 从 data URL 推断 MIME 类型 */
function inferMimeType(dataUrl: string): string {
  if (dataUrl.startsWith('data:image/png')) return 'image/png'
  return 'image/jpeg'
}

/** 将同源 URL / blob URL fetch 转 data URL；失败返回 undefined */
async function fetchUrlToDataUrl(url: string): Promise<string | undefined> {
  try {
    const blob = await fetch(url).then(r => r.blob())
    return await blobToBase64(blob)
  } catch {
    return undefined
  }
}

/**
 * 从 Resume 对象中提取照片数据，替换为文件引用
 * 返回修改后的 resume（用于 JSON 序列化）和提取出的照片条目
 *
 * async：photo 可能是同源 URL（dev 环境静态资源），需 fetch 转 data URL 后再提取。
 */
export async function extractPhotos(
  resume: Record<string, unknown>,
  resumeId: string,
): Promise<{
  resume: Record<string, unknown>
  photos: { relativePath: string; dataUrl: string; mimeType: string }[]
}> {
  const photos: { relativePath: string; dataUrl: string; mimeType: string }[] = []
  const basicInfo = { ...(resume.basicInfo as Record<string, unknown>) }

  // 提取 photo / photoOriginal 字段
  const fields = ['photo', 'photoOriginal'] as const
  for (const field of fields) {
    const value = basicInfo[field] as string | undefined
    // data URL 直接用；同源 / blob URL 先 fetch 转 data URL；其余跳过
    if (!value || isPhotoRef(value)) continue
    const isUrl = value.startsWith('/') || value.startsWith('blob:')
    const dataUrl = value.startsWith('data:')
      ? value
      : isUrl ? await fetchUrlToDataUrl(value) : undefined
    if (!dataUrl) continue

    const ext = inferExt(dataUrl)
    const suffix = field === 'photoOriginal' ? '_original' : ''
    const relativePath = `photos/${resumeId}${suffix}.${ext}`
    photos.push({ relativePath, dataUrl, mimeType: inferMimeType(dataUrl) })
    basicInfo[field] = makePhotoRef(relativePath)
  }

  return { resume: { ...resume, basicInfo }, photos }
}

/**
 * 将照片文件引用替换回 base64 数据
 * 用于从目录加载简历时还原数据
 */
export function injectPhotos(
  resume: Record<string, unknown>,
  photoData: Map<string, string>,
): Record<string, unknown> {
  const basicInfo = { ...(resume.basicInfo as Record<string, unknown>) }

  const fields = ['photo', 'photoOriginal'] as const
  for (const field of fields) {
    const value = basicInfo[field] as string | undefined
    if (value && isPhotoRef(value)) {
      const relativePath = parsePhotoRef(value)
      const data = photoData.get(relativePath)
      if (data) {
        basicInfo[field] = data
      } else {
        // 照片文件缺失，清空字段
        basicInfo[field] = ''
      }
    }
  }

  return { ...resume, basicInfo }
}
