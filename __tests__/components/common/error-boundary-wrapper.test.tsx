import { render, screen } from '@testing-library/react'
import { ErrorBoundaryWrapper } from '@/components/ui/ErrorBoundaryWrapper'

describe('ErrorBoundaryWrapper', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('renders children when no error', () => {
    render(<ErrorBoundaryWrapper><p>content</p></ErrorBoundaryWrapper>)
    expect(screen.getByText('content')).toBeInTheDocument()
  })

  it('catches error and shows fallback', () => {
    const Throws = () => { throw new Error('test error') }
    render(<ErrorBoundaryWrapper><Throws /></ErrorBoundaryWrapper>)
    expect(screen.getByText('Something went wrong loading this section.')).toBeInTheDocument()
  })
})
