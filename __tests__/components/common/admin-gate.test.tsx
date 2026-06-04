import { render, screen } from '@testing-library/react'
import AdminGate from '@/components/auth/AdminGate'

jest.mock('@/hooks/useAdmin', () => ({
  useAdmin: jest.fn(),
}))

const mockUseAdmin = jest.requireMock('@/hooks/useAdmin').useAdmin

describe('AdminGate', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('shows loading state', () => {
    mockUseAdmin.mockReturnValue({
      user: null,
      loading: true,
      isAdmin: false,
      isSuperAdmin: false,
      claims: null,
      signInWithGoogle: jest.fn(),
      logout: jest.fn(),
    })
    render(<AdminGate><p>admin content</p></AdminGate>)
    expect(screen.getByText('Checking permissions...')).toBeInTheDocument()
  })

  it('shows login modal when no user', () => {
    mockUseAdmin.mockReturnValue({
      user: null,
      loading: false,
      isAdmin: false,
      isSuperAdmin: false,
      claims: null,
      signInWithGoogle: jest.fn(),
      logout: jest.fn(),
    })
    render(<AdminGate><p>admin content</p></AdminGate>)
    expect(screen.getByText('Login')).toBeInTheDocument()
  })

  it('shows unauthorized message when user is not admin', () => {
    mockUseAdmin.mockReturnValue({
      user: { uid: '123', email: 'test@test.com' },
      loading: false,
      isAdmin: false,
      isSuperAdmin: false,
      claims: null,
      signInWithGoogle: jest.fn(),
      logout: jest.fn(),
    })
    render(<AdminGate><p>admin content</p></AdminGate>)
    expect(screen.getByText('Admin Access Required')).toBeInTheDocument()
  })

  it('renders children when user is admin', () => {
    mockUseAdmin.mockReturnValue({
      user: { uid: '123', email: 'admin@test.com' },
      loading: false,
      isAdmin: true,
      isSuperAdmin: false,
      claims: { admin: true },
      signInWithGoogle: jest.fn(),
      logout: jest.fn(),
    })
    render(<AdminGate><p>admin content</p></AdminGate>)
    expect(screen.getByText('admin content')).toBeInTheDocument()
  })
})
