import {
  analyzeCourse,
  getPublishedBlogPosts,
  getSiteStats,
  searchSiteContent,
} from '@/lib/mcp/uuais-data';
import type { PublicSeed } from '@/lib/server-data';

const mockCollection = jest.fn()
const mockGetPublicSeed = jest.fn()
const mockFetchCourses = jest.fn()
const mockFetchCourseById = jest.fn()

jest.mock('@/lib/server-data', () => ({
  getPublicSeed: (...args: unknown[]) => mockGetPublicSeed(...args),
}))

jest.mock('@/lib/firebase-admin', () => ({
  adminDb: { collection: (...args: unknown[]) => mockCollection(...args) },
}))

jest.mock('@/lib/courses', () => ({
  fetchCourses: (...args: unknown[]) => mockFetchCourses(...args),
  fetchCourseById: (...args: unknown[]) => mockFetchCourseById(...args),
}))

interface FakeDoc {
  id: string
  data: () => Record<string, unknown>
}

function makeCollection(docs: FakeDoc[] = [], filter?: (d: FakeDoc) => boolean) {
  const visible = filter ? docs.filter(filter) : docs
  const collection = {
    where: jest.fn(() => collection),
    orderBy: jest.fn(() => collection),
    limit: jest.fn(() => collection),
    get: jest.fn(async () => ({ docs: visible })),
    doc: jest.fn((id: string) => ({
      get: jest.fn(async () => {
        const d = docs.find((x) => x.id === id)
        return d ?? { exists: false, data: () => undefined }
      }),
    })),
  }
  return collection
}

const seed: PublicSeed = {
  events: [
    { id: 'e1', title: 'AI Meetup', description: 'A talk about machine learning', location: 'Ångström', eventStartAt: '2026-09-01T10:00:00Z' } as never,
    { id: 'e2', title: 'Past event', description: 'Happened already', location: '', eventStartAt: '2026-01-01T10:00:00Z' } as never,
  ],
  jobs: [],
  faqs: [{ id: 'f1', question: 'How do I join?', answer: 'Sign up on the site', category: 'general', order: 1, published: true } as never],
  teamMembers: [{ id: 't1', name: 'Ada Lovelace', position: 'Board member', teams: ['board'] } as never],
  boardPositions: [],
  campaigns: [],
}

const blogPosts: FakeDoc[] = [
  { id: 'b1', data: () => ({ title: 'Post about ML', excerpt: 'Machine learning recap', content: 'Long content here', author: 'ada', published: true, date: '2026-08-12' }) },
  { id: 'b2', data: () => ({ title: 'Draft post', excerpt: 'unpublished', content: '', author: 'ada', published: false, date: '2026-08-11' }) },
]

const courses = [
  {
    id: '1DL034',
    code: '',
    title: 'Introduction to Machine Learning',
    description: 'Basics of ML',
    tags: ['ML', 'AI'],
    level: "Bachelor's",
    credits: 15,
    prerequisites: ['1DL073'],
    prerequisite_of: [],
    relatedCourses: [],
    Learning_outcomes: '',
  },
  {
    id: '1DL073',
    code: '1DL073',
    title: 'Natural Computation Methods for Machine Learning',
    description: 'Advanced ML',
    tags: ['ML'],
    level: "Master's",
    credits: 15,
    prerequisites: [],
    prerequisite_of: ['1DL034'],
    relatedCourses: ['1DL034'],
    Learning_outcomes: '',
  },
]

describe('lib/mcp/uuais-data', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetPublicSeed.mockResolvedValue(seed)
    mockFetchCourses.mockResolvedValue(courses)
    mockFetchCourseById.mockResolvedValue(courses[0])
    mockCollection.mockImplementation((name: string) => {
      if (name === 'blogPosts') return makeCollection(blogPosts, (d) => d.data().published === true)
      return makeCollection()
    })
  })

  describe('getPublishedBlogPosts', () => {
    it('returns only published posts', async () => {
      const posts = await getPublishedBlogPosts(10)
      expect(posts).toHaveLength(1)
      expect(posts?.[0].id).toBe('b1')
    })
  })

  describe('getSiteStats', () => {
    it('computes counts across all collections', async () => {
      const stats = await getSiteStats()
      expect(stats.counts).toMatchObject({
        events: 2,
        upcomingEvents: 1,
        jobs: 0,
        faqs: 1,
        teamMembers: 1,
        blogPosts: 1,
        courses: 2,
      })
    })
  })

  describe('searchSiteContent', () => {
    it('finds hits across events, blog, and courses', async () => {
      const { hits } = (await searchSiteContent('machine learning', 10)) ?? { hits: [] }
      const types = hits.map((h) => h.type)
      expect(types).toContain('event')
      expect(types).toContain('blog')
      expect(types).toContain('course')
      expect(hits.some((h) => h.type === 'event' && h.id === 'e1')).toBe(true)
      expect(hits.some((h) => h.type === 'course' && h.id === '1DL034')).toBe(true)
    })

    it('matches faqs by question and team by name', async () => {
      const { hits } = (await searchSiteContent('Ada Lovelace', 10)) ?? { hits: [] }
      expect(hits.some((h) => h.type === 'team' && h.id === 't1')).toBe(true)
    })

    it('returns empty hits for a missing term or empty query', async () => {
      expect((await searchSiteContent('zzzzzz', 10))?.hits).toHaveLength(0)
      expect((await searchSiteContent('', 10))?.hits).toHaveLength(0)
    })
  })

  describe('analyzeCourse', () => {
    it('resolves prerequisites and falls back to id for code', async () => {
      const result = await analyzeCourse('1DL034')
      expect(result.available).toBe(true)
      expect(result.analysis?.course.code).toBe('1DL034')
      expect(result.analysis?.prerequisites).toEqual([
        expect.objectContaining({ id: '1DL073', code: '1DL073', title: 'Natural Computation Methods for Machine Learning' }),
      ])
    })

    it('returns analysis null when the course is not found', async () => {
      mockFetchCourseById.mockResolvedValue(undefined)
      const result = await analyzeCourse('unknown')
      expect(result.available).toBe(true)
      expect(result.analysis).toBeNull()
    })

    it('returns unavailable when the course lookup fails', async () => {
      mockFetchCourseById.mockRejectedValue(new Error('boom'))
      const result = await analyzeCourse('1DL034')
      expect(result.available).toBe(false)
    })
  })
})
