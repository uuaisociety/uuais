import { render, screen } from '@testing-library/react'
import CourseNavigatorPage from '@/app/projects/course-navigator/page'
import { updatePageMeta } from '@/utils/seo'

// AdminGate reaches the real Firebase client at import time; CI has no keys.
jest.mock('@/lib/firebase-client', () => ({ auth: {}, db: {} }))

jest.mock('lucide-react', () => ({
  ArrowRight: () => <svg data-testid="arrow-right" />,
}))

describe('CourseNavigatorPage', () => {
  // The page sits behind AdminGate while the navigator is unreleased.
  beforeAll(() => {
    global.__setAdminState({ user: { uid: 'a' }, loading: false, isAdmin: true })
  })

  afterAll(() => {
    global.__setAdminState(null)
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders the main heading', () => {
    render(<CourseNavigatorPage />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Course Navigator')
  })

  it('renders the hero description', () => {
    render(<CourseNavigatorPage />)
    expect(
      screen.getByText(/Discover courses at Uppsala University using AI-powered recommendations/)
    ).toBeInTheDocument()
  })

  it('renders the "Back to Projects" link with correct href', () => {
    render(<CourseNavigatorPage />)
    const link = screen.getByText('Back to Projects').closest('a')
    expect(link).toHaveAttribute('href', '/projects')
  })

  it('renders the "Launch Course Navigator" button linking to /explore', () => {
    render(<CourseNavigatorPage />)
    const link = screen.getByText('Launch Course Navigator').closest('a')
    expect(link).toHaveAttribute('href', '/explore')
  })

  it('renders the ArrowRight icon inside the CTA', () => {
    render(<CourseNavigatorPage />)
    expect(screen.getByTestId('arrow-right')).toBeInTheDocument()
  })

  it('renders the preview image with correct src and alt', () => {
    render(<CourseNavigatorPage />)
    const img = screen.getByRole('img')
    expect(img).toHaveAttribute('alt', 'Course Navigator Preview')
    expect(img).toHaveAttribute('src', '/images/campus.png')
  })

  it('renders the About This Project section', () => {
    render(<CourseNavigatorPage />)
    expect(screen.getByText('About This Project')).toBeInTheDocument()
    expect(
      screen.getByText(/Course Navigator is an AI-powered tool designed to help students/)
    ).toBeInTheDocument()
  })

  it('renders the Features Coming Soon section', () => {
    render(<CourseNavigatorPage />)
    expect(screen.getByText('Features Coming Soon')).toBeInTheDocument()
    expect(screen.getByText('Integration with UU course catalog')).toBeInTheDocument()
    expect(screen.getByText('Course visualization')).toBeInTheDocument()
    expect(
      screen.getByText('Peer recommendations based on similar backgrounds')
    ).toBeInTheDocument()
  })

  it('renders the Project Details sidebar with Status, Team, and Tech Stack', () => {
    render(<CourseNavigatorPage />)
    expect(screen.getByText('Project Details')).toBeInTheDocument()
    expect(screen.getByText('In Development')).toBeInTheDocument()
    expect(screen.getByText('UU AI Society Dev Team')).toBeInTheDocument()
    expect(screen.getByText('Next.js, TypeScript, AI/LLM')).toBeInTheDocument()
  })

  it('renders the Contact the Team button with correct mailto href', () => {
    render(<CourseNavigatorPage />)
    const link = screen.getByText('Contact the Team').closest('a')
    expect(link).toHaveAttribute('href', 'mailto:dev@uuais.com')
  })

  it('calls updatePageMeta on mount with correct arguments', () => {
    render(<CourseNavigatorPage />)
    expect(updatePageMeta).toHaveBeenCalledWith(
      'Course Navigator',
      'AI-powered course recommendations for Uppsala University students'
    )
  })
})
