/**
 * Integration test for POST /api/board-apply
 *
 * Tests request/response logic with mocked Firebase dependencies.
 * For real Firebase tests, create a separate file (e.g. *.firebase.test.ts)
 * without jest.mock() calls — those only run when FIREBASE_ENV=ci.
 */

const mockGetTokens = jest.fn()
const mockRunTransaction = jest.fn()

jest.mock('next-firebase-auth-edge', () => ({
  getTokens: (...args: unknown[]) => mockGetTokens(...args),
}))

jest.mock('firebase-admin', () => {
  const FieldValue = { serverTimestamp: () => ({ _method: 'serverTimestamp' }) }
  const firestoreFn = () => ({ runTransaction: (...args: unknown[]) => mockRunTransaction(...args) })
  ;(firestoreFn as { FieldValue: typeof FieldValue }).FieldValue = FieldValue
  return {
    firestore: firestoreFn as typeof firestoreFn & { FieldValue: typeof FieldValue },
    storage: () => ({
      bucket: () => ({
        file: () => ({
          save: jest.fn().mockResolvedValue(undefined),
          getSignedUrl: jest.fn().mockResolvedValue(['http://signed.url']),
        }),
      }),
    }),
    FieldValue,
  }
})

jest.mock('@/lib/auth-config', () => ({
  authConfig: { apiKey: 'test', serviceAccount: {} },
}))

function createDocRef(id = 'doc-id') {
  return {
    id,
    get: jest.fn().mockResolvedValue({ exists: false, data: () => null }),
    set: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined),
  }
}

function createCollectionMock() {
  const chain: Record<string, jest.Mock> = {} as Record<string, jest.Mock>
  chain.where = jest.fn(() => chain)
  chain.count = jest.fn(() => chain)
  chain.get = jest.fn().mockResolvedValue({ data: () => ({ count: 0 }), size: 0 })
  chain.doc = jest.fn(() => createDocRef())
  return chain as { where: jest.Mock; count: jest.Mock; get: jest.Mock; doc: jest.Mock }
}

jest.mock('@/lib/firebase-admin', () => ({
  adminDb: {
    collection: jest.fn(() => createCollectionMock()),
    runTransaction: (...args: unknown[]) => mockRunTransaction(...args),
  },
}))

type MockTx = {
  get: jest.Mock;
  set: jest.Mock;
  delete: jest.Mock;
}

beforeEach(() => {
  jest.clearAllMocks()
  mockRunTransaction.mockImplementation(async (cb: (tx: MockTx) => Promise<void>) => {
    const tx: MockTx = {
      get: jest.fn().mockResolvedValue({ exists: false, data: () => null }),
      set: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined),
    }
    await cb(tx)
  })
})

describe('POST /api/board-apply', () => {
  describe('authentication', () => {
    it('returns 401 when no auth token', async () => {
      mockGetTokens.mockResolvedValue(null)

      const { POST } = await import('@/app/api/board-apply/route')
      const req = new Request('http://localhost/api/board-apply', { method: 'POST' })
      const res = await POST(req as unknown as Request)
      const body = await res.json()

      expect(res.status).toBe(401)
      expect(body.error).toBe('Unauthorized')
    })
  })

  describe('validation', () => {
    it('returns 400 when name is missing', async () => {
      mockGetTokens.mockResolvedValue({ decodedToken: { uid: 'admin1', admin: true } })

      const { POST } = await import('@/app/api/board-apply/route')
      const formData = new FormData()
      formData.set('email', 'a@b.com')
      const req = new Request('http://localhost/api/board-apply', { method: 'POST', body: formData })
      const res = await POST(req as unknown as Request)
      const body = await res.json()

      expect(res.status).toBe(400)
      expect(body.error).toMatch(/name|email/i)
    })

    it('returns 400 when no CV file', async () => {
      mockGetTokens.mockResolvedValue({ decodedToken: { uid: 'admin1', admin: true } })

      const { POST } = await import('@/app/api/board-apply/route')
      const formData = new FormData()
      formData.set('name', 'Alice')
      formData.set('email', 'a@b.com')
      formData.set('role', 'Chair')
      formData.set('agree', 'true')
      const req = new Request('http://localhost/api/board-apply', { method: 'POST', body: formData })
      const res = await POST(req as unknown as Request)
      const body = await res.json()

      expect(res.status).toBe(400)
      expect(body.error).toMatch(/CV/i)
    })

    it('returns 400 on missing agreement', async () => {
      mockGetTokens.mockResolvedValue({ decodedToken: { uid: 'admin1', admin: true } })

      const { POST } = await import('@/app/api/board-apply/route')
      const formData = new FormData()
      formData.set('name', 'Alice')
      formData.set('email', 'a@b.com')
      formData.set('role', 'Chair')
      formData.set('cv', new Blob([''], { type: 'application/pdf' }), 'cv.pdf')
      const req = new Request('http://localhost/api/board-apply', { method: 'POST', body: formData })
      const res = await POST(req as unknown as Request)
      const body = await res.json()

      expect(res.status).toBe(400)
      expect(body.error).toMatch(/agreement/i)
    })
  })

  describe('successful submission', () => {
    it('writes application and returns 200', async () => {
      mockGetTokens.mockResolvedValue({ decodedToken: { uid: 'admin1', admin: true } })

      const { POST } = await import('@/app/api/board-apply/route')
      const formData = new FormData()
      formData.set('name', 'Alice')
      formData.set('email', 'alice@test.com')
      formData.set('role', 'Chairperson')
      formData.set('agree', 'true')
      formData.set('cv', new Blob([''], { type: 'application/pdf' }), 'cv.pdf')
      formData.set('coverOption', 'text')
      formData.set('coverText', 'I am interested in this role.')

      const req = new Request('http://localhost/api/board-apply', { method: 'POST', body: formData })
      const res = await POST(req as unknown as Request)

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.name).toBe('Alice')
      expect(body.id).toBeDefined()
    })
  })
})
