import { render, screen } from '@testing-library/react'
import LoginCard from '@/components/ui/LoginModal'

jest.mock('@/lib/firebase-client', () => ({
  signInWithGooglePopup: jest.fn(),
  signInWithGithubPopup: jest.fn(),
}))

describe('LoginCard', () => {
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
})
