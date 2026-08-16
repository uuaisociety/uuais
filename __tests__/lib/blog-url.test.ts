import { normalizeNewsUrl, isHttpUrl, isAllowedImageUrl } from '@/lib/ai/blog/url'

describe('normalizeNewsUrl', () => {
  it('lowercases host and path, strips trailing slashes', () => {
    expect(normalizeNewsUrl('https://Example.com/Story/')).toBe('example.com/story')
  })

  it('strips hash and utm tracking params', () => {
    expect(normalizeNewsUrl('https://example.com/story?utm_source=x&utm_medium=y&a=1#section')).toBe(
      'example.com/story'
    )
  })

  it('collapses to host+path, dropping query strings', () => {
    expect(normalizeNewsUrl('https://example.com/?p=1')).toBe('example.com/')
  })

  it('falls back to a trimmed lowercase string for invalid URLs', () => {
    expect(normalizeNewsUrl('not a url')).toBe('not a url')
  })
})

describe('isHttpUrl', () => {
  it('accepts http and https', () => {
    expect(isHttpUrl('https://example.com')).toBe(true)
    expect(isHttpUrl('http://example.com')).toBe(true)
  })

  it('rejects javascript:, data:, ftp and relative links', () => {
    expect(isHttpUrl('javascript:alert(1)')).toBe(false)
    expect(isHttpUrl('data:text/html,hi')).toBe(false)
    expect(isHttpUrl('ftp://example.com/x')).toBe(false)
    expect(isHttpUrl('/relative/path')).toBe(false)
  })
})

describe('isAllowedImageUrl', () => {
  it('allows hosts next/image is configured to serve', () => {
    expect(isAllowedImageUrl('https://firebasestorage.googleapis.com/v0/b/x/o/img.jpg')).toBe(true)
    expect(isAllowedImageUrl('https://storage.googleapis.com/x/img.jpg')).toBe(true)
  })

  it('rejects other hosts and malformed input', () => {
    expect(isAllowedImageUrl('https://openai.com/news/og.jpg')).toBe(false)
    expect(isAllowedImageUrl('not a url')).toBe(false)
    expect(isAllowedImageUrl('')).toBe(false)
  })
})
