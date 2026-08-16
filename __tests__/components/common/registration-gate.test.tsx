import { render } from '@testing-library/react'
import RegistrationGate from '@/components/auth/RegistrationGate'

const mockPush = jest.fn()
const unsubscribe = jest.fn()

jest.mock('@/lib/firebase-client', () => ({
  auth: {
    onAuthStateChanged: jest.fn(() => unsubscribe),
  },
}))

jest.mock('@/lib/firestore', () => ({
  getUserProfile: jest.fn(),
}))

// Mutable admin state so tests can simulate signed-in members (the global jest.setup.ts mock only covers the anonymous case).
const mockAdminState = {
  user: null,
  loading: false,
  profileLoading: false,
  profile: null,
  isAdmin: false,
  isSuperAdmin: false,
  claims: null,
  signInWithGoogle: jest.fn(),
  logout: jest.fn(),
}

jest.mock('@/hooks/useAdmin', () => ({
  useAdmin: () => mockAdminState,
  refreshProfile: jest.fn(),
}))

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => global.__mockPathname || '',
}))

describe('RegistrationGate', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    global.__mockPathname = '/'
    Object.assign(mockAdminState, {
      user: null,
      loading: false,
      profileLoading: false,
      profile: null,
      isAdmin: false,
      isSuperAdmin: false,
      claims: null,
    })
  })

  it('renders nothing', () => {
    const { container } = render(<RegistrationGate />)
    expect(container).toBeEmptyDOMElement()
  })

  it('does not sign out anonymous visitors', () => {
    global.__mockPathname = '/account'
    render(<RegistrationGate />)
    expect(mockAdminState.logout).not.toHaveBeenCalled()
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('does not sign out a member with a complete profile', () => {
    Object.assign(mockAdminState, {
      user: { uid: 'u1' },
      profileLoading: false,
      profile: { id: 'u1', isMember: true, privacyAcceptedAt: '2026-01-01T00:00:00Z' },
    })
    global.__mockPathname = '/account'
    render(<RegistrationGate />)
    expect(mockAdminState.logout).not.toHaveBeenCalled()
  })

  it('signs out an incomplete-profile user who navigates off /join', () => {
    Object.assign(mockAdminState, {
      user: { uid: 'u1' },
      profileLoading: false,
      profile: null,
    })
    global.__mockPathname = '/account'
    render(<RegistrationGate />)
    expect(mockAdminState.logout).toHaveBeenCalledTimes(1)
  })

  it('signs out an incomplete-profile user browsing public pages', () => {
    Object.assign(mockAdminState, {
      user: { uid: 'u1' },
      profileLoading: false,
      profile: { id: 'u1', isMember: true }, // missing privacyAcceptedAt
    })
    global.__mockPathname = '/events'
    render(<RegistrationGate />)
    expect(mockAdminState.logout).toHaveBeenCalledTimes(1)
  })

  it('does not sign out an incomplete-profile user while on /join', () => {
    Object.assign(mockAdminState, {
      user: { uid: 'u1' },
      profileLoading: false,
      profile: null,
    })
    global.__mockPathname = '/join'
    render(<RegistrationGate />)
    expect(mockAdminState.logout).not.toHaveBeenCalled()
  })

  it('does not sign out an incomplete-profile user on the login page', () => {
    Object.assign(mockAdminState, {
      user: { uid: 'u1' },
      profileLoading: false,
      profile: null,
    })
    global.__mockPathname = '/login'
    render(<RegistrationGate />)
    expect(mockAdminState.logout).not.toHaveBeenCalled()
  })

  it('does not sign out an incomplete-profile user on the privacy page', () => {
    Object.assign(mockAdminState, {
      user: { uid: 'u1' },
      profileLoading: false,
      profile: null,
    })
    global.__mockPathname = '/privacy'
    render(<RegistrationGate />)
    expect(mockAdminState.logout).not.toHaveBeenCalled()
  })

  it('waits for the profile lookup before deciding', () => {
    Object.assign(mockAdminState, {
      user: { uid: 'u1' },
      profileLoading: true,
      profile: null,
    })
    global.__mockPathname = '/account'
    render(<RegistrationGate />)
    expect(mockAdminState.logout).not.toHaveBeenCalled()
  })
})
