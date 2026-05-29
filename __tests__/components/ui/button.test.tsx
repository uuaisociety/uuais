import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from '@/components/ui/Button'
import { ArrowUp } from 'lucide-react'

describe('Button', () => {
  it('renders children', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument()
  })

  it('renders as a button element by default', () => {
    render(<Button>Test</Button>)
    const btn = screen.getByRole('button')
    expect(btn).toHaveAttribute('data-slot', 'button')
  })

  it('applies disabled state', () => {
    render(<Button disabled>Disabled</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('disables button when loading', () => {
    render(<Button isLoading>Loading</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('shows spinner when loading alongside children', () => {
    const { container } = render(<Button isLoading>Loading</Button>)
    expect(container.querySelector('.animate-spin')).toBeInTheDocument()
    expect(screen.getByText('Loading')).toBeInTheDocument()
  })

  it('renders icon when not loading', () => {
    render(<Button icon={ArrowUp}>Up</Button>)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('fires onClick handler', async () => {
    const handleClick = jest.fn()
    render(<Button onClick={handleClick}>Click</Button>)
    await userEvent.click(screen.getByRole('button'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('does not fire onClick when disabled', async () => {
    const handleClick = jest.fn()
    render(<Button onClick={handleClick} disabled>Click</Button>)
    await userEvent.click(screen.getByRole('button'))
    expect(handleClick).not.toHaveBeenCalled()
  })

  it('renders asChild by cloning child element', () => {
    render(
      <Button asChild>
        <a href="/test">Link</a>
      </Button>
    )
    const link = screen.getByRole('link', { name: 'Link' })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/test')
  })
})
