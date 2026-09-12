import { describe, expect, it } from 'vitest'
import { strToU8, zipSync } from 'fflate'
import { parsePetFile } from '@/utils/petUpload'

const animation = { v: '5.0.0', fr: 30, ip: 0, op: 1, w: 10, h: 10, layers: [] }

function makePetFile(entries: Record<string, string | Uint8Array>): File {
  const files = Object.fromEntries(Object.entries(entries).map(([path, content]) => [
    path,
    typeof content === 'string' ? strToU8(content) : content,
  ]))
  const bytes = zipSync(files)
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
  return { name: 'pet.lottie', type: 'application/zip', size: bytes.byteLength, arrayBuffer: async () => buffer } as File
}

describe('parsePetFile', () => {
  it('keeps every manifest animation, respects initial, and inlines assets', async () => {
    const file = makePetFile({
      'manifest.json': JSON.stringify({
        animations: [{ id: 'idle' }, { id: 'hover' }, { id: 'click' }],
        initial: { animation: 'idle' },
      }),
      'animations/idle.json': JSON.stringify({ ...animation, assets: [{ p: 'icon.webp', u: 'images/' }] }),
      'a/hover.json': JSON.stringify(animation),
      'click.json': JSON.stringify(animation),
      'images/icon.webp': new Uint8Array([1, 2, 3]),
    })
    const parsed = await parsePetFile(file)
    expect(parsed.initialAnimation).toBe('idle')
    expect(Object.keys(parsed.lottieAnimations ?? {})).toEqual(['idle', 'hover', 'click'])
    const idle = parsed.lottieAnimations?.idle as { assets: Array<Record<string, unknown>> }
    expect(parsed.lottie).toBe(idle)
    expect(idle.assets[0].p).toBe('data:image/webp;base64,AQID')
    expect(idle.assets[0].u).toBe('')
    expect(idle.assets[0].e).toBe(1)
  })

  it('falls back to a legacy single animation.json', async () => {
    const parsed = await parsePetFile(makePetFile({ 'animation.json': JSON.stringify(animation) }))
    expect(parsed.initialAnimation).toBe('default')
    expect(parsed.lottieAnimations?.default).toEqual(animation)
    expect(parsed.lottie).toEqual(animation)
  })
})
