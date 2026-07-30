import { render, screen, fireEvent } from '@testing-library/react'
import BoardApplicationPage from '@/components/pages/BoardApplicationPage'
import { defaultAppState } from '@/__tests__/helpers/fixtures'

jest.mock('@/lib/firebase-client', () => ({
  auth: { onAuthStateChanged: jest.fn(() => jest.fn()) },
}))

const mockUseApp = jest.fn()
jest.mock('@/contexts/AppContext', () => ({
  useApp: () => mockUseApp(),
  AppProvider: ({ children }: { children: React.ReactNode }) => children,
}))

const samplePosition = {
  id: 'chair',
  title: 'Chairperson 2026',
  short: 'Deadline: 2026-05-10',
  description: 'Lead the board and represent the society.',
  published: true,
  order: 1,
}

describe('BoardApplicationPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders page heading', () => {
    mockUseApp.mockReturnValue({ state: defaultAppState, dispatch: jest.fn() })
    render(<BoardApplicationPage />)
    expect(screen.getByText('Open Positions')).toBeInTheDocument()
  })

  it('renders empty state when no board positions', () => {
    mockUseApp.mockReturnValue({ state: defaultAppState, dispatch: jest.fn() })
    render(<BoardApplicationPage />)
    expect(screen.getByText('Open Positions')).toBeInTheDocument()
  })

  it('renders board position listing', () => {
    mockUseApp.mockReturnValue({
      state: { ...defaultAppState, boardPositions: [samplePosition] },
      dispatch: jest.fn(),
    })
    render(<BoardApplicationPage />)
    expect(screen.getByText('Chairperson 2026')).toBeInTheDocument()
    expect(screen.getByText(/Deadline: 2026-05-10/)).toBeInTheDocument()
  })

  it('reveals application form on clicking Show details', () => {
    mockUseApp.mockReturnValue({
      state: { ...defaultAppState, boardPositions: [samplePosition] },
      dispatch: jest.fn(),
    })
    render(<BoardApplicationPage />)
    fireEvent.click(screen.getByText('Show details'))
    expect(screen.getByText(/Lead the board/)).toBeInTheDocument()
    expect(screen.getByText('Submit application')).toBeInTheDocument()
  })

  it('hides application form on clicking Hide details', () => {
    mockUseApp.mockReturnValue({
      state: { ...defaultAppState, boardPositions: [samplePosition] },
      dispatch: jest.fn(),
    })
    render(<BoardApplicationPage />)
    fireEvent.click(screen.getByText('Show details'))
    expect(screen.getByText('Submit application')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Hide details'))
  })

  it('shows submitted state', () => {
    const positionWithSubmitted = {
      ...samplePosition,
      id: 'chair',
      title: 'Chairperson 2026',
      short: 'Deadline: 2026-05-10',
      description: 'Lead the board and represent the society.',
    }

    mockUseApp.mockReturnValue({
      state: { ...defaultAppState, boardPositions: [positionWithSubmitted] },
      dispatch: jest.fn(),
    })
    render(<BoardApplicationPage />)
    fireEvent.click(screen.getByText('Show details'))
    expect(screen.getByText(/Lead the board/)).toBeInTheDocument()
    expect(screen.getByText('Submit application')).toBeInTheDocument()
  })
})
