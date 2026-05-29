const mockGetTokens = jest.fn()
const mockFetchModels = jest.fn()
const mockFormatModels = jest.fn()

jest.mock('next-firebase-auth-edge', () => ({ getTokens: (...args: unknown[]) => mockGetTokens(...args) }))
jest.mock('@/lib/auth-config', () => ({ authConfig: {} }))
jest.mock('@/lib/ai/openrouter-models', () => ({
  fetchOpenRouterModels: (...args: unknown[]) => mockFetchModels(...args),
  formatModelsForSelect: (...args: unknown[]) => mockFormatModels(...args),
}))

describe('GET /api/admin/openrouter-models', () => {
  beforeEach(() => { jest.clearAllMocks() })

  it('returns 401 when not authenticated', async () => {
    mockGetTokens.mockResolvedValue(null)
    const { GET } = await import('@/app/api/admin/openrouter-models/route')
    const req = new Request('http://localhost/api/admin/openrouter-models')
    const res = await GET(req as unknown as Request)
    const body = await res.json()

    expect(res.status).toBe(401)
    expect(body.error).toBe('Unauthorized')
  })

  it('returns 403 when not admin', async () => {
    mockGetTokens.mockResolvedValue({ decodedToken: { uid: 'user', admin: false } })
    const { GET } = await import('@/app/api/admin/openrouter-models/route')
    const req = new Request('http://localhost/api/admin/openrouter-models')
    const res = await GET(req as unknown as Request)
    const body = await res.json()

    expect(res.status).toBe(403)
    expect(body.error).toMatch(/admin access/i)
  })

  it('returns models for admin', async () => {
    mockGetTokens.mockResolvedValue({ decodedToken: { uid: 'admin', admin: true } })
    mockFetchModels.mockResolvedValue([{ id: 'gpt-4', name: 'GPT-4', pricing: {}, context_length: 8192 }])
    mockFormatModels.mockReturnValue([{ value: 'gpt-4', label: 'GPT-4' }])

    const { GET } = await import('@/app/api/admin/openrouter-models/route')
    const req = new Request('http://localhost/api/admin/openrouter-models')
    const res = await GET(req as unknown as Request)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.models).toHaveLength(1)
    expect(body.rawModels).toHaveLength(1)
  })

  it('returns 500 on fetch error', async () => {
    mockGetTokens.mockResolvedValue({ decodedToken: { uid: 'admin', admin: true } })
    mockFetchModels.mockRejectedValue(new Error('API down'))

    const { GET } = await import('@/app/api/admin/openrouter-models/route')
    const req = new Request('http://localhost/api/admin/openrouter-models')
    const res = await GET(req as unknown as Request)
    const body = await res.json()

    expect(res.status).toBe(500)
    expect(body.error).toMatch(/API down/i)
  })
})
