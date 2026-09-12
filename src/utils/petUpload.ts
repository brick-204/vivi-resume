/**
 * 自定义桌宠上传解析 v2
 *
 * 修复点：
 * 1) .lottie 不再固定读取 manifest.animations[0]，优先遵循 manifest.initial.animation。
 * 2) 兼容 animations/{id}.json / a/{id}.json / animation.json。
 * 3) 向后兼容原调用：lottie 仍返回“初始动画”。
 * 4) 额外返回 lottieAnimations + initialAnimation，供桌宠组件按 idle/click/hover/... 切换状态。
 */

import { unzipSync, strFromU8 } from 'fflate'
import { isLikelyLottie } from '@/config/desktopPets'
import { blobToBase64 } from '@/utils/storage'

export interface ParsedPet {
  type: 'lottie' | 'img'
  /** 向后兼容：初始动画数据 */
  lottie?: unknown
  /** dotLottie 多动画：id -> animationData */
  lottieAnimations?: Record<string, unknown>
  /** manifest.initial.animation，通常为 idle */
  initialAnimation?: string
  src?: string
}

interface ParsedLottieBundle {
  initialAnimation: string
  initial: Record<string, unknown>
  animations: Record<string, Record<string, unknown>>
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
    const bundle = await parseLottieZip(file)
    return {
      type: 'lottie',
      lottie: bundle.initial,
      lottieAnimations: bundle.animations,
      initialAnimation: bundle.initialAnimation,
    }
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

  // 3. 图片
  if (mime.startsWith('image/') || IMG_EXTS.includes(ext)) {
    const src = await blobToBase64(file)
    return { type: 'img', src }
  }

  throw new Error('不支持的文件类型（支持 .json / .lottie / gif / apng / webp / png / svg）')
}

/** .lottie 解压上限 */
const MAX_ZIP_RAW = 50 * 1024 * 1024
const MAX_ZIP_FILES = 500
const MAX_ZIP_TOTAL = 200 * 1024 * 1024

type ManifestAnimation = {
  id?: string
  name?: string
  path?: string
}

function normalizePath(path: string): string {
  return path.replace(/^\.?\//, '')
}

function findAnimationBytes(
  files: Record<string, Uint8Array>,
  id: string,
  declaredPath?: string,
): Uint8Array | undefined {
  const candidates: string[] = []

  if (declaredPath) {
    const p = normalizePath(declaredPath)
    candidates.push(p)
    if (p.startsWith('animations/')) {
      candidates.push(p.replace(/^animations\//, 'a/'))
    }
  }

  candidates.push(
    `animations/${id}.json`,
    `a/${id}.json`,
    `${id}.json`,
  )

  for (const p of candidates) {
    const bytes = files[p]
    if (bytes) return bytes
  }
  return undefined
}

function inlineImageAssets(
  animation: Record<string, unknown>,
  files: Record<string, Uint8Array>,
): void {
  const assets = Array.isArray(animation.assets) ? animation.assets : []

  for (const a of assets) {
    if (!a || typeof a !== 'object') continue

    const asset = a as Record<string, unknown>
    const p = asset.p
    const u = asset.u

    if (typeof p !== 'string') continue
    // 已经是 data URL，无需重复处理。
    if (p.startsWith('data:')) {
      asset.u = ''
      asset.e = 1
      continue
    }

    const relPath = (typeof u === 'string' ? u : '') + p
    const zipPath = normalizePath(relPath)
    const imgBytes = files[zipPath] ?? files[p]
    if (!imgBytes) continue

    const ext = extOf(p)
    const mime =
      ext === '.svg' ? 'image/svg+xml'
      : ext === '.webp' ? 'image/webp'
      : ext === '.gif' ? 'image/gif'
      : ext === '.avif' ? 'image/avif'
      : 'image/png'

    const b64 = arrayBufferToBase64(imgBytes)
    asset.p = `data:${mime};base64,${b64}`
    asset.u = ''
    asset.e = 1
  }
}

async function parseLottieZip(file: File): Promise<ParsedLottieBundle> {
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

  const fileNames = Object.keys(files)
  if (fileNames.length > MAX_ZIP_FILES) {
    throw new Error('.lottie 内文件数过多，疑似异常文件')
  }

  let totalBytes = 0
  for (const name of fileNames) totalBytes += files[name].length
  if (totalBytes > MAX_ZIP_TOTAL) {
    throw new Error('.lottie 解压后体积过大，请使用更小的素材')
  }

  let manifest: Record<string, unknown> | undefined
  const manifestFile = files['manifest.json']
  if (manifestFile) {
    try {
      manifest = JSON.parse(strFromU8(manifestFile)) as Record<string, unknown>
    } catch {
      // manifest 损坏：下面回退 animation.json
    }
  }

  const animations: Record<string, Record<string, unknown>> = {}

  const manifestAnimations = Array.isArray(manifest?.animations)
    ? (manifest.animations as ManifestAnimation[])
    : []

  // manifest.initial.animation 才是 dotLottie 声明的初始动作。
  const initialFromManifest =
    manifest?.initial &&
    typeof manifest.initial === 'object' &&
    typeof (manifest.initial as Record<string, unknown>).animation === 'string'
      ? String((manifest.initial as Record<string, unknown>).animation)
      : undefined

  if (manifestAnimations.length > 0) {
    for (const ref of manifestAnimations) {
      if (!ref || typeof ref.id !== 'string') continue

      const bytes = findAnimationBytes(files, ref.id, ref.path)
      if (!bytes) continue

      let animation: Record<string, unknown>
      try {
        animation = JSON.parse(strFromU8(bytes))
      } catch {
        continue
      }

      if (!isLikelyLottie(animation)) continue

      inlineImageAssets(animation, files)
      animations[ref.id] = animation
    }
  }

  // 无 manifest / manifest 不完整时，兼容单 animation.json。
  if (Object.keys(animations).length === 0) {
    const bytes = files['animation.json']
    if (!bytes) throw new Error('.lottie 内未找到动画文件')

    let animation: Record<string, unknown>
    try {
      animation = JSON.parse(strFromU8(bytes))
    } catch {
      throw new Error('.lottie 内动画 JSON 解析失败')
    }

    if (!isLikelyLottie(animation)) {
      throw new Error('.lottie 内动画数据无效（缺少 layers）')
    }

    inlineImageAssets(animation, files)
    animations.default = animation
  }

  const ids = Object.keys(animations)
  const initialAnimation =
    (initialFromManifest && animations[initialFromManifest] ? initialFromManifest : undefined)
    ?? ids[0]

  const initial = animations[initialAnimation]
  if (!initial) {
    throw new Error('.lottie 内未找到可播放的初始动画')
  }

  return {
    initialAnimation,
    initial,
    animations,
  }
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
