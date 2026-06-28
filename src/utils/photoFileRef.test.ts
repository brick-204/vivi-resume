import { describe, it, expect } from 'vitest'
import {
  isPhotoRef,
  makePhotoRef,
  parsePhotoRef,
  extractPhotos,
  injectPhotos,
} from '@/utils/photoFileRef'

describe('isPhotoRef', () => {
  it('returns true for a valid photo ref', () => {
    expect(isPhotoRef('__PHOTO_REF__:photos/abc.jpg')).toBe(true)
  })

  it('returns false for a plain string', () => {
    expect(isPhotoRef('just a string')).toBe(false)
  })

  it('returns false for empty string', () => {
    expect(isPhotoRef('')).toBe(false)
  })

  it('returns false for data URL', () => {
    expect(isPhotoRef('data:image/png;base64,abc123')).toBe(false)
  })

  it('returns false for partial prefix', () => {
    expect(isPhotoRef('__PHOTO_REF')).toBe(false)
    expect(isPhotoRef('PHOTO_REF__:x')).toBe(false)
  })
})

describe('makePhotoRef', () => {
  it('creates a ref string with the correct prefix', () => {
    const result = makePhotoRef('photos/test-id.jpg')
    expect(result).toBe('__PHOTO_REF__:photos/test-id.jpg')
  })

  it('works with different extensions', () => {
    expect(makePhotoRef('photos/abc.png')).toBe('__PHOTO_REF__:photos/abc.png')
  })
})

describe('parsePhotoRef', () => {
  it('extracts the relative path from a ref', () => {
    expect(parsePhotoRef('__PHOTO_REF__:photos/abc.jpg')).toBe('photos/abc.jpg')
  })

  it('extracts path for PNG', () => {
    expect(parsePhotoRef('__PHOTO_REF__:photos/xyz.png')).toBe('photos/xyz.png')
  })
})

describe('makePhotoRef + parsePhotoRef round-trip', () => {
  it('round-trips correctly', () => {
    const path = 'photos/my-resume.jpg'
    expect(parsePhotoRef(makePhotoRef(path))).toBe(path)
  })

  it('round-trips with nested path', () => {
    const path = 'photos/sub/dir/img.png'
    expect(parsePhotoRef(makePhotoRef(path))).toBe(path)
  })
})

describe('extractPhotos', () => {
  it('extracts photo data URL and replaces with ref', () => {
    const resume = {
      basicInfo: {
        name: 'Test',
        photo: 'data:image/jpeg;base64,/9j/4AAQ',
      },
    }
    const { resume: result, photos } = extractPhotos(resume, 'r1')

    expect(photos.length).toBe(1)
    expect(photos[0].relativePath).toBe('photos/r1.jpg')
    expect(photos[0].dataUrl).toBe('data:image/jpeg;base64,/9j/4AAQ')
    expect(photos[0].mimeType).toBe('image/jpeg')
    expect((result as any).basicInfo.photo).toBe('__PHOTO_REF__:photos/r1.jpg')
  })

  it('extracts photoOriginal as well', () => {
    const resume = {
      basicInfo: {
        name: 'Test',
        photo: 'data:image/jpeg;base64,/9j/4AAQ',
        photoOriginal: 'data:image/png;base64,iVBOR',
      },
    }
    const { resume: result, photos } = extractPhotos(resume, 'r2')

    expect(photos.length).toBe(2)
    expect(photos[0].relativePath).toBe('photos/r2.jpg')
    expect(photos[1].relativePath).toBe('photos/r2_original.png')
    expect((result as any).basicInfo.photo).toBe('__PHOTO_REF__:photos/r2.jpg')
    expect((result as any).basicInfo.photoOriginal).toBe(
      '__PHOTO_REF__:photos/r2_original.png',
    )
  })

  it('skips photo field that is already a ref', () => {
    const resume = {
      basicInfo: {
        name: 'Test',
        photo: '__PHOTO_REF__:photos/r1.jpg',
      },
    }
    const { photos } = extractPhotos(resume, 'r1')
    expect(photos.length).toBe(0)
  })

  it('skips photo field that is not a data URL', () => {
    const resume = {
      basicInfo: {
        name: 'Test',
        photo: 'https://example.com/photo.jpg',
      },
    }
    const { photos } = extractPhotos(resume, 'r1')
    expect(photos.length).toBe(0)
  })

  it('handles resume with no photo fields', () => {
    const resume = {
      basicInfo: {
        name: 'Test',
      },
    }
    const { resume: result, photos } = extractPhotos(resume, 'r1')
    expect(photos.length).toBe(0)
    expect((result as any).basicInfo.name).toBe('Test')
  })

  it('detects PNG from data URL prefix', () => {
    const resume = {
      basicInfo: {
        name: 'Test',
        photo: 'data:image/png;base64,iVBOR',
      },
    }
    const { photos } = extractPhotos(resume, 'r3')
    expect(photos[0].relativePath).toBe('photos/r3.png')
    expect(photos[0].mimeType).toBe('image/png')
  })
})

