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
})
