import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import BlogAISettingsTab from '@/components/pages/admin/tabs/BlogAISettingsTab'
import { getBlogAISettings, updateBlogAISettings } from '@/lib/firestore/blog-ai-settings'
import { getCoveredNewsUrls, addUsedNewsUrl, removeUsedNewsUrl } from '@/lib/firestore/blog-seen'

jest.mock('@/lib/firestore/blog-ai-settings', () => ({
  getBlogAISettings: jest.fn(),
  updateBlogAISettings: jest.fn(),
}))

jest.mock('@/lib/firestore/blog-seen', () => ({
  getCoveredNewsUrls: jest.fn(),
  addUsedNewsUrl: jest.fn(),
  removeUsedNewsUrl: jest.fn(),
}))

// BlogAISettingsTab reads auth.currentUser for the updatedBy stamp; mock the
// client so tests run without Firebase env vars (CI has none).
jest.mock('@/lib/firebase-client', () => ({
  auth: { currentUser: { uid: 'test-admin', displayName: 'Test Admin' } },
}))

const mockUseAdmin = jest.fn()
jest.mock('@/hooks/useAdmin', () => ({ useAdmin: () => mockUseAdmin() }))

const mockGet = getBlogAISettings as jest.Mock
const mockUpdate = updateBlogAISettings as jest.Mock
const mockGetCovered = getCoveredNewsUrls as jest.Mock
const mockAddUsed = addUsedNewsUrl as jest.Mock
const mockRemoveUsed = removeUsedNewsUrl as jest.Mock

const settings = {
  systemPrompt: 'You write for students.',
  model: 'openai/gpt-4o-mini',
  feeds: [
    { name: 'OpenAI News', type: 'rss', url: 'https://openai.com/news/rss.xml' },
    { name: 'Google DeepMind', type: 'rss', url: 'https://deepmind.google/blog/rss.xml' },
  ],
  exaQuery: 'AI news this week',
  editorialNotes: 'Watch items: Qwen3.8',
  maxOutputTokens: 4096,
  updatedAt: null,
  updatedBy: null,
}

const adminState = {
  user: null,
  loading: false,
  isAdmin: true,
  isSuperAdmin: true,
  claims: null,
  signInWithGoogle: jest.fn(),
  logout: jest.fn(),
}

const nonAdminState = { ...adminState, isSuperAdmin: false }

describe('BlogAISettingsTab', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseAdmin.mockReturnValue(nonAdminState)
    mockGetCovered.mockResolvedValue([])
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ models: [], rawModels: [] }) })
  })

  it('loads and renders the saved settings', async () => {
    mockGet.mockResolvedValue(settings)
    render(<BlogAISettingsTab />)
    expect(await screen.findByText('AI News Desk Settings')).toBeInTheDocument()
    expect(screen.getByDisplayValue('openai/gpt-4o-mini')).toBeInTheDocument()
    expect(screen.getByDisplayValue('You write for students.')).toBeInTheDocument()
    expect(screen.getByDisplayValue(/OpenAI News\|https:\/\/openai\.com\/news\/rss\.xml/)).toBeInTheDocument()
    expect(screen.getByDisplayValue('AI news this week')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Watch items: Qwen3.8')).toBeInTheDocument()
  })

  it('restores defaults when reset is confirmed', async () => {
    mockGet.mockResolvedValue(settings)
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true)
    render(<BlogAISettingsTab />)
    await screen.findByText('AI News Desk Settings')
    fireEvent.click(screen.getByText('Reset to Defaults'))
    expect(screen.getByDisplayValue('openai/gpt-4o-mini')).toBeInTheDocument()
    expect(screen.getByDisplayValue(/DeepMind\|https:\/\/deepmind\.google\/blog\/rss\.xml/)).toBeInTheDocument()
    confirmSpy.mockRestore()
  })

  it('saves as a super admin and calls updateBlogAISettings', async () => {
    mockUseAdmin.mockReturnValue(adminState)
    mockGet.mockResolvedValue(settings)
    mockUpdate.mockResolvedValue(undefined)
    render(<BlogAISettingsTab />)
    await screen.findByText('AI News Desk Settings')
    fireEvent.click(screen.getByText('Save Changes'))
    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ model: 'openai/gpt-4o-mini', maxOutputTokens: 4096 }),
        expect.any(String)
      )
    })
  })

  it('disables save for non-super-admins', async () => {
    mockGet.mockResolvedValue(settings)
    render(<BlogAISettingsTab />)
    await screen.findByText('AI News Desk Settings')
    expect(screen.getByText('Save Changes')).toBeDisabled()
  })

  it('lists used and cited articles with a re-enable action', async () => {
    mockUseAdmin.mockReturnValue(adminState)
    mockGet.mockResolvedValue(settings)
    mockGetCovered.mockResolvedValue([
      { url: 'https://openai.com/story-one', used: true, citedBy: ['Weekly Digest'] },
      { url: 'https://deepmind.google/story-b', used: false, citedBy: ['Event Recap'] },
    ])
    mockRemoveUsed.mockResolvedValue([])
    render(<BlogAISettingsTab />)

    expect(await screen.findByText('https://openai.com/story-one')).toBeInTheDocument()
    expect(screen.getByText('https://deepmind.google/story-b')).toBeInTheDocument()
    expect(screen.getByText(/Used articles/)).toBeInTheDocument()
    expect(screen.getByText('Cited by: Weekly Digest')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Re-enable article' }))
    await waitFor(() => expect(mockRemoveUsed).toHaveBeenCalledWith('https://openai.com/story-one'))
    expect(mockAddUsed).not.toHaveBeenCalled()
  })

  it('shows only a note, no toggle, for a URL that is merely cited by a post', async () => {
    mockGet.mockResolvedValue(settings)
    mockGetCovered.mockResolvedValue([
      { url: 'https://deepmind.google/story-b', used: false, citedBy: ['Event Recap'] },
    ])
    render(<BlogAISettingsTab />)

    expect(await screen.findByText('https://deepmind.google/story-b')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Re-enable article' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Mark article as used' })).not.toBeInTheDocument()
    expect(screen.getByText(/Cited by a post — delete the post to release this URL/)).toBeInTheDocument()
  })

  it('disables toggles for non-super-admins', async () => {
    mockGet.mockResolvedValue(settings)
    mockGetCovered.mockResolvedValue([
      { url: 'https://openai.com/story-one', used: true, citedBy: [] },
    ])
    render(<BlogAISettingsTab />)
    await screen.findByText('https://openai.com/story-one')
    expect(screen.getByRole('button', { name: 'Re-enable article' })).toBeDisabled()
  })

  it('marks a URL as used via the input without reloading the list', async () => {
    mockUseAdmin.mockReturnValue(adminState)
    mockGet.mockResolvedValue(settings)
    mockGetCovered.mockResolvedValue([])
    mockAddUsed.mockResolvedValue([])
    render(<BlogAISettingsTab />)
    await screen.findByText('AI News Desk Settings')

    fireEvent.change(screen.getByLabelText('URL to mark as used'), { target: { value: 'https://example.com/ai' } })
    fireEvent.click(screen.getByRole('button', { name: 'Mark URL as used' }))
    await waitFor(() => expect(mockAddUsed).toHaveBeenCalledWith('https://example.com/ai'))

    // Optimistically added to the list without a reload.
    expect(screen.getByText('https://example.com/ai')).toBeInTheDocument()
    expect(mockGetCovered).toHaveBeenCalledTimes(1)
  })
})
