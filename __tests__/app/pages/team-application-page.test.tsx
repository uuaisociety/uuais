import { render, screen, fireEvent } from '@testing-library/react'
import TeamApplicationPage from '@/components/pages/TeamApplicationPage'
import { defaultAppState } from '@/__tests__/helpers/fixtures'
import type { ApplicationCampaign } from '@/types'

const mockUseApp = jest.fn()
const mockNotify = jest.fn()
const mockSubscribeToCampaignQuestions = jest.fn(() => jest.fn())

jest.mock('@/contexts/AppContext', () => ({
  useApp: () => mockUseApp(),
  AppProvider: ({ children }: { children: React.ReactNode }) => children,
}))

jest.mock('@/components/ui/Notifications', () => ({
  useNotify: () => ({ notify: mockNotify }),
}))

jest.mock('@/lib/firebase-client', () => ({
  auth: { onAuthStateChanged: (cb: (u: unknown) => void) => { cb(null); return jest.fn(); } },
}))

jest.mock('@/lib/firestore/users', () => ({
  getUserProfile: jest.fn().mockResolvedValue(null),
}))

jest.mock('@/lib/firestore/campaignQuestions', () => ({
  subscribeToCampaignQuestions: (...args: unknown[]) => mockSubscribeToCampaignQuestions(...args),
}))

const sampleCampaign: ApplicationCampaign = {
  id: 'spring2026',
  title: 'Spring 2026 Recruitment',
  subtitle: 'UU AI Society — Spring 2026',
  description: 'Main yearly recruitment drive for all society teams.',
  deadline: '2099-05-10',
  status: 'open',
  teams: ['it', 'development', 'growth'],
  enabledStandardFields: [
    'name', 'email', 'gender', 'university', 'program', 'graduationYear',
    'linkedin', 'resume', 'interests', 'teamRanking', 'weeklyHours', 'motivation',
  ],
}

