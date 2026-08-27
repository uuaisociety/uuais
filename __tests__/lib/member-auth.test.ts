import { authorizeMember } from '@/lib/member-auth'
import type { NextRequest } from 'next/server'

const mockGetTokens = jest.fn()
const mockFirestore = jest.fn()

jest.mock('next-firebase-auth-edge', () => ({
  getTokens: (...args: unknown[]) => mockGetTokens(...args),
}))

jest.mock('@/lib/auth-config', () => ({
  authConfig: {},
}))

jest.mock('@/lib/firebase-admin', () => ({}))

jest.mock('firebase-admin', () => ({
  apps: ['pretend-initialized'],
  initializeApp: jest.fn(),
  credential: { cert: jest.fn() },
  firestore: (...args: unknown[]) => mockFirestore(...args),
}))

function makeReq(): NextRequest {
  return { cookies: {} } as unknown as NextRequest
}

function memberToken(claims: Record<string, unknown> = {}) {
  return { decodedToken: { uid: 'u1', ...claims } }
}

describe('authorizeMember', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetTokens.mockResolvedValue(memberToken())
  })

  it('admits any signed-in user as a member', async () => {
    await expect(authorizeMember(makeReq())).resolves.toEqual({ ok: true, uid: 'u1' })
  })

  it('admits admins and superAdmins', async () => {
    await expect(authorizeMember(makeReq())).resolves.toEqual({ ok: true, uid: 'u1' })
    mockGetTokens.mockResolvedValue(memberToken({ admin: true }))
    await expect(authorizeMember(makeReq())).resolves.toEqual({ ok: true, uid: 'u1' })
    mockGetTokens.mockResolvedValue(memberToken({ superAdmin: true }))
    await expect(authorizeMember(makeReq())).resolves.toEqual({ ok: true, uid: 'u1' })
  })

  it('never reads the user profile from Firestore', async () => {
    await authorizeMember(makeReq())
    expect(mockFirestore).not.toHaveBeenCalled()
  })

  it('returns no-auth when there is no session token', async () => {
    mockGetTokens.mockResolvedValue(null)
    await expect(authorizeMember(makeReq())).resolves.toEqual({ ok: false, reason: 'no-auth' })
  })

  it('reports invalid-token with the error detail when getTokens throws', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
    mockGetTokens.mockRejectedValue(new Error('signature mismatch'))
    await expect(authorizeMember(makeReq())).resolves.toEqual({
      ok: false,
      reason: 'invalid-token',
      detail: 'signature mismatch',
    })
    warn.mockRestore()
  })
})