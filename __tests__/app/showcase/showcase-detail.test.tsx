import { render, screen } from '@testing-library/react'
import ShowcaseDetailPage from '@/components/pages/ShowcaseDetailPage'
import { defaultAppState } from '@/__tests__/helpers/fixtures'

const mockUseApp = jest.fn()
jest.mock('@/contexts/AppContext', () => ({
  useApp: () => mockUseApp(),
  AppProvider: ({ children }: { children: React.ReactNode }) => children,
}))

jest.mock('@/hooks/useAdmin', () => ({
  useAdmin: () => ({ user: { uid: 'u1', displayName: 'Ada' }, isAdmin: false }),
}))

jest.mock('@/components/showcase/useShowcaseVote', () => ({
  useShowcaseVote: () => ({ voted: [], pending: [], votesFor: (p: { votes: number }) => p.votes, handleVote: jest.fn() }),
}))

const mockNotFound = jest.fn(() => {
  throw new Error('NEXT_NOT_FOUND')
})
jest.mock('next/navigation', () => ({
  ...jest.requireActual('next/navigation'),
  useParams: () => ({ id: 'course-navigator' }),
  notFound: () => mockNotFound(),
}))

function createProject(overrides: Record<string, unknown> = {}) {
  return {
    id: 'proj-1',
    slug: 'course-navigator',
    title: 'Course Navigator',
    description: 'Explore UU courses with AI assistance.',
    category: 'app',
    creatorUserId: 'u1',
    creatorName: 'Ada',
    links: {},
    tags: ['ai'],
    votes: 3,
    published: true,
    featured: false,
    createdAt: '2026-07-01T00:00:00Z',
    updatedAt: '2026-07-01T00:00:00Z',
    ...overrides,
  }
}

describe('ShowcaseDetailPage', () => {
  beforeEach(() => jest.clearAllMocks())

  // Anonymous visitors get the subscription deferred, so a shared link arrives before the data.
  it('waits for the load to settle before reporting a missing project', () => {
    mockUseApp.mockReturnValue({
      state: { ...defaultAppState, showcaseProjects: [], showcaseLoaded: false },
      dispatch: jest.fn(),
    })
    render(<ShowcaseDetailPage projectId="course-navigator" />)
    expect(mockNotFound).not.toHaveBeenCalled()
  })

  it('calls notFound once loaded and the project is genuinely absent', () => {
    mockUseApp.mockReturnValue({
      state: { ...defaultAppState, showcaseProjects: [], showcaseLoaded: true },
      dispatch: jest.fn(),
    })
    expect(() => render(<ShowcaseDetailPage projectId="course-navigator" />)).toThrow('NEXT_NOT_FOUND')
    expect(mockNotFound).toHaveBeenCalled()
  })

  // A dropped connection must not report a live URL as gone, to a reader or a crawler.
  it('reports a failed load instead of calling notFound', () => {
    mockUseApp.mockReturnValue({
      state: {
        ...defaultAppState,
        showcaseProjects: [],
        showcaseLoaded: true,
        showcaseUnavailable: true,
      },
      dispatch: jest.fn(),
    })
    render(<ShowcaseDetailPage projectId="course-navigator" />)
    expect(mockNotFound).not.toHaveBeenCalled()
    expect(screen.getByText('Could not load this project')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
  })

  it('resolves a project by slug', () => {
    mockUseApp.mockReturnValue({
      state: { ...defaultAppState, showcaseProjects: [createProject()], showcaseLoaded: true },
      dispatch: jest.fn(),
    })
    render(<ShowcaseDetailPage projectId="course-navigator" />)
    expect(screen.getByRole('heading', { level: 1, name: 'Course Navigator' })).toBeInTheDocument()
    expect(mockNotFound).not.toHaveBeenCalled()
  })

  it('resolves a project by id for records with no slug', () => {
    mockUseApp.mockReturnValue({
      state: {
        ...defaultAppState,
        showcaseProjects: [createProject({ slug: undefined })],
        showcaseLoaded: true,
      },
      dispatch: jest.fn(),
    })
    render(<ShowcaseDetailPage projectId="proj-1" />)
    expect(screen.getByRole('heading', { level: 1, name: 'Course Navigator' })).toBeInTheDocument()
  })

  it('does not surface unpublished projects', () => {
    mockUseApp.mockReturnValue({
      state: {
        ...defaultAppState,
        showcaseProjects: [createProject({ published: false })],
        showcaseLoaded: true,
      },
      dispatch: jest.fn(),
    })
    expect(() => render(<ShowcaseDetailPage projectId="course-navigator" />)).toThrow('NEXT_NOT_FOUND')
  })

  it('renders the long-form write-up as paragraphs', () => {
    mockUseApp.mockReturnValue({
      state: {
        ...defaultAppState,
        showcaseProjects: [
          createProject({ details: 'First paragraph here.\n\nSecond paragraph here.' }),
        ],
        showcaseLoaded: true,
      },
      dispatch: jest.fn(),
    })
    render(<ShowcaseDetailPage projectId="course-navigator" />)
    expect(screen.getByText('First paragraph here.')).toBeInTheDocument()
    expect(screen.getByText('Second paragraph here.')).toBeInTheDocument()
  })

  it('omits the write-up section when the project has none', () => {
    mockUseApp.mockReturnValue({
      state: { ...defaultAppState, showcaseProjects: [createProject()], showcaseLoaded: true },
      dispatch: jest.fn(),
    })
    render(<ShowcaseDetailPage projectId="course-navigator" />)
    expect(screen.queryByRole('heading', { name: /About.*this project/ })).not.toBeInTheDocument()
  })

  it('surfaces the project links as labelled cards', () => {
    mockUseApp.mockReturnValue({
      state: {
        ...defaultAppState,
        showcaseProjects: [
          createProject({ links: { github: 'https://github.com/u/p', demo: 'https://demo.example' } }),
        ],
        showcaseLoaded: true,
      },
      dispatch: jest.fn(),
    })
    render(<ShowcaseDetailPage projectId="course-navigator" />)
    expect(screen.getByText('Source code')).toBeInTheDocument()
    expect(screen.getByText('Live demo')).toBeInTheDocument()
  })

  it('offers a share action', () => {
    mockUseApp.mockReturnValue({
      state: { ...defaultAppState, showcaseProjects: [createProject()], showcaseLoaded: true },
      dispatch: jest.fn(),
    })
    render(<ShowcaseDetailPage projectId="course-navigator" />)
    expect(screen.getByRole('button', { name: 'Share' })).toBeInTheDocument()
  })

  // The initials fallback works at card size; at full width it is a 500px empty slab.
  it('omits the cover block when the project has no cover image', () => {
    mockUseApp.mockReturnValue({
      state: { ...defaultAppState, showcaseProjects: [createProject()], showcaseLoaded: true },
      dispatch: jest.fn(),
    })
    render(<ShowcaseDetailPage projectId="course-navigator" />)
    expect(screen.queryByRole('img', { name: /no cover image/i })).not.toBeInTheDocument()
  })

  it('renders the cover when the project has one', () => {
    mockUseApp.mockReturnValue({
      state: {
        ...defaultAppState,
        showcaseProjects: [createProject({ coverImage: '/images/campus.png' })],
        showcaseLoaded: true,
      },
      dispatch: jest.fn(),
    })
    render(<ShowcaseDetailPage projectId="course-navigator" />)
    expect(screen.getByAltText('Course Navigator project cover')).toBeInTheDocument()
  })
})
