import { render, screen, fireEvent } from '@testing-library/react'
import { Input } from '@/components/ui/Input'

describe('Input', () => {
  it('renders with placeholder', () => {
    render(<Input placeholder="Search..." />)
    expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument()
  })

  it('renders label', () => {
    render(<Input label="Email" />)
    expect(screen.getByText('Email')).toBeInTheDocument()
  })

  it('renders error message', () => {
    render(<Input error="Required" />)
    expect(screen.getByRole('alert')).toHaveTextContent('Required')
  })

  it('applies fullWidth class', () => {
    const { container } = render(<Input fullWidth />)
    expect(container.firstChild).toHaveClass('w-full')
  })

  it('fires onChange handler', () => {
    const handleChange = jest.fn()
    render(<Input onChange={handleChange} />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'test' } })
    expect(handleChange).toHaveBeenCalled()
  })

  it('passes through value', () => {
    render(<Input value="hello" readOnly />)
    expect(screen.getByRole('textbox')).toHaveValue('hello')
  })
})
