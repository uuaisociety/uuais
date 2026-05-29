import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ExplorePage from '@/app/explore/page'
import type { Course } from '@/lib/courses'
import { updatePageMeta } from '@/utils/seo'

jest.mock('@/components/common/RagChat', () => ({
  __esModule: true,
  default: ({ onRecommendations, onThinkingStart, placeholder }: unknown) => {
    const mockOnRecommendations = onRecommendations as (ids: string[]) => void
    const mockOnThinkingStart = onThinkingStart as () => void
    return (
      <div data-testid="rag-chat">
        <button
          data-testid="start-thinking"
          onClick={() => mockOnThinkingStart?.()}
        >
          Start Thinking
        </button>
        <button
          data-testid="show-recommendations"
          onClick={() => mockOnRecommendations?.(['rec-1', 'rec-2'])}
        >
          Show Recommendations
        </button>
        <span data-testid="rag-placeholder">{placeholder as string}</span>
      </div>
    )
  },
}))

jest.mock('@/components/courses/CourseCard', () => ({
  __esModule: true,
  default: ({ course }: { course: Course }) => (
    <div data-testid="course-card">{course.title}</div>
  ),
}))

const mockFetchCoursesClient = jest.fn()
const mockFetchCoursesByIdsClient = jest.fn()
const mockPrimeCourseClientCache = jest.fn()

jest.mock('@/lib/firestore/courses', () => ({
  fetchCoursesClient: (...args: unknown[]) => mockFetchCoursesClient(...args),
  fetchCoursesByIdsClient: (...args: unknown[]) => mockFetchCoursesByIdsClient(...args),
  primeCourseClientCache: (...args: unknown[]) => mockPrimeCourseClientCache(...args),
}))

const defaultPagination = {
  page: 1,
  limit: 50,
  total: 0,
  totalPages: 1,
  hasNextPage: false,
  hasPrevPage: false,
}

function createCourses(count: number): Course[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `course-${i}`,
    title: `Course ${i}`,
    code: `CODE${i}`,
    link: '',
    description: `Description for course ${i}`,
    Learning_outcomes: '',
    tags: [],
    relatedCourses: [],
    level: "Bachelor's" as const,
    credits: 5,
  }))
}

const masterCourse: Course = {
  id: 'master-1',
  title: 'Advanced Machine Learning',
  code: 'ML501',
  link: '',
  description: 'Deep dive into machine learning',
  Learning_outcomes: '',
  tags: ['Machine Learning', 'AI'],
  relatedCourses: [],
  level: "Master's",
  credits: 10,
}

const bachelorCourse: Course = {
  id: 'bachelor-1',
  title: 'Intro to Programming',
  code: 'PRG101',
  link: '',
  description: 'Learn programming basics',
  Learning_outcomes: '',
  tags: ['Programming'],
  relatedCourses: [],
  level: "Bachelor's",
  credits: 5,
}

const preparatoryCourse: Course = {
  id: 'prep-1',
  title: 'Preparatory Math',
  code: 'MTH001',
  link: '',
  description: 'Basic mathematics',
  Learning_outcomes: '',
  tags: ['Mathematics'],
  relatedCourses: [],
  level: 'Preparatory',
  credits: 0,
}

const defaultCourses = [bachelorCourse, masterCourse, preparatoryCourse]

beforeEach(() => {
  jest.clearAllMocks()
  mockFetchCoursesClient.mockResolvedValue({
    courses: defaultCourses,
    pagination: { ...defaultPagination, total: defaultCourses.length },
  })
  mockFetchCoursesByIdsClient.mockResolvedValue([])
})

