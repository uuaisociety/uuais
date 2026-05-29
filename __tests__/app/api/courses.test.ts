import { NextRequest } from 'next/server'

const mockFetchCourses = jest.fn<Promise<Course[]>, []>()
jest.mock('@/lib/courses', () => ({ fetchCourses: () => mockFetchCourses() }))

type Course = { id: string; title: string; description: string; tags: string[]; code: string; level: string }

const courses: Course[] = [
  { id: '1', title: 'Machine Learning', description: 'ML intro', tags: ['AI'], code: '1MA001', level: "Master's" },
  { id: '2', title: 'Linear Algebra', description: 'Math basics', tags: ['Math'], code: '1MA002', level: "Bachelor's" },
  { id: '3', title: 'Deep Learning', description: 'Advanced ML', tags: ['AI', 'NN'], code: '1MA003', level: "Master's" },
  { id: '4', title: 'Calculus', description: 'Calc basics', tags: ['Math'], code: '1MA004', level: 'Preparatory' },
]

describe('GET /api/courses', () => {
  beforeEach(() => { jest.clearAllMocks() })

  it('returns all courses with pagination', async () => {
    mockFetchCourses.mockResolvedValue(courses)
    const { GET } = await import('@/app/api/courses/route')
    const req = new NextRequest('http://localhost/api/courses')
    const res = await GET(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.courses).toHaveLength(4)
    expect(body.pagination.total).toBe(4)
  })

  it('filters by search query', async () => {
    mockFetchCourses.mockResolvedValue(courses)
    const { GET } = await import('@/app/api/courses/route')
    const req = new NextRequest('http://localhost/api/courses?search=machine')
    const res = await GET(req)
    const body = await res.json()

    expect(body.courses).toHaveLength(1)
    expect(body.courses[0].title).toBe('Machine Learning')
  })

  it('filters by level', async () => {
    mockFetchCourses.mockResolvedValue(courses)
    const { GET } = await import('@/app/api/courses/route')
    const req = new NextRequest("http://localhost/api/courses?level=Bachelor's")
    const res = await GET(req)
    const body = await res.json()

    expect(body.courses).toHaveLength(1)
    expect(body.courses[0].title).toBe('Linear Algebra')
  })

  it('paginates correctly', async () => {
    mockFetchCourses.mockResolvedValue(courses)
    const { GET } = await import('@/app/api/courses/route')
    const req = new NextRequest('http://localhost/api/courses?page=1&limit=2')
    const res = await GET(req)
    const body = await res.json()

    expect(body.courses).toHaveLength(2)
    expect(body.pagination.page).toBe(1)
    expect(body.pagination.hasNextPage).toBe(true)
  })

  it('returns 500 on fetch error', async () => {
    mockFetchCourses.mockRejectedValue(new Error('db down'))
    const { GET } = await import('@/app/api/courses/route')
    const req = new NextRequest('http://localhost/api/courses')
    const res = await GET(req)
    const body = await res.json()

    expect(res.status).toBe(500)
    expect(body.error).toBeDefined()
  })
})
