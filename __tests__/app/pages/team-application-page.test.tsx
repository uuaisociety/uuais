import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import TeamApplicationPage from '@/components/pages/TeamApplicationPage'
import { defaultAppState } from '@/__tests__/helpers/fixtures'
import { UU_PROGRAMMES } from '@/components/pages/apply/sampleData'
import type { ApplicationCampaign } from '@/types'

const mockUseApp = jest.fn()
const mockNotify = jest.fn()
const mockSubscribeToCampaignQuestions = jest.fn(() => jest.fn())
let mockAuthUser: unknown = null

const mockRefreshSessionCookie = jest.fn(async () => {
  const token = mockAuthUser && typeof (mockAuthUser as { getIdToken?: unknown }).getIdToken === 'function'
    ? await (mockAuthUser as { getIdToken: (f: boolean) => Promise<string> }).getIdToken(true)
    : null
  if (token) await global.fetch('/api/login', { headers: { Authorization: `Bearer ${token}` }, credentials: 'include' })
})

jest.mock('@/contexts/AppContext', () => ({
  useApp: () => mockUseApp(),
  AppProvider: ({ children }: { children: React.ReactNode }) => children,
}))

jest.mock('@/components/ui/Notifications', () => ({
  useNotify: () => ({ notify: mockNotify }),
}))

jest.mock('@/lib/firebase-client', () => ({
  auth: {
    get currentUser() { return mockAuthUser },
    onAuthStateChanged: (cb: (u: unknown) => void) => { cb(mockAuthUser); return jest.fn(); },
  },
  refreshSessionCookie: (...args: unknown[]) => mockRefreshSessionCookie(...args),
}))

const mockGetTeamApplicationByUid = jest.fn().mockResolvedValue(null)