describe('injectPhotos', () => {
  it('replaces photo ref with data URL from map', () => {
    const resume = {
      basicInfo: {
        name: 'Test',
        photo: '__PHOTO_REF__:photos/r1.jpg',
      },
    }
    const photoData = new Map<string, string>()
    photoData.set('photos/r1.jpg', 'data:image/jpeg;base64,/9j/4AAQ')

    const result = injectPhotos(resume, photoData)
    expect((result as any).basicInfo.photo).toBe('data:image/jpeg;base64,/9j/4AAQ')
  })

  it('replaces both photo and photoOriginal refs', () => {
    const resume = {
      basicInfo: {
        name: 'Test',
        photo: '__PHOTO_REF__:photos/r1.jpg',
        photoOriginal: '__PHOTO_REF__:photos/r1_original.png',
      },
    }
    const photoData = new Map<string, string>()
    photoData.set('photos/r1.jpg', 'data:image/jpeg;base64,/9j/4AAQ')
    photoData.set('photos/r1_original.png', 'data:image/png;base64,iVBOR')

    const result = injectPhotos(resume, photoData)
    expect((result as any).basicInfo.photo).toBe('data:image/jpeg;base64,/9j/4AAQ')
    expect((result as any).basicInfo.photoOriginal).toBe('data:image/png;base64,iVBOR')
  })

  it('clears photo field when data is missing from map', () => {
    const resume = {
      basicInfo: {
        name: 'Test',
        photo: '__PHOTO_REF__:photos/r1.jpg',
      },
    }
    const photoData = new Map<string, string>()

    const result = injectPhotos(resume, photoData)
    expect((result as any).basicInfo.photo).toBe('')
  })

  it('leaves non-ref photo fields untouched', () => {
    const resume = {
      basicInfo: {
        name: 'Test',
        photo: 'data:image/jpeg;base64,existing',
      },
    }
    const photoData = new Map<string, string>()

    const result = injectPhotos(resume, photoData)
    expect((result as any).basicInfo.photo).toBe('data:image/jpeg;base64,existing')
  })
})

describe('extractPhotos + injectPhotos round-trip', () => {
  it('round-trips photo data correctly', () => {
    const original = {
      basicInfo: {
        name: 'Test',
        photo: 'data:image/jpeg;base64,/9j/4AAQ',
      },
    }

    // Extract: photo → ref
    const { resume: extracted, photos } = extractPhotos(original, 'r1')
    expect((extracted as any).basicInfo.photo).toBe('__PHOTO_REF__:photos/r1.jpg')

    // Build the map from extracted photos
    const photoData = new Map<string, string>()
    for (const p of photos) {
      photoData.set(p.relativePath, p.dataUrl)
    }

    // Inject: ref → photo
    const restored = injectPhotos(extracted, photoData)
    expect((restored as any).basicInfo.photo).toBe('data:image/jpeg;base64,/9j/4AAQ')
  })

  it('round-trips both photo and photoOriginal', () => {
    const original = {
      basicInfo: {
        name: 'Test',
        photo: 'data:image/jpeg;base64,/9j/4AAQ',
        photoOriginal: 'data:image/png;base64,iVBOR',
      },
    }

    const { resume: extracted, photos } = extractPhotos(original, 'r2')
    const photoData = new Map<string, string>()
    for (const p of photos) {
      photoData.set(p.relativePath, p.dataUrl)
    }

    const restored = injectPhotos(extracted, photoData)
    expect((restored as any).basicInfo.photo).toBe('data:image/jpeg;base64,/9j/4AAQ')
    expect((restored as any).basicInfo.photoOriginal).toBe('data:image/png;base64,iVBOR')
  })
})
