import { previewImageFor, BLOG_PREVIEW_IMAGES } from '@/lib/blog-preview'

describe('previewImageFor', () => {
  it('returns a known preview path', () => {
    expect(BLOG_PREVIEW_IMAGES.length).toBeGreaterThanOrEqual(3)
    expect(previewImageFor('anything')).toMatch(/^\/images\//)
    expect(BLOG_PREVIEW_IMAGES).toContain(previewImageFor('anything'))
  })

  it('is deterministic for the same seed', () => {
    expect(previewImageFor('Weekly AI Digest')).toBe(previewImageFor('Weekly AI Digest'))
  })

  it('distributes across the pool for different seeds', () => {
    const seen = new Set(Array.from({ length: 40 }, (_, i) => previewImageFor(`post-${i}`)))
    expect(seen.size).toBeGreaterThan(1)
  })
})
