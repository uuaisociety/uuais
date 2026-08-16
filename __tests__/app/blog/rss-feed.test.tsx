import { GET } from '@/app/blog/rss.xml/route'
import { getPublishedBlogPosts } from '@/lib/blog-server'

jest.mock('@/lib/blog-server', () => ({
  getPublishedBlogPosts: jest.fn(),
}))

const mockGetPosts = getPublishedBlogPosts as jest.Mock

const posts = [
  {
    id: 'p1',
    title: 'Weekly AI Digest',
    excerpt: 'A digest about AI.',
    date: '2026-08-14',
    slug: 'weekly-ai-digest',
    author: 'AI Desk',
    authorType: 'ai',
    content: '<p>x</p>',
    tags: ['ai news'],
    published: true,
  },
  {
    id: 'p2',
    title: 'Event Recap: Hackathon',
    excerpt: 'What happened.',
    date: '2026-08-01',
    author: 'Alice',
    content: '<p>y</p>',
    tags: [],
    published: true,
  },
]

describe('GET /blog/rss.xml', () => {
  beforeEach(() => { jest.clearAllMocks() })

  it('returns a valid RSS feed with slug URLs and categories', async () => {
    mockGetPosts.mockResolvedValue(posts)
    const res = await GET()
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('application/rss+xml')
    const xml = await res.text()

    expect(xml).toContain('<title>UU AI Society Blog</title>')
    expect(xml).toContain('<link>https://uuais.com/blog</link>')
    expect(xml).toContain('<title>Weekly AI Digest</title>')
    expect(xml).toContain('<guid isPermaLink="true">https://uuais.com/blog/weekly-ai-digest</guid>')
    expect(xml).toContain('<category>AI News Desk</category>')
    expect(xml).toContain('<category>From the Team</category>')
    expect(xml).toContain('A digest about AI.')
    expect(xml).toContain('Fri, 14 Aug 2026') // toUTCString of 2026-08-14
  })

  it('falls back to the post id when there is no slug', async () => {
    mockGetPosts.mockResolvedValue([posts[1]])
    const xml = await (await GET()).text()
    expect(xml).toContain('https://uuais.com/blog/p2')
  })

  it('escapes XML in titles', async () => {
    mockGetPosts.mockResolvedValue([{ ...posts[0], title: 'A & B <C>' }])
    const xml = await (await GET()).text()
    expect(xml).toContain('A &amp; B &lt;C&gt;')
  })
})
