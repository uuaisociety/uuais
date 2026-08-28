import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import ShowcaseTab from '@/components/pages/admin/tabs/ShowcaseTab'
import { defaultAppState } from '@/__tests__/helpers/fixtures'

const mockUseApp = jest.fn()
jest.mock('@/contexts/AppContext', () => ({
  useApp: () => mockUseApp(),
}))

const mockNotify = jest.fn()
jest.mock('@/components/ui/Notifications', () => ({
  useNotify: () => ({ notify: mockNotify }),
}))

const mockEnsureUniqueSlug = jest.fn(async (base: string) => base)
const mockNotifyApproved = jest.fn()
jest.mock('@/lib/firestore/showcase', () => ({
  ensureUniqueShowcaseSlug: (base: string, excludeId?: string) => mockEnsureUniqueSlug(base, excludeId),
  notifyShowcaseApproved: (p: unknown) => mockNotifyApproved(p),
}))

// ShowcaseModal pulls parseTags from ShowcaseSubmissionModal, which imports the users helper; stop the chain before the real Firebase client loads.
jest.mock('@/lib/firestore/users', () => ({
  getUserProfile: jest.fn().mockResolvedValue({ isMember: true }),
}))

function createProject(overrides: Record<string, unknown> = {}) {
  return {
    id: 'proj-1',
    title: 'Course Navigator',
    description: 'Explore UU courses with AI.',
    category: 'app',
    creatorUserId: 'u1',
    creatorName: 'Ada',
    links: {},
    tags: ['ai'],
    votes: 3,
    published: true,
    featured: false,
    createdAt: '2026-07-01T00:00:00Z',
    updatedAt: '2026-07-01T00:00:00Z',
    ...overrides,
  }
}

function renderTab(projects: ReturnType<typeof createProject>[] = [], dispatch: jest.Mock = jest.fn()) {
  mockUseApp.mockReturnValue({ state: { ...defaultAppState, showcaseProjects: projects }, dispatch })
  render(<ShowcaseTab />)
  return dispatch
}

