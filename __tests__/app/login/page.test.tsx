import { render, screen } from '@testing-library/react'
import LoginPage from '@/app/login/page'
import { updatePageMeta } from '@/utils/seo'

jest.mock('@/components/ui/LoginModal', () => ({
  __esModule: true,
  default: ({ after }: { after: () => void }) => (
    <div data-testid="login-modal">
      <p>Sign In Modal</p>
      <button onClick={after}>Mock Sign In</button>
    </div>
  ),
}))

describe('LoginPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    global.__setAdminState?.(null)
  })

  it('renders the login modal', () => {
    render(<LoginPage />)
    expect(screen.getByTestId('login-modal')).toBeInTheDocument()
  })

  it('renders mock modal content', () => {
    render(<LoginPage />)
    expect(screen.getByText('Sign In Modal')).toBeInTheDocument()
  })

  it('calls updatePageMeta with correct title and description', () => {
    render(<LoginPage />)
    expect(updatePageMeta).toHaveBeenCalledWith(
      'Sign In',
      'Sign in to your UU AI Society account'
    )
  })

  it('calls updatePageMeta exactly once on mount', () => {
    render(<LoginPage />)
    expect(updatePageMeta).toHaveBeenCalledTimes(1)
  })

  it('renders with correct background styling', () => {
    const { container } = render(<LoginPage />)
    const mainDiv = container.firstChild as HTMLElement
    expect(mainDiv.className).toContain('bg-gray-50')
    expect(mainDiv.className).toContain('dark:bg-gray-900')
  })

  it('shows an account-creation notice for a signed-in user without a profile', () => {
    global.__setAdminState?.({ user: { uid: 'u1' }, profileLoading: false, profile: null })
    render(<LoginPage />)
    expect(screen.getByText(/hasn't created a profile yet/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'create an account' })).toHaveAttribute('href', '/join')
    global.__setAdminState?.(null)
  })

  it('hides the account-creation notice for members with a complete profile', () => {
    global.__setAdminState?.({
      user: { uid: 'u1' },
      profileLoading: false,
      profile: { id: 'u1', isMember: true, privacyAcceptedAt: '2026-01-01T00:00:00Z' },
    })
    render(<LoginPage />)
    expect(screen.queryByText(/hasn't created a profile yet/)).not.toBeInTheDocument()
    global.__setAdminState?.(null)
  })
})
