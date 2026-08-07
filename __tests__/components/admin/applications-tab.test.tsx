import { render, screen, fireEvent } from '@testing-library/react'
import ApplicationsTab from '@/components/pages/admin/tabs/ApplicationsTab'
import type { ApplicationCampaign, TeamApplication } from '@/types'

jest.mock('@/lib/firestore/campaignQuestions', () => ({
  subscribeToCampaignQuestions: jest.fn(() => jest.fn()),
}))

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
  program: 'MSc in Data Science – Machine Learning and Statistics',
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
  onUpdateCampaignStatus: jest.fn(),
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

  it('toggles campaign status via the segmented control', () => {
    const onUpdateCampaignStatus = jest.fn()
    render(<ApplicationsTab {...baseProps({ campaigns: [sampleCampaign], onUpdateCampaignStatus })} />)
    // The card's status toggle has a "Draft" button (the filter tab says "Draft 0")
    fireEvent.click(screen.getByRole('button', { name: 'Draft' }))
    expect(onUpdateCampaignStatus).toHaveBeenCalledWith('spring2026', 'draft')
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

  describe('role-based applications', () => {
    const roleCampaign: ApplicationCampaign = {
      ...sampleCampaign,
      roles: [
        { id: 'it_member', teamId: 'it', title: 'IT Member', status: 'open', order: 0 },
        { id: 'dev_member', teamId: 'development', title: 'Development Member', status: 'open', order: 1 },
      ],
    }

    const roleSubmission: TeamApplication = {
      ...sampleSubmission,
      id: 'sub-2',
      roleRanking: [
        { roleId: 'it_member', teamId: 'it', justification: 'I have 2 years of systems administration experience.' },
        { roleId: 'dev_member', teamId: 'development', justification: 'I enjoy building web apps.' },
      ],
      customRole: 'Event Photographer',
    }

    it('renders ranked role tags for a roleRanking submission', () => {
      render(<ApplicationsTab {...baseProps({
        campaigns: [roleCampaign],
        applications: [roleSubmission],
      })} />)
      fireEvent.click(screen.getByText('View submissions'))
      // The hidden expanded detail also contains the ranked labels, so scope via getAllByText
      expect(screen.getAllByText('#1 IT Member').length).toBeGreaterThan(0)
      expect(screen.getAllByText('#2 Development Member').length).toBeGreaterThan(0)
    })

    it('falls back to team tags for a legacy teamRanking submission', () => {
      render(<ApplicationsTab {...baseProps({
        campaigns: [roleCampaign],
        applications: [sampleSubmission],
      })} />)
      fireEvent.click(screen.getByText('View submissions'))
      expect(screen.getByText('#1 IT')).toBeInTheDocument()
      expect(screen.getByText('#2 Development')).toBeInTheDocument()
    })

    it('shows the role count on the campaign card', () => {
      render(<ApplicationsTab {...baseProps({ campaigns: [roleCampaign] })} />)
      expect(screen.getByText('2 roles')).toBeInTheDocument()
    })

    it('filters submissions by a specific role', () => {
      render(<ApplicationsTab {...baseProps({
        campaigns: [roleCampaign],
        applications: [
          roleSubmission,
          { ...sampleSubmission, id: 'sub-legacy', teamRanking: ['it', 'development'] },
        ],
      })} />)
      fireEvent.click(screen.getByText('View submissions'))

      // Role options are labelled "<Team> · <Role>"
      fireEvent.change(screen.getByRole('combobox'), { target: { value: 'role:it_member' } })
      expect(screen.getByText('Alice Doe')).toBeInTheDocument()
      expect(screen.queryByText('No submissions match your filters.')).not.toBeInTheDocument()
    })

    it('filters submissions by legacy team id when campaign has no roles', () => {
      const legacySubmission = { ...sampleSubmission, id: 'sub-legacy', teamRanking: ['it', 'development'] }
      render(<ApplicationsTab {...baseProps({
        campaigns: [sampleCampaign],
        applications: [roleSubmission, legacySubmission],
      })} />)
      fireEvent.click(screen.getByText('View submissions'))

      // No roles -> dropdown lists teams; both roleRanking and legacy submissions match "development"
      fireEvent.change(screen.getByRole('combobox'), { target: { value: 'team:development' } })
      expect(screen.getAllByText('Alice Doe')).toHaveLength(2)
      expect(screen.queryByText('No submissions match your filters.')).not.toBeInTheDocument()
    })

    it('expands a submission to show role preferences and proposed role', () => {
      render(<ApplicationsTab {...baseProps({
        campaigns: [roleCampaign],
        applications: [roleSubmission],
      })} />)
      fireEvent.click(screen.getByText('View submissions'))
      fireEvent.click(screen.getByText('Alice Doe'))

      expect(screen.queryByText(/I have 2 years of systems administration/)).not.toBeInTheDocument()
      expect(screen.queryByText('I enjoy building web apps.')).not.toBeInTheDocument()
      expect(screen.getByText('Event Photographer')).toBeInTheDocument()
    })
  })
})