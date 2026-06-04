import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import MyCoursesPage from '@/app/my-courses/page'
import { updatePageMeta } from '@/utils/seo'

const mockOnAuthStateChanged = jest.fn()

jest.mock('firebase/auth', () => ({
  onAuthStateChanged: (...args: unknown[]) => {
    mockOnAuthStateChanged(...args)
    return jest.fn()
  },
}))

jest.mock('@/lib/firebase-client', () => ({
  auth: {},
}))

jest.mock('@/components/courses/CourseCard', () => ({
  __esModule: true,
  default: ({ course }: { course: { id: string; title: string } }) => (
    <div data-testid="course-card">{course.title}</div>
  ),
}))

jest.mock('@/lib/firestore/favorites', () => ({
  getUserFavorites: jest.fn(),
}))

jest.mock('@/lib/firestore/course-categories', () => ({
  getUserCategories: jest.fn(),
  createCategory: jest.fn(),
  deleteCategory: jest.fn(),
  getCategoryCourses: jest.fn(),
  addCourseToCategory: jest.fn(),
  removeCourseFromCategory: jest.fn(),
}))

jest.mock('@/lib/firestore/courses', () => ({
  fetchCoursesByIdsClient: jest.fn(),
}))

import { getUserFavorites } from '@/lib/firestore/favorites'
import {
  getUserCategories,
  createCategory,
  deleteCategory,
  getCategoryCourses,
  addCourseToCategory,
  removeCourseFromCategory,
} from '@/lib/firestore/course-categories'
import { fetchCoursesByIdsClient } from '@/lib/firestore/courses'

function sampleCourse(id: string, title: string) {
  return {
    id,
    title,
    code: `CS${id}`,
    link: `/course/${id}`,
    description: `Description for ${title}`,
    Learning_outcomes: '',
    tags: ['AI'],
    relatedCourses: [] as string[],
    level: "Bachelor's" as const,
    credits: 5,
  }
}

function sampleCategory(id: string, name: string) {
  return {
    id,
    userId: 'user1',
    name,
    color: '#990000',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  }
}

function setupAuth(user: unknown) {
  mockOnAuthStateChanged.mockImplementation((_auth: unknown, cb: (u: unknown) => void) => {
    cb(user)
    return jest.fn()
  })
}

