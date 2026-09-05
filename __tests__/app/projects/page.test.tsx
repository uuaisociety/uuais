import { render, screen } from '@testing-library/react'
import ProjectsPage from '@/app/projects/page'

const asAdmin = () =>
  global.__setAdminState({ user: { uid: 'a' }, loading: false, isAdmin: true })

describe('ProjectsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // The navigator is held back, so the board's view is the one that shows both cards.
    asAdmin()
  })

  afterEach(() => {
    global.__setAdminState(null)
  })

  it('renders the main heading', () => {
    render(<ProjectsPage />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Our Projects')
  })

  it('renders the section description', () => {
    render(<ProjectsPage />)
    expect(
      screen.getByText(/Explore the innovative projects we're working on/)
    ).toBeInTheDocument()
  })

  it('renders the project card with title and status badge', () => {
    render(<ProjectsPage />)
    expect(screen.getByText('Course Navigator')).toBeInTheDocument()
    expect(screen.getByText('In Development')).toBeInTheDocument()
  })

  it('renders the project description', () => {
    render(<ProjectsPage />)
    expect(
      screen.getByText(
        /An AI-powered tool to help students navigate their course options/
      )
    ).toBeInTheDocument()
  })

  it('links to the project detail page', () => {
    render(<ProjectsPage />)
    const link = screen.getByRole('link', { name: /Course Navigator/ })
    expect(link).toHaveAttribute('href', '/projects/course-navigator')
  })

  it('renders the project card image with correct alt text', () => {
    render(<ProjectsPage />)
    const img = screen.getByRole('img', { name: 'Course Navigator' })
    expect(img).toHaveAttribute('src', '/images/campus.png')
  })

  it('shows the programme map, linked straight to the tool', () => {
    render(<ProjectsPage />)
    expect(screen.getByRole('link', { name: /Programme Map/ })).toHaveAttribute(
      'href',
      '/programs'
    )
  })

  // The navigator launches after the map, so a visitor must not see it yet.
  it('hides the course navigator from everyone but the board', () => {
    global.__setAdminState({ user: null, loading: false, isAdmin: false })
    render(<ProjectsPage />)

    expect(screen.queryByText('Course Navigator')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Programme Map/ })).toBeInTheDocument()
  })

  it('renders the "Have an idea?" call-to-action section', () => {
    render(<ProjectsPage />)
    expect(screen.getByText('Have an idea?')).toBeInTheDocument()
    expect(
      screen.getByText(
        /We're always looking for new project ideas and contributors/
      )
    ).toBeInTheDocument()
  })

  it('renders the contact dev team link with correct mailto href', () => {
    render(<ProjectsPage />)
    const contactLink = screen.getByText('Contact the Development Team').closest('a')
    expect(contactLink).toHaveAttribute('href', 'mailto:dev@uuais.com')
  })
})
