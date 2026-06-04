import { render, screen } from '@testing-library/react'
import { Footer } from '@/components/layout/Footer'

beforeAll(() => {
  window.scrollTo = jest.fn()
})

describe('Footer', () => {
  it('renders logo text', () => {
    render(<Footer />)
    expect(screen.getByText('UU AI Society')).toBeInTheDocument()
  })

  it('renders description', () => {
    render(<Footer />)
    expect(screen.getByText(/Connecting students passionate about Artificial Intelligence/)).toBeInTheDocument()
  })

  it('renders quick links', () => {
    render(<Footer />)
    expect(screen.getByText('Quick Links')).toBeInTheDocument()
    expect(screen.getAllByText('Home')[0]).toBeInTheDocument()
    expect(screen.getByText('Events')).toBeInTheDocument()
    expect(screen.getByText('Job board')).toBeInTheDocument()
  })

  it('renders contact section heading and emails', () => {
    render(<Footer />)
    const headings = screen.getAllByText('Contact')
    expect(headings.length).toBe(2)
    expect(screen.getByText('contact@uuais.com')).toBeInTheDocument()
    expect(screen.getByText('dev@uuais.com')).toBeInTheDocument()
    expect(screen.getByText('partnerships@uuais.com')).toBeInTheDocument()
  })

  it('renders partner section', () => {
    render(<Footer />)
    expect(screen.getByText('Our partners')).toBeInTheDocument()
  })

  it('renders privacy policy link', () => {
    render(<Footer />)
    expect(screen.getByText('Privacy Policy')).toBeInTheDocument()
  })

  it('renders organization number', () => {
    render(<Footer />)
    expect(screen.getByText(/802551-8930/)).toBeInTheDocument()
  })
})
