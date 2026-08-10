/**
 * 自定义 Image NodeView —— 全接管图片节点的 DOM、选中态、四角缩放。
 *
 * 为什么不用 @tiptap/extension-image 自带的 ResizableNodeView：
 * 1. 它的 onUpdate 回调 return true 复用 DOM 但不更新 el.src —— setContent 重建文档、
 *    同位置图片 src 变化时，旧 img 残留，出现「第一张图退出后变成第二张图」。
 * 2. Tiptap core 的 getRenderedAttributes 不含 options.HTMLAttributes，导致自带的
 *    addNodeView 创建的 img 永远拿不到 class —— img.rich-text-image 样式全失效。
 * 这里手动创建 DOM、手动 setAttribute('class')、update 时手动同步 src，三处都根治。
 *
 * DOM 结构对齐 RichTextEditor.vue 现有 CSS（[data-resize-container][data-node='image'] 等）：
 *   container[data-resize-container][data-node=image][contenteditable=false][draggable=true]
 *     └ wrapper[data-resize-wrapper][position:relative]
 *         ├ img.rich-text-image[src][style.width/height]
 *         └ 4 × div[data-resize-handle='top-left'|'top-right'|'bottom-left'|'bottom-right']
 */
import type { Editor } from '@tiptap/core'
import type { Node } from '@tiptap/pm/model'
import type { Decoration, DecorationSource, NodeView, ViewMutationRecord } from '@tiptap/pm/view'

type HandleDir = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
const HANDLE_DIRS: HandleDir[] = ['top-left', 'top-right', 'bottom-left', 'bottom-right']
const MIN_SIZE = 60

export interface ResizableImageViewOptions {
  editor: Editor
  node: Node
  getPos: () => number | undefined
  HTMLAttributes: Record<string, any>
}

export class ResizableImageView implements NodeView {
  dom: HTMLElement
  private img: HTMLImageElement
  private wrapper: HTMLElement
  private handles = new Map<HandleDir, HTMLElement>()
  private editor: Editor
  private node: Node
  private getPos: () => number | undefined
  /** 拖拽起始状态 */
  private dragging: { dir: HandleDir; startX: number; startY: number; startW: number; ratio: number } | null = null

  constructor(opts: ResizableImageViewOptions) {
    this.editor = opts.editor
    this.node = opts.node
    this.getPos = opts.getPos

    // img —— 手动设 class，不依赖 HTMLAttributes 传递（getRenderedAttributes 不含 options.HTMLAttributes）
    this.img = document.createElement('img')
    this.img.className = 'rich-text-image'
    this.img.src = opts.node.attrs.src
    this.img.draggable = false
    this.applySizeStyle(this.img, this.node)

    // wrapper 包住 img + 手柄，relative 定位让手柄锚定图片四角
    this.wrapper = document.createElement('div')
    this.wrapper.dataset.resizeWrapper = ''
    this.wrapper.style.position = 'relative'
    this.wrapper.style.display = 'block'
    this.wrapper.appendChild(this.img)

    // container —— ProseMirror NodeView 的根 dom，contenteditable=false 让图片不可编辑文字。
    // width:fit-content 让 container 收缩到图片宽度，不占满整行——否则图片右侧空白落在
    // container 内（contenteditable=false），ProseMirror 无法定位光标到图片后（Bug2）
    this.dom = document.createElement('div')
    this.dom.dataset.resizeContainer = ''
    this.dom.dataset.node = 'image'
    this.dom.contentEditable = 'false'
    this.dom.draggable = true
    this.dom.style.display = 'block'
    this.dom.style.width = 'fit-content'
    this.dom.appendChild(this.wrapper)

    for (const dir of HANDLE_DIRS) {
      const h = document.createElement('div')
      h.dataset.resizeHandle = dir
      h.addEventListener('mousedown', (e) => this.onHandleMouseDown(e, dir))
      this.handles.set(dir, h)
      this.wrapper.appendChild(h)
    }
  }

  /** 同步 width/height 到 img style（节点属性 → 视觉） */
  private applySizeStyle(el: HTMLElement, node: Node) {
    const { width, height } = node.attrs
    if (width) el.style.width = `${width}px`
    if (height) el.style.height = `${height}px`
  }

