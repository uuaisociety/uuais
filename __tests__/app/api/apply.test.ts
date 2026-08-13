// Integration test for POST /api/apply with mocked Firebase dependencies.
import { createAuthMocks, createCollectionMock, createDocRef } from '@/__tests__/helpers/mocks'

const mockRunTransaction = jest.fn()
const { mockGetTokens, authEdgeFactory } = createAuthMocks()

const mockStorageSave = jest.fn().mockResolvedValue(undefined)
const mockStorageGetSignedUrl = jest.fn().mockResolvedValue(['http://signed.url'])
const mockStorageFileDelete = jest.fn().mockResolvedValue(undefined)
const mockStorageFile = jest.fn(() => ({
  save: mockStorageSave,
  getSignedUrl: mockStorageGetSignedUrl,
  delete: mockStorageFileDelete,
}))

jest.mock('next-firebase-auth-edge', () => authEdgeFactory)

jest.mock('firebase-admin', () => {
  const FieldValue = { serverTimestamp: () => ({ _method: 'serverTimestamp' }) }
  const firestoreFn = () => ({ runTransaction: (...args: unknown[]) => mockRunTransaction(...args) }) as unknown
  ;(firestoreFn as { FieldValue: typeof FieldValue }).FieldValue = FieldValue
  return {
    firestore: firestoreFn as typeof import('firebase-admin').firestore & { FieldValue: typeof FieldValue },
    storage: () => ({
      bucket: () => ({
        file: mockStorageFile,
      }),
    }),
  }
})

jest.mock('@/lib/auth-config', () => ({
  authConfig: { apiKey: 'test', serviceAccount: {} },
}))

// Build adminDb mocks for two collections: applicationCampaigns (doc lookup) and others (collections)
let campaignData: Record<string, unknown> = {
  status: 'open',
  teams: ['it', 'development'],
  roles: [
    { id: 'it_member', teamId: 'it', title: 'IT Member', status: 'open', order: 0 },
    { id: 'dev_member', teamId: 'development', title: 'Development Member', status: 'open', order: 1 },
  ],
}
const VALID_ROLE_RANKING = JSON.stringify([
  { roleId: 'it_member', teamId: 'it', justification: 'I am passionate about systems administration and automation.' },
])
const campaignDocRef = createDocRef('spring2026')
campaignDocRef.get = jest.fn().mockResolvedValue({
  exists: true,
  data: () => campaignData,
})

const teamAppsCollection = createCollectionMock()
const limitsCollection = createCollectionMock()
const locksCollection = createCollectionMock()
const teamAppDocRef = createDocRef('team-app-doc')
teamAppsCollection.doc = jest.fn(() => teamAppDocRef)
limitsCollection.doc = jest.fn(() => createDocRef())
locksCollection.doc = jest.fn(() => createDocRef())

// campaignQuestions: queryable by campaignId; docs configurable per test
let questionsData: { id: string; question: string; required?: boolean }[] = []
const questionsCollection = createCollectionMock()
questionsCollection.get = jest.fn().mockImplementation(() =>
  Promise.resolve({
    empty: questionsData.length === 0,
    docs: questionsData.map((q) => ({ id: q.id, data: () => q })),
    size: questionsData.length,
  }),
)

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
      if (name === 'campaignQuestions') return questionsCollection
      return createCollectionMock()
    }),
    runTransaction: (...args: unknown[]) => mockRunTransaction(...args),
  },
}))

type MockTx = { get: jest.Mock; set: jest.Mock; delete: jest.Mock }

let lastTx: MockTx | null = null

function lastApplicationPayload(): Record<string, unknown> | null {
  if (!lastTx) return null
  for (const call of lastTx.set.mock.calls) {
    const arg = call[1] as Record<string, unknown> | undefined
    if (arg && typeof arg === 'object' && 'applicationType' in arg) {
      return arg
    }
  }
  return null
}

