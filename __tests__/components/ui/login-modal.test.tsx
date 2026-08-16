import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LoginCard from '@/components/ui/LoginModal'

const mockSignInWithGooglePopup = jest.fn()
const mockSignInWithGithubPopup = jest.fn()
const mockGetUserProfile = jest.fn()
const mockRouterPush = jest.fn()

jest.mock('@/lib/firebase-client', () => ({
  signInWithGooglePopup: (...args: unknown[]) => mockSignInWithGooglePopup(...args),
  signInWithGithubPopup: (...args: unknown[]) => mockSignInWithGithubPopup(...args),
}))

jest.mock('@/lib/firestore', () => ({
  getUserProfile: (...args: unknown[]) => mockGetUserProfile(...args),
}))

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockRouterPush }),
}))

const mockUser = { uid: 'u1' }

describe('LoginCard', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetUserProfile.mockResolvedValue({ id: 'u1', isMember: true, privacyAcceptedAt: '2026-01-01T00:00:00Z' })
  })

  it('renders login heading and description', () => {
    render(<LoginCard after={jest.fn()} />)
    expect(screen.getByText('Login')).toBeInTheDocument()
    expect(screen.getByText(/Please login using one/)).toBeInTheDocument()
  })

  it('renders SSO buttons', () => {
    render(<LoginCard after={jest.fn()} />)
    expect(screen.getByText(/Continue with Google/)).toBeInTheDocument()
    expect(screen.getByText(/Continue with GitHub/)).toBeInTheDocument()
  })

  it('renders join link', () => {
    render(<LoginCard after={jest.fn()} />)
    expect(screen.getByText('Create an account')).toBeInTheDocument()
  })

  it('renders privacy link', () => {
    render(<LoginCard after={jest.fn()} />)
    expect(screen.getByText('Privacy Policy')).toBeInTheDocument()
  })

  it('calls signInWithGooglePopup and after when Google button is clicked', async () => {
    mockSignInWithGooglePopup.mockResolvedValue(mockUser)
    const after = jest.fn()
    render(<LoginCard after={after} />)
    await userEvent.click(screen.getByText(/Continue with Google/))
    expect(mockSignInWithGooglePopup).toHaveBeenCalledTimes(1)
    expect(mockGetUserProfile).toHaveBeenCalledWith('u1')
    expect(after).toHaveBeenCalledTimes(1)
    expect(mockRouterPush).not.toHaveBeenCalled()
  })

  it('calls signInWithGithubPopup and after when GitHub button is clicked', async () => {
    mockSignInWithGithubPopup.mockResolvedValue(mockUser)
    const after = jest.fn()
    render(<LoginCard after={after} />)
    await userEvent.click(screen.getByText(/Continue with GitHub/))
    expect(mockSignInWithGithubPopup).toHaveBeenCalledTimes(1)
    expect(after).toHaveBeenCalledTimes(1)
    expect(mockRouterPush).not.toHaveBeenCalled()
  })

  it('redirects to /join when the account has not created a profile', async () => {
    mockSignInWithGooglePopup.mockResolvedValue(mockUser)
    mockGetUserProfile.mockResolvedValue(null)
    const after = jest.fn()
    render(<LoginCard after={after} />)
    await userEvent.click(screen.getByText(/Continue with Google/))
    expect(mockRouterPush).toHaveBeenCalledWith('/join')
    expect(after).not.toHaveBeenCalled()
  })

  it('redirects to /join when the profile is incomplete', async () => {
    mockSignInWithGooglePopup.mockResolvedValue(mockUser)
    mockGetUserProfile.mockResolvedValue({ id: 'u1', isMember: true }) // missing privacyAcceptedAt
    const after = jest.fn()
    render(<LoginCard after={after} />)
    await userEvent.click(screen.getByText(/Continue with Google/))
    expect(mockRouterPush).toHaveBeenCalledWith('/join')
    expect(after).not.toHaveBeenCalled()
  })

  it('shows an error instead of silently failing when sign-in rejects', async () => {
    mockSignInWithGooglePopup.mockRejectedValue(new Error('auth/popup-blocked'))
    const after = jest.fn()
    render(<LoginCard after={after} />)
    await userEvent.click(screen.getByText(/Continue with Google/))
    expect(screen.getByRole('alert')).toHaveTextContent('auth/popup-blocked')
    expect(after).not.toHaveBeenCalled()
  })

  it('still calls after when the profile lookup fails', async () => {
    mockSignInWithGooglePopup.mockResolvedValue(mockUser)
    mockGetUserProfile.mockRejectedValue(new Error('network'))
    const after = jest.fn()
    render(<LoginCard after={after} />)
    await userEvent.click(screen.getByText(/Continue with Google/))
    expect(after).toHaveBeenCalledTimes(1)
  })
})