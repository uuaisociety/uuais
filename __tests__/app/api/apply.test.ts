/**
 * Integration test for POST /api/apply
 *
 * Tests request/response logic with mocked Firebase dependencies.
 */

import { createAuthMocks, createCollectionMock, createDocRef } from '@/__tests__/helpers/mocks'

const mockRunTransaction = jest.fn()
const { mockGetTokens, authEdgeFactory } = createAuthMocks()

jest.mock('next-firebase-auth-edge', () => authEdgeFactory)

jest.mock('firebase-admin', () => {
  const FieldValue = { serverTimestamp: () => ({ _method: 'serverTimestamp' }) }
  const firestoreFn = () => ({ runTransaction: (...args: unknown[]) => mockRunTransaction(...args) }) as unknown
  ;(firestoreFn as { FieldValue: typeof FieldValue }).FieldValue = FieldValue
  return {
    firestore: firestoreFn as typeof import('firebase-admin').firestore & { FieldValue: typeof FieldValue },
    storage: () => ({
      bucket: () => ({
        file: () => ({
          save: jest.fn().mockResolvedValue(undefined),
          getSignedUrl: jest.fn().mockResolvedValue(['http://signed.url']),
        }),
      }),
    }),
  }
})

jest.mock('@/lib/auth-config', () => ({
  authConfig: { apiKey: 'test', serviceAccount: {} },
}))

// Build adminDb mocks for two collections: applicationCampaigns (doc lookup) and others (collections)
const campaignDocRef = createDocRef('spring2026')
campaignDocRef.get = jest.fn().mockResolvedValue({
  exists: true,
  data: () => ({ status: 'open', teams: ['it', 'development'] }),
})

const teamAppsCollection = createCollectionMock()
const limitsCollection = createCollectionMock()
const locksCollection = createCollectionMock()
const teamAppDocRef = createDocRef('team-app-doc')
teamAppsCollection.doc = jest.fn(() => teamAppDocRef)
limitsCollection.doc = jest.fn(() => createDocRef())
locksCollection.doc = jest.fn(() => createDocRef())

jest.mock('@/lib/firebase-admin', () => ({
  adminDb: {
    collection: jest.fn((name: string) => {
      if (name === 'applicationCampaigns') {
        const c = createCollectionMock()
        c.doc = jest.fn(() => campaignDocRef)
        return c
      }
      if (name === 'teamApplications') return teamAppsCollection
      if (name === 'applicationUserLimits') return limitsCollection
      if (name === 'applicationCampaignLocks') return locksCollection
      return createCollectionMock()
    }),
    runTransaction: (...args: unknown[]) => mockRunTransaction(...args),
  },
}))

type MockTx = { get: jest.Mock; set: jest.Mock; delete: jest.Mock }

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

