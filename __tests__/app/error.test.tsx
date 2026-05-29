import { render, screen, fireEvent } from '@testing-library/react'
import ErrorPage from '@/app/error'

describe('ErrorPage', () => {
  const mockReset = jest.fn()
  const mockError = new Error('Test error')

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders 500 heading', () => {
    render(<ErrorPage error={mockError} reset={mockReset} />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('500')
  })

  it('renders Something went wrong heading', () => {
    render(<ErrorPage error={mockError} reset={mockReset} />)
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
  })

  it('calls reset when Try Again button is clicked', () => {
    render(<ErrorPage error={mockError} reset={mockReset} />)
    fireEvent.click(screen.getByText('Try Again'))
    expect(mockReset).toHaveBeenCalledTimes(1)
  })

  it('renders Go Home link pointing to /', () => {
    render(<ErrorPage error={mockError} reset={mockReset} />)
    const link = screen.getByText('Go Home')
    expect(link.closest('a')).toHaveAttribute('href', '/')
  })

  it('renders contact email link', () => {
    render(<ErrorPage error={mockError} reset={mockReset} />)
    const emailLink = screen.getByText('dev@uuais.com')
    expect(emailLink.closest('a')).toHaveAttribute('href', 'mailto:dev@uuais.com')
  })

  it('logs error to console on mount', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    render(<ErrorPage error={mockError} reset={mockReset} />)
    expect(consoleSpy).toHaveBeenCalledWith(mockError)
  })
})
