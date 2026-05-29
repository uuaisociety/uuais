import { render, screen, fireEvent } from '@testing-library/react'
import StyledSelect from '@/components/ui/StyledSelect'

const options = [
  { value: 'all', label: 'All' },
  { value: 'a', label: 'Option A' },
  { value: 'b', label: 'Option B' },
]

describe('StyledSelect', () => {
  it('renders selected option label', () => {
    render(<StyledSelect value="a" onChange={jest.fn()} options={options} />)
    expect(screen.getByText('Option A')).toBeInTheDocument()
  })

  it('shows "Select..." when no option matches value', () => {
    render(<StyledSelect value="nonexistent" onChange={jest.fn()} options={options} />)
    expect(screen.getByText('Select...')).toBeInTheDocument()
  })

  it('opens dropdown on click', () => {
    render(<StyledSelect value="all" onChange={jest.fn()} options={options} />)
    fireEvent.click(screen.getByRole('button'))
    expect(screen.getByText('Option A')).toBeVisible()
    expect(screen.getByText('Option B')).toBeVisible()
  })

  it('calls onChange when option is clicked', () => {
    const handleChange = jest.fn()
    render(<StyledSelect value="all" onChange={handleChange} options={options} />)
    fireEvent.click(screen.getByRole('button'))
    fireEvent.click(screen.getByText('Option A'))
    expect(handleChange).toHaveBeenCalledWith('a')
  })

  it('closes dropdown after selection', () => {
    const handleChange = jest.fn()
    render(<StyledSelect value="all" onChange={handleChange} options={options} />)
    fireEvent.click(screen.getByRole('button'))
    fireEvent.click(screen.getByText('Option A'))
    expect(screen.queryByText('Option B')).not.toBeInTheDocument()
  })

  it('applies custom className', () => {
    const { container } = render(<StyledSelect value="all" onChange={jest.fn()} options={options} className="my-class" />)
    expect(container.firstChild).toHaveClass('my-class')
  })
})
