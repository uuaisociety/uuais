import { NextRequest, NextResponse } from 'next/server'

const mockAuthMiddleware = jest.fn()
let capturedOptions: Record<string, unknown> = {}

jest.mock('next-firebase-auth-edge', () => ({
  authMiddleware: (_req: unknown, options: unknown) => {
    capturedOptions = options as Record<string, unknown>
    return mockAuthMiddleware(options)
  },
}))
jest.mock('@/lib/auth-config', () => ({ authConfig: {} }))

import { proxy } from '@/proxy'

function makeRequest(url: string): NextRequest {
  return new NextRequest(url)
}

describe('proxy admin API enforcement', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    capturedOptions = {}
    mockAuthMiddleware.mockResolvedValue(new NextResponse('next'))
  })

  it('applies an admin gate to /api/admin/* paths', async () => {
    await proxy(makeRequest('http://localhost/api/admin/team-applications/resume?path=x'))
    expect(capturedOptions).toHaveProperty('handleValidToken')
    expect(capturedOptions).toHaveProperty('handleInvalidToken')
  })

  it('does not apply the admin gate to public /api paths', async () => {
    await proxy(makeRequest('http://localhost/api/chat'))
    expect(capturedOptions).not.toHaveProperty('handleValidToken')
  })

  it('still gates /admin page routes', async () => {
    await proxy(makeRequest('http://localhost/admin/dashboard'))
    expect(capturedOptions).toHaveProperty('handleValidToken')
  })

  it('returns 403 for a valid token without admin claims', async () => {
    await proxy(makeRequest('http://localhost/api/admin/team-applications/resume?path=x'))
    const handleValidToken = capturedOptions.handleValidToken as (
      tokens: { decodedToken: Record<string, unknown> },
      headers: Headers,
    ) => Promise<NextResponse>
    const res = await handleValidToken(
      { decodedToken: { uid: 'user', admin: false } },
      new Headers()
    )
    expect(res.status).toBe(403)
  })

  it('passes through for an admin token', async () => {
    await proxy(makeRequest('http://localhost/api/admin/team-applications/resume?path=x'))
    const handleValidToken = capturedOptions.handleValidToken as (
      tokens: { decodedToken: Record<string, unknown> },
      headers: Headers,
    ) => Promise<NextResponse>
    const res = await handleValidToken(
      { decodedToken: { uid: 'admin', admin: true } },
      new Headers()
    )
    expect(res.status).toBe(200)
  })

  it('passes through for a super admin token', async () => {
    await proxy(makeRequest('http://localhost/api/admin/team-applications/resume?path=x'))
    const handleValidToken = capturedOptions.handleValidToken as (
      tokens: { decodedToken: Record<string, unknown> },
      headers: Headers,
    ) => Promise<NextResponse>
    const res = await handleValidToken(
      { decodedToken: { uid: 'super', superAdmin: true } },
      new Headers()
    )
    expect(res.status).toBe(200)
  })

  it('returns 401 when no token is present', async () => {
    await proxy(makeRequest('http://localhost/api/admin/team-applications/resume?path=x'))
    const handleInvalidToken = capturedOptions.handleInvalidToken as () => Promise<NextResponse>
    const res = await handleInvalidToken()
    expect(res.status).toBe(401)
  })
})
