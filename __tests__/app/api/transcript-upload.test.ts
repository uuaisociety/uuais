import { NextRequest } from 'next/server'

const mockGetTokens = jest.fn()
const mockGenerateStructured = jest.fn()
const mockFetchCourses = jest.fn()

jest.mock('next-firebase-auth-edge', () => ({ getTokens: (...args: unknown[]) => mockGetTokens(...args) }))
jest.mock('@/lib/auth-config', () => ({ authConfig: {} }))
jest.mock('@/lib/ai/openrouter', () => ({ generateStructured: (...args: unknown[]) => mockGenerateStructured(...args) }))
jest.mock('@/lib/courses', () => ({ fetchCourses: () => mockFetchCourses() }))

describe('POST /api/transcript/upload', () => {
  beforeEach(() => { jest.clearAllMocks() })

  it('returns 401 when not authenticated', async () => {
    mockGetTokens.mockResolvedValue(null)
    const { POST } = await import('@/app/api/transcript/upload/route')
    const req = new NextRequest('http://localhost/api/transcript/upload', { method: 'POST' })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('returns 400 when consent not given', async () => {
    mockGetTokens.mockResolvedValue({ decodedToken: { uid: 'user1' } })
    const { POST } = await import('@/app/api/transcript/upload/route')
    const formData = new FormData()
    formData.set('file', new Blob(['fake'], { type: 'application/pdf' }), 'transcript.pdf')
    const req = new NextRequest('http://localhost/api/transcript/upload', { method: 'POST', body: formData })
    const res = await POST(req)
    const body = await res.json()
    expect(res.status).toBe(400)
    expect(body.error).toMatch(/consent/i)
  })

  it('returns 400 when no file provided', async () => {
    mockGetTokens.mockResolvedValue({ decodedToken: { uid: 'user1' } })
    const { POST } = await import('@/app/api/transcript/upload/route')
    const formData = new FormData()
    formData.set('consent', 'true')
    const req = new NextRequest('http://localhost/api/transcript/upload', { method: 'POST', body: formData })
    const res = await POST(req)
    const body = await res.json()
    expect(res.status).toBe(400)
    expect(body.error).toMatch(/No file/i)
  })

  it('returns 400 when file is not PDF', async () => {
    mockGetTokens.mockResolvedValue({ decodedToken: { uid: 'user1' } })
    const { POST } = await import('@/app/api/transcript/upload/route')
    const formData = new FormData()
    formData.set('consent', 'true')
    formData.set('file', new Blob(['not pdf'], { type: 'text/plain' }), 'file.txt')
    const req = new NextRequest('http://localhost/api/transcript/upload', { method: 'POST', body: formData })
    const res = await POST(req)
    const body = await res.json()
    expect(res.status).toBe(400)
    expect(body.error).toMatch(/PDF/i)
  })

  it('returns 400 when file exceeds 5MB', async () => {
    mockGetTokens.mockResolvedValue({ decodedToken: { uid: 'user1' } })
    const { POST } = await import('@/app/api/transcript/upload/route')
    const formData = new FormData()
    formData.set('consent', 'true')
    formData.set('file', new Blob(['x'.repeat(6 * 1024 * 1024)], { type: 'application/pdf' }), 'large.pdf')
    const req = new NextRequest('http://localhost/api/transcript/upload', { method: 'POST', body: formData })
    const res = await POST(req)
    const body = await res.json()
    expect(res.status).toBe(400)
    expect(body.error).toMatch(/too large/i)
  })
})