describe('ExplorePage', () => {
  it('renders hero section with title and description', async () => {
    render(<ExplorePage />)
    expect(screen.getByText('UUAIS Course Navigator')).toBeInTheDocument()
    expect(
      screen.getByText(/Search all Uppsala University courses/)
    ).toBeInTheDocument()
    expect(
      screen.getByText(/This is an early prototype, expect some inaccuracies/)
    ).toBeInTheDocument()
  })

  it('renders RagChat with placeholder', async () => {
    render(<ExplorePage />)
    expect(screen.getByTestId('rag-chat')).toBeInTheDocument()
    expect(screen.getByTestId('rag-placeholder')).toHaveTextContent(
      "Ask about courses, e.g. 'beginner statistics with labs'"
    )
  })

  it('renders Saved courses link', async () => {
    render(<ExplorePage />)
    expect(screen.getByText('Saved courses')).toBeInTheDocument()
  })

  it('shows "All Courses" heading initially', () => {
    render(<ExplorePage />)
    expect(screen.getByText('All Courses')).toBeInTheDocument()
    expect(
      screen.getByText('Browse all courses without AI intervention.')
    ).toBeInTheDocument()
  })

  it('shows loading skeleton initially when fetch is pending', () => {
    mockFetchCoursesClient.mockReturnValue(new Promise(() => {}))
    render(<ExplorePage />)
    const skeletons = document.querySelectorAll('.animate-pulse')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('renders search input and level filter', async () => {
    render(<ExplorePage />)
    expect(
      screen.getByPlaceholderText('Filter by title, code, tag\u2026')
    ).toBeInTheDocument()
    expect(screen.getByRole('combobox')).toBeInTheDocument()
    expect(screen.getByText('All levels')).toBeInTheDocument()
  })

  it('loads and displays courses from server', async () => {
    render(<ExplorePage />)
    await waitFor(() => {
      expect(screen.getByText('Intro to Programming')).toBeInTheDocument()
    })
    expect(screen.getByText('Advanced Machine Learning')).toBeInTheDocument()
    expect(screen.getByText('Preparatory Math')).toBeInTheDocument()
  })

  it('displays correct course count message for single course', async () => {
    mockFetchCoursesClient.mockResolvedValue({
      courses: [bachelorCourse],
      pagination: { ...defaultPagination, total: 1 },
    })
    render(<ExplorePage />)
    await waitFor(() => {
      expect(screen.getByText(/Showing 1 of 1 course/)).toBeInTheDocument()
    })
  })

  it('displays correct course count message for multiple courses', async () => {
    render(<ExplorePage />)
    await waitFor(() => {
      expect(screen.getByText(/Showing 3 of 3 courses/)).toBeInTheDocument()
    })
  })

  it('calls updatePageMeta on mount', () => {
    render(<ExplorePage />)
    expect(updatePageMeta).toHaveBeenCalledWith(
      'Explore Courses',
      expect.stringContaining('Uppsala University courses')
    )
  })

  it('shows empty state when no courses returned', async () => {
    mockFetchCoursesClient.mockResolvedValue({
      courses: [],
      pagination: defaultPagination,
    })
    render(<ExplorePage />)
    await waitFor(() => {
      expect(
        screen.getByText('No courses found, please try again.')
      ).toBeInTheDocument()
    })
  })

  it('filters courses by search query client-side', async () => {
    render(<ExplorePage />)
    await waitFor(() => {
      expect(screen.getAllByTestId('course-card')).toHaveLength(3)
    })
    const searchInput = screen.getByPlaceholderText(
      'Filter by title, code, tag\u2026'
    )
    fireEvent.change(searchInput, { target: { value: 'Machine Learning' } })
    await waitFor(() => {
      expect(screen.getByText('Advanced Machine Learning')).toBeInTheDocument()
      expect(screen.queryByText('Intro to Programming')).not.toBeInTheDocument()
      expect(screen.queryByText('Preparatory Math')).not.toBeInTheDocument()
    })
  })

  it('filters courses by code via search', async () => {
    render(<ExplorePage />)
    await waitFor(() => {
      expect(screen.getAllByTestId('course-card')).toHaveLength(3)
    })
    const searchInput = screen.getByPlaceholderText(
      'Filter by title, code, tag\u2026'
    )
    fireEvent.change(searchInput, { target: { value: 'PRG101' } })
    await waitFor(() => {
      expect(screen.getByText('Intro to Programming')).toBeInTheDocument()
      expect(screen.queryByText('Advanced Machine Learning')).not.toBeInTheDocument()
    })
  })

  it('filters by level selector', async () => {
    render(<ExplorePage />)
    await waitFor(() => {
      expect(screen.getAllByTestId('course-card')).toHaveLength(3)
    })
    const levelSelect = screen.getByRole('combobox')
    fireEvent.change(levelSelect, { target: { value: "Master's" } })
    await waitFor(() => {
      expect(screen.getByText('Advanced Machine Learning')).toBeInTheDocument()
      expect(screen.queryByText('Intro to Programming')).not.toBeInTheDocument()
      expect(screen.queryByText('Preparatory Math')).not.toBeInTheDocument()
    })
  })

  it('filters by Preparatory level', async () => {
    render(<ExplorePage />)
    await waitFor(() => {
      expect(screen.getAllByTestId('course-card')).toHaveLength(3)
    })
    const levelSelect = screen.getByRole('combobox')
    fireEvent.change(levelSelect, { target: { value: 'Preparatory' } })
    await waitFor(() => {
      expect(screen.getByText('Preparatory Math')).toBeInTheDocument()
      expect(screen.queryByText('Advanced Machine Learning')).not.toBeInTheDocument()
      expect(screen.queryByText('Intro to Programming')).not.toBeInTheDocument()
    })
  })

  it('shows no courses found when filter matches nothing', async () => {
    render(<ExplorePage />)
    await waitFor(() => {
      expect(screen.getAllByTestId('course-card')).toHaveLength(3)
    })
    const searchInput = screen.getByPlaceholderText(
      'Filter by title, code, tag\u2026'
    )
    fireEvent.change(searchInput, { target: { value: 'zzzznonexistent' } })
    await waitFor(() => {
      expect(
        screen.getByText('No courses found, please try again.')
      ).toBeInTheDocument()
    })
  })

  it('shows "Show more" button when results exceed 50', async () => {
    const manyCourses = createCourses(55)
    mockFetchCoursesClient.mockResolvedValue({
      courses: manyCourses,
      pagination: { ...defaultPagination, total: 55 },
    })
    render(<ExplorePage />)
    await waitFor(() => {
      expect(screen.getAllByTestId('course-card')).toHaveLength(50)
    })
    expect(screen.getByText('Show more')).toBeInTheDocument()
  })

  it('clicking "Show more" reveals additional courses', async () => {
    const manyCourses = createCourses(55)
    mockFetchCoursesClient.mockResolvedValue({
      courses: manyCourses,
      pagination: { ...defaultPagination, total: 55 },
    })
    render(<ExplorePage />)
    await waitFor(() => {
      expect(screen.getAllByTestId('course-card')).toHaveLength(50)
    })
    fireEvent.click(screen.getByText('Show more'))
    await waitFor(() => {
      expect(screen.getAllByTestId('course-card')).toHaveLength(55)
    })
    expect(screen.queryByText('Show more')).not.toBeInTheDocument()
  })

  it('shows "Load more from server" button when hasNextPage and all visible', async () => {
    const page1Courses = createCourses(50)
    mockFetchCoursesClient.mockResolvedValue({
      courses: page1Courses,
      pagination: { ...defaultPagination, total: 100, hasNextPage: true, totalPages: 2 },
    })
    render(<ExplorePage />)
    await waitFor(() => {
      expect(screen.getAllByTestId('course-card')).toHaveLength(50)
    })
    expect(screen.getByText('Load more from server')).toBeInTheDocument()
    expect(screen.getByText(/page 1 of 2/)).toBeInTheDocument()
  })

  it('shows "Loading more courses..." when fetching next page', async () => {
    const page1Courses = createCourses(50)
    mockFetchCoursesClient
      .mockResolvedValueOnce({
        courses: page1Courses,
        pagination: { ...defaultPagination, total: 100, hasNextPage: true, totalPages: 2 },
      })
      .mockReturnValueOnce(new Promise(() => {}))
    render(<ExplorePage />)
    await waitFor(() => {
      expect(screen.getByText('Load more from server')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByText('Load more from server'))
    await waitFor(() => {
      expect(
        screen.getByText('Loading more courses...')
      ).toBeInTheDocument()
    })
  })

  it('primes course cache after loading', async () => {
    render(<ExplorePage />)
    await waitFor(() => {
      expect(screen.getAllByTestId('course-card')).toHaveLength(3)
    })
    expect(mockPrimeCourseClientCache).toHaveBeenCalledWith(defaultCourses)
  })

  it('shows "AI is thinking..." heading when AI thinking starts', () => {
    render(<ExplorePage />)
    fireEvent.click(screen.getByTestId('start-thinking'))
    expect(screen.getByText('AI is thinking...')).toBeInTheDocument()
  })

  it('shows AI recommendation heading after recommendations arrive', async () => {
    mockFetchCoursesByIdsClient.mockResolvedValue([])
    render(<ExplorePage />)
    await waitFor(() => {
      expect(screen.getByText('All Courses')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByTestId('start-thinking'))
    fireEvent.click(screen.getByTestId('show-recommendations'))
    await waitFor(() => {
      expect(screen.getByText('AI Recommendations')).toBeInTheDocument()
    })
    expect(
      screen.getByText('Showing courses recommended by the AI.')
    ).toBeInTheDocument()
  })

  it('shows "Loading AI Recommendations..." while fetching recs', async () => {
    mockFetchCoursesByIdsClient.mockReturnValue(new Promise(() => {}))
    render(<ExplorePage />)
    await waitFor(() => {
      expect(screen.getByText('All Courses')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByTestId('start-thinking'))
    fireEvent.click(screen.getByTestId('show-recommendations'))
    await waitFor(() => {
      expect(
        screen.getByText('Loading AI Recommendations...')
      ).toBeInTheDocument()
    })
  })

  it('displays recommended courses after fetching', async () => {
    const recCourses = [
      {
        id: 'rec-1',
        title: 'Recommended Course 1',
        code: 'REC101',
        link: '',
        description: 'A recommended course',
        Learning_outcomes: '',
        tags: [],
        relatedCourses: [],
        level: "Master's" as const,
        credits: 7.5,
      },
      {
        id: 'rec-2',
        title: 'Recommended Course 2',
        code: 'REC102',
        link: '',
        description: 'Another recommended course',
        Learning_outcomes: '',
        tags: [],
        relatedCourses: [],
        level: "Bachelor's" as const,
        credits: 5,
      },
    ]
    mockFetchCoursesByIdsClient.mockResolvedValue(recCourses)
    render(<ExplorePage />)
    await waitFor(() => {
      expect(screen.getByText('All Courses')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByTestId('start-thinking'))
    fireEvent.click(screen.getByTestId('show-recommendations'))
    await waitFor(() => {
      expect(screen.getByText('Recommended Course 1')).toBeInTheDocument()
    })
    expect(screen.getByText('Recommended Course 2')).toBeInTheDocument()
  })

  it('shows "Clear recommendations" button in AI mode', async () => {
    mockFetchCoursesByIdsClient.mockResolvedValue([])
    render(<ExplorePage />)
    await waitFor(() => {
      expect(screen.getByText('All Courses')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByTestId('show-recommendations'))
    await waitFor(() => {
      expect(
        screen.getByText('Clear recommendations')
      ).toBeInTheDocument()
    })
  })

  it('clearing recommendations reverts to all courses', async () => {
    mockFetchCoursesByIdsClient.mockResolvedValue([])
    render(<ExplorePage />)
    await waitFor(() => {
      expect(screen.getByText('All Courses')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByTestId('show-recommendations'))
    await waitFor(() => {
      expect(
        screen.getByText('Clear recommendations')
      ).toBeInTheDocument()
    })
    fireEvent.click(screen.getByText('Clear recommendations'))
    await waitFor(() => {
      expect(screen.getByText('All Courses')).toBeInTheDocument()
    })
    expect(
      screen.getByText('Browse all courses without AI intervention.')
    ).toBeInTheDocument()
    expect(
      screen.queryByText('Clear recommendations')
    ).not.toBeInTheDocument()
  })

  it('handles fetchCoursesClient error gracefully', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    mockFetchCoursesClient.mockRejectedValue(new Error('Network error'))
    render(<ExplorePage />)
    await waitFor(() => {
      expect(
        screen.getByText('No courses found, please try again.')
      ).toBeInTheDocument()
    })
    consoleSpy.mockRestore()
  })

  it('handles fetchCoursesByIdsClient error gracefully', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    mockFetchCoursesByIdsClient.mockRejectedValue(new Error('Rec fetch error'))
    render(<ExplorePage />)
    await waitFor(() => {
      expect(screen.getByText('All Courses')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByTestId('show-recommendations'))
    await waitFor(() => {
      expect(screen.getByText('AI Recommendations')).toBeInTheDocument()
    })
    consoleSpy.mockRestore()
  })

  it('shows pagination info with page numbers', async () => {
    mockFetchCoursesClient.mockResolvedValue({
      courses: createCourses(50),
      pagination: { ...defaultPagination, total: 100, hasNextPage: true, totalPages: 3, page: 2 },
    })
    render(<ExplorePage />)
    await waitFor(() => {
      expect(screen.getByText(/page 2 of 3/)).toBeInTheDocument()
    })
  })

  it('does not show pagination text when no next page', async () => {
    render(<ExplorePage />)
    await waitFor(() => {
      expect(screen.getByText(/Showing 3 of 3 courses/)).toBeInTheDocument()
    })
    expect(screen.queryByText(/page/)).not.toBeInTheDocument()
  })

  it('filters by tags via search', async () => {
    render(<ExplorePage />)
    await waitFor(() => {
      expect(screen.getAllByTestId('course-card')).toHaveLength(3)
    })
    const searchInput = screen.getByPlaceholderText(
      'Filter by title, code, tag\u2026'
    )
    fireEvent.change(searchInput, { target: { value: 'Mathematics' } })
    await waitFor(() => {
      expect(screen.getByText('Preparatory Math')).toBeInTheDocument()
      expect(screen.queryByText('Advanced Machine Learning')).not.toBeInTheDocument()
    })
  })
})