describe('POST /api/apply', () => {
  describe('authentication', () => {
    it('returns 401 when no auth token', async () => {
      mockGetTokens.mockResolvedValue(null)

      const { POST } = await import('@/app/api/apply/route')
      const req = new Request('http://localhost/api/apply', { method: 'POST' })
      const res = await POST(req as unknown as Request)
      const body = await res.json()

      expect(res.status).toBe(401)
      expect(body.error).toMatch(/sign in/i)
    })
  })

  describe('validation', () => {
    it('returns 400 when campaignId is missing', async () => {
      mockGetTokens.mockResolvedValue({ decodedToken: { uid: 'user1' } })

      const { POST } = await import('@/app/api/apply/route')
      const formData = new FormData()
      formData.set('name', 'Alice')
      formData.set('email', 'a@b.com')
      const req = new Request('http://localhost/api/apply', { method: 'POST', body: formData })
      const res = await POST(req as unknown as Request)
      const body = await res.json()

      expect(res.status).toBe(400)
      expect(body.error).toMatch(/campaign/i)
    })

    it('returns 400 when name is missing', async () => {
      mockGetTokens.mockResolvedValue({ decodedToken: { uid: 'user1' } })

      const { POST } = await import('@/app/api/apply/route')
      const formData = new FormData()
      formData.set('campaignId', 'spring2026')
      formData.set('email', 'a@b.com')
      formData.set('motivation', 'I want to join.')
      formData.set('linkedin', 'https://linkedin.com/in/x')
      formData.set('agree', 'true')
      const req = new Request('http://localhost/api/apply', { method: 'POST', body: formData })
      const res = await POST(req as unknown as Request)
      const body = await res.json()

      expect(res.status).toBe(400)
      expect(body.error).toMatch(/name|email/i)
    })

    it('returns 400 when motivation is missing', async () => {
      mockGetTokens.mockResolvedValue({ decodedToken: { uid: 'user1' } })

      const { POST } = await import('@/app/api/apply/route')
      const formData = new FormData()
      formData.set('campaignId', 'spring2026')
      formData.set('name', 'Alice')
      formData.set('email', 'a@b.com')
      formData.set('linkedin', 'https://linkedin.com/in/x')
      formData.set('agree', 'true')
      const req = new Request('http://localhost/api/apply', { method: 'POST', body: formData })
      const res = await POST(req as unknown as Request)
      const body = await res.json()

      expect(res.status).toBe(400)
      expect(body.error).toMatch(/motivation/i)
    })

    it('returns 400 when agreement is missing', async () => {
      mockGetTokens.mockResolvedValue({ decodedToken: { uid: 'user1' } })

      const { POST } = await import('@/app/api/apply/route')
      const formData = new FormData()
      formData.set('campaignId', 'spring2026')
      formData.set('name', 'Alice')
      formData.set('email', 'a@b.com')
      formData.set('linkedin', 'https://linkedin.com/in/x')
      formData.set('motivation', 'I want to join.')
      const req = new Request('http://localhost/api/apply', { method: 'POST', body: formData })
      const res = await POST(req as unknown as Request)
      const body = await res.json()

      expect(res.status).toBe(400)
      expect(body.error).toMatch(/agreement/i)
    })

    it('returns 400 when linkedin is missing', async () => {
      mockGetTokens.mockResolvedValue({ decodedToken: { uid: 'user1' } })

      const { POST } = await import('@/app/api/apply/route')
      const formData = new FormData()
      formData.set('campaignId', 'spring2026')
      formData.set('name', 'Alice')
      formData.set('email', 'a@b.com')
      formData.set('motivation', 'I want to contribute to the AI community very actively.')
      formData.set('agree', 'true')
      const req = new Request('http://localhost/api/apply', { method: 'POST', body: formData })
      const res = await POST(req as unknown as Request)
      const body = await res.json()

      expect(res.status).toBe(400)
      expect(body.error).toMatch(/linkedin/i)
    })

    it('returns 400 when name exceeds max length', async () => {
      mockGetTokens.mockResolvedValue({ decodedToken: { uid: 'user1' } })

      const { POST } = await import('@/app/api/apply/route')
      const formData = new FormData()
      formData.set('campaignId', 'spring2026')
      formData.set('name', 'A'.repeat(101))
      formData.set('email', 'a@b.com')
      formData.set('linkedin', 'https://linkedin.com/in/x')
      formData.set('motivation', 'I want to join.')
      formData.set('agree', 'true')
      const req = new Request('http://localhost/api/apply', { method: 'POST', body: formData })
      const res = await POST(req as unknown as Request)
      const body = await res.json()

      expect(res.status).toBe(400)
      expect(body.error).toMatch(/name.*100|100.*name/i)
    })

    it('returns 400 when linkedin uses javascript: scheme', async () => {
      mockGetTokens.mockResolvedValue({ decodedToken: { uid: 'user1' } })

      const { POST } = await import('@/app/api/apply/route')
      const formData = new FormData()
      formData.set('campaignId', 'spring2026')
      formData.set('name', 'Alice')
      formData.set('email', 'a@b.com')
      formData.set('linkedin', 'javascript:alert(1)')
      formData.set('motivation', 'I want to contribute to the AI community very actively.')
      formData.set('agree', 'true')
      const req = new Request('http://localhost/api/apply', { method: 'POST', body: formData })
      const res = await POST(req as unknown as Request)
      const body = await res.json()

      expect(res.status).toBe(400)
      expect(body.error).toMatch(/scheme|invalid/i)
    })

    it('returns 400 when weekly hours exceeds max', async () => {
      mockGetTokens.mockResolvedValue({ decodedToken: { uid: 'user1' } })

      const { POST } = await import('@/app/api/apply/route')
      const formData = new FormData()
      formData.set('campaignId', 'spring2026')
      formData.set('name', 'Alice')
      formData.set('email', 'a@b.com')
      formData.set('linkedin', 'https://linkedin.com/in/x')
      formData.set('motivation', 'I want to contribute to the AI community very actively.')
      formData.set('agree', 'true')
      formData.set('weeklyHours', '999')
      const req = new Request('http://localhost/api/apply', { method: 'POST', body: formData })
      const res = await POST(req as unknown as Request)
      const body = await res.json()

      expect(res.status).toBe(400)
      expect(body.error).toMatch(/hours|between/i)
    })
  })

  describe('successful submission', () => {
    it('writes application and returns 200', async () => {
      mockGetTokens.mockResolvedValue({ decodedToken: { uid: 'user1' } })

      const { POST } = await import('@/app/api/apply/route')
      const formData = new FormData()
      formData.set('campaignId', 'spring2026')
      formData.set('name', 'Alice')
      formData.set('email', 'alice@test.com')
      formData.set('linkedin', 'https://linkedin.com/in/alice')
      formData.set('motivation', 'I want to contribute to the AI community.')
      formData.set('agree', 'true')
      formData.set('weeklyHours', '5')
      formData.set('interests', JSON.stringify(['robotics', 'nlp']))
      formData.set('teamRanking', JSON.stringify(['it', 'development']))
      formData.set('customAnswers', JSON.stringify({}))

      const req = new Request('http://localhost/api/apply', { method: 'POST', body: formData })
      const res = await POST(req as unknown as Request)

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.name).toBe('Alice')
      expect(body.campaignId).toBe('spring2026')
      expect(body.id).toBeDefined()
    })
  })
})