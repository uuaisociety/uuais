import { checkShowcaseRateLimit } from '@/lib/showcase-rate-limit'

const mockGet = jest.fn()
const mockSet = jest.fn()
const mockUpdate = jest.fn()
const mockDocRef = { get: mockGet, set: mockSet, update: mockUpdate }
const mockDoc = jest.fn(() => mockDocRef)

jest.mock('@/lib/firebase-admin', () => ({
  adminDb: { collection: jest.fn(() => ({ doc: mockDoc })) },
}))

jest.mock('firebase-admin/firestore', () => ({
  FieldValue: { increment: jest.fn((n: number) => ({ __inc: n })) },
}))

const WINDOW_MS = 60 * 1000

function existingDoc(data: Record<string, unknown>) {
  return { exists: true, data: () => data }
}

describe('checkShowcaseRateLimit', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGet.mockResolvedValue({ exists: false, data: () => null })
  })

  it('targets the per-user per-action usage doc', async () => {
    await checkShowcaseRateLimit('u1', 'vote', 60, 1)
    expect(mockDoc).toHaveBeenCalledWith('u1_vote')
  })

  it('allows the first request in a fresh window and records it', async () => {
    await expect(checkShowcaseRateLimit('u1', 'vote', 60, 1)).resolves.toEqual({
      allowed: true,
      retryAfterSeconds: 0,
    })
    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({ uid: 'u1', action: 'vote', count: 1, windowStart: expect.any(Number) }),
      { merge: true },
    )
  })

  it('allows a request within the window and increments the count', async () => {
    mockGet.mockResolvedValue(existingDoc({ windowStart: Date.now() - 10_000, count: 1 }))
    await expect(checkShowcaseRateLimit('u1', 'vote', 60, 1)).resolves.toEqual({
      allowed: true,
      retryAfterSeconds: 0,
    })
    expect(mockUpdate).toHaveBeenCalledWith({ count: { __inc: 1 } })
    expect(mockSet).not.toHaveBeenCalled()
  })

  it('increments a doc that is within the window but has no count yet', async () => {
    mockGet.mockResolvedValue(existingDoc({ windowStart: Date.now() - 10_000 }))
    await expect(checkShowcaseRateLimit('u1', 'vote', 60, 1)).resolves.toEqual({
      allowed: true,
      retryAfterSeconds: 0,
    })
    expect(mockUpdate).toHaveBeenCalledWith({ count: { __inc: 1 } })
  })

  it('rejects once the window count reaches the limit, with a retry-after', async () => {
    mockGet.mockResolvedValue(existingDoc({ windowStart: Date.now() - 30_000, count: 2 }))
    const status = await checkShowcaseRateLimit('u1', 'vote', 2, 1)
    expect(status.allowed).toBe(false)
    // Half the window is gone, so roughly 30s remain; assert the guard rails.
    expect(status.retryAfterSeconds).toBeGreaterThan(0)
    expect(status.retryAfterSeconds).toBeLessThanOrEqual(60)
    expect(mockUpdate).not.toHaveBeenCalled()
    expect(mockSet).not.toHaveBeenCalled()
  })

  it('never reports a retry-after below one second', async () => {
    mockGet.mockResolvedValue(existingDoc({ windowStart: Date.now() - (WINDOW_MS - 50), count: 5 }))
    const status = await checkShowcaseRateLimit('u1', 'vote', 5, 1)
    expect(status.allowed).toBe(false)
    expect(status.retryAfterSeconds).toBe(1)
  })

  it('resets an expired window and starts counting again', async () => {
    mockGet.mockResolvedValue(existingDoc({ windowStart: Date.now() - 2 * WINDOW_MS, count: 5 }))
    await expect(checkShowcaseRateLimit('u1', 'vote', 2, 1)).resolves.toEqual({
      allowed: true,
      retryAfterSeconds: 0,
    })
    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({ count: 1 }),
      { merge: true },
    )
  })

  it('treats a doc without a numeric windowStart as a fresh window', async () => {
    mockGet.mockResolvedValue(existingDoc({ count: 9 }))
    await expect(checkShowcaseRateLimit('u1', 'vote', 5, 1)).resolves.toEqual({
      allowed: true,
      retryAfterSeconds: 0,
    })
    expect(mockSet).toHaveBeenCalled()
  })
})