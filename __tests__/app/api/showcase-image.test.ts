const mockAuthorizeMember = jest.fn()
jest.mock('@/lib/member-auth', () => ({
  authorizeMember: (...args: unknown[]) => mockAuthorizeMember(...args),
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

describe('POST /api/showcase/image', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockAuthorizeMember.mockResolvedValue({ ok: true, uid: 'u1' })
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

  it('uploads a valid image and returns urls', async () => {
    const res = await POST(makeUploadReq(new Blob([pngBytes], { type: 'image/png' })))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(body.path).toMatch(/^showcase\//)
    expect(body.url).toBe('http://signed.url')
    expect(body.urlPublic).toMatch(/storage\.googleapis\.com/)
    expect(mockBucketFile.save).toHaveBeenCalled()
    expect(mockBucketFile.makePublic).toHaveBeenCalled()
  })

  it('deletes a previous cover image when a different path is supplied', async () => {
    const res = await POST(makeUploadReq(new Blob([pngBytes], { type: 'image/png' }), { previousPath: 'showcase/old.png' }))
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
    expect(body.path).toMatch(/^showcase\//)
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

  it('deletes an existing file', async () => {
    const req = new Request('http://localhost/api/showcase/image', { method: 'DELETE', body: JSON.stringify({ path: 'showcase/x.png' }) })
    const res = await DELETE(req)
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body).toEqual({ ok: true, deleted: true })
  })

  it('reports not-found for a missing file', async () => {
    mockBucketFile.exists.mockResolvedValue([false])
    const req = new Request('http://localhost/api/showcase/image', { method: 'DELETE', body: JSON.stringify({ path: 'showcase/ghost.png' }) })
    const res = await DELETE(req)
    const body = await res.json()
    expect(body).toEqual({ ok: true, deleted: false, reason: 'not-found' })
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
