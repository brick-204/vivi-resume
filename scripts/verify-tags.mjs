// 验证表格标签的渲染（边框+背景是否可靠）
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType, AlignmentType } from 'docx'
import { writeFileSync } from 'fs'

function parseAccentColor(color) {
  if (!color) return null
  const m = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/)
  if (m) return { r: +m[1], g: +m[2], b: +m[3], a: m[4] !== undefined ? +m[4] : 1 }
  const clean = color.replace('#', '')
  if (clean.length !== 6) return null
  const n = parseInt(clean, 16)
  return isNaN(n) ? null : { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, a: 1 }
}
function tintOverWhiteHex(accent, alpha) {
  const p = parseAccentColor(accent)
  if (!p) return 'cccccc'
  const r = Math.round(p.r * alpha + 255 * (1 - alpha))
  const g = Math.round(p.g * alpha + 255 * (1 - alpha))
  const b = Math.round(p.b * alpha + 255 * (1 - alpha))
  return `${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`
}

const accent = '#3b82f6'
const tagBg = tintOverWhiteHex(accent, 0.08)
const tagColor = '1d4ed8'
const tagBorder = tintOverWhiteHex(accent, 0.3)
console.log('tagBg:', tagBg, 'tagBorder(0.3):', tagBorder)

const tags = ['Vue 3', 'React', 'TypeScript', 'Vite', 'Pinia']
const noBorders = { top:{style:BorderStyle.NONE}, bottom:{style:BorderStyle.NONE}, left:{style:BorderStyle.NONE}, right:{style:BorderStyle.NONE}, insideHorizontal:{style:BorderStyle.NONE}, insideVertical:{style:BorderStyle.NONE} }

const tagCells = tags.map(tag => new TableCell({
  children: [new Paragraph({ children: [new TextRun({ text: ` ${tag} `, size: 18, color: tagColor, bold: true })], alignment: AlignmentType.CENTER })],
  shading: { type: ShadingType.SOLID, color: tagBg, fill: tagBg },
  borders: {
    top: { style: BorderStyle.SINGLE, size: 4, color: tagBorder },
    bottom: { style: BorderStyle.SINGLE, size: 4, color: tagBorder },
    left: { style: BorderStyle.SINGLE, size: 4, color: tagBorder },
    right: { style: BorderStyle.SINGLE, size: 4, color: tagBorder },
  },
  margins: { top: 20, bottom: 20, left: 40, right: 40 },
}))

const tagsTable = new Table({
  rows: [new TableRow({ children: tagCells })],
  width: { size: 100, type: WidthType.PERCENTAGE },
  borders: noBorders,
})

const doc = new Document({
  sections: [{
    children: [
      new Paragraph({ children: [new TextRun({ text: '技术栈标签（表格实现）', bold: true })] }),
      new Paragraph({ children: [new TextRun({ text: '技术栈：', color: '6b7280' })] }),
      tagsTable,
    ],
  }],
})

const buf = await Packer.toBuffer(doc)
writeFileSync('d:/tmp/test-tags-table.docx', buf)
console.log('已生成 d:/tmp/test-tags-table.docx')
