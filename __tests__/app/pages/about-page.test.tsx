import { render, screen } from '@testing-library/react'
import AboutPage from '@/components/pages/AboutPage'

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

describe('AboutPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders page heading and description', () => {
    mockUseApp.mockReturnValue({ state: defaultState, dispatch: jest.fn() })
    render(<AboutPage />)
    expect(screen.getByText('About UU AI Society')).toBeInTheDocument()
    expect(screen.getByText(/We are a community of students/)).toBeInTheDocument()
  })

  it('renders mission section', () => {
    mockUseApp.mockReturnValue({ state: defaultState, dispatch: jest.fn() })
    render(<AboutPage />)
    expect(screen.getByText('Our Mission')).toBeInTheDocument()
    expect(screen.getByText(/To democratize AI education/)).toBeInTheDocument()
  })

  it('renders vision section', () => {
    mockUseApp.mockReturnValue({ state: defaultState, dispatch: jest.fn() })
    render(<AboutPage />)
    expect(screen.getByText('Our Vision')).toBeInTheDocument()
    expect(screen.getByText(/A student led non-profit/)).toBeInTheDocument()
  })

  it('renders team section heading', () => {
    mockUseApp.mockReturnValue({ state: defaultState, dispatch: jest.fn() })
    render(<AboutPage />)
    expect(screen.getByText('Meet Our Team')).toBeInTheDocument()
  })
})
