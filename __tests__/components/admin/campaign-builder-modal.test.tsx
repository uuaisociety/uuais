import { render, screen, fireEvent } from '@testing-library/react'
import CampaignBuilderModal from '@/components/pages/admin/modals/CampaignBuilderModal'
import { getCampaignQuestions } from '@/lib/firestore/campaignQuestions'
import type { ApplicationCampaign } from '@/types'

jest.mock('@/lib/firestore/campaignQuestions', () => ({
  getCampaignQuestions: jest.fn(),
  addCampaignQuestion: jest.fn(),
  updateCampaignQuestion: jest.fn(),
  deleteCampaignQuestion: jest.fn(),
  deleteCampaignQuestionsByCampaign: jest.fn(),
}))

jest.mock('@/components/ui/Notifications', () => ({
  useNotify: () => ({ notify: jest.fn() }),
}))

const mockGetQuestions = getCampaignQuestions as jest.Mock

const campaign: ApplicationCampaign = {
  id: 'c1',
  title: 'Spring 2026 Recruitment',
  subtitle: 'UU AI Society — Spring 2026',
  description: 'Main yearly drive.',
  deadline: '2099-01-01',
  status: 'draft',
  teams: ['it', 'development'],
  enabledStandardFields: ['name', 'email'],
}

const baseProps = (overrides: Partial<React.ComponentProps<typeof CampaignBuilderModal>> = {}) => ({
  open: true,
  campaign,
  isNew: false,
  onClose: jest.fn(),
  onSaveCampaign: jest.fn(),
  ...overrides,
})

describe('CampaignBuilderModal options editor', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetQuestions.mockResolvedValue([
      { id: 'q1', campaignId: 'c1', question: 'Favorite team?', type: 'select', options: ['IT', 'Dev'], required: false, order: 0 },
    ])
  })

  it('lists existing options for a select question', async () => {
    render(<CampaignBuilderModal {...baseProps()} />)
    fireEvent.click(await screen.findByRole('button', { name: /Options \(2\)/ }))
    expect(screen.getByDisplayValue('IT')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Dev')).toBeInTheDocument()
  })

  it('creates and edits a new option via the Create new option button', async () => {
    render(<CampaignBuilderModal {...baseProps()} />)
    fireEvent.click(await screen.findByRole('button', { name: /Options \(2\)/ }))
    fireEvent.click(screen.getByRole('button', { name: /Create new option/i }))
    const newInput = screen.getByPlaceholderText('Option 3')
    fireEvent.change(newInput, { target: { value: 'Growth' } })
    expect(screen.getByDisplayValue('Growth')).toBeInTheDocument()
  })

  it('removes an option', async () => {
    render(<CampaignBuilderModal {...baseProps()} />)
    fireEvent.click(await screen.findByRole('button', { name: /Options \(2\)/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Remove option 1' }))
    expect(screen.queryByDisplayValue('IT')).not.toBeInTheDocument()
    expect(screen.getByDisplayValue('Dev')).toBeInTheDocument()
  })

  it('updates the options count label as options are added', async () => {
    render(<CampaignBuilderModal {...baseProps()} />)
    const toggle = await screen.findByRole('button', { name: /Options \(2\)/ })
    fireEvent.click(toggle)
    fireEvent.click(screen.getByRole('button', { name: /Create new option/i }))
    // Collapse and re-expand: count should still be 2 while the new option is empty
    fireEvent.click(screen.getByRole('button', { name: /Hide options/i }))
    expect(screen.getByRole('button', { name: /Options \(2\)/ })).toBeInTheDocument()
  })
})
