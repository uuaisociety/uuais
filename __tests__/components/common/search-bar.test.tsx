import { render, screen, fireEvent } from '@testing-library/react'
import SearchBar from '@/components/common/SearchBar'

describe('SearchBar', () => {
  it('renders search input and button', () => {
    render(<SearchBar onSearch={jest.fn()} />)
    expect(screen.getByPlaceholderText('Search courses...')).toBeInTheDocument()
    expect(screen.getByText('Search')).toBeInTheDocument()
  })

  it('calls onSearch with input value on submit', () => {
    const onSearch = jest.fn()
    render(<SearchBar onSearch={onSearch} />)
    const input = screen.getByPlaceholderText('Search courses...')
    fireEvent.change(input, { target: { value: 'machine learning' } })
    fireEvent.click(screen.getByText('Search'))
    expect(onSearch).toHaveBeenCalledWith('machine learning')
  })

  it('uses custom placeholder', () => {
    render(<SearchBar placeholder="Find..." onSearch={jest.fn()} />)
    expect(screen.getByPlaceholderText('Find...')).toBeInTheDocument()
  })

  it('uses initial value', () => {
    render(<SearchBar initialValue="AI" onSearch={jest.fn()} />)
    expect(screen.getByPlaceholderText('Search courses...')).toHaveValue('AI')
  })
})
