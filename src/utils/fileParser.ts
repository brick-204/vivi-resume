/**
 * 文件解析层
 * 支持 .md / .docx / .pdf 文件提取纯文本
 */

export type SupportedFileType = 'md' | 'docx' | 'pdf'

export interface FileParseResult {
  text: string
  fileType: SupportedFileType
  fileName: string
  /** 从文件中提取的第一张图片（data URI 格式），用于简历头像 */
  photoDataUri?: string
}

/** 文件大小上限 5MB */
const MAX_FILE_SIZE = 5 * 1024 * 1024

/** 按扩展名判断文件类型 */
export function getSupportedFileType(file: File): SupportedFileType | null {
  const name = file.name.toLowerCase()
  if (name.endsWith('.md') || name.endsWith('.markdown')) return 'md'
  if (name.endsWith('.docx')) return 'docx'
  if (name.endsWith('.pdf')) return 'pdf'
  return null
}

/** 判断文件是否为支持的类型 */
export function isSupportedFileType(file: File): boolean {
  return getSupportedFileType(file) !== null
}

/** 解析文件为纯文本 */
export async function parseFile(file: File): Promise<FileParseResult> {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('文件过大，请选择 5MB 以内的文件')
  }

  const fileType = getSupportedFileType(file)
  if (!fileType) {
    throw new Error('不支持的文件格式，请选择 .md / .docx / .pdf 文件')
  }

  let text: string
  let photoDataUri: string | undefined

  switch (fileType) {
    case 'md':
      text = await parseMarkdown(file)
      break
    case 'docx': {
      const docxResult = await parseDocx(file)
      text = docxResult.text
      photoDataUri = docxResult.photoDataUri
      break
    }
    case 'pdf': {
      const pdfResult = await parsePdf(file)
      text = pdfResult.text
      photoDataUri = pdfResult.photoDataUri
      break
    }
  }

  if (!text.trim()) {
    throw new Error('文件内容为空，无法提取有效文本')
  }

  return { text, fileType, fileName: file.name, photoDataUri }
}

/** 读取 Markdown 文件 */
function parseMarkdown(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Markdown 文件读取失败'))
    reader.readAsText(file)
  })
}

/** 读取 DOCX 文件（使用 mammoth 提取纯文本 + 第一张图片） */
async function parseDocx(file: File): Promise<{ text: string; photoDataUri?: string }> {
  try {
    const mammoth = await import('mammoth')
    const arrayBuffer = await file.arrayBuffer()

    // 只调用一次 convertToHtml，同时提取文本和图片
    let photoDataUri: string | undefined
    let htmlResult: string

    try {
      const result = await mammoth.convertToHtml(
        { arrayBuffer },
        {
          convertImage: mammoth.images.imgElement(async (image) => {
            if (!photoDataUri) {
              // 只取第一张图片
              const base64 = await image.readAsBase64String()
              photoDataUri = `data:${image.contentType};base64,${base64}`
            }
            return { src: '' }
          }),
        },
      )
      htmlResult = result.value
    } catch {
      // convertToHtml 失败（如图片处理异常），回退到 extractRawText
      const textResult = await mammoth.extractRawText({ arrayBuffer: arrayBuffer.slice(0) })
      htmlResult = textResult.value
    }

    // 从 HTML 提取纯文本：去除标签，保留换行和空格
    const text = htmlResult
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<\/li>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\n{3,}/g, '\n\n')
      .trim()

    return { text, photoDataUri }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    throw new Error(`Word 文件解析失败：${msg || '文件可能已损坏'}`)
  }
}

/** 读取 PDF 文件（使用 pdfjs-dist 提取纯文本 + 第一张图片） */

async function parsePdf(file: File): Promise<{ text: string; photoDataUri?: string }> {
  try {
    // 使用 Vite 原生 Worker 导入：将 pdf.worker.mjs 作为独立 Worker 线程加载
    // Vite 会自动处理 ESM Worker 的构建和部署，无需手动复制 worker 文件到 public
    const pdfjsLib = await import('pdfjs-dist')
    const workerUrl = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url)
    pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl.toString()

    const arrayBuffer = await file.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise

    const pages: string[] = []
    let photoDataUri: string | undefined

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const content = await page.getTextContent()
      const pageText = content.items
        .map((item: any) => item.str)
        .join(' ')
      if (pageText.trim()) {
        pages.push(pageText)
      }

      // 从第一页提取第一张图片
      if (!photoDataUri && i === 1) {
        try {
          photoDataUri = await extractFirstImageFromPdfPage(page)
        } catch {
          // 图片提取失败不影响文本解析
        }
      }
    }

    if (pages.length === 0) {
      throw new Error('PDF 中未提取到文本，可能为扫描件或加密文件')
    }

    return { text: pages.join('\n\n'), photoDataUri }
  } catch (e) {
    if (e instanceof Error && e.message.includes('扫描件')) {
      throw e
    }
    const msg = e instanceof Error ? e.message : String(e)
    throw new Error(`PDF 文件解析失败：${msg || '可能为扫描件或加密文件，请尝试其他格式'}`)
  }
}

/** 头像图片的最小尺寸阈值（像素），过滤掉装饰线、图标等小元素 */
const MIN_PHOTO_DIMENSION = 50

