import { NextRequest } from 'next/server'

describe('GET /api/analytics/firebase', () => {
  beforeEach(() => {
    jest.resetModules()
    delete process.env.GA4_PROPERTY_ID
  })

  it('returns configured=false when GA4_PROPERTY_ID not set', async () => {
    const { GET } = await import('@/app/api/analytics/firebase/route')
    const req = new NextRequest('http://localhost/api/analytics/firebase')
    const res = await GET(req)
    const body = await res.json()
    expect(body.configured).toBe(false)
    expect(body.message).toMatch(/GA4_PROPERTY_ID/)
  })
})
