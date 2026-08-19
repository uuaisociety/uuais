import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ApplicationsTab from '@/components/pages/admin/tabs/ApplicationsTab'
import type { ApplicationCampaign, TeamApplication } from '@/types'

jest.mock('@/lib/firestore/applicationCampaigns', () => ({
  // Method shorthand keeps fn.name stable so the useCollectionData mock can key its responses by subscription.
  subscribeAllCampaigns() { return jest.fn(); },
  subscribeToCampaigns() { return jest.fn(); },
  addCampaign: jest.fn().mockResolvedValue('new-id'),
  updateCampaign: jest.fn().mockResolvedValue(undefined),
  deleteCampaign: jest.fn().mockResolvedValue(undefined),
}))

jest.mock('@/lib/firestore/teamApplications', () => ({
  subscribeToTeamApplications() { return jest.fn(); },
  deleteTeamApplicationWithLimits: jest.fn().mockResolvedValue(undefined),
}))

jest.mock('@/components/ui/Notifications', () => ({
  useNotify: () => ({ notify: jest.fn() }),
}))

jest.mock('@/lib/firestore/campaignQuestions', () => ({
  subscribeToCampaignQuestions: jest.fn(() => jest.fn()),
  getCampaignQuestions: jest.fn().mockResolvedValue([]),
  deleteCampaignQuestionsByCampaign: jest.fn().mockResolvedValue(undefined),
}))

const mockExportZip = jest.fn()
jest.mock('@/lib/exportApplications', () => ({
  exportApplicationsZip: (...args: unknown[]) => mockExportZip(...args),
}))

import { updateCampaign, deleteCampaign } from '@/lib/firestore/applicationCampaigns'
import { deleteCampaignQuestionsByCampaign } from '@/lib/firestore/campaignQuestions'

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

// Campaigns and applications are fetched by the tab itself; key the responses by subscription name so re-renders keep their data.
function mockData(campaigns: ApplicationCampaign[], applications: TeamApplication[] = []) {
  global.__setCollectionData?.({
    subscribeAllCampaigns: { data: campaigns, loaded: true },
    subscribeToTeamApplications: { data: applications, loaded: true },
  })
}

