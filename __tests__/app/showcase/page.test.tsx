import { render, screen, fireEvent } from '@testing-library/react'
import ShowcasePage from '@/components/pages/ShowcasePage'
import { defaultAppState } from '@/__tests__/helpers/fixtures'

const mockUseApp = jest.fn()
jest.mock('@/contexts/AppContext', () => ({
  useApp: () => mockUseApp(),
  AppProvider: ({ children }: { children: React.ReactNode }) => children,
}))

const mockUseAdmin = jest.fn()
jest.mock('@/hooks/useAdmin', () => ({
  useAdmin: () => mockUseAdmin(),
}))

jest.mock('@/components/ui/Notifications', () => ({
  useNotify: () => ({ notify: jest.fn() }),
}))

const mockMySubmissions = jest.fn(() => [] as unknown[])
jest.mock('@/lib/firestore/useCollectionData', () => ({
  useCollectionData: () => ({ data: mockMySubmissions(), loaded: true }),
}))
jest.mock('@/lib/firestore/showcase', () => ({
  subscribeToMyShowcaseProjects: jest.fn(() => () => {}),
}))

const mockUseShowcaseVote = jest.fn()
jest.mock('@/components/showcase/useShowcaseVote', () => ({
  useShowcaseVote: () => mockUseShowcaseVote(),
}))

function createProject(overrides: Record<string, unknown> = {}) {
  return {
    id: 'proj-1',
    title: 'Course Navigator',
    description: 'Explore UU courses with AI assistance.',
    category: 'app',
    creatorUserId: 'u1',
    creatorName: 'Ada',
    links: {},
    tags: ['ai', 'courses'],
    votes: 3,
    published: true,
    featured: false,
    createdAt: '2026-07-01T00:00:00Z',
    updatedAt: '2026-07-01T00:00:00Z',
    ...overrides,
  }
}

function setProjects(projects: ReturnType<typeof createProject>[]) {
  mockUseApp.mockReturnValue({
    state: { ...defaultAppState, showcaseProjects: projects },
    dispatch: jest.fn(),
  })
}

