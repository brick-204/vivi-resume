/**
 * 图片自动压缩工具
 * 当照片 data URL 超过大小阈值时，逐步降低质量重编码，保留原始尺寸
 */

/** 默认大小阈值：500KB */
const DEFAULT_SIZE_THRESHOLD = 500 * 1024

/**
 * 估算 data URL 的实际字节数
 * base64 编码后体积约为原始数据的 4/3 倍
 */
export function dataUrlSize(dataUrl: string): number {
  const base64 = dataUrl.split(',')[1] || ''
  // base64 每 4 个字符表示 3 字节，末尾 padding 需要减去
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0
  return Math.ceil((base64.length * 3) / 4) - padding
}

/**
 * 将 data URL 加载为 HTMLImageElement
 */
function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('图片加载失败'))
    img.src = src
  })
}

/**
 * 对上传的原始图片做压缩（用于 photoOriginal）
 * 先按最大尺寸缩放，若仍超阈值则逐步降低质量
 *
 * @param dataUrl 原始 data URL
 * @param resizeImage Worker 的 resizeImage 方法
 * @param threshold 大小阈值（字节）
 * @param maxDimension 最大边长（像素）
 */
export async function compressUploadedImage(
  dataUrl: string,
  resizeImage: (source: HTMLImageElement, maxDim: number, mimeType: 'image/jpeg', quality: number) => Promise<string>,
  threshold: number = DEFAULT_SIZE_THRESHOLD,
  maxDimension: number = 800,
): Promise<string> {
  // 加载图片
  const image = await loadImageElement(dataUrl)

  // 第一步：按最大尺寸缩放 + 初始质量编码
  let result = await resizeImage(image, maxDimension, 'image/jpeg', 0.85)

  // 第二步：如果仍超阈值，逐步降低质量
  if (dataUrlSize(result) > threshold) {
    const qualitySteps = [0.7, 0.55, 0.4, 0.3, 0.2]
    for (const quality of qualitySteps) {
      result = await resizeImage(image, maxDimension, 'image/jpeg', quality)
      if (dataUrlSize(result) <= threshold) break
    }
  }

  return result
}

/**
 * 对已裁剪的最终照片做质量压缩（不缩放尺寸）
 * 如果超阈值，用 canvas 重绘降低质量
 * PNG 透明图会先绘制白色背景再转为 JPEG
 *
 * @param dataUrl 裁剪后的 data URL
 * @param threshold 大小阈值（字节）
 */
export async function compressCroppedPhoto(
  dataUrl: string,
  threshold: number = DEFAULT_SIZE_THRESHOLD,
): Promise<string> {
  // 未超阈值，直接返回
  if (dataUrlSize(dataUrl) <= threshold) return dataUrl

  // 非 JPEG/PNG 格式不做压缩
  if (!dataUrl.startsWith('data:image/jpeg') && !dataUrl.startsWith('data:image/png')) {
    return dataUrl
  }

  const image = await loadImageElement(dataUrl)
  const { naturalWidth, naturalHeight } = image

  // 创建 canvas，PNG 需要绘制白色背景（JPEG 不支持透明度）
  const canvas = document.createElement('canvas')
  canvas.width = naturalWidth
  canvas.height = naturalHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) return dataUrl

  // PNG 透明度兼容：先填白色背景，再绘制图片
  const isPng = dataUrl.startsWith('data:image/png')
  if (isPng) {
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, naturalWidth, naturalHeight)
  }
  ctx.drawImage(image, 0, 0)

  const qualitySteps = [0.7, 0.55, 0.4, 0.3, 0.2]
  let result = dataUrl

  for (const quality of qualitySteps) {
    result = canvas.toDataURL('image/jpeg', quality)
    if (dataUrlSize(result) <= threshold) break
  }

  return result
}
