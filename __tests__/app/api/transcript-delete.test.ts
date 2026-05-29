const mockGetTokens = jest.fn()
jest.mock('next-firebase-auth-edge', () => ({ getTokens: (...args: unknown[]) => mockGetTokens(...args) }))
jest.mock('@/lib/auth-config', () => ({ authConfig: {} }))

describe('DELETE /api/transcript/delete', () => {
  beforeEach(() => { jest.clearAllMocks() })

  it('returns 401 when not authenticated', async () => {
    mockGetTokens.mockResolvedValue(null)
    const { DELETE } = await import('@/app/api/transcript/delete/route')
    const req = new Request('http://localhost/api/transcript/delete', { method: 'DELETE' })
    const res = await DELETE(req as unknown as Request)
    const body = await res.json()

    expect(res.status).toBe(401)
    expect(body.error).toBe('Unauthorized')
  })

  it('returns uid when authenticated', async () => {
    mockGetTokens.mockResolvedValue({ decodedToken: { uid: 'user123' } })
    const { DELETE } = await import('@/app/api/transcript/delete/route')
    const req = new Request('http://localhost/api/transcript/delete', { method: 'DELETE' })
    const res = await DELETE(req as unknown as Request)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.uid).toBe('user123')
    expect(body.success).toBe(true)
  })
})
