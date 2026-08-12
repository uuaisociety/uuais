import { NextRequest } from 'next/server'
import { createAuthMocks } from '@/__tests__/helpers/mocks'

const { mockGetTokens, authEdgeFactory, authConfigFactory } = createAuthMocks()
jest.mock('next-firebase-auth-edge', () => authEdgeFactory)
jest.mock('@/lib/auth-config', () => authConfigFactory)

describe('GET /api/analytics/firebase', () => {
  beforeEach(() => {
    jest.resetModules()
    jest.clearAllMocks()
    delete process.env.GA4_PROPERTY_ID
  })

  it('returns 401 when not authenticated', async () => {
    mockGetTokens.mockResolvedValue(null)
    const { GET } = await import('@/app/api/analytics/firebase/route')
    const req = new NextRequest('http://localhost/api/analytics/firebase')
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  it('returns 403 when not admin', async () => {
    mockGetTokens.mockResolvedValue({ decodedToken: { uid: 'user', admin: false } })
    const { GET } = await import('@/app/api/analytics/firebase/route')
    const req = new NextRequest('http://localhost/api/analytics/firebase')
    const res = await GET(req)
    expect(res.status).toBe(403)
  })

  it('returns configured=false when GA4_PROPERTY_ID not set', async () => {
    mockGetTokens.mockResolvedValue({ decodedToken: { uid: 'admin', admin: true } })
    const { GET } = await import('@/app/api/analytics/firebase/route')
    const req = new NextRequest('http://localhost/api/analytics/firebase')
    const res = await GET(req)
    const body = await res.json()
    expect(body.configured).toBe(false)
    expect(body.message).toMatch(/GA4_PROPERTY_ID/)
  })
})
