import { render, screen, fireEvent } from '@testing-library/react'
import { FieldGroup, InputBase, SelectBase, TextareaBase } from '@/components/ui/Form'

describe('FieldGroup', () => {
  it('renders label and requiredHint', () => {
    render(<FieldGroup label="Name" requiredHint="Required">child</FieldGroup>)
    expect(screen.getByText('Name')).toBeInTheDocument()
    expect(screen.getByText('Required')).toBeInTheDocument()
  })

  it('renders children', () => {
    render(<FieldGroup label="Name"><input /></FieldGroup>)
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })
})

describe('InputBase', () => {
  it('renders input with placeholder', () => {
    render(<InputBase placeholder="Enter..." />)
    expect(screen.getByPlaceholderText('Enter...')).toBeInTheDocument()
  })

  it('fires onChange', () => {
    const handleChange = jest.fn()
    render(<InputBase onChange={handleChange} />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'x' } })
    expect(handleChange).toHaveBeenCalled()
  })

  it('can be disabled', () => {
    render(<InputBase disabled />)
    expect(screen.getByRole('textbox')).toBeDisabled()
  })
})

describe('SelectBase', () => {
  it('renders options', () => {
    render(<SelectBase><option value="a">A</option><option value="b">B</option></SelectBase>)
    expect(screen.getByText('A')).toBeInTheDocument()
    expect(screen.getByText('B')).toBeInTheDocument()
  })

  it('fires onChange', () => {
    const handleChange = jest.fn()
    render(<SelectBase onChange={handleChange}><option value="a">A</option></SelectBase>)
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'a' } })
    expect(handleChange).toHaveBeenCalled()
  })
})

describe('TextareaBase', () => {
  it('renders with placeholder', () => {
    render(<TextareaBase placeholder="Write..." />)
    expect(screen.getByPlaceholderText('Write...')).toBeInTheDocument()
  })

  it('fires onChange', () => {
    const handleChange = jest.fn()
    render(<TextareaBase onChange={handleChange} />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'x' } })
    expect(handleChange).toHaveBeenCalled()
  })
})