describe('TeamApplicationPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSubscribeToCampaignQuestions.mockImplementation(() => jest.fn())
  })

  it('shows loading state when no campaigns', () => {
    mockUseApp.mockReturnValue({ state: defaultAppState, dispatch: jest.fn() })
    render(<TeamApplicationPage />)
    expect(screen.getByText('Loading campaigns…')).toBeInTheDocument()
  })

  it('shows no active campaigns message when only closed/draft campaigns exist', () => {
    mockUseApp.mockReturnValue({
      state: {
        ...defaultAppState,
        campaignsLoaded: true,
        campaigns: [{ ...sampleCampaign, status: 'closed' }],
      },
      dispatch: jest.fn(),
    })
    render(<TeamApplicationPage />)
    expect(screen.getByText('No active campaigns')).toBeInTheDocument()
  })

  it('renders hero with campaign title and overview', () => {
    mockUseApp.mockReturnValue({
      state: { ...defaultAppState, campaigns: [sampleCampaign] },
      dispatch: jest.fn(),
    })
    render(<TeamApplicationPage />)
    expect(screen.getByText('Spring 2026 Recruitment')).toBeInTheDocument()
    expect(screen.getByText(/We are looking for passionate students/)).toBeInTheDocument()
    expect(screen.getByText('Our Teams')).toBeInTheDocument()
  })

  it('shows team cards from campaign teams', () => {
    mockUseApp.mockReturnValue({
      state: { ...defaultAppState, campaigns: [sampleCampaign] },
      dispatch: jest.fn(),
    })
    render(<TeamApplicationPage />)
    expect(screen.getByText('IT')).toBeInTheDocument()
    expect(screen.getByText('Development')).toBeInTheDocument()
    expect(screen.getByText('Growth')).toBeInTheDocument()
  })

  it('navigates to profile step on Continue click', () => {
    mockUseApp.mockReturnValue({
      state: { ...defaultAppState, campaigns: [sampleCampaign] },
      dispatch: jest.fn(),
    })
    render(<TeamApplicationPage />)
    fireEvent.click(screen.getByText('Continue'))
    // "Your Profile" appears in step-nav as well as h2; match the h2 heading specifically
    expect(screen.getByRole('heading', { name: 'Your Profile', level: 2 })).toBeInTheDocument()
  })

  it('shows team selection step heading after navigating to step 4', () => {
    mockUseApp.mockReturnValue({
      state: { ...defaultAppState, campaigns: [sampleCampaign] },
      dispatch: jest.fn(),
    })
    render(<TeamApplicationPage />)
    // Step 0 -> 1 (Overview -> Profile)
    fireEvent.click(screen.getByText('Continue'))
    const nameInput = screen.getByLabelText(/Full name/i)
    const emailInput = screen.getByLabelText(/^Email/i)
    fireEvent.change(nameInput, { target: { value: 'Alex' } })
    fireEvent.change(emailInput, { target: { value: 'alex@test.com' } })
    // Step 1 -> 2 (Profile -> Experience)
    fireEvent.click(screen.getByText('Continue'))
    // On step 2 (Experience), set linkedin and select an area of interest to enable Continue
    fireEvent.change(screen.getByLabelText(/LinkedIn URL/i), { target: { value: 'https://linkedin.com/in/alice' } })
    fireEvent.click(screen.getByLabelText('Robotics'))
    fireEvent.click(screen.getByText('Continue'))
    expect(screen.getByText('Draggable Team Selection')).toBeInTheDocument()
    expect(screen.getByText('Weekly Availability')).toBeInTheDocument()
    expect(screen.getByText('Personal motivation')).toBeInTheDocument()
  })

  it('renders review step after completing all steps', () => {
    mockUseApp.mockReturnValue({
      state: { ...defaultAppState, campaigns: [sampleCampaign] },
      dispatch: jest.fn(),
    })
    render(<TeamApplicationPage />)
    fireEvent.click(screen.getByText('Continue'))
    fireEvent.change(screen.getByLabelText(/Full name/i), { target: { value: 'Alex' } })
    fireEvent.change(screen.getByLabelText(/^Email/i), { target: { value: 'alex@test.com' } })
    fireEvent.click(screen.getByText('Continue'))
    fireEvent.change(screen.getByLabelText(/LinkedIn URL/i), { target: { value: 'https://linkedin.com/in/alice' } })
    fireEvent.click(screen.getByLabelText('Robotics'))
    fireEvent.click(screen.getByText('Continue'))
    // Step 3 (Team Selection): add a team so Continue is enabled (canNext requires motivation + ranking >= 1)
    const itButton = screen.getByRole('button', { name: /^IT/i })
    fireEvent.click(itButton)
    // Fill motivation so Continue is enabled
    fireEvent.change(screen.getByPlaceholderText(/Tell us why you want to join/), { target: { value: 'I am excited to contribute to AI.' } })
    fireEvent.click(screen.getByText('Continue'))
    expect(screen.getByRole('heading', { name: /Review & Submit/i, level: 2 })).toBeInTheDocument()
  })

  it('hides standard fields that the campaign has disabled', () => {
    const limitedCampaign: ApplicationCampaign = {
      ...sampleCampaign,
      enabledStandardFields: ['name', 'email'],
    }
    mockUseApp.mockReturnValue({
      state: { ...defaultAppState, campaigns: [limitedCampaign] },
      dispatch: jest.fn(),
    })
    render(<TeamApplicationPage />)
    fireEvent.click(screen.getByText('Continue'))
    // Name/email still render, but disabled fields (LinkedIn, etc.) do not
    expect(screen.getByLabelText(/Full name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^Email/i)).toBeInTheDocument()
    expect(screen.queryByLabelText(/LinkedIn URL/i)).not.toBeInTheDocument()
    expect(screen.queryByText('Areas of Interest')).not.toBeInTheDocument()
    // Continue is enabled without filling the disabled LinkedIn/interests fields
    fireEvent.change(screen.getByLabelText(/Full name/i), { target: { value: 'Alex' } })
    fireEvent.change(screen.getByLabelText(/^Email/i), { target: { value: 'alex@test.com' } })
    fireEvent.click(screen.getByText('Continue'))
    fireEvent.click(screen.getByText('Continue'))
    expect(screen.getByRole('heading', { name: /Team Selection/i, level: 2 })).toBeInTheDocument()
  })

  it('shows applications closed when the campaign deadline has passed', () => {
    mockUseApp.mockReturnValue({
      state: {
        ...defaultAppState,
        campaignsLoaded: true,
        campaigns: [{ ...sampleCampaign, deadline: '2020-01-01' }],
      },
      dispatch: jest.fn(),
    })
    render(<TeamApplicationPage />)
    expect(screen.getByText('Applications Closed')).toBeInTheDocument()
    expect(screen.queryByText('Continue')).not.toBeInTheDocument()
  })

  it('blocks advancing when a required custom question is unanswered', () => {
    mockSubscribeToCampaignQuestions.mockImplementation((_id: string, cb: (qs: unknown[]) => void) => {
      cb([{ id: 'q1', question: 'Why do you want to join?', required: true, type: 'textarea' }])
      return jest.fn()
    })
    mockUseApp.mockReturnValue({
      state: { ...defaultAppState, campaigns: [sampleCampaign] },
      dispatch: jest.fn(),
    })
    render(<TeamApplicationPage />)
    fireEvent.click(screen.getByText('Continue'))
    fireEvent.change(screen.getByLabelText(/Full name/i), { target: { value: 'Alex' } })
    fireEvent.change(screen.getByLabelText(/^Email/i), { target: { value: 'alex@test.com' } })
    fireEvent.click(screen.getByText('Continue'))
    fireEvent.change(screen.getByLabelText(/LinkedIn URL/i), { target: { value: 'https://linkedin.com/in/alice' } })
    fireEvent.click(screen.getByLabelText('Robotics'))
    expect(screen.getByRole('button', { name: /Continue/i })).toBeDisabled()
    fireEvent.change(screen.getByLabelText(/Why do you want to join/), { target: { value: 'I love AI.' } })
    expect(screen.getByRole('button', { name: /Continue/i })).toBeEnabled()
  })
})