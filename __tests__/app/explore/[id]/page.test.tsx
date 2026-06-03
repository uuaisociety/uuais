import { render, screen } from '@testing-library/react'
import ExploreDetailPage, { generateMetadata } from '@/app/explore/[id]/page'
import { createMockCourse } from '@/__tests__/helpers/fixtures'

// ---- Mocks ----

jest.mock('@/lib/courses', () => ({
  fetchCourseById: jest.fn(),
}))

jest.mock('@/components/courses/CourseDetailClient', () => ({
  __esModule: true,
  default: ({ course, hrefBase }: { course: { id: string; title: string }; hrefBase: string }) => (
    <div data-testid="course-detail-client">
      <span data-testid="client-course-id">{course.id}</span>
      <span data-testid="client-course-title">{course.title}</span>
      <span data-testid="client-href-base">{hrefBase}</span>
    </div>
  ),
}))

import { fetchCourseById } from '@/lib/courses'

// ---- Fixtures ----

const mockCourse = createMockCourse({
  tags: ['ML', 'AI'],
  link: 'https://uu.se/course/ml501',
})

const fullCourse = createMockCourse({
  tags: ['ML', 'AI'],
  link: 'https://uu.se/course/ml501',
})

// ---- Tests ----

describe('ExploreDetailPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('when course is found', () => {
    it('renders CourseDetailClient with course data', async () => {
      (fetchCourseById as jest.Mock).mockResolvedValue(mockCourse)

      const element = await ExploreDetailPage({
        params: Promise.resolve({ id: 'course-1' }),
      })
      render(element)

      expect(screen.getByTestId('course-detail-client')).toBeInTheDocument()
      expect(screen.getByTestId('client-course-id')).toHaveTextContent('course-1')
      expect(screen.getByTestId('client-course-title')).toHaveTextContent(
        'Advanced Machine Learning',
      )
    })

    it('passes hrefBase="/explore" to CourseDetailClient', async () => {
      (fetchCourseById as jest.Mock).mockResolvedValue(mockCourse)

      const element = await ExploreDetailPage({
        params: Promise.resolve({ id: 'course-1' }),
      })
      render(element)

      expect(screen.getByTestId('client-href-base')).toHaveTextContent('/explore')
    })

    it('shows Back to Courses link pointing to /explore', async () => {
      (fetchCourseById as jest.Mock).mockResolvedValue(mockCourse)

      const element = await ExploreDetailPage({
        params: Promise.resolve({ id: 'course-1' }),
      })
      render(element)

      const backLink = screen.getByRole('link', { name: /Back to Courses/i })
      expect(backLink).toBeInTheDocument()
      expect(backLink).toHaveAttribute('href', '/explore')
    })

    it('calls fetchCourseById with the correct id', async () => {
      (fetchCourseById as jest.Mock).mockResolvedValue(mockCourse)

      await ExploreDetailPage({ params: Promise.resolve({ id: 'course-1' }) })

      expect(fetchCourseById).toHaveBeenCalledTimes(1)
      expect(fetchCourseById).toHaveBeenCalledWith('course-1')
    })

    it('renders without error when course has all optional fields', async () => {
      (fetchCourseById as jest.Mock).mockResolvedValue(fullCourse)

      const element = await ExploreDetailPage({
        params: Promise.resolve({ id: 'course-1' }),
      })
      render(element)

      expect(screen.getByTestId('course-detail-client')).toBeInTheDocument()
      expect(screen.getByTestId('client-course-id')).toHaveTextContent('course-1')
    })
  })

  describe('error / edge cases', () => {
    it('throws NEXT_NOT_FOUND when course is undefined', async () => {
      (fetchCourseById as jest.Mock).mockResolvedValue(undefined)

      await expect(
        ExploreDetailPage({ params: Promise.resolve({ id: 'course-1' }) }),
      ).rejects.toThrow('NEXT_NOT_FOUND')
    })

    it('throws NEXT_NOT_FOUND when course is null', async () => {
      (fetchCourseById as jest.Mock).mockResolvedValue(null)

      await expect(
        ExploreDetailPage({ params: Promise.resolve({ id: 'course-1' }) }),
      ).rejects.toThrow('NEXT_NOT_FOUND')
    })

    it('throws NEXT_NOT_FOUND when id is empty', async () => {
      await expect(
        ExploreDetailPage({ params: Promise.resolve({ id: '' }) }),
      ).rejects.toThrow('NEXT_NOT_FOUND')
    })

    it('does not call fetchCourseById when id is empty', async () => {
      await expect(
        ExploreDetailPage({ params: Promise.resolve({ id: '' }) }),
      ).rejects.toThrow('NEXT_NOT_FOUND')

      expect(fetchCourseById).not.toHaveBeenCalled()
    })
  })
})

describe('generateMetadata', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns title and description from course when found', async () => {
    (fetchCourseById as jest.Mock).mockResolvedValue(mockCourse)

    const metadata = await generateMetadata({
      params: Promise.resolve({ id: 'course-1' }),
    })

    expect(metadata).toEqual({
      title: 'Advanced Machine Learning',
      description: 'Deep dive into machine learning',
    })
  })

  it('returns fallback title when course is not found', async () => {
    (fetchCourseById as jest.Mock).mockResolvedValue(undefined)

    const metadata = await generateMetadata({
      params: Promise.resolve({ id: 'nonexistent' }),
    })

    expect(metadata).toEqual({ title: 'Course Detail' })
  })

  it('returns fallback title when id is empty', async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ id: '' }),
    })

    expect(metadata).toEqual({ title: 'Course Detail' })
  })

  it('uses course code when title is missing', async () => {
    (fetchCourseById as jest.Mock).mockResolvedValue({
      ...mockCourse,
      title: '',
      code: 'ML501',
    })

    const metadata = await generateMetadata({
      params: Promise.resolve({ id: 'course-1' }),
    })

    expect(metadata).toEqual({
      title: 'ML501',
      description: 'Deep dive into machine learning',
    })
  })

  it('truncates description to 160 characters', async () => {
    const longDescription = 'A'.repeat(300)
    ;(fetchCourseById as jest.Mock).mockResolvedValue({
      ...mockCourse,
      description: longDescription,
    })

    const metadata = await generateMetadata({
      params: Promise.resolve({ id: 'course-1' }),
    })

    expect(metadata.description).toHaveLength(160)
  })

  it('returns fallback on fetchCourseById error', async () => {
    (fetchCourseById as jest.Mock).mockRejectedValue(new Error('Network error'))

    const metadata = await generateMetadata({
      params: Promise.resolve({ id: 'course-1' }),
    })

    expect(metadata).toEqual({ title: 'Course Detail' })
  })
})
