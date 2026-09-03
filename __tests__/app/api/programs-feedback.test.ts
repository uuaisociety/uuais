const mockAdd = jest.fn()

jest.mock('@/lib/firebase-admin', () => ({
  adminDb: { collection: jest.fn(() => ({ add: (...args: unknown[]) => mockAdd(...args) })) },
}))

import { POST } from '@/app/api/programs/feedback/route'
import { resetRateLimits } from '@/lib/rate-limit-in-memory'
import type { NextRequest } from 'next/server'

function makeReq(body: Record<string, unknown>, ip = '203.0.113.1') {
  return new Request('http://localhost/api/programs/feedback', {
    method: 'POST',
    headers: { 'x-forwarded-for': ip },
    body: JSON.stringify(body),
  }) as unknown as NextRequest
}

const valid = {
  programSlug: 'ttf2y',
  programName: 'Engineering Physics',
  kind: 'wrong-prerequisite',
  message: 'This is not actually a prerequisite.',
}

describe('POST /api/programs/feedback', () => {
  beforeEach(() => {
    mockAdd.mockReset().mockResolvedValue({ id: 'r1' })
    resetRateLimits()
  })

  it('stores a report from an anonymous reader', async () => {
    const response = await POST(makeReq(valid))
    expect(response.status).toBe(200)
    expect(mockAdd).toHaveBeenCalledWith(
      expect.objectContaining({ programSlug: 'ttf2y', status: 'open', contact: null })
    )
  })

  it('rejects a programme that is not in the catalogue', async () => {
    // The slug becomes a link an admin follows out of the report queue.
    const response = await POST(makeReq({ ...valid, programSlug: '../../admin' }))
    expect(response.status).toBe(400)
    expect(mockAdd).not.toHaveBeenCalled()
  })

  it('rejects a report with nothing in it', async () => {
    const response = await POST(makeReq({ ...valid, message: 'hi' }))
    expect(response.status).toBe(400)
    expect(mockAdd).not.toHaveBeenCalled()
  })

  it('keeps only a course code of the shape the maps use', async () => {
    await POST(makeReq({ ...valid, courseCode: 'not-a-code' }))
    expect(mockAdd).toHaveBeenCalledWith(expect.objectContaining({ courseCode: null }))
  })

  it('stops one address after ten reports in an hour', async () => {
    for (let i = 0; i < 10; i += 1) {
      expect((await POST(makeReq(valid))).status).toBe(200)
    }
    expect((await POST(makeReq(valid))).status).toBe(429)
    // A different reader is unaffected.
    expect((await POST(makeReq(valid, '198.51.100.7'))).status).toBe(200)
  })

  it('prefers the address the platform sets over the one the client sends', async () => {
    const spoofed = new Request('http://localhost/api/programs/feedback', {
      method: 'POST',
      headers: { 'x-vercel-forwarded-for': '203.0.113.9', 'x-forwarded-for': 'made-up' },
      body: JSON.stringify(valid),
    }) as unknown as NextRequest

    for (let i = 0; i < 10; i += 1) await POST(spoofed.clone() as unknown as NextRequest)
    const response = await POST(spoofed.clone() as unknown as NextRequest)
    expect(response.status).toBe(429)
  })
})
