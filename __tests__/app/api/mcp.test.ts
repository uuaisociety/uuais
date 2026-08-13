const mockHandleMcpRequest = jest.fn()

jest.mock('@/lib/mcp/uuais-admin', () => ({
  handleMcpRequest: (...args: unknown[]) => mockHandleMcpRequest(...args),
}))

import { resetRateLimits } from '@/lib/rate-limit-in-memory'

describe('POST /api/mcp', () => {
  const originalToken = process.env.MCP_ADMIN_TOKEN

  beforeEach(() => {
    jest.clearAllMocks()
    resetRateLimits()
    process.env.MCP_ADMIN_TOKEN = 'test-secret-token'
  })

  afterAll(() => {
    if (originalToken === undefined) delete process.env.MCP_ADMIN_TOKEN
    else process.env.MCP_ADMIN_TOKEN = originalToken
  })

  it('returns 401 without a bearer token and does not reach the handler', async () => {
    const { POST } = await import('@/app/api/mcp/route')
    const res = await POST(new Request('http://localhost/api/mcp', { method: 'POST' }) as never)
    expect(res.status).toBe(401)
    expect(mockHandleMcpRequest).not.toHaveBeenCalled()
  })

  it('returns 401 with a wrong token', async () => {
    const { POST } = await import('@/app/api/mcp/route')
    const req = new Request('http://localhost/api/mcp', {
      method: 'POST',
      headers: { Authorization: 'Bearer wrong-token' },
    })
    const res = await POST(req as never)
    expect(res.status).toBe(401)
    expect(mockHandleMcpRequest).not.toHaveBeenCalled()
  })

  it('returns 401 when MCP_ADMIN_TOKEN is not configured', async () => {
    delete process.env.MCP_ADMIN_TOKEN
    const { POST } = await import('@/app/api/mcp/route')
    const req = new Request('http://localhost/api/mcp', {
      method: 'POST',
      headers: { Authorization: 'Bearer test-secret-token' },
    })
    const res = await POST(req as never)
    expect(res.status).toBe(401)
  })

  it('delegates to the MCP handler with a valid token', async () => {
    mockHandleMcpRequest.mockResolvedValue(new Response('ok', { status: 200 }))
    const { POST } = await import('@/app/api/mcp/route')
    const req = new Request('http://localhost/api/mcp', {
      method: 'POST',
      headers: { Authorization: 'Bearer test-secret-token' },
    })
    const res = await POST(req as never)
    expect(mockHandleMcpRequest).toHaveBeenCalledTimes(1)
    expect(res.status).toBe(200)
  })

  it('returns 429 after the per-IP burst limit is exceeded', async () => {
    mockHandleMcpRequest.mockResolvedValue(new Response('ok', { status: 200 }))
    const { POST } = await import('@/app/api/mcp/route')
    const headers = { Authorization: 'Bearer test-secret-token', 'x-forwarded-for': '10.0.0.9' }
    let last = 0
    for (let i = 0; i < 61; i++) {
      const res = await POST(new Request('http://localhost/api/mcp', { method: 'POST', headers }) as never)
      last = res.status
    }
    expect(last).toBe(429)
    expect(mockHandleMcpRequest).toHaveBeenCalledTimes(60)
  })

  it('returns 405 for GET and DELETE', async () => {
    const { GET, DELETE } = await import('@/app/api/mcp/route')
    expect((await GET()).status).toBe(405)
    expect((await DELETE()).status).toBe(405)
  })
})
