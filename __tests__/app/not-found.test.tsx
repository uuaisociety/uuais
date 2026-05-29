import { render, screen } from '@testing-library/react'
import NotFound from '@/app/not-found'

describe('NotFound', () => {
  it('renders the 404 heading', () => {
    render(<NotFound />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('404')
  })

  it('renders navigation links', () => {
    render(<NotFound />)
    expect(screen.getByText('Go Home')).toBeInTheDocument()
    expect(screen.getByText('Browse Events')).toBeInTheDocument()
  })

  it('renders contact email', () => {
    render(<NotFound />)
    expect(screen.getByText('dev@uuais.com')).toBeInTheDocument()
  })
})
