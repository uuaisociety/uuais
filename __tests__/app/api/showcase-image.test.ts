const mockAuthorizeMember = jest.fn()
jest.mock('@/lib/member-auth', () => ({
  authorizeMember: (...args: unknown[]) => mockAuthorizeMember(...args),
}))

const mockRequireAdmin = jest.fn()
jest.mock('@/lib/server-auth', () => ({
  requireAdmin: (...args: unknown[]) => mockRequireAdmin(...args),
}))

const mockCheckShowcaseRateLimit = jest.fn()
jest.mock('@/lib/showcase-rate-limit', () => ({
  checkShowcaseRateLimit: (...args: unknown[]) => mockCheckShowcaseRateLimit(...args),
}))

jest.mock('@/lib/firebase-admin', () => ({}))

const mockBucketFile = {
  save: jest.fn().mockResolvedValue(undefined),
  makePublic: jest.fn().mockResolvedValue(undefined),
  getSignedUrl: jest.fn().mockResolvedValue(['http://signed.url']),
  exists: jest.fn().mockResolvedValue([true]),
  delete: jest.fn().mockResolvedValue(undefined),
}
const mockBucket = { name: 'test-bucket', file: jest.fn(() => mockBucketFile) }

jest.mock('firebase-admin', () => ({
  apps: ['pretend-initialized'],
  app: jest.fn(() => ({ options: { storageBucket: 'test-bucket' } })),
  initializeApp: jest.fn(),
  credential: { cert: jest.fn() },
  firestore: jest.fn(),
  storage: jest.fn(() => ({ bucket: jest.fn(() => mockBucket) })),
  FieldValue: { serverTimestamp: jest.fn() },
}))

import { POST, DELETE } from '@/app/api/showcase/image/route'

const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0, 0, 0, 0, 0])

function makeUploadReq(file: Blob | null, extra: Record<string, string> = {}) {
  const formData = new FormData()
  if (file) formData.set('file', file, 'photo.png')
  Object.entries(extra).forEach(([k, v]) => formData.set(k, v))
  return new Request('http://localhost/api/showcase/image', { method: 'POST', body: formData })
}

function mockIsAdmin() {
  mockRequireAdmin.mockResolvedValue({ ok: true, session: { uid: 'u1', isAdmin: true, isSuperAdmin: false } })
}

describe('POST /api/showcase/image', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockAuthorizeMember.mockResolvedValue({ ok: true, uid: 'u1' })
    mockRequireAdmin.mockResolvedValue({ ok: false, reason: 'not-admin' })
    mockCheckShowcaseRateLimit.mockResolvedValue({ allowed: true, retryAfterSeconds: 0 })
    mockBucketFile.exists.mockResolvedValue([true])
  })

  it('returns 401 when not authorized as member', async () => {
    mockAuthorizeMember.mockResolvedValue({ ok: false, reason: 'no-auth' })
    const res = await POST(makeUploadReq(null))
    expect(res.status).toBe(401)
  })

  it('returns 400 when file is missing', async () => {
    const res = await POST(makeUploadReq(null))
    expect(res.status).toBe(400)
  })

  it('returns 400 when file is not an image', async () => {
    const res = await POST(makeUploadReq(new Blob(['not-an-image'], { type: 'text/plain' })))
    expect(res.status).toBe(400)
  })

  it('rejects unknown magic bytes even when the client claims image/png', async () => {
    const res = await POST(makeUploadReq(new Blob(['some random bytes here'], { type: 'image/png' })))
    expect(res.status).toBe(400)
    expect(mockBucketFile.save).not.toHaveBeenCalled()
  })

  it('returns 429 when the upload rate limit is hit', async () => {
    mockCheckShowcaseRateLimit.mockResolvedValue({ allowed: false, retryAfterSeconds: 120 })
    const res = await POST(makeUploadReq(new Blob([pngBytes])))
    expect(res.status).toBe(429)
    expect(await res.json()).toEqual({ error: 'rate-limit', retryAfterSeconds: 120 })
    expect(mockCheckShowcaseRateLimit).toHaveBeenCalledWith('u1', 'upload', 20, 60)
    expect(mockBucketFile.save).not.toHaveBeenCalled()
  })

  it('uploads a valid image, detecting the content type from magic bytes', async () => {
    // Client claims octet-stream, but the PNG magic bytes must win.
    const res = await POST(makeUploadReq(new Blob([pngBytes], { type: 'application/octet-stream' })))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(body.path).toMatch(/^showcase\/u1\//)
    expect(body.url).toBe('http://signed.url')
    expect(body.urlPublic).toMatch(/storage\.googleapis\.com/)
    expect(mockBucketFile.save).toHaveBeenCalledWith(
      expect.any(Buffer),
      expect.objectContaining({ metadata: expect.objectContaining({ contentType: 'image/png' }) }),
    )
    expect(mockBucketFile.makePublic).toHaveBeenCalled()
  })

  it('deletes a previous cover image when the member owns it', async () => {
    const res = await POST(makeUploadReq(new Blob([pngBytes], { type: 'image/png' }), { previousPath: 'showcase/u1/old.png' }))
    expect(res.status).toBe(200)
    expect(mockBucketFile.delete).toHaveBeenCalled()
  })

  it('returns 403 when a member tries to replace a cover they do not own', async () => {
    const res = await POST(makeUploadReq(new Blob([pngBytes], { type: 'image/png' }), { previousPath: 'showcase/u2/other.png' }))
    expect(res.status).toBe(403)
    expect(await res.json()).toEqual({ error: 'forbidden', reason: 'not-owner' })
    expect(mockBucketFile.save).not.toHaveBeenCalled()
    expect(mockBucketFile.delete).not.toHaveBeenCalled()
  })

  it('allows an admin to replace any cover', async () => {
    mockIsAdmin()
    const res = await POST(makeUploadReq(new Blob([pngBytes], { type: 'image/png' }), { previousPath: 'showcase/u2/other.png' }))
    expect(res.status).toBe(200)
    expect(mockBucketFile.delete).toHaveBeenCalled()
  })

  it('does not delete a previous file outside the showcase/ prefix', async () => {
    const res = await POST(makeUploadReq(new Blob([pngBytes], { type: 'image/png' }), { previousPath: 'team-images/old.png' }))
    expect(res.status).toBe(200)
    expect(mockBucketFile.delete).not.toHaveBeenCalled()
  })

  it('ignores a client-supplied folder and always stores under showcase/', async () => {
    const res = await POST(makeUploadReq(new Blob([pngBytes], { type: 'image/png' }), { folder: 'events' }))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.path).toMatch(/^showcase\/u1\//)
  })

  it('returns 400 for oversized files', async () => {
    const big = new Uint8Array(5 * 1024 * 1024)
    big.set(pngBytes)
    const res = await POST(makeUploadReq(new Blob([big], { type: 'image/png' })))
    expect(res.status).toBe(400)
    expect(mockBucketFile.save).not.toHaveBeenCalled()
  })

  it('rejects image content-type that lacks matching magic bytes', async () => {
    const res = await POST(makeUploadReq(new Blob(['<svg onload="alert(1)"></svg>'], { type: 'image/svg+xml' })))
    expect(res.status).toBe(400)
  })
})