describe('ShowcaseTab', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockEnsureUniqueSlug.mockImplementation(async (base: string) => base)
  })

  it('shows empty state when no projects exist', () => {
    renderTab()
    expect(screen.getByText('No showcase submissions yet.')).toBeInTheDocument()
  })

  it('renders projects with status tags', () => {
    renderTab([createProject()])
    expect(screen.getByText('Course Navigator')).toBeInTheDocument()
    // "Published" is also a section filter, so target the project's status tag.
    expect(screen.getAllByText('Published').length).toBeGreaterThan(1)
    expect(screen.getByText(/Ada/)).toBeInTheDocument()
  })

  it('shows Draft tag for unpublished projects', () => {
    renderTab([createProject({ published: false })])
    expect(screen.getByText('Draft')).toBeInTheDocument()
  })

  it('shows Featured tag for featured projects', () => {
    renderTab([createProject({ featured: true })])
    expect(screen.getByText('Featured')).toBeInTheDocument()
  })

  it('opens the create modal from New Project', () => {
    renderTab()
    fireEvent.click(screen.getByText('New Project'))
    expect(screen.getByRole('heading', { name: 'Create New Showcase Project' })).toBeInTheDocument()
  })

  it('opens the edit modal prefilled with the project', () => {
    renderTab([createProject()])
    fireEvent.click(screen.getByText('Edit'))
    expect(screen.getByDisplayValue('Course Navigator')).toBeInTheDocument()
  })

  it('deletes a project after confirmation', () => {
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true)
    const dispatch = renderTab([createProject()])
    fireEvent.click(screen.getByText('Delete'))
    expect(dispatch).toHaveBeenCalledWith({ firestoreAction: 'DELETE_SHOWCASE_PROJECT', payload: 'proj-1' })
    confirmSpy.mockRestore()
  })

  it('deletes the cover image from storage when deleting a project with one', async () => {
    const originalFetch = global.fetch
    const fetchMock = jest.fn().mockResolvedValue({ ok: true })
    global.fetch = fetchMock as unknown as typeof fetch
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true)
    const dispatch = renderTab([createProject({ coverImagePath: 'showcase/abc.png' })])
    fireEvent.click(screen.getByText('Delete'))
    expect(fetchMock).toHaveBeenCalledWith('/api/showcase/image', expect.objectContaining({
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: 'showcase/abc.png' }),
    }))
    expect(dispatch).toHaveBeenCalledWith({ firestoreAction: 'DELETE_SHOWCASE_PROJECT', payload: 'proj-1' })
    confirmSpy.mockRestore()
    global.fetch = originalFetch
  })

  it('toggles publish state via the Firestore action', () => {
    const dispatch = renderTab([createProject()])
    fireEvent.click(screen.getByText('Unpublish'))
    expect(dispatch).toHaveBeenCalledWith({
      firestoreAction: 'UPDATE_SHOWCASE_PROJECT',
      payload: expect.objectContaining({ id: 'proj-1', published: false }),
    })
  })

  it('toggles featured state via the Firestore action', () => {
    const dispatch = renderTab([createProject()])
    fireEvent.click(screen.getByText('Feature'))
    expect(dispatch).toHaveBeenCalledWith({
      firestoreAction: 'UPDATE_SHOWCASE_PROJECT',
      payload: expect.objectContaining({ id: 'proj-1', featured: true }),
    })
  })

  // Publishing is the first moment a slug is reachable, so a clash resolves there.
  it('settles a colliding slug when publishing', async () => {
    mockEnsureUniqueSlug.mockResolvedValue('course-navigator-2')
    const dispatch = renderTab([
      createProject({ id: 'proj-1', slug: 'course-navigator', published: false }),
    ])
    fireEvent.click(screen.getByText('Publish'))
    await waitFor(() =>
      expect(dispatch).toHaveBeenCalledWith({
        firestoreAction: 'UPDATE_SHOWCASE_PROJECT',
        payload: expect.objectContaining({
          id: 'proj-1',
          published: true,
          slug: 'course-navigator-2',
        }),
      }),
    )
    // Its own record must not count as a clash, or every publish would bump the slug.
    expect(mockEnsureUniqueSlug).toHaveBeenCalledWith('course-navigator', 'proj-1')
  })

  it('gives a member submission with no slug one at publish', async () => {
    const dispatch = renderTab([
      createProject({ id: 'proj-1', title: 'Course Navigator', slug: undefined, published: false }),
    ])
    fireEvent.click(screen.getByText('Publish'))
    await waitFor(() => expect(mockEnsureUniqueSlug).toHaveBeenCalledWith('course-navigator', 'proj-1'))
    expect(dispatch).toHaveBeenCalledWith({
      firestoreAction: 'UPDATE_SHOWCASE_PROJECT',
      payload: expect.objectContaining({ slug: 'course-navigator', published: true }),
    })
  })

  it('does not touch the slug when unpublishing', () => {
    renderTab([createProject({ slug: 'course-navigator' })])
    fireEvent.click(screen.getByText('Unpublish'))
    expect(mockEnsureUniqueSlug).not.toHaveBeenCalled()
  })

  it('sends the approval email on publish, but only after the write resolves', async () => {
    let resolveDispatch: (v: unknown) => void = () => {}
    let dispatchCalled = false
    const dispatch = jest.fn(() => {
      dispatchCalled = true
      return new Promise((resolve) => { resolveDispatch = resolve })
    })
    renderTab([createProject({ id: 'proj-1', slug: 'course-navigator', published: false })], dispatch)
    fireEvent.click(screen.getByText('Publish'))
    // Let the slug check resolve so the write is actually dispatched.
    await act(async () => { await Promise.resolve() })
    await waitFor(() => expect(dispatchCalled).toBe(true))
    // The write is still out — the email must not have fired yet.
    expect(mockNotifyApproved).not.toHaveBeenCalled()
    await act(async () => { resolveDispatch(true) })
    await waitFor(() =>
      expect(mockNotifyApproved).toHaveBeenCalledWith(expect.objectContaining({ id: 'proj-1', published: true })),
    )
  })

  it('does not email when the publish write fails', async () => {
    const dispatch = jest.fn().mockResolvedValue(false)
    renderTab([createProject({ id: 'proj-1', slug: 'course-navigator', published: false })], dispatch)
    fireEvent.click(screen.getByText('Publish'))
    await waitFor(() => expect(dispatch).toHaveBeenCalled())
    await waitFor(() => expect(mockNotifyApproved).not.toHaveBeenCalled())
  })

  it('does not email when unpublishing', async () => {
    renderTab([createProject({ published: true })])
    fireEvent.click(screen.getByText('Unpublish'))
    await waitFor(() =>
      expect(mockNotifyApproved).not.toHaveBeenCalled(),
    )
  })

  // A rename must not break links people have already shared.
  it('keeps an existing slug when the project is edited', async () => {
    const dispatch = renderTab([createProject({ id: 'proj-1', slug: 'course-navigator' })])
    fireEvent.click(screen.getByText('Edit'))
    fireEvent.change(screen.getByDisplayValue('Course Navigator'), {
      target: { value: 'Course Compass' },
    })
    fireEvent.click(screen.getByText('Update Project'))
    await waitFor(() =>
      expect(dispatch).toHaveBeenCalledWith({
        firestoreAction: 'UPDATE_SHOWCASE_PROJECT',
        payload: expect.objectContaining({ title: 'Course Compass', slug: 'course-navigator' }),
      }),
    )
    expect(mockEnsureUniqueSlug).not.toHaveBeenCalled()
  })
})
