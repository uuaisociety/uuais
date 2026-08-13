import { createAuthMocks } from '@/__tests__/helpers/mocks'

const { mockGetTokens, authEdgeFactory, authConfigFactory } = createAuthMocks()
jest.mock('next-firebase-auth-edge', () => authEdgeFactory)
jest.mock('@/lib/auth-config', () => authConfigFactory)

const mockAppRef = {
  delete: jest.fn().mockResolvedValue(undefined),
  get: jest.fn(),
}
const mockLockRef = { delete: jest.fn().mockResolvedValue(undefined) }
const mockLimitsRef = { delete: jest.fn().mockResolvedValue(undefined) }
const mockLockDoc = jest.fn(() => mockLockRef)
const mockLimitsDoc = jest.fn(() => mockLimitsRef)
const mockFileExists = jest.fn().mockResolvedValue([true])
const mockFileDelete = jest.fn().mockResolvedValue(undefined)
const mockStorageFile = jest.fn(() => ({
  exists: mockFileExists,
  delete: mockFileDelete,
}))
const mockCollection = jest.fn((name: string) => {
  if (name === 'teamApplications') {
    return { doc: jest.fn(() => mockAppRef) }
  }
  if (name === 'applicationCampaignLocks') {
    return { doc: mockLockDoc }
  }
  if (name === 'applicationUserLimits') {
    return { doc: mockLimitsDoc }
  }
  return { doc: jest.fn() }
})

jest.mock('@/lib/firebase-admin', () => ({
  adminDb: { collection: (...args: unknown[]) => mockCollection(...args) },
}))

jest.mock('firebase-admin', () => ({
  storage: () => ({
    bucket: () => ({
      file: mockStorageFile,
    }),
  }),
}))

describe('DELETE /api/admin/team-applications', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockAppRef.get.mockResolvedValue({
      exists: true,
      data: () => ({ uid: 'auth-uid-1', emailNormalized: 'alice@test.com', resume: { path: 'team-applications/123_resume.pdf' } }),
    })
  })

  it('returns 401 when not authenticated', async () => {
    mockGetTokens.mockResolvedValue(null)
    const { DELETE } = await import('@/app/api/admin/team-applications/route')
    const req = new Request('http://localhost/api/admin/team-applications', {
      method: 'DELETE',
      body: JSON.stringify({ id: 'app-1', campaignId: 'spring2026' }),
    })
    const res = await DELETE(req as unknown as Request)
    expect(res.status).toBe(401)
  })

  it('returns 403 when not admin', async () => {
    mockGetTokens.mockResolvedValue({ decodedToken: { uid: 'user', admin: false } })
    const { DELETE } = await import('@/app/api/admin/team-applications/route')
    const req = new Request('http://localhost/api/admin/team-applications', {
      method: 'DELETE',
      body: JSON.stringify({ id: 'app-1', campaignId: 'spring2026' }),
    })
    const res = await DELETE(req as unknown as Request)
    expect(res.status).toBe(403)
  })

  it('returns 400 when id/campaignId missing', async () => {
    mockGetTokens.mockResolvedValue({ decodedToken: { uid: 'admin', admin: true } })
    const { DELETE } = await import('@/app/api/admin/team-applications/route')
    const req = new Request('http://localhost/api/admin/team-applications', {
      method: 'DELETE',
      body: JSON.stringify({}),
    })
    const res = await DELETE(req as unknown as Request)
    expect(res.status).toBe(400)
  })

  it('deletes app, uid-keyed lock/limits, and the resume from storage', async () => {
    mockGetTokens.mockResolvedValue({ decodedToken: { uid: 'admin', admin: true } })
    const { DELETE } = await import('@/app/api/admin/team-applications/route')
    const req = new Request('http://localhost/api/admin/team-applications', {
      method: 'DELETE',
      body: JSON.stringify({ id: 'app-1', emailNormalized: 'alice@test.com', campaignId: 'spring2026' }),
    })
    const res = await DELETE(req as unknown as Request)

    expect(res.status).toBe(200)
    // App doc deleted
    expect(mockAppRef.delete).toHaveBeenCalled()
    // Resume deleted from storage: file path derived from the stored doc's resume.path
    expect(mockStorageFile).toHaveBeenCalledWith('team-applications/123_resume.pdf')
    expect(mockFileExists).toHaveBeenCalled()
    expect(mockFileDelete).toHaveBeenCalled()
    // Lock/limits keyed by stored uid (from appSnap.data().uid), not the request body
    expect(mockLockDoc).toHaveBeenCalledWith('auth-uid-1__spring2026')
    expect(mockLimitsDoc).toHaveBeenCalledWith('auth-uid-1')
    expect(mockLockRef.delete).toHaveBeenCalled()
    expect(mockLimitsRef.delete).toHaveBeenCalled()
  })

  it('falls back to emailNormalized identity when the doc has no uid', async () => {
    mockGetTokens.mockResolvedValue({ decodedToken: { uid: 'admin', admin: true } })
    mockAppRef.get.mockResolvedValue({
      exists: true,
      data: () => ({ emailNormalized: 'bob@test.com' }),
    })
    const { DELETE } = await import('@/app/api/admin/team-applications/route')
    const req = new Request('http://localhost/api/admin/team-applications', {
      method: 'DELETE',
      body: JSON.stringify({ id: 'app-2', emailNormalized: 'bob@test.com', campaignId: 'spring2026' }),
    })
    const res = await DELETE(req as unknown as Request)
    expect(res.status).toBe(200)
    expect(mockLockDoc).toHaveBeenCalledWith('bob%40test.com__spring2026')
    expect(mockLimitsDoc).toHaveBeenCalledWith('bob%40test.com')
    expect(mockLockRef.delete).toHaveBeenCalled()
    expect(mockLimitsRef.delete).toHaveBeenCalled()
  })

  it('still deletes the application when the doc is missing', async () => {
    mockGetTokens.mockResolvedValue({ decodedToken: { uid: 'admin', admin: true } })
    mockAppRef.get.mockResolvedValue({ exists: false })
    const { DELETE } = await import('@/app/api/admin/team-applications/route')
    const req = new Request('http://localhost/api/admin/team-applications', {
      method: 'DELETE',
      body: JSON.stringify({ id: 'app-3', campaignId: 'spring2026' }),
    })
    const res = await DELETE(req as unknown as Request)
    expect(res.status).toBe(200)
    expect(mockAppRef.delete).toHaveBeenCalled()
  })
})
