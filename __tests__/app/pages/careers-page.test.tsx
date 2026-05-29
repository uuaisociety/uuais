import { render, screen, fireEvent } from '@testing-library/react'
import CareersPage from '@/components/pages/CareersPage'

jest.mock('@/lib/firestore/analytics', () => ({
  incrementJobClick: jest.fn(),
}))

jest.mock('dompurify', () => ({
  sanitize: (s: string) => s,
}))

const mockUseApp = jest.fn()
jest.mock('@/contexts/AppContext', () => ({
  useApp: () => mockUseApp(),
  AppProvider: ({ children }: { children: React.ReactNode }) => children,
}))

const defaultState = {
  events: [],
  teamMembers: [],
  blogPosts: [],
  faqs: [],
  jobs: [],
  boardPositions: [],
  applicants: [],
  registrationQuestions: [],
  isLoading: false,
  error: null,
}

const sampleJob = {
  id: 'j1',
  title: 'Software Engineer',
  company: 'Tech AB',
  location: 'Uppsala',
  description: 'Build cool stuff',
  type: 'job' as const,
  published: true,
  tags: ['Python', 'React'],
  applyUrl: 'https://example.com/apply',
}

const sampleStartup = {
  id: 'j2',
  title: 'ML Intern',
  company: 'AI Startup',
  location: 'Remote',
  description: 'Work on ML models',
  type: 'startup' as const,
  published: true,
  tags: ['ML'],
  applyUrl: 'https://example.com/ml',
}

const sampleInternship = {
  id: 'j3',
  title: 'Research Intern',
  company: 'Uni',
  description: 'Research position',
  type: 'internship' as const,
  published: true,
  tags: [],
  applyEmail: 'apply@uni.se',
}

const sampleUnpublished = {
  id: 'j4',
  title: 'Hidden Job',
  company: 'Secret',
  description: 'Not published yet',
  type: 'job' as const,
  published: false,
  tags: [],
}

