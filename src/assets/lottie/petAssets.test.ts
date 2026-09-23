import { existsSync, readFileSync } from 'node:fs'
import { basename, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const pets = ['vzai', 'xiaoyin'] as const

describe('桌宠共享图片资源', () => {
  for (const pet of pets) {
    it(`${pet} 动画不再内嵌图片，并且共享 WebP 存在`, () => {
      const sourceDir = resolve(process.cwd(), 'src/assets/lottie', pet)
      const files = Object.keys(import.meta.glob('./{vzai,xiaoyin}/*.json', { query: '?raw', import: 'default' }))
        .filter(file => file.includes(`/${pet}/`))

      expect(files.length).toBeGreaterThan(0)
      for (const file of files) {
        const filename = resolve(sourceDir, basename(file))
        const animation = JSON.parse(readFileSync(filename, 'utf8'))
        const assetIds = new Set((animation.assets ?? []).map((asset: { id?: string }) => asset.id).filter(Boolean))
        const referencedIds = [...JSON.stringify(animation).matchAll(/"refId":"([^"]+)"/g)].map(match => match[1])
        const imagePaths = (animation.assets ?? [])
          .map((asset: { p?: string }) => asset.p)
          .filter((path: string | undefined): path is string => Boolean(path))

        expect(referencedIds.every(refId => assetIds.has(refId))).toBe(true)
        expect(new Set(imagePaths).size).toBe(imagePaths.length)
        for (const asset of animation.assets ?? []) {
          if (!asset.p) continue
          expect(asset.p).not.toMatch(/^data:image/)
          expect(asset.e).toBe(0)
          expect(asset.u).toBe(`pets/${pet}/`)
          expect(existsSync(resolve(process.cwd(), 'public', asset.u, asset.p))).toBe(true)
        }
      }
    })
  }
})