/**
 * 从 PDF 页面中提取第一张合适的图片（作为简历头像候选）
 * 遍历页面操作符，找到尺寸合理的 paintImageXObject 并渲染为 data URI
 *
 * pdfjs-dist v6 中：
 * - 页面内嵌图片存储在 page.objs（PDFPageProxy 的本地 PDFObjects 实例）
 * - 字体等全局共享资源存储在 page.commonObjs（transport 级别）
 * - 图片 ID 通常不以 "g_" 开头，所以优先查 page.objs
 * - PDFObjects.get(id) 同步返回已 resolve 的数据，未 resolve 则抛异常
 * - PDFObjects.get(id, callback) 注册回调，resolve 后触发
 */
async function extractFirstImageFromPdfPage(page: any): Promise<string | undefined> {
  const operators = await page.getOperatorList()
  const { OPS } = await import('pdfjs-dist')

  // 遍历操作符列表，找到合适的 paintImageXObject
  for (let i = 0; i < operators.fnArray.length; i++) {
    if (operators.fnArray[i] === OPS.paintImageXObject) {
      const imageName = operators.argsArray[i][0]
      try {
        // 页面内嵌图片优先查 page.objs，回退查 page.commonObjs
        const imageObj = await getPageImageObject(page, imageName)

        if (!imageObj) continue

        // 尺寸过滤：忽略过小的图片（装饰线、图标等）
        const width = imageObj.width || 0
        const height = imageObj.height || 0
        if (width < MIN_PHOTO_DIMENSION || height < MIN_PHOTO_DIMENSION) continue

        const dataUri = renderPdfImageToDataUri(imageObj, width, height)
        if (dataUri) return dataUri
      } catch {
        // 单张图片提取失败，跳过继续找下一张
        continue
      }
    }
  }

  return undefined
}

/**
 * 从 page.objs 或 page.commonObjs 获取图片对象
 * 优先查 page.objs（页面内嵌图片），再查 page.commonObjs（全局共享资源）
 *
 * 关键：回调方式 objs.get(id, cb) 会在 pdfjs-dist v6 中为不存在的 ID 创建占位条目，
 * 导致回调永远不触发。因此只在同步 get 返回 undefined（已 resolve 但值为 undefined）
 * 时才使用回调方式，否则跳过此池子。
 */
function getPageImageObject(page: any, imageName: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('timeout')), 3000)

    const tryObjs = (objs: any): boolean => {
      if (!objs) return false

      // 1. 尝试同步获取（对象已 resolve 时直接返回数据）
      try {
        const result = objs.get(imageName)
        if (result !== undefined && result !== null) {
          clearTimeout(timeout)
          resolve(result)
          return true
        }
        // result === undefined 意味着对象尚未 resolve，继续尝试回调
        // 注意：如果对象 ID 不存在于此池子，同步 get 也会抛异常
        if (result !== undefined) {
          // 同步返回了 undefined/null 以外的假值，视为空结果
          return false
        }
      } catch {
        // 同步 get 抛异常 = 对象尚未 resolve 或不存在于该池子
      }

      // 2. 尝试回调方式：仅在对象确实存在于该池子时才注册回调
      //    通过检查 objs 内部 Map 是否包含该 key 来判断
      //    如果无法判断（私有属性），则放弃回调方式，避免为不存在的 ID 注册永远不触发的回调
      try {
        // pdfjs-dist v6 的 PDFObjects 内部使用 #objs (Map)，
        // 我们无法直接访问私有字段来判断 key 是否存在。
        // 安全策略：仅在同步 get 未抛异常（对象存在但值为 undefined/INITIAL_DATA）时才用回调。
        // 如果同步 get 抛了异常，说明 key 不存在于该池子或尚未注册，不应注册回调。
        // 回退：不做回调注册，直接返回 false 让下一个池子尝试
        return false
      } catch {
        return false
      }
    }

    // 先查 page.objs（页面本地图片）
    if (tryObjs(page.objs)) return

    // 再查 page.commonObjs（全局共享资源）
    if (tryObjs(page.commonObjs)) return

    // 两个池子都找不到，直接失败
    clearTimeout(timeout)
    reject(new Error(`Image object not found: ${imageName}`))
  })
}

/**
 * 将 pdfjs-dist 图片对象渲染为 data URI
 * 支持 ImageBitmap（bitmap）和原始像素数据（data）两种格式
 */
function renderPdfImageToDataUri(imageObj: any, width: number, height: number): string | undefined {
  if (imageObj.bitmap) {
    // 使用 ImageBitmap 渲染到 canvas 获取 data URI
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.drawImage(imageObj.bitmap, 0, 0)
      const dataUri = canvas.toDataURL('image/png')
      canvas.remove()
      return dataUri
    }
  } else if (imageObj.data) {
    // 从原始像素数据创建 data URI
    const { data, kind } = imageObj
    if (width && height && data) {
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (ctx) {
        const imgData = ctx.createImageData(width, height)
        // kind 1 = RGB, kind 2 = RGBA
        if (kind === 1) {
          for (let j = 0, k = 0; j < data.length; j += 3, k += 4) {
            imgData.data[k] = data[j]
            imgData.data[k + 1] = data[j + 1]
            imgData.data[k + 2] = data[j + 2]
            imgData.data[k + 3] = 255
          }
        } else if (kind === 2) {
          imgData.data.set(data)
        }
        ctx.putImageData(imgData, 0, 0)
        const dataUri = canvas.toDataURL('image/png')
        canvas.remove()
        return dataUri
      }
    }
  }
  return undefined
}