describe('CareersPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders page heading', () => {
    mockUseApp.mockReturnValue({ state: defaultState, dispatch: jest.fn() })
    render(<CareersPage />)
    expect(screen.getByText('Job board')).toBeInTheDocument()
  })

  it('shows empty state when no jobs', () => {
    mockUseApp.mockReturnValue({ state: defaultState, dispatch: jest.fn() })
    render(<CareersPage />)
    expect(screen.getByText(/No jobs available/)).toBeInTheDocument()
  })

  it('renders job listings from context', () => {
    mockUseApp.mockReturnValue({
      state: { ...defaultState, jobs: [sampleJob] },
      dispatch: jest.fn(),
    })
    render(<CareersPage />)
    expect(screen.getByText('Software Engineer')).toBeInTheDocument()
    expect(screen.getByText('Tech AB')).toBeInTheDocument()
    expect(screen.getByText('Uppsala')).toBeInTheDocument()
  })

  it('renders tags for jobs', () => {
    mockUseApp.mockReturnValue({
      state: { ...defaultState, jobs: [sampleJob] },
      dispatch: jest.fn(),
    })
    render(<CareersPage />)
    expect(screen.getByText('Python')).toBeInTheDocument()
    expect(screen.getByText('React')).toBeInTheDocument()
  })

  it('renders HTML description when description contains HTML', () => {
    const htmlJob = {
      ...sampleJob,
      id: 'html1',
      title: 'HTML Job',
      description: '<p>Build <strong>cool</strong> stuff</p>',
    }
    mockUseApp.mockReturnValue({
      state: { ...defaultState, jobs: [htmlJob] },
      dispatch: jest.fn(),
    })
    const { container } = render(<CareersPage />)
    expect(container.innerHTML).toContain('Build')
    expect(container.innerHTML).toContain('cool')
    expect(container.innerHTML).toContain('stuff')
  })

  it('filters out unpublished jobs', () => {
    mockUseApp.mockReturnValue({
      state: { ...defaultState, jobs: [sampleJob, sampleUnpublished] },
      dispatch: jest.fn(),
    })
    render(<CareersPage />)
    expect(screen.getByText('Software Engineer')).toBeInTheDocument()
    expect(screen.queryByText('Hidden Job')).not.toBeInTheDocument()
  })

  it('renders filter buttons', () => {
    mockUseApp.mockReturnValue({ state: defaultState, dispatch: jest.fn() })
    render(<CareersPage />)
    expect(screen.getByText('Show all')).toBeInTheDocument()
    expect(screen.getByText('Internships & Master thesis')).toBeInTheDocument()
    expect(screen.getByText('Startups')).toBeInTheDocument()
    expect(screen.getByText('Jobs')).toBeInTheDocument()
    expect(screen.getByText('Other')).toBeInTheDocument()
  })

  it('filters jobs by type', () => {
    mockUseApp.mockReturnValue({
      state: { ...defaultState, jobs: [sampleJob, sampleStartup, sampleInternship] },
      dispatch: jest.fn(),
    })
    render(<CareersPage />)
    fireEvent.click(screen.getByText('Startups'))
    expect(screen.getByText('ML Intern')).toBeInTheDocument()
    expect(screen.queryByText('Software Engineer')).not.toBeInTheDocument()
  })

  it('filters by internships type', () => {
    mockUseApp.mockReturnValue({
      state: { ...defaultState, jobs: [sampleJob, sampleStartup, sampleInternship] },
      dispatch: jest.fn(),
    })
    render(<CareersPage />)
    fireEvent.click(screen.getByText('Internships & Master thesis'))
    expect(screen.getByText('Research Intern')).toBeInTheDocument()
    expect(screen.queryByText('Software Engineer')).not.toBeInTheDocument()
  })

  it('filters by other type', () => {
    const otherJob = { id: 'j5', title: 'Other Role', company: 'OtherCo', description: 'desc', type: 'other' as const, published: true, tags: [] }
    mockUseApp.mockReturnValue({
      state: { ...defaultState, jobs: [sampleJob, otherJob] },
      dispatch: jest.fn(),
    })
    render(<CareersPage />)
    fireEvent.click(screen.getByText('Other'))
    expect(screen.getByText('Other Role')).toBeInTheDocument()
    expect(screen.queryByText('Software Engineer')).not.toBeInTheDocument()
  })

  it('updates aria-pressed on filter click', () => {
    mockUseApp.mockReturnValue({
      state: { ...defaultState, jobs: [sampleJob] },
      dispatch: jest.fn(),
    })
    render(<CareersPage />)
    const allBtn = screen.getByText('Show all').closest('button')!
    const jobsBtn = screen.getByText('Jobs').closest('button')!
    expect(allBtn).toHaveAttribute('aria-pressed', 'true')
    expect(jobsBtn).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(jobsBtn)
    expect(allBtn).toHaveAttribute('aria-pressed', 'false')
    expect(jobsBtn).toHaveAttribute('aria-pressed', 'true')
  })

  it('renders apply email link', () => {
    mockUseApp.mockReturnValue({
      state: { ...defaultState, jobs: [sampleInternship] },
      dispatch: jest.fn(),
    })
    render(<CareersPage />)
    expect(screen.getByText('apply@uni.se')).toBeInTheDocument()
  })

  it('calls incrementJobClick when clicking apply link', () => {
    const analytics = jest.requireMock('@/lib/firestore/analytics')
    analytics.incrementJobClick.mockResolvedValue(undefined)
    mockUseApp.mockReturnValue({
      state: { ...defaultState, jobs: [sampleJob] },
      dispatch: jest.fn(),
    })
    render(<CareersPage />)
    const readMore = screen.getByText('Read more')
    fireEvent.click(readMore)
    expect(analytics.incrementJobClick).toHaveBeenCalledWith('j1')
  })

  it('calls incrementJobClick when clicking apply email', () => {
    const analytics = jest.requireMock('@/lib/firestore/analytics')
    analytics.incrementJobClick.mockResolvedValue(undefined)
    mockUseApp.mockReturnValue({
      state: { ...defaultState, jobs: [sampleInternship] },
      dispatch: jest.fn(),
    })
    render(<CareersPage />)
    const email = screen.getByText('apply@uni.se')
    fireEvent.click(email)
    expect(analytics.incrementJobClick).toHaveBeenCalledWith('j3')
  })
})
