import { render, screen, fireEvent } from '@testing-library/react'
import ShowcaseTab from '@/components/pages/admin/tabs/ShowcaseTab'

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

describe('ShowcaseTab', () => {
  const onAddClick = jest.fn()
  const onEdit = jest.fn()
  const onDelete = jest.fn()
  const onTogglePublish = jest.fn()
  const onToggleFeature = jest.fn()

  const props = {
    projects: [] as ReturnType<typeof createProject>[],
    onAddClick,
    onEdit,
    onDelete,
    onTogglePublish,
    onToggleFeature,
  }

  beforeEach(() => jest.clearAllMocks())

  it('shows empty state when no projects exist', () => {
    render(<ShowcaseTab {...props} />)
    expect(screen.getByText('No showcase submissions yet.')).toBeInTheDocument()
  })

  it('renders projects with status tags', () => {
    render(<ShowcaseTab {...props} projects={[createProject()]} />)
    expect(screen.getByText('Course Navigator')).toBeInTheDocument()
    expect(screen.getByText('Published')).toBeInTheDocument()
    expect(screen.getByText(/Ada/)).toBeInTheDocument()
  })

  it('shows Draft tag for unpublished projects', () => {
    render(<ShowcaseTab {...props} projects={[createProject({ published: false })]} />)
    expect(screen.getByText('Draft')).toBeInTheDocument()
  })

  it('shows Featured tag for featured projects', () => {
    render(<ShowcaseTab {...props} projects={[createProject({ featured: true })]} />)
    expect(screen.getByText('Featured')).toBeInTheDocument()
  })

  it('calls onAddClick when New Project is clicked', () => {
    render(<ShowcaseTab {...props} />)
    fireEvent.click(screen.getByText('New Project'))
    expect(onAddClick).toHaveBeenCalledTimes(1)
  })

  it('calls onEdit with the project', () => {
    const project = createProject()
    render(<ShowcaseTab {...props} projects={[project]} />)
    fireEvent.click(screen.getByText('Edit'))
    expect(onEdit).toHaveBeenCalledWith(project)
  })

  it('calls onDelete with the project id', () => {
    render(<ShowcaseTab {...props} projects={[createProject()]} />)
    fireEvent.click(screen.getByText('Delete'))
    expect(onDelete).toHaveBeenCalledWith('proj-1')
  })

  it('calls onTogglePublish with the project', () => {
    const project = createProject()
    render(<ShowcaseTab {...props} projects={[project]} />)
    fireEvent.click(screen.getByText('Unpublish'))
    expect(onTogglePublish).toHaveBeenCalledWith(project)
  })

  it('calls onToggleFeature with the project', () => {
    const project = createProject()
    render(<ShowcaseTab {...props} projects={[project]} />)
    fireEvent.click(screen.getByText('Feature'))
    expect(onToggleFeature).toHaveBeenCalledWith(project)
  })
})
