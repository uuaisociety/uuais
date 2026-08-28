import { render, screen } from '@testing-library/react'
import { ErrorBoundaryWrapper } from '@/components/ui/ErrorBoundaryWrapper'

describe('ErrorBoundaryWrapper', () => {
  it('renders children when no error', () => {
    render(<ErrorBoundaryWrapper><p>content</p></ErrorBoundaryWrapper>)
    expect(screen.getByText('content')).toBeInTheDocument()
  })

  it('catches error and shows fallback', () => {
    const Throws = () => { throw new Error('test error') }
    render(<ErrorBoundaryWrapper><Throws /></ErrorBoundaryWrapper>)
    expect(screen.getByText('Something went wrong loading this section.')).toBeInTheDocument()
  })

  // notFound()/redirect() throw to route, not to fail; swallowing them hides the real page.
  it.each([
    ['NEXT_HTTP_ERROR_FALLBACK;404'],
    ['NEXT_NOT_FOUND'],
    ['NEXT_REDIRECT;replace;/login;307;'],
  ])('rethrows Next routing errors (%s)', (digest) => {
    const Throws = () => {
      const err = new Error(digest) as Error & { digest: string }
      err.digest = digest
      throw err
    }
    expect(() =>
      render(<ErrorBoundaryWrapper><Throws /></ErrorBoundaryWrapper>)
    ).toThrow(digest)
    expect(screen.queryByText('Something went wrong loading this section.')).not.toBeInTheDocument()
  })
})
