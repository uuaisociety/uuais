const mockFetchCourseById = jest.fn()
jest.mock('@/lib/courses', () => ({ fetchCourseById: (...args: unknown[]) => mockFetchCourseById(...args) }))

describe('POST /api/courses/batch', () => {
  beforeEach(() => { jest.clearAllMocks() })

  it('returns courses for valid IDs', async () => {
    mockFetchCourseById.mockImplementation((id: string) => {
      if (id === '1') return { id: '1', title: 'ML' }
      if (id === '2') return { id: '2', title: 'Algebra' }
      return undefined
    })

    const { POST } = await import('@/app/api/courses/batch/route')
    const req = new Request('http://localhost/api/courses/batch', {
      method: 'POST',
      body: JSON.stringify({ ids: ['1', '2', 'nonexistent'] }),
    })
    const res = await POST(req as unknown as Request)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.courses).toHaveLength(2)
  })

  it('returns empty array for empty ids', async () => {
    const { POST } = await import('@/app/api/courses/batch/route')
    const req = new Request('http://localhost/api/courses/batch', {
      method: 'POST',
      body: JSON.stringify({ ids: [] }),
    })
    const res = await POST(req as unknown as Request)
    const body = await res.json()

    expect(body.courses).toEqual([])
  })

  it('returns 400 when ids is not an array', async () => {
    const { POST } = await import('@/app/api/courses/batch/route')
    const req = new Request('http://localhost/api/courses/batch', {
      method: 'POST',
      body: JSON.stringify({ ids: 'not-array' }),
    })
    const res = await POST(req as unknown as Request)
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error).toMatch(/must be an array/i)
  })

  it('limits batch size to 50', async () => {
    mockFetchCourseById.mockResolvedValue(undefined)
    const ids = Array.from({ length: 100 }, (_, i) => String(i))

    const { POST } = await import('@/app/api/courses/batch/route')
    const req = new Request('http://localhost/api/courses/batch', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    })
    const res = await POST(req as unknown as Request)

    expect(res.status).toBe(200)
    expect(mockFetchCourseById).toHaveBeenCalledTimes(50)
  })

  it('returns 500 on fetch error', async () => {
    mockFetchCourseById.mockRejectedValue(new Error('db down'))

    const { POST } = await import('@/app/api/courses/batch/route')
    const req = new Request('http://localhost/api/courses/batch', {
      method: 'POST',
      body: JSON.stringify({ ids: ['1'] }),
    })
    const res = await POST(req as unknown as Request)
    const body = await res.json()

    expect(res.status).toBe(500)
    expect(body.error).toBeDefined()
  })
})
