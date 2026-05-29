const mockGetTokens = jest.fn()
const mockBucketFile = { save: jest.fn().mockResolvedValue(undefined), makePublic: jest.fn().mockResolvedValue(undefined), getSignedUrl: jest.fn().mockResolvedValue(['http://signed.url']), exists: jest.fn().mockResolvedValue([true]), delete: jest.fn().mockResolvedValue(undefined) }
const mockDocRef = { update: jest.fn().mockResolvedValue(undefined) }

jest.mock('next-firebase-auth-edge', () => ({ getTokens: (...args: unknown[]) => mockGetTokens(...args) }))
jest.mock('@/lib/auth-config', () => ({ authConfig: {} }))

jest.mock('firebase-admin', () => ({
  apps: ['pretend-initialized'],
  app: jest.fn(() => ({ options: {} })),
  initializeApp: jest.fn(),
  credential: { cert: jest.fn() },
  auth: jest.fn(() => ({})),
  firestore: jest.fn(() => ({ doc: jest.fn(() => mockDocRef) })),
  FieldValue: { serverTimestamp: jest.fn(() => ({})) },
  storage: jest.fn(() => ({ bucket: jest.fn(() => ({ file: jest.fn(() => mockBucketFile) })) })),
}))

describe('POST /api/admin/team-image', () => {
  beforeEach(() => { jest.clearAllMocks() })

  it('returns 401 when not authenticated', async () => {
    mockGetTokens.mockResolvedValue(null)
    const { POST } = await import('@/app/api/admin/team-image/route')
    const req = new Request('http://localhost/api/admin/team-image', { method: 'POST' })
    const res = await POST(req as unknown as Request)
    expect(res.status).toBe(401)
  })

  it('returns 401 when not admin', async () => {
    mockGetTokens.mockResolvedValue({ decodedToken: { uid: 'user', admin: false } })
    const { POST } = await import('@/app/api/admin/team-image/route')
    const req = new Request('http://localhost/api/admin/team-image', { method: 'POST' })
    const res = await POST(req as unknown as Request)
    expect(res.status).toBe(401)
  })

  it('returns 400 when file missing', async () => {
    mockGetTokens.mockResolvedValue({ decodedToken: { uid: 'admin', admin: true } })
    const { POST } = await import('@/app/api/admin/team-image/route')
    const formData = new FormData()
    const req = new Request('http://localhost/api/admin/team-image', { method: 'POST', body: formData })
    const res = await POST(req as unknown as Request)
    const body = await res.json()
    expect(res.status).toBe(400)
    expect(body.error).toMatch(/missing/i)
  })

  it('returns 400 when file is not an image', async () => {
    mockGetTokens.mockResolvedValue({ decodedToken: { uid: 'admin', admin: true } })
    const { POST } = await import('@/app/api/admin/team-image/route')
    const formData = new FormData()
    formData.set('file', new Blob(['not-an-image'], { type: 'text/plain' }), 'test.txt')
    const req = new Request('http://localhost/api/admin/team-image', { method: 'POST', body: formData })
    const res = await POST(req as unknown as Request)
    const body = await res.json()
    expect(res.status).toBe(400)
    expect(body.error).toMatch(/invalid/i)
  })

  it('uploads valid image and returns URLs', async () => {
    process.env.FIREBASE_STORAGE_BUCKET = 'test-bucket'
    mockGetTokens.mockResolvedValue({ decodedToken: { uid: 'admin', admin: true } })
    const { POST } = await import('@/app/api/admin/team-image/route')
    const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0, 0, 0, 0, 0])
    const formData = new FormData()
    formData.set('file', new Blob([pngBytes], { type: 'image/png' }), 'photo.png')
    const req = new Request('http://localhost/api/admin/team-image', { method: 'POST', body: formData })
    const res = await POST(req as unknown as Request)
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(body.url).toBe('http://signed.url')
    expect(body.urlPublic).toMatch(/storage\.googleapis\.com/)
  })
})

describe('DELETE /api/admin/team-image', () => {
  beforeEach(() => { jest.clearAllMocks() })

  it('returns 401 when not authenticated', async () => {
    mockGetTokens.mockResolvedValue(null)
    const { DELETE } = await import('@/app/api/admin/team-image/route')
    const req = new Request('http://localhost/api/admin/team-image', { method: 'DELETE', body: JSON.stringify({ path: 'test.jpg' }) })
    const res = await DELETE(req as unknown as Request)
    expect(res.status).toBe(401)
  })

  it('returns 400 when path missing', async () => {
    mockGetTokens.mockResolvedValue({ decodedToken: { uid: 'admin', admin: true } })
    const { DELETE } = await import('@/app/api/admin/team-image/route')
    const req = new Request('http://localhost/api/admin/team-image', { method: 'DELETE', body: JSON.stringify({}) })
    const res = await DELETE(req as unknown as Request)
    const body = await res.json()
    expect(res.status).toBe(400)
    expect(body.error).toMatch(/missing path/i)
  })

  it('deletes existing file', async () => {
    mockGetTokens.mockResolvedValue({ decodedToken: { uid: 'admin', admin: true } })
    const { DELETE } = await import('@/app/api/admin/team-image/route')
    const req = new Request('http://localhost/api/admin/team-image', { method: 'DELETE', body: JSON.stringify({ path: 'test.jpg' }) })
    const res = await DELETE(req as unknown as Request)
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.deleted).toBe(true)
  })

  it('handles non-existent file gracefully', async () => {
    mockGetTokens.mockResolvedValue({ decodedToken: { uid: 'admin', admin: true } })
    mockBucketFile.exists.mockResolvedValue([false])
    const { DELETE } = await import('@/app/api/admin/team-image/route')
    const req = new Request('http://localhost/api/admin/team-image', { method: 'DELETE', body: JSON.stringify({ path: 'ghost.jpg' }) })
    const res = await DELETE(req as unknown as Request)
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.deleted).toBe(false)
    expect(body.reason).toBe('not-found')
  })
})
