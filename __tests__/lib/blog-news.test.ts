import { fetchNewsCandidates } from '@/lib/ai/blog/news'

const mockGetSettings = jest.fn()
jest.mock('@/lib/ai/blog/settings', () => ({
  getBlogAISettings: (...args: unknown[]) => mockGetSettings(...args),
}))

const mockQueryGet = jest.fn().mockResolvedValue({ docs: [], forEach: () => {} })
const mockConfigGet = jest.fn().mockResolvedValue({ exists: false, data: () => ({}) })
const mockCollection = jest.fn()
jest.mock('@/lib/firebase-admin', () => ({
  adminDb: { collection: (name: string) => mockCollection(name) },
}))
// Chainable query mock (getPreviouslyCoveredUrls chains two .where() calls).
const makeQuery = () => ({
  where: () => makeQuery(),
  limit: () => ({ get: mockQueryGet }),
  get: mockQueryGet,
})
mockCollection.mockImplementation((name: string) => {
  if (name === 'config') {
    return { doc: () => ({ get: mockConfigGet }) }
  }
  return makeQuery()
})

function makeSnapshot(docs: { data: () => Record<string, unknown> }[]) {
  return { docs, forEach: (fn: (d: { data: () => Record<string, unknown> }) => void) => docs.forEach(fn) }
}

const feeds = [
  { name: 'OpenAI', type: 'rss', url: 'https://openai.com/news/rss.xml' },
  { name: 'DeepMind', type: 'rss', url: 'https://deepmind.google/blog/rss.xml' },
  { name: 'Anthropic', type: 'scrape', url: 'https://www.anthropic.com/news', hrefPrefix: '/news/' },
]

const rssXml = `<?xml version="1.0"?>
<rss version="2.0"><channel>
  <item><title>Story One</title><link>https://openai.com/story-one</link><pubDate>Mon, 11 Aug 2026 10:00:00 GMT</pubDate><description>&lt;p&gt;Description one&lt;/p&gt;</description></item>
  <item><title>Story Two</title><link>https://openai.com/story-two</link><pubDate>Sun, 10 Aug 2026 09:00:00 GMT</pubDate></item>
</channel></rss>`

const atomXml = `<?xml version="1.0"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <entry><title>Atom Story</title><link href="https://deepmind.google/blog/atom-1"/><updated>2026-08-12T00:00:00Z</updated></entry>
</feed>`

const anthropicHtml = `<html><body>
  <a href="/news/announcing">Anthropic announces Claude 5</a>
  <a href="/news/security">Anthropic security report</a>
  <a href="/about">About us</a>
</body></html>`

function makeFetch(url: string) {
  if (url.includes('openai.com')) return rssXml
  if (url.includes('deepmind.google')) return atomXml
  if (url.includes('anthropic.com')) return anthropicHtml
  return ''
}

describe('fetchNewsCandidates (hermes-style research pipeline)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.EXA_API_KEY = ''
    mockQueryGet.mockResolvedValue(makeSnapshot([]))
    mockConfigGet.mockResolvedValue({ exists: false, data: () => ({}) })
    mockGetSettings.mockResolvedValue({ feeds, exaQuery: 'ai news', editorialNotes: '', maxOutputTokens: 4096, systemPrompt: 'p', model: 'm', updatedAt: null, updatedBy: null })
    global.fetch = jest.fn((url: unknown) =>
      Promise.resolve({ ok: true, status: 200, text: async () => makeFetch(String(url)) })
    )
  })

  it('collects candidates from RSS, Atom and scraped feeds', async () => {
    const result = await fetchNewsCandidates({})
    const titles = result.candidates.map((c) => c.title)
    expect(titles).toEqual(expect.arrayContaining(['Story One', 'Story Two', 'Atom Story', 'Anthropic announces Claude 5', 'Anthropic security report']))
    expect(result.sources.feeds).toEqual(expect.arrayContaining(['OpenAI', 'DeepMind', 'Anthropic']))
    expect(result.candidates.find((c) => c.url === 'https://www.anthropic.com/news/announcing')).toBeDefined()
  })

  it('parses Atom link attributes into article URLs', async () => {
    const result = await fetchNewsCandidates({})
    expect(result.candidates.find((c) => c.title === 'Atom Story')?.url).toBe('https://deepmind.google/blog/atom-1')
  })

  it('dedupes the same story surfaced from multiple feeds', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        text: async () => `<?xml version="1.0"?><rss version="2.0"><channel><item><title>Shared</title><link>https://shared.com/story</link></item></channel></rss>`,
      })
    )
    const result = await fetchNewsCandidates({})
    const shared = result.candidates.filter((c) => normalizeUrlSafe(c.url) === 'shared.com/story')
    expect(shared.length).toBe(1)
  })

  it('excludes URLs already cited by previous AI posts', async () => {
    mockQueryGet.mockResolvedValue(
      makeSnapshot([{ data: () => ({ published: true, sources: [{ url: 'https://openai.com/story-one' }] }) }])
    )
    const result = await fetchNewsCandidates({})
    expect(result.candidates.find((c) => c.title === 'Story One')).toBeUndefined()
    expect(result.candidates.find((c) => c.title === 'Story Two')).toBeDefined()
  })

  it('excludes URLs the admin has marked as used', async () => {
    mockConfigGet.mockResolvedValue({ exists: true, data: () => ({ urls: ['https://openai.com/story-one'] }) })
    const result = await fetchNewsCandidates({})
    expect(result.candidates.find((c) => c.title === 'Story One')).toBeUndefined()
    expect(result.candidates.find((c) => c.title === 'Story Two')).toBeDefined()
  })

  it('warns when EXA_API_KEY is unset but still returns feed candidates', async () => {
    const result = await fetchNewsCandidates({})
    expect(result.candidates.length).toBeGreaterThan(0)
    expect(result.warnings.some((w) => /EXA_API_KEY is not set/.test(w))).toBe(true)
  })
})

function normalizeUrlSafe(url: string): string {
  try {
    const u = new URL(url)
    return `${u.hostname}${u.pathname.replace(/\/+$/, '')}`
  } catch {
    return url
  }
}