jest.mock('@/lib/firestore/teamApplications', () => ({
  getTeamApplicationByUid: (...args: unknown[]) => mockGetTeamApplicationByUid(...args),
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
  roles: [
    { id: 'it_member', teamId: 'it', title: 'IT Member', status: 'open', order: 0 },
    { id: 'development_member', teamId: 'development', title: 'Development Member', status: 'open', order: 1 },
    { id: 'growth_member', teamId: 'growth', title: 'Growth Member', status: 'open', order: 2 },
  ],
  enabledStandardFields: [
    'name', 'email', 'gender', 'university', 'program', 'graduationYear',
    'linkedin', 'resume', 'interests', 'teamRanking', 'weeklyHours', 'motivation',
  ],
}

describe('TeamApplicationPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    localStorage.clear()
    mockAuthUser = null
    mockGetTeamApplicationByUid.mockResolvedValue(null)
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
    expect(screen.getByText('Open Roles')).toBeInTheDocument()
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

  it('renders team and role descriptions with rich formatting on the overview', () => {
    const richCampaign: ApplicationCampaign = {
      ...sampleCampaign,
      teamInfo: {
        it: { description: 'We keep the infra running.\n\n- Servers\n- Networking' },
      },
      roles: [
        {
          ...sampleCampaign.roles[0],
          description: '# What you will do\n\nHelp with sysadmin.\nContact it@uuais.com',
        },
        ...sampleCampaign.roles.slice(1),
      ],
    }
    mockUseApp.mockReturnValue({
      state: { ...defaultAppState, campaigns: [richCampaign] },
      dispatch: jest.fn(),
    })
    render(<TeamApplicationPage />)
    // Team description renders paragraphs and bullet points
    expect(screen.getByText('We keep the infra running.')).toBeInTheDocument()
    expect(screen.getByText('Servers')).toBeInTheDocument()
    expect(screen.getByText('Networking')).toBeInTheDocument()
    // Role description renders a heading and auto-links the email
    expect(screen.getByRole('heading', { name: 'What you will do' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'it@uuais.com' })).toHaveAttribute('href', 'mailto:it@uuais.com')
  })

  it('separates multiple roles in the same team with a markdown-style --- delimiter', () => {
    const multiRoleCampaign: ApplicationCampaign = {
      ...sampleCampaign,
      teams: ['it', 'growth'],
      roles: [
        { id: 'it_member', teamId: 'it', title: 'IT Member', status: 'open', order: 0 },
        { id: 'it_lead', teamId: 'it', title: 'IT Lead', status: 'open', order: 1 },
        { id: 'growth_member', teamId: 'growth', title: 'Growth Member', status: 'open', order: 2 },
      ],
    }
    mockUseApp.mockReturnValue({
      state: { ...defaultAppState, campaigns: [multiRoleCampaign] },
      dispatch: jest.fn(),
    })
    render(<TeamApplicationPage />)

    expect(screen.getByText('IT Member')).toBeInTheDocument()
    expect(screen.getByText('IT Lead')).toBeInTheDocument()
    expect(screen.getByText('Growth Member')).toBeInTheDocument()
    // One --- delimiter between the two IT roles; none between different teams
    expect(screen.getAllByText('---').length).toBe(1)
  })

  it('clamps overflowing descriptions and expands/collapses them on toggle', () => {
    Object.defineProperty(HTMLElement.prototype, 'scrollHeight', { configurable: true, get: () => 200 })
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, get: () => 50 })
    mockUseApp.mockReturnValue({
      state: { ...defaultAppState, campaigns: [sampleCampaign] },
      dispatch: jest.fn(),
    })
    render(<TeamApplicationPage />)

    const showMore = screen.getAllByRole('button', { name: /Show more/i })
    expect(showMore.length).toBeGreaterThan(0)
    fireEvent.click(showMore[0])
    expect(screen.getAllByRole('button', { name: /Show less/i }).length).toBeGreaterThan(0)
    fireEvent.click(screen.getAllByRole('button', { name: /Show less/i })[0])
    expect(screen.getAllByRole('button', { name: /Show more/i }).length).toBeGreaterThan(0)

    delete (HTMLElement.prototype as { scrollHeight?: unknown }).scrollHeight
    delete (HTMLElement.prototype as { clientHeight?: unknown }).clientHeight
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
    fireEvent.click(screen.getByLabelText('AI Research & Theoretical ML'))
    fireEvent.click(screen.getByText('Continue'))
    expect(screen.getByRole('heading', { name: 'Role Selection', level: 2 })).toBeInTheDocument()
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
    fireEvent.click(screen.getByLabelText('AI Research & Theoretical ML'))
    fireEvent.click(screen.getByText('Continue'))
    // Step 3: rank a role so Continue is enabled (canNext needs motivation >= 25 chars AND a ranked role).
    fireEvent.click(screen.getByRole('button', { name: /Add IT Member/i }))
    fireEvent.change(screen.getByPlaceholderText(/Tell us why you want to join/), { target: { value: 'I am excited to contribute to AI.' } })
    fireEvent.click(screen.getByText('Continue'))
    expect(screen.getByRole('heading', { name: /Review & Submit/i, level: 2 })).toBeInTheDocument()
  })

  it('renders the custom-interest row as a text field without a dead checkbox', () => {
    mockUseApp.mockReturnValue({
      state: { ...defaultAppState, campaigns: [sampleCampaign] },
      dispatch: jest.fn(),
    })
    render(<TeamApplicationPage />)
    fireEvent.click(screen.getByText('Continue'))
    fireEvent.change(screen.getByLabelText(/Full name/i), { target: { value: 'Alex' } })
    fireEvent.change(screen.getByLabelText(/^Email/i), { target: { value: 'alex@test.com' } })
    fireEvent.click(screen.getByText('Continue'))

    const customInput = screen.getByPlaceholderText('Describe your area of interest')
    expect(customInput).toBeInTheDocument()
    // No non-functional checkbox masquerading as a selector
    expect(customInput.closest('label')?.querySelector('input[type="checkbox"]')).toBeNull()
    // Typing in the field counts toward the "at least one area" requirement
    fireEvent.change(screen.getByLabelText(/LinkedIn URL/i), { target: { value: 'https://linkedin.com/in/alice' } })
    fireEvent.change(customInput, { target: { value: 'AI Ethics' } })
    expect(screen.getByRole('button', { name: /Continue/i })).toBeEnabled()
  })

  it('filters the programme list as you type and selects with Enter', () => {
    mockUseApp.mockReturnValue({
      state: { ...defaultAppState, campaigns: [sampleCampaign] },
      dispatch: jest.fn(),
    })
    render(<TeamApplicationPage />)
    fireEvent.click(screen.getByText('Continue'))

    const combobox = screen.getByRole('combobox', { name: /Program/ })
    fireEvent.focus(combobox)
    fireEvent.change(combobox, { target: { value: 'computer sci' } })

    // Filtered matches appear in the listbox (subset of the 300+ programmes)
    const listbox = screen.getByRole('listbox')
    const matches = within(listbox).getAllByRole('option').map((o) => o.textContent)
    expect(matches.some((m) => m?.includes('Computer Science'))).toBe(true)
    expect(matches.length).toBeLessThan(UU_PROGRAMMES.length)

    // Enter commits the first (highlighted) match
    fireEvent.keyDown(combobox, { key: 'Enter' })
    expect(combobox).toHaveValue(matches[0])
  })

  it('commits free text when no programme matches', () => {
    mockUseApp.mockReturnValue({
      state: { ...defaultAppState, campaigns: [sampleCampaign] },
      dispatch: jest.fn(),
    })
    render(<TeamApplicationPage />)
    fireEvent.click(screen.getByText('Continue'))

    const combobox = screen.getByRole('combobox', { name: /Program/ })
    fireEvent.focus(combobox)
    fireEvent.change(combobox, { target: { value: 'AI Ethics' } })
    expect(screen.getByText(/No programmes match/)).toBeInTheDocument()

    fireEvent.blur(combobox)
    expect(combobox).toHaveValue('AI Ethics')
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
    expect(screen.getByRole('heading', { name: /Role Selection/i, level: 2 })).toBeInTheDocument()
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

  it('shows "no roles open" screen when role selection is enabled but no roles are open', () => {
    mockUseApp.mockReturnValue({
      state: {
        ...defaultAppState,
        campaignsLoaded: true,
        campaigns: [{ ...sampleCampaign, roles: [] }],
      },
      dispatch: jest.fn(),
    })
    render(<TeamApplicationPage />)
    expect(screen.getByText('No roles are open right now')).toBeInTheDocument()
    expect(screen.queryByText('Continue')).not.toBeInTheDocument()
  })

  it('does not block the form when role selection is disabled even without roles', () => {
    mockUseApp.mockReturnValue({
      state: {
        ...defaultAppState,
        campaignsLoaded: true,
        campaigns: [{
          ...sampleCampaign,
          roles: [],
          enabledStandardFields: ['name', 'email', 'motivation', 'linkedin'],
        }],
      },
      dispatch: jest.fn(),
    })
    render(<TeamApplicationPage />)
    expect(screen.queryByText('No roles are open right now')).not.toBeInTheDocument()
    expect(screen.getByText('Continue')).toBeInTheDocument()
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
    fireEvent.click(screen.getByLabelText('AI Research & Theoretical ML'))
    expect(screen.getByRole('button', { name: /Continue/i })).toBeDisabled()
    fireEvent.change(screen.getByLabelText(/Why do you want to join/), { target: { value: 'I love AI.' } })
    expect(screen.getByRole('button', { name: /Continue/i })).toBeEnabled()
  })

  it('explains why Continue is blocked with an actionable hint', () => {
    mockUseApp.mockReturnValue({
      state: { ...defaultAppState, campaigns: [sampleCampaign] },
      dispatch: jest.fn(),
    })
    render(<TeamApplicationPage />)
    fireEvent.click(screen.getByText('Continue'))
    // No name yet — the hint names the missing field
    expect(screen.getByText('Enter your full name to continue.')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText(/Full name/i), { target: { value: 'Alex' } })
    // Now the email is the blocker — the hint updates
    expect(screen.getByText('Enter a valid email address to continue.')).toBeInTheDocument()
  })

  it('explains why Submit is blocked until the confirmation is ticked', () => {
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
    fireEvent.click(screen.getByLabelText('AI Research & Theoretical ML'))
    fireEvent.click(screen.getByText('Continue'))
    fireEvent.click(screen.getByRole('button', { name: /Add IT Member/i }))
    fireEvent.change(screen.getByPlaceholderText(/Tell us why you want to join/), { target: { value: 'I am excited to contribute to AI.' } })
    fireEvent.click(screen.getByText('Continue'))
    // Review step: Submit is disabled until the agreement is confirmed
    const submit = screen.getByRole('button', { name: /Submit application/i })
    expect(submit).toBeDisabled()
    expect(screen.getByText('Confirm that your information is accurate to submit.')).toBeInTheDocument()
    fireEvent.click(screen.getByLabelText(/I confirm the information above is accurate/i))
    expect(screen.getByRole('button', { name: /Submit application/i })).toBeEnabled()
  })

  it('shows "Already Applied!" instead of the form for a signed-in user who already applied', async () => {
    mockAuthUser = { uid: 'user-1', email: 'alex@test.com', displayName: 'Alex' }
    mockGetTeamApplicationByUid.mockResolvedValue({
      id: 'app-1',
      campaignId: 'spring2026',
      name: 'Alex',
      email: 'alex@test.com',
      emailNormalized: 'alex@test.com',
      uid: 'user-1',
      roleRanking: [{ roleId: 'it_member', teamId: 'it' }],
    })
    mockUseApp.mockReturnValue({
      state: { ...defaultAppState, campaigns: [sampleCampaign] },
      dispatch: jest.fn(),
    })
    render(<TeamApplicationPage />)

    expect(await screen.findByText('Already Applied!')).toBeInTheDocument()
    // Neither the application form nor the add-role UI should render
    expect(screen.queryByText('Continue')).not.toBeInTheDocument()
    expect(screen.queryByText('Add new roles')).not.toBeInTheDocument()
    expect(mockGetTeamApplicationByUid).toHaveBeenCalledWith('user-1', 'spring2026')
  })

  it('does not flash "Already Applied!" while a submission is in flight', async () => {
    mockAuthUser = {
      uid: 'user-1',
      email: 'alex@test.com',
      displayName: 'Alex',
      getIdToken: jest.fn().mockResolvedValue('id-token-1'),
    }
    mockGetTeamApplicationByUid.mockResolvedValue(null)

    // Mutable so we can simulate the Firestore subscription reporting the new app mid-submit.
    const stateRef = {
      ...defaultAppState,
      campaigns: [sampleCampaign],
      teamApplications: [],
    }
    mockUseApp.mockReturnValue({ state: stateRef, dispatch: jest.fn() })

    // Deferred fetch so we control when the submit response arrives
    let resolveFetch: (v: { ok: boolean; json: () => Promise<unknown> }) => void
    const fetchPromise = new Promise<{ ok: boolean; json: () => Promise<unknown> }>((res) => {
      resolveFetch = res
    })
    const fetchMock = jest.fn((url: string) =>
      url === '/api/login'
        ? Promise.resolve({ ok: true, json: async () => ({}) })
        : fetchPromise
    )
    const originalFetch = global.fetch
    global.fetch = fetchMock as unknown as typeof fetch

    const { rerender } = render(<TeamApplicationPage />)

    fireEvent.click(screen.getByText('Continue'))
    fireEvent.change(screen.getByLabelText(/Full name/i), { target: { value: 'Alex' } })
    fireEvent.change(screen.getByLabelText(/^Email/i), { target: { value: 'alex@test.com' } })
    fireEvent.click(screen.getByText('Continue'))
    fireEvent.change(screen.getByLabelText(/LinkedIn URL/i), { target: { value: 'https://linkedin.com/in/alice' } })
    fireEvent.click(screen.getByLabelText('AI Research & Theoretical ML'))
    fireEvent.click(screen.getByText('Continue'))
    fireEvent.click(screen.getByRole('button', { name: /Add IT Member/i }))
    fireEvent.change(screen.getByPlaceholderText(/Tell us why you want to join/), { target: { value: 'I am excited to contribute to AI.' } })
    fireEvent.click(screen.getByText('Continue'))
    fireEvent.click(screen.getByLabelText(/I confirm the information above is accurate/i))
    fireEvent.click(screen.getByRole('button', { name: /Submit application/i }))

    // Firestore subscription reports the new application mid-flight
    stateRef.teamApplications = [{
      id: 'app-1',
      campaignId: 'spring2026',
      name: 'Alex',
      email: 'alex@test.com',
      emailNormalized: 'alex@test.com',
      uid: 'user-1',
    }]
    rerender(<TeamApplicationPage />)

    expect(screen.queryByText('Already Applied!')).not.toBeInTheDocument()

    // Success response resolves — the submitted screen must win
    resolveFetch({ ok: true, json: async () => ({}) })
    expect(await screen.findByText('Application Submitted!')).toBeInTheDocument()
    expect(screen.queryByText('Already Applied!')).not.toBeInTheDocument()

    // The session cookie is refreshed to the current account before applying
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/login',
      expect.objectContaining({ headers: { Authorization: 'Bearer id-token-1' } }),
    )

    global.fetch = originalFetch
  })

  it('persists a draft to localStorage as the user fills the form', async () => {
    mockUseApp.mockReturnValue({
      state: { ...defaultAppState, campaigns: [sampleCampaign] },
      dispatch: jest.fn(),
    })
    render(<TeamApplicationPage />)
    fireEvent.click(screen.getByText('Continue'))
    fireEvent.change(screen.getByLabelText(/Full name/i), { target: { value: 'Alex' } })
    fireEvent.change(screen.getByLabelText(/^Email/i), { target: { value: 'alex@test.com' } })

    // Debounced save (400ms) — wait for it to land.
    await new Promise((r) => setTimeout(r, 450))

    const keys = Object.keys(localStorage).filter((k) => k.startsWith('teamApplicationDraft'))
    expect(keys.length).toBe(1)
    const saved = JSON.parse(localStorage.getItem(keys[0])!)
    expect(saved.name).toBe('Alex')
    expect(saved.email).toBe('alex@test.com')
    expect(saved.step).toBe(1)
  })

  it('does not create a draft on a fresh page visit', async () => {
    mockUseApp.mockReturnValue({
      state: { ...defaultAppState, campaigns: [sampleCampaign] },
      dispatch: jest.fn(),
    })
    render(<TeamApplicationPage />)
    await new Promise((r) => setTimeout(r, 450))
    const keys = Object.keys(localStorage).filter((k) => k.startsWith('teamApplicationDraft'))
    expect(keys.length).toBe(0)
  })

  it('restores the saved draft and notifies the user on a fresh mount', async () => {
    localStorage.setItem('teamApplicationDraft:spring2026:anon', JSON.stringify({
      name: 'Alex', email: 'alex@test.com', step: 1, interests: [], roleRanking: [],
    }))
    mockUseApp.mockReturnValue({
      state: { ...defaultAppState, campaigns: [sampleCampaign] },
      dispatch: jest.fn(),
    })
    render(<TeamApplicationPage />)

    await waitFor(() => expect(mockNotify).toHaveBeenCalledWith(expect.objectContaining({ title: 'Draft restored' })))
    expect(screen.getByRole('heading', { name: 'Your Profile', level: 2 })).toBeInTheDocument()
    expect(screen.getByLabelText(/Full name/i)).toHaveValue('Alex')
  })

  it('clears the draft after a successful submission', async () => {
    mockAuthUser = { uid: 'user-1', email: 'alex@test.com', displayName: 'Alex' }
    localStorage.setItem('teamApplicationDraft:spring2026:user-1', JSON.stringify({
      name: 'Alex', email: 'alex@test.com', step: 4, interests: [], roleRanking: [],
    }))
    mockUseApp.mockReturnValue({
      state: { ...defaultAppState, campaigns: [sampleCampaign] },
      dispatch: jest.fn(),
    })

    const fetchMock = jest.fn((url: string) =>
      url === '/api/login'
        ? Promise.resolve({ ok: true, json: async () => ({}) })
        : Promise.resolve({ ok: true, json: async () => ({}) })
    )
    const originalFetch = global.fetch
    global.fetch = fetchMock as unknown as typeof fetch

    render(<TeamApplicationPage />)
    await waitFor(() => expect(mockNotify).toHaveBeenCalledWith(expect.objectContaining({ title: 'Draft restored' })))

    // Land on the review step (restored step 4) and submit.
    fireEvent.click(screen.getByLabelText(/I confirm the information above is accurate/i))
    fireEvent.click(screen.getByRole('button', { name: /Submit application/i }))

    expect(await screen.findByText('Application Submitted!')).toBeInTheDocument()
    await new Promise((r) => setTimeout(r, 100))
    expect(localStorage.getItem('teamApplicationDraft:spring2026:user-1')).toBeNull()

    global.fetch = originalFetch
  })
})