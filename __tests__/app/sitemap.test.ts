jest.mock('@/lib/server-data', () => ({
  getPublicSeed: jest.fn().mockResolvedValue({ events: [], jobs: [], faqs: [], team: [] }),
}))

jest.mock('@/lib/blog-server', () => ({ getPublishedBlogPosts: jest.fn().mockResolvedValue([]) }))
jest.mock('@/lib/showcase-server', () => ({
  getPublishedShowcaseProjects: jest.fn().mockResolvedValue([]),
}))

import sitemap from '@/app/sitemap'
import { listPrograms, programSlug } from '@/lib/programs'

describe('sitemap', () => {
  it('lists every programme map, not just the catalogue', async () => {
    // The maps prerender their whole course list, so leaving them out hid the content.
    const urls = (await sitemap()).map((entry) => entry.url)
    const missing = listPrograms()
      .map((entry) => `/programs/${programSlug(entry)}`)
      .filter((path) => !urls.some((url) => url.endsWith(path)))

    expect(missing).toEqual([])
    expect(listPrograms().length).toBeGreaterThan(70)
  })

  it('still lists the catalogue itself', async () => {
    const urls = (await sitemap()).map((entry) => entry.url)
    expect(urls.some((url) => url.endsWith('/programs'))).toBe(true)
  })

  it('leaves out the routes gated while the navigator is unreleased', async () => {
    const urls = (await sitemap()).map((entry) => entry.url)
    expect(urls.some((url) => url.endsWith('/explore'))).toBe(false)
    expect(urls.some((url) => url.endsWith('/projects/course-navigator'))).toBe(false)
  })
})