describe('DELETE /api/showcase/image', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockAuthorizeMember.mockResolvedValue({ ok: true, uid: 'u1' })
    mockRequireAdmin.mockResolvedValue({ ok: false, reason: 'not-admin' })
    mockCheckShowcaseRateLimit.mockResolvedValue({ allowed: true, retryAfterSeconds: 0 })
    mockBucketFile.exists.mockResolvedValue([true])
  })

  it('returns 401 when not authorized as member', async () => {
    mockAuthorizeMember.mockResolvedValue({ ok: false, reason: 'no-auth' })
    const req = new Request('http://localhost/api/showcase/image', { method: 'DELETE', body: JSON.stringify({ path: 'x.png' }) })
    const res = await DELETE(req)
    expect(res.status).toBe(401)
  })

  it('returns 400 when path is missing', async () => {
    const req = new Request('http://localhost/api/showcase/image', { method: 'DELETE', body: JSON.stringify({}) })
    const res = await DELETE(req)
    expect(res.status).toBe(400)
  })

  it('deletes an existing file the member owns', async () => {
    const req = new Request('http://localhost/api/showcase/image', { method: 'DELETE', body: JSON.stringify({ path: 'showcase/u1/x.png' }) })
    const res = await DELETE(req)
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body).toEqual({ ok: true, deleted: true })
  })

  it('reports not-found for a missing file the member owns', async () => {
    mockBucketFile.exists.mockResolvedValue([false])
    const req = new Request('http://localhost/api/showcase/image', { method: 'DELETE', body: JSON.stringify({ path: 'showcase/u1/ghost.png' }) })
    const res = await DELETE(req)
    const body = await res.json()
    expect(body).toEqual({ ok: true, deleted: false, reason: 'not-found' })
  })

  it('returns 403 when a member deletes another creator path', async () => {
    const req = new Request('http://localhost/api/showcase/image', { method: 'DELETE', body: JSON.stringify({ path: 'showcase/u2/other.png' }) })
    const res = await DELETE(req)
    expect(res.status).toBe(403)
    expect(await res.json()).toEqual({ error: 'forbidden', reason: 'not-owner' })
    expect(mockBucketFile.exists).not.toHaveBeenCalled()
    expect(mockBucketFile.delete).not.toHaveBeenCalled()
  })

  it('allows an admin to delete any showcase path', async () => {
    mockIsAdmin()
    const req = new Request('http://localhost/api/showcase/image', { method: 'DELETE', body: JSON.stringify({ path: 'showcase/u2/any.png' }) })
    const res = await DELETE(req)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true, deleted: true })
  })

  it('rejects deleting a file outside the showcase/ prefix', async () => {
    const req = new Request('http://localhost/api/showcase/image', { method: 'DELETE', body: JSON.stringify({ path: 'team-images/x.png' }) })
    const res = await DELETE(req)
    expect(res.status).toBe(400)
    expect(mockBucketFile.delete).not.toHaveBeenCalled()
  })

  it('rejects path traversal attempts', async () => {
    const req = new Request('http://localhost/api/showcase/image', { method: 'DELETE', body: JSON.stringify({ path: 'showcase/../secret.png' }) })
    const res = await DELETE(req)
    expect(res.status).toBe(400)
    expect(mockBucketFile.delete).not.toHaveBeenCalled()
  })
})
