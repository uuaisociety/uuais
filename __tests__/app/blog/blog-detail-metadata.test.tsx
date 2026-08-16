import { generateMetadata } from '@/app/blog/[id]/page'
import { findPublishedBlogPost } from '@/lib/blog-server'

jest.mock('@/lib/blog-server', () => ({
  findPublishedBlogPost: jest.fn(),
  getPublishedBlogPosts: jest.fn(),
}))

const mockFind = findPublishedBlogPost as jest.Mock

const basePost = {
  id: 'p1',
  title: 'GPT-6 Launch',
  excerpt: 'A big new model',
  content: '<p>x</p>',
  author: 'AI Desk',
  date: '2026-08-01',
  image: '/images/x.jpg',
  tags: ['ai'],
  published: true,
}

describe('blog detail generateMetadata', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns generic metadata when the post is not found', async () => {
    mockFind.mockResolvedValue(null)
    const meta = await generateMetadata({ params: Promise.resolve({ id: 'nope' }) })
    expect(meta.title).toBe('Blog')
    expect(meta.openGraph).toBeUndefined()
  })

  it('returns OG metadata for a published post using its slug', async () => {
    mockFind.mockResolvedValue({ ...basePost, slug: 'gpt-6-launch' })
    const meta = await generateMetadata({ params: Promise.resolve({ id: 'gpt-6-launch' }) })
    expect(meta.title).toBe('GPT-6 Launch')
    expect(meta.description).toBe('A big new model')
    expect(meta.alternates?.canonical).toBe('https://uuais.com/blog/gpt-6-launch')
    expect(meta.openGraph?.type).toBe('article')
    expect(meta.openGraph?.url).toBe('https://uuais.com/blog/gpt-6-launch')
    expect(meta.openGraph?.images).toEqual([{ url: '/images/x.jpg', width: 1200, height: 630, alt: 'GPT-6 Launch' }])
    expect(meta.twitter?.card).toBe('summary_large_image')
  })

  it('falls back to the post id when no slug exists', async () => {
    mockFind.mockResolvedValue({ ...basePost, image: '' })
    const meta = await generateMetadata({ params: Promise.resolve({ id: 'p1' }) })
    expect(meta.openGraph?.url).toBe('https://uuais.com/blog/p1')
    expect(meta.openGraph?.images).toEqual([{ url: '/images/logo-highdef.png', width: 1200, height: 630, alt: 'GPT-6 Launch' }])
  })
})