beforeEach(() => {
  jest.clearAllMocks()
  campaignData = {
    status: 'open',
    teams: ['it', 'development'],
    roles: [
      { id: 'it_member', teamId: 'it', title: 'IT Member', status: 'open', order: 0 },
      { id: 'dev_member', teamId: 'development', title: 'Development Member', status: 'open', order: 1 },
    ],
  }
  questionsData = []
  lastTx = null
  mockRunTransaction.mockImplementation(async (cb: (tx: MockTx) => Promise<void>) => {
    const tx: MockTx = {
      get: jest.fn().mockResolvedValue({ exists: false, data: () => null }),
      set: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined),
    }
    lastTx = tx
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
      formData.set('roleRanking', VALID_ROLE_RANKING)
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
      formData.set('roleRanking', VALID_ROLE_RANKING)
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
      formData.set('roleRanking', VALID_ROLE_RANKING)
      formData.set('agree', 'true')
      const req = new Request('http://localhost/api/apply', { method: 'POST', body: formData })
      const res = await POST(req as unknown as Request)
      const body = await res.json()

      expect(res.status).toBe(400)
      expect(body.error).toMatch(/linkedin/i)
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

    it('returns 400 when roleRanking payload exceeds the raw size bound', async () => {
      mockGetTokens.mockResolvedValue({ decodedToken: { uid: 'user1' } })

      const { POST } = await import('@/app/api/apply/route')
      const formData = new FormData()
      formData.set('campaignId', 'spring2026')
      formData.set('name', 'Alice')
      formData.set('email', 'a@b.com')
      formData.set('linkedin', 'https://linkedin.com/in/x')
      formData.set('motivation', 'I want to contribute to the AI community very actively.')
      formData.set('agree', 'true')
      formData.set('roleRanking', JSON.stringify([{ roleId: 'it_member', teamId: 'it', justification: 'x'.repeat(6000) }]))
      const req = new Request('http://localhost/api/apply', { method: 'POST', body: formData })
      const res = await POST(req as unknown as Request)
      const body = await res.json()

      expect(res.status).toBe(400)
      expect(body.error).toMatch(/roleRanking must be a JSON array/i)
    })

    it('returns 400 when customAnswers payload exceeds the raw size bound', async () => {
      mockGetTokens.mockResolvedValue({ decodedToken: { uid: 'user1' } })

      const { POST } = await import('@/app/api/apply/route')
      const formData = new FormData()
      formData.set('campaignId', 'spring2026')
      formData.set('name', 'Alice')
      formData.set('email', 'a@b.com')
      formData.set('linkedin', 'https://linkedin.com/in/x')
      formData.set('motivation', 'I want to contribute to the AI community very actively.')
      formData.set('agree', 'true')
      formData.set('customAnswers', JSON.stringify({ huge: 'x'.repeat(500000) }))
      const req = new Request('http://localhost/api/apply', { method: 'POST', body: formData })
      const res = await POST(req as unknown as Request)
      const body = await res.json()

      expect(res.status).toBe(400)
      expect(body.error).toMatch(/too large/i)
    })

    it('returns 400 when interests payload exceeds the raw size bound', async () => {
      mockGetTokens.mockResolvedValue({ decodedToken: { uid: 'user1' } })

      const { POST } = await import('@/app/api/apply/route')
      const formData = new FormData()
      formData.set('campaignId', 'spring2026')
      formData.set('name', 'Alice')
      formData.set('email', 'a@b.com')
      formData.set('linkedin', 'https://linkedin.com/in/x')
      formData.set('motivation', 'I want to contribute to the AI community very actively.')
      formData.set('agree', 'true')
      formData.set('interests', JSON.stringify(['x'.repeat(21000)]))
      const req = new Request('http://localhost/api/apply', { method: 'POST', body: formData })
      const res = await POST(req as unknown as Request)
      const body = await res.json()

      expect(res.status).toBe(400)
      expect(body.error).toMatch(/too large/i)
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
      formData.set('roleRanking', VALID_ROLE_RANKING)
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

  describe('security hardening', () => {
    it('stores the verified uid on the application', async () => {
      mockGetTokens.mockResolvedValue({ decodedToken: { uid: 'user1' } })

      const { POST } = await import('@/app/api/apply/route')
      const formData = new FormData()
      formData.set('campaignId', 'spring2026')
      formData.set('name', 'Alice')
      formData.set('email', 'alice@test.com')
      formData.set('linkedin', 'https://linkedin.com/in/alice')
      formData.set('motivation', 'I want to contribute to the AI community.')
      formData.set('agree', 'true')
      formData.set('roleRanking', VALID_ROLE_RANKING)

      const req = new Request('http://localhost/api/apply', { method: 'POST', body: formData })
      const res = await POST(req as unknown as Request)

      expect(res.status).toBe(200)
      expect(lastApplicationPayload()?.uid).toBe('user1')
    })

    it('drops disabled standard fields from the stored application', async () => {
      campaignData = { status: 'open', teams: ['it', 'development'], enabledStandardFields: ['name', 'email'] }
      mockGetTokens.mockResolvedValue({ decodedToken: { uid: 'user1' } })

      const { POST } = await import('@/app/api/apply/route')
      const formData = new FormData()
      formData.set('campaignId', 'spring2026')
      formData.set('name', 'Alice')
      formData.set('email', 'alice@test.com')
      formData.set('agree', 'true')
      formData.set('teamRanking', JSON.stringify(['it']))
      formData.set('weeklyHours', '5')
      formData.set('interests', JSON.stringify(['robotics']))

      const req = new Request('http://localhost/api/apply', { method: 'POST', body: formData })
      const res = await POST(req as unknown as Request)

      expect(res.status).toBe(200)
      const payload = lastApplicationPayload()
      expect(payload?.teamRanking).toEqual([])
      expect(payload?.weeklyHours).toBe(0)
      expect(payload?.interests).toEqual([])
    })

    it('rejects a submission missing a required custom question', async () => {
      campaignData = { status: 'open', teams: ['it', 'development'], enabledStandardFields: ['name', 'email'] }
      questionsData = [{ id: 'q1', question: 'What is your favourite project?', required: true }]
      mockGetTokens.mockResolvedValue({ decodedToken: { uid: 'user1' } })

      const { POST } = await import('@/app/api/apply/route')
      const formData = new FormData()
      formData.set('campaignId', 'spring2026')
      formData.set('name', 'Alice')
      formData.set('email', 'alice@test.com')
      formData.set('agree', 'true')
      formData.set('customAnswers', JSON.stringify({}))

      const req = new Request('http://localhost/api/apply', { method: 'POST', body: formData })
      const res = await POST(req as unknown as Request)
      const body = await res.json()

      expect(res.status).toBe(400)
      expect(body.error).toMatch(/favourite project.*required|required.*favourite project/i)
    })

    it('accepts a submission when all required custom questions are answered', async () => {
      campaignData = { status: 'open', teams: ['it', 'development'], enabledStandardFields: ['name', 'email'] }
      questionsData = [{ id: 'q1', question: 'What is your favourite project?', required: true }]
      mockGetTokens.mockResolvedValue({ decodedToken: { uid: 'user1' } })

      const { POST } = await import('@/app/api/apply/route')
      const formData = new FormData()
      formData.set('campaignId', 'spring2026')
      formData.set('name', 'Alice')
      formData.set('email', 'alice@test.com')
      formData.set('agree', 'true')
      formData.set('customAnswers', JSON.stringify({ q1: 'My capstone project' }))

      const req = new Request('http://localhost/api/apply', { method: 'POST', body: formData })
      const res = await POST(req as unknown as Request)

      expect(res.status).toBe(200)
    })

    it('rejects a submission when the campaign deadline has passed', async () => {
      campaignData = { status: 'open', teams: ['it', 'development'], deadline: '2020-01-01' }
      mockGetTokens.mockResolvedValue({ decodedToken: { uid: 'user1' } })

      const { POST } = await import('@/app/api/apply/route')
      const formData = new FormData()
      formData.set('campaignId', 'spring2026')
      formData.set('name', 'Alice')
      formData.set('email', 'alice@test.com')
      formData.set('agree', 'true')

      const req = new Request('http://localhost/api/apply', { method: 'POST', body: formData })
      const res = await POST(req as unknown as Request)
      const body = await res.json()

      expect(res.status).toBe(400)
      expect(body.error).toMatch(/no longer/i)
    })

    it('accepts a submission when the campaign deadline is in the future', async () => {
      campaignData = {
        status: 'open',
        teams: ['it', 'development'],
        deadline: '2099-01-01',
        roles: [
          { id: 'it_member', teamId: 'it', title: 'IT Member', status: 'open', order: 0 },
        ],
      }
      mockGetTokens.mockResolvedValue({ decodedToken: { uid: 'user1' } })

      const { POST } = await import('@/app/api/apply/route')
      const formData = new FormData()
      formData.set('campaignId', 'spring2026')
      formData.set('name', 'Alice')
      formData.set('email', 'alice@test.com')
      formData.set('linkedin', 'https://linkedin.com/in/alice')
      formData.set('motivation', 'I want to contribute to the AI community.')
      formData.set('agree', 'true')
      formData.set('roleRanking', VALID_ROLE_RANKING)

      const req = new Request('http://localhost/api/apply', { method: 'POST', body: formData })
      const res = await POST(req as unknown as Request)

      expect(res.status).toBe(200)
    })

    it('rejects a role whose per-role deadline extends past the campaign deadline (create mode)', async () => {
      campaignData = {
        status: 'open',
        teams: ['it', 'development'],
        deadline: '2020-01-01', // campaign-wide deadline passed — authoritative
        roles: [
          { id: 'it_member', teamId: 'it', title: 'IT Member', status: 'open', order: 0, deadline: '2099-01-01' },
        ],
      }
      mockGetTokens.mockResolvedValue({ decodedToken: { uid: 'user1' } })

      const { POST } = await import('@/app/api/apply/route')
      const formData = new FormData()
      formData.set('campaignId', 'spring2026')
      formData.set('name', 'Alice')
      formData.set('email', 'alice@test.com')
      formData.set('linkedin', 'https://linkedin.com/in/alice')
      formData.set('motivation', 'I want to contribute to the AI community.')
      formData.set('agree', 'true')
      formData.set('roleRanking', VALID_ROLE_RANKING)

      const req = new Request('http://localhost/api/apply', { method: 'POST', body: formData })
      const res = await POST(req as unknown as Request)
      const body = await res.json()

      expect(res.status).toBe(400)
      expect(body.error).toMatch(/no longer/i)
    })

    it('rejects a role whose per-role deadline has also passed (create mode)', async () => {
      campaignData = {
        status: 'open',
        teams: ['it', 'development'],
        deadline: '2020-01-01',
        roles: [
          { id: 'it_member', teamId: 'it', title: 'IT Member', status: 'open', order: 0, deadline: '2021-01-01' },
        ],
      }
      mockGetTokens.mockResolvedValue({ decodedToken: { uid: 'user1' } })

      const { POST } = await import('@/app/api/apply/route')
      const formData = new FormData()
      formData.set('campaignId', 'spring2026')
      formData.set('name', 'Alice')
      formData.set('email', 'alice@test.com')
      formData.set('linkedin', 'https://linkedin.com/in/alice')
      formData.set('motivation', 'I want to contribute to the AI community.')
      formData.set('agree', 'true')
      formData.set('roleRanking', VALID_ROLE_RANKING)

      const req = new Request('http://localhost/api/apply', { method: 'POST', body: formData })
      const res = await POST(req as unknown as Request)
      const body = await res.json()

      expect(res.status).toBe(400)
      expect(body.error).toMatch(/no longer/i)
    })
  })

  describe('enabledStandardFields', () => {
    it('accepts a submission without motivation/linkedin when those fields are disabled', async () => {
      campaignData = { status: 'open', teams: ['it', 'development'], enabledStandardFields: ['name', 'email'] }
      mockGetTokens.mockResolvedValue({ decodedToken: { uid: 'user1' } })

      const { POST } = await import('@/app/api/apply/route')
      const formData = new FormData()
      formData.set('campaignId', 'spring2026')
      formData.set('name', 'Alice')
      formData.set('email', 'alice@test.com')
      formData.set('agree', 'true')
      formData.set('weeklyHours', '5')
      formData.set('interests', JSON.stringify(['robotics']))
      formData.set('teamRanking', JSON.stringify(['it']))
      formData.set('customAnswers', JSON.stringify({}))

      const req = new Request('http://localhost/api/apply', { method: 'POST', body: formData })
      const res = await POST(req as unknown as Request)

      expect(res.status).toBe(200)
    })

    it('rejects a submission missing motivation when motivation is enabled', async () => {
      campaignData = { status: 'open', teams: ['it', 'development'], enabledStandardFields: ['name', 'email', 'motivation'] }
      mockGetTokens.mockResolvedValue({ decodedToken: { uid: 'user1' } })

      const { POST } = await import('@/app/api/apply/route')
      const formData = new FormData()
      formData.set('campaignId', 'spring2026')
      formData.set('name', 'Alice')
      formData.set('email', 'alice@test.com')
      formData.set('agree', 'true')

      const req = new Request('http://localhost/api/apply', { method: 'POST', body: formData })
      const res = await POST(req as unknown as Request)
      const body = await res.json()

      expect(res.status).toBe(400)
      expect(body.error).toMatch(/motivation/i)
    })

    it('rejects a submission with teamRanking enabled but empty ranking', async () => {
      campaignData = { status: 'open', teams: ['it', 'development'], enabledStandardFields: ['name', 'email', 'teamRanking'] }
      mockGetTokens.mockResolvedValue({ decodedToken: { uid: 'user1' } })

      const { POST } = await import('@/app/api/apply/route')
      const formData = new FormData()
      formData.set('campaignId', 'spring2026')
      formData.set('name', 'Alice')
      formData.set('email', 'alice@test.com')
      formData.set('agree', 'true')
      formData.set('teamRanking', JSON.stringify([]))

      const req = new Request('http://localhost/api/apply', { method: 'POST', body: formData })
      const res = await POST(req as unknown as Request)
      const body = await res.json()

      expect(res.status).toBe(400)
      expect(body.error).toMatch(/team|preference/i)
    })

    it('still enforces max length on a disabled motivation field', async () => {
      campaignData = { status: 'open', teams: ['it', 'development'], enabledStandardFields: ['name', 'email'] }
      mockGetTokens.mockResolvedValue({ decodedToken: { uid: 'user1' } })

      const { POST } = await import('@/app/api/apply/route')
      const formData = new FormData()
      formData.set('campaignId', 'spring2026')
      formData.set('name', 'Alice')
      formData.set('email', 'alice@test.com')
      formData.set('agree', 'true')
      formData.set('motivation', 'x'.repeat(2001))

      const req = new Request('http://localhost/api/apply', { method: 'POST', body: formData })
      const res = await POST(req as unknown as Request)
      const body = await res.json()

      expect(res.status).toBe(400)
      expect(body.error).toMatch(/motivation/i)
    })
  })

  describe('add-role mode (late-opening roles)', () => {
    const existingAppRef = createDocRef('team-app-doc')
    const existingRanking = [
      { roleId: 'it_member', teamId: 'it', justification: 'I am passionate about systems administration and automation.' },
    ]

    function mockExistingApplication(roleRanking: unknown[] = existingRanking) {
      teamAppsCollection.get.mockResolvedValue({
        empty: false,
        docs: [{ ref: existingAppRef }],
        size: 1,
      })
      mockRunTransaction.mockImplementation(async (cb: (tx: MockTx) => Promise<void>) => {
        const tx: MockTx = {
          get: jest.fn().mockResolvedValue({ exists: true, data: () => ({ roleRanking }) }),
          set: jest.fn().mockResolvedValue(undefined),
          update: jest.fn().mockResolvedValue(undefined),
          delete: jest.fn().mockResolvedValue(undefined),
        }
        lastTx = tx
        await cb(tx)
      })
    }

    it('adds a new role to an existing application without re-entering the profile', async () => {
      mockGetTokens.mockResolvedValue({ decodedToken: { uid: 'user1' } })
      mockExistingApplication()

      const { POST } = await import('@/app/api/apply/route')
      const formData = new FormData()
      formData.set('mode', 'addRole')
      formData.set('campaignId', 'spring2026')
      formData.set('email', 'alice@test.com')
      formData.set('roleRanking', JSON.stringify([
        { roleId: 'dev_member', teamId: 'development', justification: 'I want to build AI products that people actually use.' },
      ]))
      const req = new Request('http://localhost/api/apply', { method: 'POST', body: formData })
      const res = await POST(req as unknown as Request)
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.roleRanking).toEqual([
        { roleId: 'dev_member', teamId: 'development', justification: 'I want to build AI products that people actually use.' },
      ])
      const updateCall = lastTx?.update.mock.calls[0]
      expect(updateCall?.[0].id).toBe('team-app-doc')
      expect(updateCall?.[1].roleRanking).toHaveLength(2)
      expect(updateCall?.[1].roleRanking[1].roleId).toBe('dev_member')
    })

    it('returns 404 when no existing application matches', async () => {
      mockGetTokens.mockResolvedValue({ decodedToken: { uid: 'user1' } })
      teamAppsCollection.get.mockResolvedValue({ empty: true, docs: [], size: 0 })

      const { POST } = await import('@/app/api/apply/route')
      const formData = new FormData()
      formData.set('mode', 'addRole')
      formData.set('campaignId', 'spring2026')
      formData.set('email', 'nobody@test.com')
      formData.set('roleRanking', VALID_ROLE_RANKING)
      const req = new Request('http://localhost/api/apply', { method: 'POST', body: formData })
      const res = await POST(req as unknown as Request)
      const body = await res.json()

      expect(res.status).toBe(404)
      expect(body.error).toMatch(/no existing application/i)
    })

    it('returns 400 when adding a role would exceed the total cap', async () => {
      mockGetTokens.mockResolvedValue({ decodedToken: { uid: 'user1' } })
      mockExistingApplication([
        { roleId: 'it_member', teamId: 'it', justification: 'a'.repeat(25) },
        { roleId: 'dev_member', teamId: 'development', justification: 'b'.repeat(25) },
        { roleId: 'growth_member', teamId: 'growth', justification: 'c'.repeat(25) },
        { roleId: 'research_member', teamId: 'research', justification: 'd'.repeat(25) },
        { roleId: 'media_member', teamId: 'media', justification: 'e'.repeat(25) },
      ])
      campaignData = {
        status: 'open',
        teams: ['it', 'development', 'growth', 'research', 'media'],
        roles: [
          { id: 'it_member', teamId: 'it', title: 'IT Member', status: 'open', order: 0 },
          { id: 'dev_member', teamId: 'development', title: 'Development Member', status: 'open', order: 1 },
          { id: 'growth_member', teamId: 'growth', title: 'Growth Member', status: 'open', order: 2 },
          { id: 'research_member', teamId: 'research', title: 'Research Member', status: 'open', order: 3 },
          { id: 'media_member', teamId: 'media', title: 'Media Member', status: 'open', order: 4 },
          { id: 'design_member', teamId: 'design', title: 'Design Member', status: 'open', order: 5 },
        ],
      }

      const { POST } = await import('@/app/api/apply/route')
      const formData = new FormData()
      formData.set('mode', 'addRole')
      formData.set('campaignId', 'spring2026')
      formData.set('email', 'alice@test.com')
      formData.set('roleRanking', JSON.stringify([
        { roleId: 'design_member', teamId: 'design', justification: 'I enjoy crafting clean interfaces for AI products.' },
      ]))
      const req = new Request('http://localhost/api/apply', { method: 'POST', body: formData })
      const res = await POST(req as unknown as Request)
      const body = await res.json()

      expect(res.status).toBe(400)
      expect(body.error).toMatch(/at most 5 roles/i)
    })

    it('returns 400 when a role in the add-role request is closed', async () => {
      mockGetTokens.mockResolvedValue({ decodedToken: { uid: 'user1' } })
      mockExistingApplication()
      campaignData = {
        status: 'open',
        teams: ['it', 'development'],
        roles: [
          { id: 'it_member', teamId: 'it', title: 'IT Member', status: 'open', order: 0 },
          { id: 'dev_member', teamId: 'development', title: 'Development Member', status: 'closed', order: 1 },
        ],
      }

      const { POST } = await import('@/app/api/apply/route')
      const formData = new FormData()
      formData.set('mode', 'addRole')
      formData.set('campaignId', 'spring2026')
      formData.set('email', 'alice@test.com')
      formData.set('roleRanking', JSON.stringify([
        { roleId: 'dev_member', teamId: 'development', justification: 'I would love to join development this cycle.' },
      ]))
      const req = new Request('http://localhost/api/apply', { method: 'POST', body: formData })
      const res = await POST(req as unknown as Request)
      const body = await res.json()

      expect(res.status).toBe(400)
      expect(body.error).toMatch(/not currently accepting/i)
    })

    it('bumps the dedicated update-cooldown marker so add-role bursts are rate limited', async () => {
      mockGetTokens.mockResolvedValue({ decodedToken: { uid: 'user1' } })
      mockExistingApplication()
      const limitsDocRef = createDocRef('limits-user1')
      limitsCollection.doc.mockReturnValue(limitsDocRef)

      const { POST } = await import('@/app/api/apply/route')
      const formData = new FormData()
      formData.set('mode', 'addRole')
      formData.set('campaignId', 'spring2026')
      formData.set('email', 'alice@test.com')
      formData.set('roleRanking', JSON.stringify([
        { roleId: 'dev_member', teamId: 'development', justification: 'I want to build AI products that people actually use.' },
      ]))
      const req = new Request('http://localhost/api/apply', { method: 'POST', body: formData })
      const res = await POST(req as unknown as Request)

      expect(res.status).toBe(200)
      const txSet = lastTx?.set.mock.calls || []
      const limitWrite = txSet.find((call) => call[0].id === 'limits-user1')
      expect(limitWrite?.[1]).toEqual({ lastRoleUpdateAtMs: expect.any(Number) })
    })
  })

  describe('resume upload', () => {
    function uploadFormData() {
      const formData = new FormData()
      formData.set('campaignId', 'spring2026')
      formData.set('name', 'Alice')
      formData.set('email', 'alice@test.com')
      formData.set('linkedin', 'https://linkedin.com/in/alice')
      formData.set('motivation', 'I want to contribute to the AI community.')
      formData.set('agree', 'true')
      formData.set('roleRanking', VALID_ROLE_RANKING)
      formData.set('resume', new File(['%PDF-1.4 test resume content'], 'resume.pdf', { type: 'application/pdf' }))
      return formData
    }

    it('saves the PDF to storage and maps the signed URL onto the application doc', async () => {
      mockGetTokens.mockResolvedValue({ decodedToken: { uid: 'user1' } })

      const { POST } = await import('@/app/api/apply/route')
      const req = new Request('http://localhost/api/apply', { method: 'POST', body: uploadFormData() })
      const res = await POST(req as unknown as Request)
      const body = await res.json()

      expect(res.status).toBe(200)
      // Uploaded to storage with a sanitized, timestamped path
      expect(mockStorageFile).toHaveBeenCalledWith(expect.stringMatching(/^team-applications\/\d+_resume\.pdf$/))
      expect(mockStorageSave).toHaveBeenCalledWith(expect.any(Buffer), { metadata: { contentType: 'application/pdf' } })
      expect(mockStorageGetSignedUrl).toHaveBeenCalledWith({ action: 'read', expires: expect.any(Number) })
      // Signed URL merged onto the application doc
      expect(teamAppDocRef.set).toHaveBeenCalledWith(
        { resume: { path: expect.stringMatching(/^team-applications\//), url: 'http://signed.url' } },
        { merge: true },
      )
      expect(body.resume.url).toBe('http://signed.url')
    })

    it('rolls back the application, lock, and limits when the storage upload fails', async () => {
      mockGetTokens.mockResolvedValue({ decodedToken: { uid: 'user1' } })
      mockStorageSave.mockRejectedValueOnce(new Error('storage down'))

      const { POST } = await import('@/app/api/apply/route')
      const req = new Request('http://localhost/api/apply', { method: 'POST', body: uploadFormData() })
      const res = await POST(req as unknown as Request)
      const body = await res.json()

      expect(res.status).toBe(500)
      // Second transaction deleted the lock, limits, and application docs
      const deletes = lastTx?.delete.mock.calls || []
      expect(deletes).toHaveLength(3)
      expect(deletes.map((c) => c[0])).toContain(teamAppDocRef)
      // No storage cleanup: the file never reached storage (save rejected)
      expect(mockStorageFileDelete).not.toHaveBeenCalled()
      expect(body.error).toBeTruthy()
    })

    it('cleans up the stored file and rolls back when the resume doc write fails', async () => {
      mockGetTokens.mockResolvedValue({ decodedToken: { uid: 'user1' } })
      teamAppDocRef.set.mockRejectedValueOnce(new Error('doc write failed'))

      const { POST } = await import('@/app/api/apply/route')
      const req = new Request('http://localhost/api/apply', { method: 'POST', body: uploadFormData() })
      const res = await POST(req as unknown as Request)

      expect(res.status).toBe(500)
      // Storage file was saved, so it gets cleaned up on rollback
      expect(mockStorageFileDelete).toHaveBeenCalled()
      const deletes = lastTx?.delete.mock.calls || []
      expect(deletes).toHaveLength(3)
      expect(deletes.map((c) => c[0])).toContain(teamAppDocRef)
    })
  })
})