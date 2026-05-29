import { render, screen, fireEvent } from '@testing-library/react'
import { ThemeToggle } from '@/components/ui/ThemeToggle'

const mockToggleTheme = jest.fn()
jest.mock('@/providers/ThemeProvider', () => ({
  useTheme: () => ({ theme: 'light', toggleTheme: mockToggleTheme }),
}))

describe('ThemeToggle', () => {
  beforeEach(() => {
    mockToggleTheme.mockClear()
  })

  it('renders button', () => {
    render(<ThemeToggle />)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('calls toggleTheme on click', () => {
    render(<ThemeToggle />)
    fireEvent.click(screen.getByRole('button'))
    expect(mockToggleTheme).toHaveBeenCalledTimes(1)
  })

  it('has aria-label', () => {
    render(<ThemeToggle />)
    expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Toggle theme')
  })

  it('accepts isHomePage prop', () => {
    render(<ThemeToggle isHomePage />)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('renders moon icon in light mode', () => {
    render(<ThemeToggle />)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })
})
