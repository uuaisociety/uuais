import { render, screen, fireEvent } from '@testing-library/react'
import { Select } from '@/components/ui/Select'

const options = [
  { value: 'all', label: 'All' },
  { value: 'a', label: 'Option A' },
  { value: 'b', label: 'Option B' },
]

describe('Select', () => {
  it('renders all options', () => {
    render(<Select options={options} />)
    expect(screen.getByText('All')).toBeInTheDocument()
    expect(screen.getByText('Option A')).toBeInTheDocument()
    expect(screen.getByText('Option B')).toBeInTheDocument()
  })

  it('renders label', () => {
    render(<Select label="Category" options={options} />)
    expect(screen.getByText('Category')).toBeInTheDocument()
  })

  it('renders error message', () => {
    render(<Select options={options} error="Required" />)
    expect(screen.getByRole('alert')).toHaveTextContent('Required')
  })

  it('fires onChange handler', () => {
    const handleChange = jest.fn()
    render(<Select options={options} onChange={handleChange} />)
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'a' } })
    expect(handleChange).toHaveBeenCalled()
  })

  it('applies fullWidth class', () => {
    const { container } = render(<Select options={options} fullWidth />)
    expect(container.firstChild).toHaveClass('w-full')
  })
})