describe('ApplicationsTab', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders header and New campaign button', () => {
    mockData([])
    render(<ApplicationsTab />)
    expect(screen.getByText('Applications')).toBeInTheDocument()
    expect(screen.getByText('New campaign')).toBeInTheDocument()
  })

  it('shows empty state when no campaigns match filter', () => {
    mockData([])
    render(<ApplicationsTab />)
    expect(screen.getByText(/No campaigns with status/i)).toBeInTheDocument()
  })

  it('renders campaign cards with status badges and actions', () => {
    mockData([sampleCampaign])
    render(<ApplicationsTab />)
    expect(screen.getByText('Spring 2026 Recruitment')).toBeInTheDocument()
    // Status badge appears as Tag; filter tab button also says "Open" — match the badge (text-sm size on Tag).
    const openMatches = screen.getAllByText('Open')
    expect(openMatches.length).toBeGreaterThan(0)
    expect(screen.getByText('Edit')).toBeInTheDocument()
  })

  it('filters by Open tab', () => {
    mockData([
      sampleCampaign,
      { ...sampleCampaign, id: 'closed-one', status: 'closed', title: 'Closed Campaign' },
    ])
    render(<ApplicationsTab />)
    // Click the "Open" filter tab (filter buttons have border-b-2 class inline)
    const openButtons = screen.getAllByRole('button', { name: /^Open/i })
    fireEvent.click(openButtons.find(b => b.tagName === 'BUTTON')!)
    expect(screen.getByText('Spring 2026 Recruitment')).toBeInTheDocument()
    expect(screen.queryByText('Closed Campaign')).not.toBeInTheDocument()
  })

  it('switches to submissions view on View submissions click', () => {
    mockData([sampleCampaign], [sampleSubmission])
    render(<ApplicationsTab />)
    fireEvent.click(screen.getByText('View submissions'))
    expect(screen.getByText('Submissions: Spring 2026 Recruitment')).toBeInTheDocument()
    expect(screen.getByText('Alice Doe')).toBeInTheDocument()
  })

  it('opens the campaign builder when New campaign is clicked', () => {
    mockData([])
    render(<ApplicationsTab />)
    fireEvent.click(screen.getByText('New campaign'))
    // The builder modal renders with a campaign title field
    expect(screen.getByLabelText(/Campaign title/)).toBeInTheDocument()
  })

  it('opens the campaign builder pre-filled when Edit is clicked', async () => {
    mockData([sampleCampaign])
    render(<ApplicationsTab />)
    fireEvent.click(screen.getByText('Edit'))
    // Questions load async before the form renders
    expect(await screen.findByLabelText(/Campaign title/)).toHaveValue('Spring 2026 Recruitment')
  })

  it('opens confirm modal when delete campaign clicked and confirms delete', async () => {
    jest.spyOn(window, 'confirm').mockReturnValue(true)
    mockData([sampleCampaign])
    render(<ApplicationsTab />)
    // Click the destructive delete button (Trash2 icon-only button)
    fireEvent.click(screen.getByRole('button', { name: /delete campaign/i }))
    expect(screen.getByText('Delete campaign?')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Delete'))
    await waitFor(() => expect(deleteCampaign).toHaveBeenCalledWith('spring2026'))
    await waitFor(() => expect(deleteCampaignQuestionsByCampaign).toHaveBeenCalledWith('spring2026'))
  })

  it('toggles campaign status via the segmented control', () => {
    mockData([sampleCampaign])
    render(<ApplicationsTab />)
    // The card's status toggle has a "Draft" button (the filter tab says "Draft 0")
    fireEvent.click(screen.getByRole('button', { name: 'Draft' }))
    expect(updateCampaign).toHaveBeenCalledWith('spring2026', { status: 'draft' })
  })

  it('expands a submission to show motivation on click', () => {
    mockData([sampleCampaign], [sampleSubmission])
    render(<ApplicationsTab />)
    fireEvent.click(screen.getByText('View submissions'))
    fireEvent.click(screen.getByText('Alice Doe'))
    expect(screen.getByText('I want to contribute.')).toBeInTheDocument()
  })

  it('Back button returns to campaigns view', () => {
    mockData([sampleCampaign], [sampleSubmission])
    render(<ApplicationsTab />)
    fireEvent.click(screen.getByText('View submissions'))
    fireEvent.click(screen.getByText('Back to campaigns'))
    expect(screen.getByText('Applications')).toBeInTheDocument()
  })

  it('renders an Export .zip button in the submissions view', () => {
    mockData([sampleCampaign], [sampleSubmission])
    render(<ApplicationsTab />)
    fireEvent.click(screen.getByText('View submissions'))
    expect(screen.getByText('Export .zip')).toBeInTheDocument()
  })

  it('exports filtered submissions when Export .zip is clicked', async () => {
    mockExportZip.mockResolvedValue(undefined)
    mockData([sampleCampaign], [sampleSubmission])
    render(<ApplicationsTab />)
    fireEvent.click(screen.getByText('View submissions'))
    fireEvent.click(screen.getByText('Export .zip'))
    expect(mockExportZip).toHaveBeenCalledWith(expect.objectContaining({
      campaignTitle: 'Spring 2026 Recruitment',
      applications: [expect.objectContaining({ id: 'sub-1', name: 'Alice Doe' })],
    }))
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
      mockData([roleCampaign], [roleSubmission])
      render(<ApplicationsTab />)
      fireEvent.click(screen.getByText('View submissions'))
      // The hidden expanded detail also contains the ranked labels, so scope via getAllByText
      expect(screen.getAllByText('#1 IT Member').length).toBeGreaterThan(0)
      expect(screen.getAllByText('#2 Development Member').length).toBeGreaterThan(0)
    })

    it('falls back to team tags for a legacy teamRanking submission', () => {
      mockData([roleCampaign], [sampleSubmission])
      render(<ApplicationsTab />)
      fireEvent.click(screen.getByText('View submissions'))
      expect(screen.getByText('#1 IT')).toBeInTheDocument()
      expect(screen.getByText('#2 Development')).toBeInTheDocument()
    })

    it('shows the role count on the campaign card', () => {
      mockData([roleCampaign])
      render(<ApplicationsTab />)
      expect(screen.getByText('2 roles')).toBeInTheDocument()
    })

    it('filters submissions by a specific role', () => {
      mockData([roleCampaign], [
        roleSubmission,
        { ...sampleSubmission, id: 'sub-legacy', teamRanking: ['it', 'development'] },
      ])
      render(<ApplicationsTab />)
      fireEvent.click(screen.getByText('View submissions'))

      // Role options are labelled "<Team> · <Role>"
      fireEvent.change(screen.getByRole('combobox'), { target: { value: 'role:it_member' } })
      expect(screen.getByText('Alice Doe')).toBeInTheDocument()
      expect(screen.queryByText('No submissions match your filters.')).not.toBeInTheDocument()
    })

    it('filters submissions by legacy team id when campaign has no roles', () => {
      const legacySubmission = { ...sampleSubmission, id: 'sub-legacy', teamRanking: ['it', 'development'] }
      mockData([sampleCampaign], [roleSubmission, legacySubmission])
      render(<ApplicationsTab />)
      fireEvent.click(screen.getByText('View submissions'))

      // No roles -> dropdown lists teams; both roleRanking and legacy submissions match "development"
      fireEvent.change(screen.getByRole('combobox'), { target: { value: 'team:development' } })
      expect(screen.getAllByText('Alice Doe')).toHaveLength(2)
      expect(screen.queryByText('No submissions match your filters.')).not.toBeInTheDocument()
    })

    it('expands a submission to show role preferences and proposed role', () => {
      mockData([roleCampaign], [roleSubmission])
      render(<ApplicationsTab />)
      fireEvent.click(screen.getByText('View submissions'))
      fireEvent.click(screen.getByText('Alice Doe'))

      expect(screen.queryByText(/I have 2 years of systems administration/)).not.toBeInTheDocument()
      expect(screen.queryByText('I enjoy building web apps.')).not.toBeInTheDocument()
      expect(screen.getByText('Event Photographer')).toBeInTheDocument()
    })
  })
})
