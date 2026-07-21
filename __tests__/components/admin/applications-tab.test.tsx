import { render, screen, fireEvent } from '@testing-library/react'
import ApplicationsTab from '@/components/pages/admin/tabs/ApplicationsTab'
import type { ApplicationCampaign, TeamApplication } from '@/types'

const sampleCampaign: ApplicationCampaign = {
  id: 'spring2026',
  title: 'Spring 2026 Recruitment',
  subtitle: 'UU AI Society — Spring 2026',
  description: 'Main yearly drive.',
  deadline: '2026-05-10',
  status: 'open',
  teams: ['it', 'development'],
  enabledStandardFields: ['name', 'email'],
}

const sampleSubmission: TeamApplication = {
  id: 'sub-1',
  campaignId: 'spring2026',
  name: 'Alice Doe',
  email: 'alice@test.com',
  program: 'Data Science (MSc)',
  graduationYear: '2027',
  linkedin: 'https://linkedin.com/in/alice',
  interests: ['robotics'],
  teamRanking: ['it', 'development'],
  weeklyHours: 8,
  motivation: 'I want to contribute.',
  customAnswers: {},
  agree: true,
  createdAt: '2026-04-01',
}

const baseProps = (overrides: Partial<React.ComponentProps<typeof ApplicationsTab>> = {}) => ({
  campaigns: [] as ApplicationCampaign[],
  applications: [] as TeamApplication[],
  onAddCampaign: jest.fn(),
  onEditCampaign: jest.fn(),
  onDeleteCampaign: jest.fn(),
  onDeleteApplication: jest.fn(),
  ...overrides,
})

describe('ApplicationsTab', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders header and New campaign button', () => {
    render(<ApplicationsTab {...baseProps()} />)
    expect(screen.getByText('Application Campaigns')).toBeInTheDocument()
    expect(screen.getByText('New campaign')).toBeInTheDocument()
  })

  it('shows empty state when no campaigns match filter', () => {
    render(<ApplicationsTab {...baseProps({ campaigns: [] })} />)
    expect(screen.getByText(/No campaigns with status/i)).toBeInTheDocument()
  })

  it('renders campaign cards with status badges and actions', () => {
    render(<ApplicationsTab {...baseProps({ campaigns: [sampleCampaign] })} />)
    expect(screen.getByText('Spring 2026 Recruitment')).toBeInTheDocument()
    // Status badge appears as Tag; filter tab button also says "Open" — match the badge (text-sm size on Tag).
    const openMatches = screen.getAllByText('Open')
    expect(openMatches.length).toBeGreaterThan(0)
    expect(screen.getByText('Edit')).toBeInTheDocument()
  })

  it('filters by Open tab', () => {
    render(<ApplicationsTab {...baseProps({ campaigns: [
      sampleCampaign,
      { ...sampleCampaign, id: 'closed-one', status: 'closed', title: 'Closed Campaign' },
    ] })} />)
    // Click the "Open" filter tab (filter buttons have border-b-2 class inline)
    const openButtons = screen.getAllByRole('button', { name: /^Open/i })
    fireEvent.click(openButtons.find(b => b.tagName === 'BUTTON')!)
    expect(screen.getByText('Spring 2026 Recruitment')).toBeInTheDocument()
    expect(screen.queryByText('Closed Campaign')).not.toBeInTheDocument()
  })

  it('switches to submissions view on View submissions click', () => {
    render(<ApplicationsTab {...baseProps({
      campaigns: [sampleCampaign],
      applications: [sampleSubmission],
    })} />)
    fireEvent.click(screen.getByText('View submissions'))
    expect(screen.getByText('Submissions: Spring 2026 Recruitment')).toBeInTheDocument()
    expect(screen.getByText('Alice Doe')).toBeInTheDocument()
  })

  it('calls onAddCampaign when New campaign is clicked', () => {
    const onAddCampaign = jest.fn()
    render(<ApplicationsTab {...baseProps({ onAddCampaign })} />)
    fireEvent.click(screen.getByText('New campaign'))
    expect(onAddCampaign).toHaveBeenCalled()
  })

  it('calls onEditCampaign when Edit is clicked', () => {
    const onEditCampaign = jest.fn()
    render(<ApplicationsTab {...baseProps({ campaigns: [sampleCampaign], onEditCampaign })} />)
    fireEvent.click(screen.getByText('Edit'))
    expect(onEditCampaign).toHaveBeenCalledWith(sampleCampaign)
  })

  it('opens confirm modal when delete campaign clicked and confirms delete', () => {
    const onDeleteCampaign = jest.fn()
    render(<ApplicationsTab {...baseProps({ campaigns: [sampleCampaign], onDeleteCampaign })} />)
    // Click the destructive delete button (Trash2 icon-only button)
    fireEvent.click(screen.getByRole('button', { name: /delete campaign/i }))
    expect(screen.getByText('Delete campaign?')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Delete'))
    expect(onDeleteCampaign).toHaveBeenCalledWith('spring2026')
  })

  it('expands a submission to show motivation on click', () => {
    render(<ApplicationsTab {...baseProps({
      campaigns: [sampleCampaign],
      applications: [sampleSubmission],
    })} />)
    fireEvent.click(screen.getByText('View submissions'))
    fireEvent.click(screen.getByText('Alice Doe'))
    expect(screen.getByText('I want to contribute.')).toBeInTheDocument()
  })

  it('Back button returns to campaigns view', () => {
    render(<ApplicationsTab {...baseProps({
      campaigns: [sampleCampaign],
      applications: [sampleSubmission],
    })} />)
    fireEvent.click(screen.getByText('View submissions'))
    fireEvent.click(screen.getByText('Back to campaigns'))
    expect(screen.getByText('Application Campaigns')).toBeInTheDocument()
  })
})