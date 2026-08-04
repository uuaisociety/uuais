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

describe('ShowcasePage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseAdmin.mockReturnValue({ user: { uid: 'u1', displayName: 'Ada' }, isAdmin: false })
    mockUseShowcaseVote.mockReturnValue({ voted: [], votesFor: (p: { votes: number }) => p.votes, handleVote: jest.fn() })
  })

  it('renders the terminal-style header', () => {
    mockUseApp.mockReturnValue({ state: { ...defaultAppState, showcaseProjects: [] }, dispatch: jest.fn() })
    render(<ShowcasePage />)
    expect(screen.getByText('Showcase')).toBeInTheDocument()
    expect(screen.getAllByText('share your project').length).toBeGreaterThan(0)
  })

  it('renders category filter chips', () => {
    mockUseApp.mockReturnValue({ state: { ...defaultAppState, showcaseProjects: [] }, dispatch: jest.fn() })
    render(<ShowcasePage />)
    expect(screen.getByText('--all')).toBeInTheDocument()
    expect(screen.getByText('--category app')).toBeInTheDocument()
    expect(screen.getByText('--category github')).toBeInTheDocument()
  })

  it('shows empty state when no projects exist', () => {
    mockUseApp.mockReturnValue({ state: { ...defaultAppState, showcaseProjects: [] }, dispatch: jest.fn() })
    render(<ShowcasePage />)
    expect(
      screen.getByText("No projects yet. Be the first to share what you're building.")
    ).toBeInTheDocument()
  })

  it('only renders published projects', () => {
    mockUseApp.mockReturnValue({
      state: {
        ...defaultAppState,
        showcaseProjects: [
          createProject(),
          createProject({ id: 'proj-2', title: 'Draft Project', published: false }),
        ],
      },
      dispatch: jest.fn(),
    })
    render(<ShowcasePage />)
    expect(screen.getByText('Course Navigator')).toBeInTheDocument()
    expect(screen.queryByText('Draft Project')).not.toBeInTheDocument()
  })

  it('filters projects by category', () => {
    mockUseApp.mockReturnValue({
      state: {
        ...defaultAppState,
        showcaseProjects: [
          createProject({ id: 'p1', title: 'Mobile App', category: 'app' }),
          createProject({ id: 'p2', title: 'Open Source Lib', category: 'github' }),
        ],
      },
      dispatch: jest.fn(),
    })
    render(<ShowcasePage />)
    expect(screen.getByText('Mobile App')).toBeInTheDocument()
    expect(screen.getByText('Open Source Lib')).toBeInTheDocument()

    fireEvent.click(screen.getByText('--category app'))
    expect(screen.getByText('Mobile App')).toBeInTheDocument()
    expect(screen.queryByText('Open Source Lib')).not.toBeInTheDocument()
  })

  it('searches projects by title', () => {
    mockUseApp.mockReturnValue({
      state: {
        ...defaultAppState,
        showcaseProjects: [
          createProject({ id: 'p1', title: 'Course Navigator' }),
          createProject({ id: 'p2', title: 'Essay Grader' }),
        ],
      },
      dispatch: jest.fn(),
    })
    render(<ShowcasePage />)
    fireEvent.change(screen.getByLabelText('Search projects'), { target: { value: 'navigator' } })
    expect(screen.getByText('Course Navigator')).toBeInTheDocument()
    expect(screen.queryByText('Essay Grader')).not.toBeInTheDocument()
  })

  it('shows featured projects in the README block', () => {
    mockUseApp.mockReturnValue({
      state: {
        ...defaultAppState,
        showcaseProjects: [
          createProject({ id: 'p1', title: 'Trending Project', featured: true }),
        ],
      },
      dispatch: jest.fn(),
    })
    render(<ShowcasePage />)
    expect(screen.getByText('trending projects')).toBeInTheDocument()
    expect(screen.getByText('Trending Project')).toBeInTheDocument()
  })

  it('opens the submission modal from the share button', () => {
    mockUseApp.mockReturnValue({ state: { ...defaultAppState, showcaseProjects: [] }, dispatch: jest.fn() })
    render(<ShowcasePage />)
    fireEvent.click(screen.getAllByText('share your project')[0])
    expect(screen.getByLabelText(/Title/)).toBeInTheDocument()
  })
})
