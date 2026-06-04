import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LoginCard from '@/components/ui/LoginModal'

const mockSignInWithGooglePopup = jest.fn()
const mockSignInWithGithubPopup = jest.fn()

jest.mock('@/lib/firebase-client', () => ({
  signInWithGooglePopup: (...args: unknown[]) => mockSignInWithGooglePopup(...args),
  signInWithGithubPopup: (...args: unknown[]) => mockSignInWithGithubPopup(...args),
}))

describe('LoginCard', () => {
  beforeEach(() => {
    jest.clearAllMocks()
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
    mockSignInWithGooglePopup.mockResolvedValue(undefined)
    const after = jest.fn()
    render(<LoginCard after={after} />)
    await userEvent.click(screen.getByText(/Continue with Google/))
    expect(mockSignInWithGooglePopup).toHaveBeenCalledTimes(1)
    expect(after).toHaveBeenCalledTimes(1)
  })

  it('calls signInWithGithubPopup and after when GitHub button is clicked', async () => {
    mockSignInWithGithubPopup.mockResolvedValue(undefined)
    const after = jest.fn()
    render(<LoginCard after={after} />)
    await userEvent.click(screen.getByText(/Continue with GitHub/))
    expect(mockSignInWithGithubPopup).toHaveBeenCalledTimes(1)
    expect(after).toHaveBeenCalledTimes(1)
  })
})
