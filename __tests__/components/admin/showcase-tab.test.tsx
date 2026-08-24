import { render, screen, fireEvent } from '@testing-library/react'
import ShowcaseTab from '@/components/pages/admin/tabs/ShowcaseTab'
import { defaultAppState } from '@/__tests__/helpers/fixtures'

const mockUseApp = jest.fn()
jest.mock('@/contexts/AppContext', () => ({
  useApp: () => mockUseApp(),
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

function renderTab(projects: ReturnType<typeof createProject>[] = []) {
  const dispatch = jest.fn()
  mockUseApp.mockReturnValue({ state: { ...defaultAppState, showcaseProjects: projects }, dispatch })
  render(<ShowcaseTab />)
  return dispatch
}

describe('ShowcaseTab', () => {
  beforeEach(() => jest.clearAllMocks())

  it('shows empty state when no projects exist', () => {
    renderTab()
    expect(screen.getByText('No showcase submissions yet.')).toBeInTheDocument()
  })

  it('renders projects with status tags', () => {
    renderTab([createProject()])
    expect(screen.getByText('Course Navigator')).toBeInTheDocument()
    expect(screen.getByText('Published')).toBeInTheDocument()
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
})
