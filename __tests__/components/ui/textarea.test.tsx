import { render, screen, fireEvent } from '@testing-library/react'
import { Textarea } from '@/components/ui/Textarea'

describe('Textarea', () => {
  it('renders with placeholder', () => {
    render(<Textarea placeholder="Write..." />)
    expect(screen.getByPlaceholderText('Write...')).toBeInTheDocument()
  })

  it('renders label', () => {
    render(<Textarea label="Bio" />)
    expect(screen.getByText('Bio')).toBeInTheDocument()
  })

  it('renders error message', () => {
    render(<Textarea error="Required" />)
    expect(screen.getByRole('alert')).toHaveTextContent('Required')
  })

  it('fires onChange handler', () => {
    const handleChange = jest.fn()
    render(<Textarea onChange={handleChange} />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'test' } })
    expect(handleChange).toHaveBeenCalled()
  })

  it('applies fullWidth class', () => {
    const { container } = render(<Textarea fullWidth />)
    expect(container.firstChild).toHaveClass('w-full')
  })
})
