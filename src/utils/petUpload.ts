/**
 * 自定义桌宠上传解析
 *
 * 统一入口 parsePetFile，按扩展名/MIME 三路分流：
 * - .json        → Lottie JSON 对象
 * - .lottie      → zip 容器，fflate 解压 + 图片资源内联 → Lottie JSON 对象
 * - image/*      → data URL（GIF/APNG/WebP/PNG/SVG，浏览器自行区分动图/静态）
 *
 * 图片转 data URL 复用 storage.ts 的 blobToBase64。
 * .lottie 仅内联图片资源（assets 里的位图），字体/音频忽略（桌宠场景无）。
 */
import { unzipSync, strFromU8 } from 'fflate'
import { isLikelyLottie } from '@/config/desktopPets'
import { blobToBase64 } from '@/utils/storage'

export interface ParsedPet {
  type: 'lottie' | 'img'
  lottie?: unknown
  src?: string
}

/** 支持的图片扩展名（小写，含点） */
const IMG_EXTS = ['.gif', '.apng', '.webp', '.png', '.svg', '.avif']

const extOf = (name: string): string => {
  const i = name.lastIndexOf('.')
  return i >= 0 ? name.slice(i).toLowerCase() : ''
}

/** 入口：解析上传的桌宠素材文件 */
export async function parsePetFile(file: File): Promise<ParsedPet> {
  const ext = extOf(file.name)
  const mime = file.type

  // 1. .lottie zip 容器
  if (ext === '.lottie') {
    const lottie = await parseLottieZip(file)
    return { type: 'lottie', lottie }
  }

  // 2. Lottie JSON
  if (ext === '.json' || mime === 'application/json') {
    const text = await file.text()
    let data: unknown
    try {
      data = JSON.parse(text)
    } catch {
      throw new Error('JSON 解析失败，请检查文件格式')
    }
    if (!isLikelyLottie(data)) {
      throw new Error('不是有效的 Lottie JSON（缺少 layers 字段）')
    }
    return { type: 'lottie', lottie: data }
  }

  // 3. 图片（按 MIME 或扩展名判定）
  if (mime.startsWith('image/') || IMG_EXTS.includes(ext)) {
    const src = await blobToBase64(file)
    return { type: 'img', src }
  }

  throw new Error('不支持的文件类型（支持 .json / .lottie / gif / apng / webp / png / svg）')
}

/**
 * 解析 .lottie zip 容器：
 * 解压 → 读 manifest 找动画入口（无 manifest 直接找 animation.json）
 * → 遍历 assets 把图片资源（u+p 指向的 zip 内文件）转 data URL 内联
 * → 返回可喂给 lottie-web 的 animationData 对象
 */
/** .lottie 解压上限：防 zip 炸弹导致主线程冻结/OOM。用户本地文件，但仍防不可控网络下载源 */
const MAX_ZIP_RAW = 50 * 1024 * 1024   // 压缩包原始大小上限 50MB
const MAX_ZIP_FILES = 500              // 解压后文件数上限
const MAX_ZIP_TOTAL = 200 * 1024 * 1024 // 解压后总字节数上限 200MB

async function parseLottieZip(file: File): Promise<unknown> {
  if (file.size > MAX_ZIP_RAW) {
    throw new Error('.lottie 文件过大（超过 50MB），请使用更小的素材')
  }
  const buf = new Uint8Array(await file.arrayBuffer())
  let files: Record<string, Uint8Array>
  try {
    files = unzipSync(buf)
  } catch {
    throw new Error('.lottie 解压失败，请检查文件是否为有效的 .lottie 包')
  }

  // 文件数 + 解压后总字节数校验，防高压缩比 zip 炸弹
  const fileNames = Object.keys(files)
  if (fileNames.length > MAX_ZIP_FILES) {
    throw new Error('.lottie 内文件数过多，疑似异常文件')
  }
  let totalBytes = 0
  for (const name of fileNames) totalBytes += files[name].length
  if (totalBytes > MAX_ZIP_TOTAL) {
    throw new Error('.lottie 解压后体积过大，请使用更小的素材')
  }

  // 找动画 JSON 入口：优先 manifest 指定，否则用 animation.json
  let animPath = 'animation.json'
  const manifestFile = files['manifest.json']
  if (manifestFile) {
    try {
      const manifest = JSON.parse(strFromU8(manifestFile))
      // .lottie manifest: { animations: [{ id, path }] } 或 { assets: [...] }
      const ref = manifest?.animations?.[0]?.path ?? manifest?.assets?.[0]?.path
      if (typeof ref === 'string') animPath = ref.replace(/^\.?\//, '')
    } catch {
      // manifest 损坏，回退 animation.json
    }
  }
  const animBytes = files[animPath] ?? files['animation.json']
  if (!animBytes) throw new Error('.lottie 内未找到动画文件')
  let animation: Record<string, unknown>
  try {
    animation = JSON.parse(strFromU8(animBytes))
  } catch {
    throw new Error('.lottie 内动画 JSON 解析失败')
  }
  if (!isLikelyLottie(animation)) {
    throw new Error('.lottie 内动画数据无效（缺少 layers）')
  }

  // 内联图片资源：assets 数组每项可能含 { p: 'image_0.png', u: 'images/', e: 1 }
  const assets = Array.isArray(animation.assets) ? animation.assets : []
  for (const a of assets) {
    if (!a || typeof a !== 'object') continue
    const p = (a as Record<string, unknown>).p
    const u = (a as Record<string, unknown>).u
    if (typeof p !== 'string') continue
    // zip 内路径：u + p（去前导 ./）
    const relPath = (typeof u === 'string' ? u : '') + p
    const zipPath = relPath.replace(/^\.?\//, '')
    const imgBytes = files[zipPath] ?? files[p]
    if (!imgBytes) continue
    // 推断 MIME
    const ext = extOf(p)
    const mime =
      ext === '.svg' ? 'image/svg+xml'
      : ext === '.webp' ? 'image/webp'
      : ext === '.gif' ? 'image/gif'
      : 'image/png' // 默认 png（.lottie 内位图多为 png）
    const b64 = arrayBufferToBase64(imgBytes)
    ;(a as Record<string, unknown>).p = `data:${mime};base64,${b64}`
    ;(a as Record<string, unknown>).u = '' // 已内联，清空路径前缀
    ;(a as Record<string, unknown>).e = 1  // 标记嵌入
  }

  return animation
}

// ponytail: base64 编码 Uint8Array，分块避免 callstack 溢出（大图）
function arrayBufferToBase64(bytes: Uint8Array): string {
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}