describe('ShowcasePage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockMySubmissions.mockReturnValue([])
    window.history.replaceState(null, '', '/showcase')
    mockUseAdmin.mockReturnValue({ user: { uid: 'u1', displayName: 'Ada' }, isAdmin: false })
    mockUseShowcaseVote.mockReturnValue({
      voted: [],
      pending: [],
      votesFor: (p: { votes: number }) => p.votes,
      handleVote: jest.fn(),
    })
  })

  afterEach(() => {
    window.history.replaceState(null, '', '/showcase')
  })

  it('renders the page header', () => {
    setProjects([])
    render(<ShowcasePage />)
    expect(screen.getByRole('heading', { level: 1, name: 'Showcase' })).toBeInTheDocument()
    expect(screen.getAllByText('Share your project').length).toBeGreaterThan(0)
  })

  it('renders category filters with human labels and counts', () => {
    setProjects([createProject({ id: 'p1', category: 'github' })])
    render(<ShowcasePage />)
    // The raw enum key never reaches the page.
    expect(screen.getByRole('button', { name: /Open Source/ })).toBeInTheDocument()
    expect(screen.queryByText('github')).not.toBeInTheDocument()
  })

  it('hides category filters that have no projects', () => {
    setProjects([createProject({ id: 'p1', category: 'app' })])
    render(<ShowcasePage />)
    expect(screen.queryByRole('button', { name: /Research/ })).not.toBeInTheDocument()
  })

  // A failed read must not claim the gallery is empty and invite a first contributor.
  it('reports a failed load instead of an empty gallery', () => {
    mockUseApp.mockReturnValue({
      state: { ...defaultAppState, showcaseProjects: [], showcaseUnavailable: true },
      dispatch: jest.fn(),
    })
    render(<ShowcasePage />)
    expect(screen.getByText('Could not load the showcase')).toBeInTheDocument()
    expect(screen.queryByText('No projects yet')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
  })

  it('shows the genuine empty state when the server confirms there are none', () => {
    mockUseApp.mockReturnValue({
      state: { ...defaultAppState, showcaseProjects: [], showcaseUnavailable: false },
      dispatch: jest.fn(),
    })
    render(<ShowcasePage />)
    expect(screen.getByText('No projects yet')).toBeInTheDocument()
    expect(screen.queryByText('Could not load the showcase')).not.toBeInTheDocument()
  })

  it('shows empty state when no projects exist', () => {
    setProjects([])
    render(<ShowcasePage />)
    expect(screen.getByText('No projects yet')).toBeInTheDocument()
  })

  it('only renders published projects', () => {
    setProjects([
      createProject({ id: 'p1', title: 'Published One' }),
      createProject({ id: 'p2', title: 'Draft One', published: false }),
    ])
    render(<ShowcasePage />)
    expect(screen.getByText('Published One')).toBeInTheDocument()
    expect(screen.queryByText('Draft One')).not.toBeInTheDocument()
  })

  it('filters projects by category', () => {
    setProjects([
      createProject({ id: 'p1', title: 'An App', category: 'app' }),
      createProject({ id: 'p2', title: 'A Paper', category: 'research' }),
    ])
    render(<ShowcasePage />)
    fireEvent.click(screen.getByRole('button', { name: /Research/ }))
    expect(screen.getByText('A Paper')).toBeInTheDocument()
    expect(screen.queryByText('An App')).not.toBeInTheDocument()
  })

  it('searches projects by title', () => {
    setProjects([
      createProject({ id: 'p1', title: 'Course Navigator' }),
      createProject({ id: 'p2', title: 'Essay Grader' }),
    ])
    render(<ShowcasePage />)
    fireEvent.change(screen.getByLabelText('Search projects'), { target: { value: 'navigator' } })
    expect(screen.getByText('Course Navigator')).toBeInTheDocument()
    expect(screen.queryByText('Essay Grader')).not.toBeInTheDocument()
  })

  it('adopts ?q= from the URL so tag links land filtered', () => {
    window.history.replaceState(null, '', '/showcase?q=grader')
    setProjects([
      createProject({ id: 'p1', title: 'Course Navigator' }),
      createProject({ id: 'p2', title: 'Essay Grader' }),
    ])
    render(<ShowcasePage />)
    expect(screen.getByText('Essay Grader')).toBeInTheDocument()
    expect(screen.queryByText('Course Navigator')).not.toBeInTheDocument()
  })

  it('sorts by votes when the sort control is switched', () => {
    setProjects([
      createProject({ id: 'p1', title: 'Newer Fewer Votes', votes: 1, createdAt: '2026-08-01T00:00:00Z' }),
      createProject({ id: 'p2', title: 'Older More Votes', votes: 99, createdAt: '2026-01-01T00:00:00Z' }),
    ])
    render(<ShowcasePage />)
    // Newest sort leads with the recent project...
    expect(screen.getByRole('heading', { level: 2, name: 'Newer Fewer Votes' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Most voted' }))
    // ...and the vote sort promotes the popular one into the lead slot.
    expect(screen.getByRole('heading', { level: 2, name: 'Older More Votes' })).toBeInTheDocument()
  })

  it('gives a featured project the lead slot', () => {
    setProjects([
      createProject({ id: 'p1', title: 'Regular Project', createdAt: '2026-08-01T00:00:00Z' }),
      createProject({ id: 'p2', title: 'Featured Project', featured: true, createdAt: '2026-01-01T00:00:00Z' }),
    ])
    render(<ShowcasePage />)
    expect(screen.getByRole('heading', { level: 2, name: 'Featured Project' })).toBeInTheDocument()
  })

  it('links projects by slug when one exists', () => {
    setProjects([createProject({ id: 'p1', title: 'Course Navigator', slug: 'course-navigator' })])
    render(<ShowcasePage />)
    expect(screen.getByLabelText('Open Course Navigator')).toHaveAttribute(
      'href',
      '/showcase/course-navigator',
    )
  })

  it('shows a skeleton until the projects have loaded', () => {
    mockUseApp.mockReturnValue({
      state: { ...defaultAppState, showcaseProjects: [], showcaseLoaded: false },
      dispatch: jest.fn(),
    })
    render(<ShowcasePage />)
    expect(screen.queryByText('No projects yet')).not.toBeInTheDocument()
  })

  it('shows the member their own submissions while they wait for review', () => {
    mockMySubmissions.mockReturnValue([
      { ...createProject({ id: 'mine-1', title: 'My Pending Build', published: false }) },
    ])
    setProjects([createProject({ id: 'p1', title: 'Someone Elses' })])
    render(<ShowcasePage />)
    expect(screen.getByText('My Pending Build')).toBeInTheDocument()
    expect(screen.getByText('In review')).toBeInTheDocument()
  })

  it('does not show a review strip when nothing is pending', () => {
    mockMySubmissions.mockReturnValue([createProject({ id: 'mine-1', published: true })])
    setProjects([createProject({ id: 'p1' })])
    render(<ShowcasePage />)
    expect(screen.queryByText('In review')).not.toBeInTheDocument()
  })

  // Four link icons squeezed the byline beside them down to "By Bar…".
  it('drops the review strip once the user is signed out', () => {
    mockUseAdmin.mockReturnValue({ user: null, isAdmin: false })
    mockMySubmissions.mockReturnValue([
      createProject({ id: 'mine-1', title: 'My Pending Build', published: false }),
    ])
    setProjects([createProject({ id: 'p1' })])
    render(<ShowcasePage />)
    expect(screen.queryByText('My Pending Build')).not.toBeInTheDocument()
    expect(screen.queryByText('In review')).not.toBeInTheDocument()
  })

  // Four link icons squeezed the byline beside them down to "By Bar…".
  it('caps the card link icons so the byline keeps its room', () => {
    setProjects([
      createProject({ id: 'lead', title: 'Lead Project', featured: true }),
      createProject({
        id: 'p1',
        title: 'Many Links',
        links: {
          github: 'https://github.com/x/y',
          website: 'https://example.com',
          demo: 'https://demo.example.com',
          video: 'https://youtube.com/watch?v=z',
        },
      }),
    ])
    render(<ShowcasePage />)
    expect(screen.getByLabelText('Repository — Many Links')).toBeInTheDocument()
    expect(screen.getByLabelText('Website — Many Links')).toBeInTheDocument()
    expect(screen.queryByLabelText('Live demo — Many Links')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Video — Many Links')).not.toBeInTheDocument()
  })

  it('labels the vote control as a toggle once cast', () => {
    mockUseShowcaseVote.mockReturnValue({
      voted: ['p1'],
      pending: [],
      votesFor: (p: { votes: number }) => p.votes,
      handleVote: jest.fn(),
    })
    setProjects([
      createProject({ id: 'lead', title: 'Lead Project', featured: true }),
      createProject({ id: 'p1', title: 'Voted Project' }),
    ])
    render(<ShowcasePage />)
    expect(screen.getByLabelText('Remove your vote for Voted Project')).toBeInTheDocument()
  })

  it('opens the submission modal from the share button', () => {
    setProjects([])
    render(<ShowcasePage />)
    fireEvent.click(screen.getAllByText('Share your project')[0])
    expect(screen.getByText(/Checking your membership|Members can share projects|Title/)).toBeInTheDocument()
  })
})
