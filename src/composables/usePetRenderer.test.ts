import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  loadAnimation: vi.fn(),
  loadDesktopPetAnimation: vi.fn(),
  pet: {
    id: 'v-za',
    name: 'v仔',
    initialAnimation: 'idle',
    lottieAnimationLoaders: { idle: vi.fn(), click: vi.fn() },
  },
}))

vi.mock('lottie-web', () => ({
  default: { loadAnimation: mocks.loadAnimation },
}))

vi.mock('vue', async (importOriginal) => ({
  ...await importOriginal<typeof import('vue')>(),
  onBeforeUnmount: vi.fn(),
}))

vi.mock('@/config/desktopPets', () => ({
  DEFAULT_PET_ID: 'v-za',
  getDesktopPetById: () => mocks.pet,
  getDesktopPetAnimationKeys: () => ['idle', 'click'],
  loadDesktopPetAnimation: mocks.loadDesktopPetAnimation,
}))

import { usePetRenderer } from './usePetRenderer'

const validAnimation = { v: '5.7.0', fr: 12, ip: 0, op: 8, w: 256, h: 256, layers: [] }

const deferred = <T>() => {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => { resolve = done })
  return { promise, resolve }
}

const animationInstance = () => ({
  destroy: vi.fn(),
  goToAndStop: vi.fn(),
  pause: vi.fn(),
  play: vi.fn(),
  addEventListener: vi.fn(),
})

describe('usePetRenderer async action guards', () => {
  beforeEach(() => {
    mocks.loadAnimation.mockReset().mockImplementation(animationInstance)
    mocks.loadDesktopPetAnimation.mockReset()
  })

  it('distinguishes a cancelled mount from invalid animation data', async () => {
    const pending = deferred<Record<string, unknown> | null>()
    mocks.loadDesktopPetAnimation.mockReturnValueOnce(pending.promise)
    const renderer = usePetRenderer()
    const mounting = renderer.mountLottie(document.createElement('div'))

    renderer.destroyLottie()
    pending.resolve(validAnimation)

    await expect(mounting).resolves.toBe('cancelled')
    expect(mocks.loadAnimation).not.toHaveBeenCalled()

    mocks.loadDesktopPetAnimation.mockResolvedValue(null)
    await expect(renderer.mountLottie(document.createElement('div'))).resolves.toBe('invalid')
  })

  it('does not revive a temporary action after cancellation', async () => {
    mocks.loadDesktopPetAnimation.mockResolvedValue(validAnimation)
    const renderer = usePetRenderer()
    await expect(renderer.mountLottie(document.createElement('div'))).resolves.toBe('mounted')
    mocks.loadAnimation.mockClear()

    const pending = deferred<Record<string, unknown> | null>()
    mocks.loadDesktopPetAnimation.mockReturnValueOnce(pending.promise)
    renderer.playTemporaryAction('click')
    renderer.cancelTemporaryAction()
    pending.resolve(validAnimation)
    await Promise.resolve()
    await Promise.resolve()

    expect(mocks.loadAnimation).not.toHaveBeenCalled()
  })
})
