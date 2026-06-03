import { render, screen } from '@testing-library/react'
import AboutPage from '@/components/pages/AboutPage'
import { defaultAppState } from '@/__tests__/helpers/fixtures'

const mockUseApp = jest.fn()
jest.mock('@/contexts/AppContext', () => ({
  useApp: () => mockUseApp(),
  AppProvider: ({ children }: { children: React.ReactNode }) => children,
}))

describe('AboutPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders page heading and description', () => {
    mockUseApp.mockReturnValue({ state: defaultAppState, dispatch: jest.fn() })
    render(<AboutPage />)
    expect(screen.getByText('About UU AI Society')).toBeInTheDocument()
    expect(screen.getByText(/We are a community of students/)).toBeInTheDocument()
  })

  it('renders mission section', () => {
    mockUseApp.mockReturnValue({ state: defaultAppState, dispatch: jest.fn() })
    render(<AboutPage />)
    expect(screen.getByText('Our Mission')).toBeInTheDocument()
    expect(screen.getByText(/To democratize AI education/)).toBeInTheDocument()
  })

  it('renders vision section', () => {
    mockUseApp.mockReturnValue({ state: defaultAppState, dispatch: jest.fn() })
    render(<AboutPage />)
    expect(screen.getByText('Our Vision')).toBeInTheDocument()
    expect(screen.getByText(/A student led non-profit/)).toBeInTheDocument()
  })

  it('renders team section heading', () => {
    mockUseApp.mockReturnValue({ state: defaultAppState, dispatch: jest.fn() })
    render(<AboutPage />)
    expect(screen.getByText('Meet Our Team')).toBeInTheDocument()
  })
})