describe('MyCoursesPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(window, 'confirm').mockImplementation(() => true)
    jest.spyOn(window, 'alert').mockImplementation(() => {})
  })

  it('calls updatePageMeta on mount', () => {
    setupAuth(null)
    render(<MyCoursesPage />)
    expect(updatePageMeta).toHaveBeenCalledWith(
      'My Courses',
      'View your favorite courses and custom categories',
    )
  })

  it('shows sign in prompt when not logged in', () => {
    setupAuth(null)
    render(<MyCoursesPage />)
    expect(screen.getByText('My Courses')).toBeInTheDocument()
    expect(screen.getByText('Sign in to view your favorite courses and custom categories')).toBeInTheDocument()
    const signInLink = screen.getByRole('link', { name: /sign in/i })
    expect(signInLink).toHaveAttribute('href', '/account?returnTo=/my-courses')
  })

  it('shows loading while fetching user data', async () => {
    setupAuth({ uid: 'user1' })
    jest.mocked(getUserFavorites).mockReturnValue(new Promise(() => {}))
    jest.mocked(getUserCategories).mockReturnValue(new Promise(() => {}))

    render(<MyCoursesPage />)

    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('shows empty favorites message when user has no favorites and no categories', async () => {
    setupAuth({ uid: 'user1' })
    jest.mocked(getUserFavorites).mockResolvedValue([])
    jest.mocked(getUserCategories).mockResolvedValue([])
    jest.mocked(fetchCoursesByIdsClient).mockResolvedValue([])

    render(<MyCoursesPage />)

    await waitFor(() => {
      expect(screen.getByText("You haven't favorited any courses yet")).toBeInTheDocument()
    })
    const exploreBtn = screen.getByRole('link', { name: /explore courses/i })
    expect(exploreBtn).toHaveAttribute('href', '/explore')
    expect(screen.getByText('0 courses')).toBeInTheDocument()
  })

  it('renders favorite courses in favorites tab', async () => {
    setupAuth({ uid: 'user1' })
    const courses = [sampleCourse('c1', 'Course Alpha'), sampleCourse('c2', 'Course Beta')]
    jest.mocked(getUserFavorites).mockResolvedValue([
      { courseId: 'c1', userId: 'user1', createdAt: '2026-01-01' },
      { courseId: 'c2', userId: 'user1', createdAt: '2026-01-02' },
    ])
    jest.mocked(getUserCategories).mockResolvedValue([])
    jest.mocked(fetchCoursesByIdsClient).mockResolvedValue(courses)

    render(<MyCoursesPage />)

    await waitFor(() => {
      expect(screen.getByText('Course Alpha')).toBeInTheDocument()
    })
    expect(screen.getByText('Course Beta')).toBeInTheDocument()
    expect(screen.getByText('2 courses')).toBeInTheDocument()
  })

  it('shows no categories yet message when no categories exist', async () => {
    setupAuth({ uid: 'user1' })
    jest.mocked(getUserFavorites).mockResolvedValue([])
    jest.mocked(getUserCategories).mockResolvedValue([])
    jest.mocked(fetchCoursesByIdsClient).mockResolvedValue([])

    render(<MyCoursesPage />)

    await waitFor(() => {
      expect(screen.getByText('No categories yet')).toBeInTheDocument()
    })
  })

  it('renders categories in sidebar', async () => {
    setupAuth({ uid: 'user1' })
    jest.mocked(getUserFavorites).mockResolvedValue([])
    jest.mocked(getUserCategories).mockResolvedValue([
      sampleCategory('cat1', 'ML Courses'),
      sampleCategory('cat2', 'AI Basics'),
    ])
    jest.mocked(getCategoryCourses).mockResolvedValue([])
    jest.mocked(fetchCoursesByIdsClient).mockResolvedValue([])

    render(<MyCoursesPage />)

    await waitFor(() => {
      expect(screen.getByText('ML Courses')).toBeInTheDocument()
    })
    expect(screen.getByText('AI Basics')).toBeInTheDocument()
  })

  it('shows empty category message when category has no courses', async () => {
    setupAuth({ uid: 'user1' })
    jest.mocked(getUserFavorites).mockResolvedValue([])
    jest.mocked(getUserCategories).mockResolvedValue([sampleCategory('cat1', 'ML Courses')])
    jest.mocked(getCategoryCourses).mockResolvedValue([])
    jest.mocked(fetchCoursesByIdsClient).mockResolvedValue([])

    render(<MyCoursesPage />)

    await waitFor(() => {
      expect(screen.getByText('ML Courses')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('ML Courses'))

    await waitFor(() => {
      expect(screen.getByText('This category is empty')).toBeInTheDocument()
    })
  })

  it('displays courses when switching to a category tab', async () => {
    setupAuth({ uid: 'user1' })
    const course = sampleCourse('c1', 'ML Foundations')
    jest.mocked(getUserFavorites).mockResolvedValue([])
    jest.mocked(getUserCategories).mockResolvedValue([sampleCategory('cat1', 'ML Courses')])
    jest.mocked(getCategoryCourses).mockResolvedValue(['c1'])
    jest.mocked(fetchCoursesByIdsClient).mockResolvedValue([course])

    render(<MyCoursesPage />)

    await waitFor(() => {
      expect(screen.getByText('ML Courses')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('ML Courses'))

    await waitFor(() => {
      expect(screen.getByText('ML Foundations')).toBeInTheDocument()
    })
  })

  it('opens create category modal', async () => {
    setupAuth({ uid: 'user1' })
    jest.mocked(getUserFavorites).mockResolvedValue([])
    jest.mocked(getUserCategories).mockResolvedValue([])
    jest.mocked(fetchCoursesByIdsClient).mockResolvedValue([])

    render(<MyCoursesPage />)

    await waitFor(() => {
      expect(screen.getByText('New Category')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('New Category'))

    expect(screen.getByText('Create New Category')).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/category name/i)).toBeInTheDocument()
  })

  it('closes create category modal on cancel', async () => {
    setupAuth({ uid: 'user1' })
    jest.mocked(getUserFavorites).mockResolvedValue([])
    jest.mocked(getUserCategories).mockResolvedValue([])
    jest.mocked(fetchCoursesByIdsClient).mockResolvedValue([])

    render(<MyCoursesPage />)

    await waitFor(() => {
      expect(screen.getByText('New Category')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('New Category'))
    expect(screen.getByText('Create New Category')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Cancel'))
    expect(screen.queryByText('Create New Category')).not.toBeInTheDocument()
  })

  it('creates a new category', async () => {
    setupAuth({ uid: 'user1' })
    jest.mocked(getUserFavorites).mockResolvedValue([])
    jest.mocked(getUserCategories).mockResolvedValue([])
    jest.mocked(createCategory).mockResolvedValue('new-cat-id')
    jest.mocked(fetchCoursesByIdsClient).mockResolvedValue([])

    render(<MyCoursesPage />)

    await waitFor(() => {
      expect(screen.getByText('New Category')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('New Category'))
    fireEvent.change(screen.getByPlaceholderText(/category name/i), {
      target: { value: 'My New Category' },
    })
    fireEvent.click(screen.getByText('Create'))

    await waitFor(() => {
      expect(createCategory).toHaveBeenCalledWith('user1', 'My New Category')
    })
  })

  it('disables create button when name is empty', async () => {
    setupAuth({ uid: 'user1' })
    jest.mocked(getUserFavorites).mockResolvedValue([])
    jest.mocked(getUserCategories).mockResolvedValue([])
    jest.mocked(fetchCoursesByIdsClient).mockResolvedValue([])

    render(<MyCoursesPage />)

    await waitFor(() => {
      expect(screen.getByText('New Category')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('New Category'))

    const createBtn = screen.getByText('Create').closest('button')
    expect(createBtn).toBeDisabled()
  })

  it('disables create button when max categories reached', async () => {
    setupAuth({ uid: 'user1' })
    const manyCategories = Array.from({ length: 10 }, (_, i) => sampleCategory(`cat${i}`, `Category ${i}`))
    jest.mocked(getUserFavorites).mockResolvedValue([])
    jest.mocked(getUserCategories).mockResolvedValue(manyCategories)
    jest.mocked(getCategoryCourses).mockResolvedValue([])
    jest.mocked(fetchCoursesByIdsClient).mockResolvedValue([])

    render(<MyCoursesPage />)

    await waitFor(() => {
      expect(screen.getByText('New Category')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('New Category'))

    const createBtn = screen.getByText('Create').closest('button')
    expect(createBtn).toBeDisabled()
  })

  it('deletes a category after confirmation', async () => {
    setupAuth({ uid: 'user1' })
    jest.mocked(getUserFavorites).mockResolvedValue([])
    jest.mocked(getUserCategories).mockResolvedValue([sampleCategory('cat1', 'ML Courses')])
    jest.mocked(getCategoryCourses).mockResolvedValue([])
    jest.mocked(deleteCategory).mockResolvedValue()
    jest.mocked(fetchCoursesByIdsClient).mockResolvedValue([])

    render(<MyCoursesPage />)

    await waitFor(() => {
      expect(screen.getByText('ML Courses')).toBeInTheDocument()
    })

    const tabBtn = screen.getByText('ML Courses').closest('button')!
    const container = tabBtn.parentElement!
    const deleteBtn = container.querySelectorAll('button')[1]
    fireEvent.click(deleteBtn)

    expect(window.confirm).toHaveBeenCalledWith('Delete this category?')

    await waitFor(() => {
      expect(deleteCategory).toHaveBeenCalledWith('user1', 'cat1')
    })
  })

  it('does not delete category when confirm is cancelled', async () => {
    jest.spyOn(window, 'confirm').mockImplementation(() => false)

    setupAuth({ uid: 'user1' })
    jest.mocked(getUserFavorites).mockResolvedValue([])
    jest.mocked(getUserCategories).mockResolvedValue([sampleCategory('cat1', 'ML Courses')])
    jest.mocked(getCategoryCourses).mockResolvedValue([])
    jest.mocked(fetchCoursesByIdsClient).mockResolvedValue([])

    render(<MyCoursesPage />)

    await waitFor(() => {
      expect(screen.getByText('ML Courses')).toBeInTheDocument()
    })

    const tabBtn = screen.getByText('ML Courses').closest('button')!
    const container = tabBtn.parentElement!
    const deleteBtn = container.querySelectorAll('button')[1]
    fireEvent.click(deleteBtn)

    expect(deleteCategory).not.toHaveBeenCalled()
  })

  it('shows add to group button in favorites tab', async () => {
    setupAuth({ uid: 'user1' })
    const course = sampleCourse('c1', 'Course Alpha')
    jest.mocked(getUserFavorites).mockResolvedValue([
      { courseId: 'c1', userId: 'user1', createdAt: '2026-01-01' },
    ])
    jest.mocked(getUserCategories).mockResolvedValue([sampleCategory('cat1', 'ML Courses')])
    jest.mocked(getCategoryCourses).mockResolvedValue([])
    jest.mocked(fetchCoursesByIdsClient).mockResolvedValue([course])

    render(<MyCoursesPage />)

    await waitFor(() => {
      expect(screen.getByText('Course Alpha')).toBeInTheDocument()
    })

    expect(screen.getByText('Add to Group')).toBeInTheDocument()
  })

  it('calls addCourseToCategory when adding course to group from favorites', async () => {
    setupAuth({ uid: 'user1' })
    const course = sampleCourse('c1', 'Course Alpha')
    jest.mocked(getUserFavorites).mockResolvedValue([
      { courseId: 'c1', userId: 'user1', createdAt: '2026-01-01' },
    ])
    jest.mocked(getUserCategories).mockResolvedValue([sampleCategory('cat1', 'ML Courses')])
    jest.mocked(getCategoryCourses).mockResolvedValue([])
    jest.mocked(addCourseToCategory).mockResolvedValue()
    jest.mocked(fetchCoursesByIdsClient).mockResolvedValue([course])

    render(<MyCoursesPage />)

    await waitFor(() => {
      expect(screen.getByText('Add to Group')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Add to Group'))

    await waitFor(() => {
      expect(addCourseToCategory).toHaveBeenCalledWith('cat1', 'c1')
    })
  })

  it('shows move and remove buttons in a category tab', async () => {
    setupAuth({ uid: 'user1' })
    const course = sampleCourse('c1', 'ML Foundations')
    jest.mocked(getUserFavorites).mockResolvedValue([])
    jest.mocked(getUserCategories).mockResolvedValue([sampleCategory('cat1', 'ML Courses')])
    jest.mocked(getCategoryCourses).mockResolvedValue(['c1'])
    jest.mocked(fetchCoursesByIdsClient).mockResolvedValue([course])

    render(<MyCoursesPage />)

    await waitFor(() => {
      expect(screen.getByText('ML Courses')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('ML Courses'))

    await waitFor(() => {
      expect(screen.getByText('ML Foundations')).toBeInTheDocument()
    })

    expect(screen.getByText('Move')).toBeInTheDocument()
    expect(screen.getByText('Remove')).toBeInTheDocument()
  })

  it('calls removeCourseFromCategory when removing a course from a category', async () => {
    setupAuth({ uid: 'user1' })
    const course = sampleCourse('c1', 'ML Foundations')
    jest.mocked(getUserFavorites).mockResolvedValue([])
    jest.mocked(getUserCategories).mockResolvedValue([sampleCategory('cat1', 'ML Courses')])
    jest.mocked(getCategoryCourses).mockResolvedValue(['c1'])
    jest.mocked(removeCourseFromCategory).mockResolvedValue()
    jest.mocked(fetchCoursesByIdsClient).mockResolvedValue([course])

    render(<MyCoursesPage />)

    await waitFor(() => {
      expect(screen.getByText('ML Courses')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('ML Courses'))

    await waitFor(() => {
      expect(screen.getByText('Remove')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Remove'))

    await waitFor(() => {
      expect(removeCourseFromCategory).toHaveBeenCalledWith('cat1', 'c1')
    })
  })

  it('calls addCourseToCategory and removeCourseFromCategory when moving between groups', async () => {
    setupAuth({ uid: 'user1' })
    const course = sampleCourse('c1', 'ML Foundations')
    jest.mocked(getUserFavorites).mockResolvedValue([])
    jest.mocked(getUserCategories).mockResolvedValue([
      sampleCategory('cat1', 'ML Courses'),
      sampleCategory('cat2', 'Deep Learning'),
    ])
    jest.mocked(getCategoryCourses).mockImplementation(async (catId: string) => {
      if (catId === 'cat1') return ['c1']
      return []
    })
    jest.mocked(addCourseToCategory).mockResolvedValue()
    jest.mocked(removeCourseFromCategory).mockResolvedValue()
    jest.mocked(fetchCoursesByIdsClient).mockResolvedValue([course])

    render(<MyCoursesPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /ml courses/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /ml courses/i }))

    await waitFor(() => {
      expect(screen.getByText('Move')).toBeInTheDocument()
    })

    const selects = screen.getAllByRole('combobox')
    fireEvent.change(selects[0], { target: { value: 'cat2' } })

    fireEvent.click(screen.getByText('Move'))

    await waitFor(() => {
      expect(addCourseToCategory).toHaveBeenCalledWith('cat2', 'c1')
      expect(removeCourseFromCategory).toHaveBeenCalledWith('cat1', 'c1')
    })
  })

  it('does not move course when target is the same category', async () => {
    setupAuth({ uid: 'user1' })
    const course = sampleCourse('c1', 'ML Foundations')
    jest.mocked(getUserFavorites).mockResolvedValue([])
    jest.mocked(getUserCategories).mockResolvedValue([
      sampleCategory('cat1', 'ML Courses'),
      sampleCategory('cat2', 'Deep Learning'),
    ])
    jest.mocked(getCategoryCourses).mockResolvedValue(['c1'])
    jest.mocked(fetchCoursesByIdsClient).mockResolvedValue([course])

    render(<MyCoursesPage />)

    await waitFor(() => {
      expect(screen.getByText('ML Courses')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('ML Courses'))

    await waitFor(() => {
      expect(screen.getByText('Move')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Move'))

    await waitFor(() => {
      expect(addCourseToCategory).not.toHaveBeenCalled()
      expect(removeCourseFromCategory).not.toHaveBeenCalled()
    })
  })

  it('disables move button when target is the same category', async () => {
    setupAuth({ uid: 'user1' })
    const course = sampleCourse('c1', 'ML Foundations')
    jest.mocked(getUserFavorites).mockResolvedValue([])
    jest.mocked(getUserCategories).mockResolvedValue([
      sampleCategory('cat1', 'ML Courses'),
      sampleCategory('cat2', 'Deep Learning'),
    ])
    jest.mocked(getCategoryCourses).mockResolvedValue(['c1'])
    jest.mocked(fetchCoursesByIdsClient).mockResolvedValue([course])

    render(<MyCoursesPage />)

    await waitFor(() => {
      expect(screen.getByText('ML Courses')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('ML Courses'))

    await waitFor(() => {
      expect(screen.getByText('Move')).toBeInTheDocument()
    })

    const moveBtn = screen.getByText('Move').closest('button')
    expect(moveBtn).toBeDisabled()
  })

  it('shows alert when group reaches max courses', async () => {
    setupAuth({ uid: 'user1' })
    const courseIds = Array.from({ length: 50 }, (_, i) => `c${i}`)
    const courses = courseIds.map((id) => sampleCourse(id, `Course ${id}`))
    const extraCourse = sampleCourse('c_extra', 'Extra Course')

    jest.mocked(getUserFavorites).mockResolvedValue([
      { courseId: 'c_extra', userId: 'user1', createdAt: '2026-01-01' },
    ])
    jest.mocked(getUserCategories).mockResolvedValue([sampleCategory('cat1', 'ML Courses')])
    jest.mocked(getCategoryCourses).mockResolvedValue(courseIds)
    jest.mocked(fetchCoursesByIdsClient).mockResolvedValue([...courses, extraCourse])

    render(<MyCoursesPage />)

    await waitFor(() => {
      expect(screen.getByText('Extra Course')).toBeInTheDocument()
    })

    const select = screen.getByRole('combobox')
    fireEvent.change(select, { target: { value: 'cat1' } })

    fireEvent.click(screen.getByText('Add to Group'))

    expect(window.alert).toHaveBeenCalledWith('Each group can contain up to 50 courses.')
    expect(addCourseToCategory).not.toHaveBeenCalled()
  })

  it('shows alert when move target group is full', async () => {
    setupAuth({ uid: 'user1' })
    const courseIds = Array.from({ length: 50 }, (_, i) => `c${i}`)
    const courses = courseIds.map((id) => sampleCourse(id, `Course ${id}`))
    const singleCourse = sampleCourse('c_main', 'Main Course')

    jest.mocked(getUserFavorites).mockResolvedValue([])
    jest.mocked(getUserCategories).mockResolvedValue([
      sampleCategory('cat1', 'Full Group'),
      sampleCategory('cat2', 'Other Group'),
    ])
    jest.mocked(getCategoryCourses).mockImplementation(async (catId: string) => {
      if (catId === 'cat1') return courseIds
      return ['c_main']
    })
    jest.mocked(fetchCoursesByIdsClient).mockResolvedValue([...courses, singleCourse])

    render(<MyCoursesPage />)

    await waitFor(() => {
      expect(screen.getByText('Other Group')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Other Group'))

    await waitFor(() => {
      expect(screen.getByText('Main Course')).toBeInTheDocument()
    })

    const select = screen.getByRole('combobox')
    fireEvent.change(select, { target: { value: 'cat1' } })

    fireEvent.click(screen.getByText('Move'))

    expect(window.alert).toHaveBeenCalledWith('Each group can contain up to 50 courses.')
    expect(addCourseToCategory).not.toHaveBeenCalled()
    expect(removeCourseFromCategory).not.toHaveBeenCalled()
  })

  it('switches to favorites tab when deleting the active category tab', async () => {
    setupAuth({ uid: 'user1' })
    jest.mocked(getUserFavorites).mockResolvedValue([])
    jest.mocked(getUserCategories).mockResolvedValue([sampleCategory('cat1', 'ML Courses')])
    jest.mocked(getCategoryCourses).mockResolvedValue([])
    jest.mocked(deleteCategory).mockResolvedValue()
    jest.mocked(fetchCoursesByIdsClient).mockResolvedValue([])

    render(<MyCoursesPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /ml courses/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /ml courses/i }))

    await waitFor(() => {
      expect(screen.getByText('This category is empty')).toBeInTheDocument()
    })

    const tabBtn = screen.getByRole('button', { name: /ml courses/i })
    const container = tabBtn.parentElement!
    const deleteBtn = container.querySelectorAll('button')[1]
    fireEvent.click(deleteBtn)

    await waitFor(() => {
      expect(deleteCategory).toHaveBeenCalledWith('user1', 'cat1')
    })

    expect(screen.getByText("You haven't favorited any courses yet")).toBeInTheDocument()
  })

  it('hides category courses from sidebar after tab switch', async () => {
    setupAuth({ uid: 'user1' })
    const favCourse = sampleCourse('c_fav', 'Favorite Course')
    const catCourse = sampleCourse('c_cat', 'Category Course')

    jest.mocked(getUserFavorites).mockResolvedValue([
      { courseId: 'c_fav', userId: 'user1', createdAt: '2026-01-01' },
    ])
    jest.mocked(getUserCategories).mockResolvedValue([sampleCategory('cat1', 'ML Courses')])
    jest.mocked(getCategoryCourses).mockResolvedValue(['c_cat'])
    jest.mocked(fetchCoursesByIdsClient).mockResolvedValue([favCourse, catCourse])

    render(<MyCoursesPage />)

    await waitFor(() => {
      expect(screen.getByText('Favorite Course')).toBeInTheDocument()
    })
    expect(screen.queryByText('Category Course')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /ml courses/i }))

    await waitFor(() => {
      expect(screen.getByText('Category Course')).toBeInTheDocument()
    })
    expect(screen.queryByText('Favorite Course')).not.toBeInTheDocument()
  })
})
