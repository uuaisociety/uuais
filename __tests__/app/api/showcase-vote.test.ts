const mockAuthorizeMember = jest.fn()
jest.mock('@/lib/member-auth', () => ({
  authorizeMember: (...args: unknown[]) => mockAuthorizeMember(...args),
}))

jest.mock('@/lib/firebase-admin', () => ({}))

const mockTx = {
  get: jest.fn(),
  set: jest.fn(),
  update: jest.fn(),
}
const mockDocRef = { get: jest.fn(), path: '' }
const mockDb = {
  doc: jest.fn((path: string) => ({ ...mockDocRef, path })),
  runTransaction: jest.fn(async (fn: (tx: typeof mockTx) => Promise<void>) => fn(mockTx)),
}

jest.mock('firebase-admin', () => ({
  apps: ['pretend-initialized'],
  app: jest.fn(() => ({ options: {} })),
  initializeApp: jest.fn(),
  credential: { cert: jest.fn() },
  firestore: Object.assign(jest.fn(() => mockDb), {
    FieldValue: {
      serverTimestamp: jest.fn(() => ({ __ts: true })),
      increment: jest.fn((n: number) => ({ __inc: n })),
    },
  }),
  storage: jest.fn(() => ({ bucket: jest.fn() })),
}))

import { POST } from '@/app/api/showcase/vote/route'

function makeReq(body: Record<string, unknown> = {}) {
  return new Request('http://localhost/api/showcase/vote', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

describe('POST /api/showcase/vote', () => {
  function mockProjectSnap(published: boolean, votes = 3) {
    mockTx.get.mockImplementation((ref: { path: string }) =>
      Promise.resolve(
        ref.path.startsWith('showcaseVotes/')
          ? { exists: false, data: () => null }
          : { exists: true, data: () => ({ votes, published }) },
      ),
    )
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockAuthorizeMember.mockResolvedValue({ ok: true, uid: 'u1' })
    mockProjectSnap(true)
  })

  it('returns 401 when not authorized as member', async () => {
    mockAuthorizeMember.mockResolvedValue({ ok: false, reason: 'no-auth' })
    const res = await POST(makeReq({ projectId: 'p1' }))
    expect(res.status).toBe(401)
  })

  it('returns 400 when projectId is missing', async () => {
    const res = await POST(makeReq({}))
    expect(res.status).toBe(400)
  })

  it('returns 409 when the user already voted', async () => {
    mockTx.get.mockImplementation((ref: { path: string }) =>
      Promise.resolve(
        ref.path.startsWith('showcaseVotes/')
          ? { exists: true, data: () => ({ createdAt: 'x' }) }
          : { exists: true, data: () => ({ votes: 3, published: true }) },
      ),
    )
    const res = await POST(makeReq({ projectId: 'p1' }))
    expect(res.status).toBe(409)
  })

  it('returns 404 when the project is unpublished', async () => {
    mockProjectSnap(false)
    const res = await POST(makeReq({ projectId: 'p1' }))
    expect(res.status).toBe(404)
  })

  it('records the vote and returns the new count', async () => {
    mockDocRef.get = jest.fn().mockResolvedValue({ exists: true, data: () => ({ votes: 4, published: true }) })
    const res = await POST(makeReq({ projectId: 'p1' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({ ok: true, votes: 4 })
    expect(mockTx.set).toHaveBeenCalled()
    expect(mockTx.update).toHaveBeenCalledWith(expect.objectContaining({ path: 'showcaseProjects/p1' }), { votes: { __inc: 1 } })
  })
})