  /**
   * ProseMirror 节点更新时回调。同类型 → 同步 src/尺寸后复用 DOM（return true）。
   * 关键：这里手动 el.src = node.attrs.src，根治「setContent 后 src 不刷新」。
   */
  update(node: Node, _decorations: readonly Decoration[], _innerDecorations: DecorationSource): boolean {
    if (node.type !== this.node.type) return false
    this.node = node
    if (this.img.src !== node.attrs.src) this.img.src = node.attrs.src
    this.img.style.width = node.attrs.width ? `${node.attrs.width}px` : ''
    this.img.style.height = node.attrs.height ? `${node.attrs.height}px` : ''
    return true
  }

  selectNode() {
    this.dom.classList.add('ProseMirror-selectednode')
  }

  deselectNode() {
    this.dom.classList.remove('ProseMirror-selectednode')
  }

  /**
   * 只阻止 ProseMirror 拦截「手柄 mousedown」——拖拽缩放需要原生事件。
   * 图片本身/container 空白的点击放行给 ProseMirror：它负责 NodeSelection 选中、
   * 点别处 deselect、点 container 外侧空白定位光标。stopEvent 一刀切返回 true 会导致
   * 点图片右侧空白无法 deselect/定位光标（Bug2）。
   */
  stopEvent(event: Event): boolean {
    const target = event.target as HTMLElement
    return !!target?.closest('[data-resize-handle]')
  }

  ignoreMutation(_mutation: ViewMutationRecord): boolean {
    return true
  }

  destroy() {
    this.cancelDrag()
    this.handles.clear()
    this.dom.remove()
  }

  // ========== 四角拖拽缩放 ==========

  private onHandleMouseDown(e: MouseEvent, dir: HandleDir) {
    e.preventDefault()
    e.stopPropagation()
    if (!this.editor.isEditable) return
    const w = this.img.offsetWidth || this.img.naturalWidth
    const h = this.img.offsetHeight || this.img.naturalHeight
    this.dragging = {
      dir,
      startX: e.clientX,
      startY: e.clientY,
      startW: w,
      ratio: h > 0 ? w / h : 1,
    }
    document.addEventListener('mousemove', this.onMouseMove)
    document.addEventListener('mouseup', this.onMouseUp)
  }

  private onMouseMove = (e: MouseEvent) => {
    if (!this.dragging) return
    const { dir, startX, startY, startW, ratio } = this.dragging
    const dx = e.clientX - startX
    const dy = e.clientY - startY
    // 拖右下角：dx/dy 正向放大；拖左上角：反向（dx 负向放大）。取对角线投影最大方向驱动缩放
    let scale: number
    if (dir === 'bottom-right') scale = Math.max(dx, dy)
    else if (dir === 'bottom-left') scale = Math.max(-dx, dy)
    else if (dir === 'top-right') scale = Math.max(dx, -dy)
    else scale = Math.max(-dx, -dy) // top-left

    let newW = startW + scale
    // 锁宽高比
    let newH = newW / ratio
    // 最小尺寸约束（同时满足宽高不破下限）
    if (newW < MIN_SIZE) { newW = MIN_SIZE; newH = newW / ratio }
    if (newH < MIN_SIZE) { newH = MIN_SIZE; newW = newH * ratio }

    this.img.style.width = `${Math.round(newW)}px`
    this.img.style.height = `${Math.round(newH)}px`
  }

  private onMouseUp = () => {
    if (!this.dragging) return
    const pos = this.getPos()
    const width = Math.round(this.img.offsetWidth)
    const height = Math.round(this.img.offsetHeight)
    if (pos !== undefined && width > 0) {
      this.editor
        .chain()
        .setNodeSelection(pos)
        .updateAttributes('image', { width, height })
        .run()
    }
    this.cancelDrag()
  }

  private cancelDrag() {
    this.dragging = null
    document.removeEventListener('mousemove', this.onMouseMove)
    document.removeEventListener('mouseup', this.onMouseUp)
  }
}
