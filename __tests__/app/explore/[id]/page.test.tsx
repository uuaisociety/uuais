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

jest.mock('@/lib/programs', () => ({
  getProgram: jest.fn(),
}))

import { fetchCourseById } from '@/lib/courses'
import { getProgram } from '@/lib/programs'

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

  // Roughly one code in five that a programme map links to has never been scraped, so
  // a miss is a gap in our data rather than a bad URL and must not dead-end.
  describe('when the course is not in our catalogue', () => {
    it.each([undefined, null])('renders the code rather than 404ing (%p)', async (missing) => {
      (fetchCourseById as jest.Mock).mockResolvedValue(missing)

      const element = await ExploreDetailPage({
        params: Promise.resolve({ id: '1TE609' }),
      })
      render(element)

      expect(screen.getByRole('heading', { name: '1TE609' })).toBeInTheDocument()
      expect(screen.queryByTestId('course-detail-client')).not.toBeInTheDocument()
    })

    // CI runs with no Firebase credentials, so the lookup rejects rather than resolving empty.
    it('renders the code when the lookup fails outright', async () => {
      (fetchCourseById as jest.Mock).mockRejectedValue(new Error('Missing Firebase credentials'))

      const element = await ExploreDetailPage({
        params: Promise.resolve({ id: '1TE609' }),
      })
      render(element)

      expect(screen.getByRole('heading', { name: '1TE609' })).toBeInTheDocument()
      expect(screen.queryByTestId('course-detail-client')).not.toBeInTheDocument()
    })

    it('links out to the university page for the code', async () => {
      (fetchCourseById as jest.Mock).mockResolvedValue(null)

      render(await ExploreDetailPage({ params: Promise.resolve({ id: '1TE609' }) }))

      const link = screen.getByRole('link', { name: /Look up 1TE609 at uu\.se/i })
      expect(link).toHaveAttribute(
        'href',
        'https://www.uu.se/en/study/course?query=1TE609',
      )
      expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'))
    })

    it('offers a route back into the catalogue and the course finder', async () => {
      (fetchCourseById as jest.Mock).mockResolvedValue(null)

      render(await ExploreDetailPage({ params: Promise.resolve({ id: '1MA090' }) }))

      expect(screen.getByRole('link', { name: /Course finder/i })).toHaveAttribute(
        'href',
        '/explore',
      )
      expect(screen.getByRole('link', { name: /Programme catalogue/i })).toHaveAttribute(
        'href',
        '/programs',
      )
    })

    it('invents no title for a course it has no detail for', async () => {
      (fetchCourseById as jest.Mock).mockResolvedValue(null)

      render(await ExploreDetailPage({ params: Promise.resolve({ id: '1MA360' }) }))

      expect(screen.getByText(/no cached detail/i)).toBeInTheDocument()
    })
  })

  describe('error / edge cases', () => {
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

describe('the way back', () => {
  const backLink = () => screen.getByRole('link', { name: /Back to/i })

  beforeEach(() => {
    (fetchCourseById as jest.Mock).mockResolvedValue(mockCourse)
  })

  const renderWith = async (from?: string) =>
    render(
      await ExploreDetailPage({
        params: Promise.resolve({ id: 'course-1' }),
        searchParams: Promise.resolve(from === undefined ? {} : { from }),
      })
    )

  it('returns to the programme the course was opened from, named', async () => {
    (getProgram as jest.Mock).mockReturnValue({
      nameSv: 'Civilingenjörsprogrammet i teknisk fysik',
      nameEn: 'Master of Science in Engineering Physics',
    })

    await renderWith('/programs/ttf2y')

    expect(backLink()).toHaveAttribute('href', '/programs/ttf2y')
    expect(backLink()).toHaveTextContent(/Engineering Physics/i)
  })

  it('keeps the specialisation the reader had chosen', async () => {
    (getProgram as jest.Mock).mockReturnValue({ nameSv: 'Teknisk fysik', nameEn: null })

    await renderWith('/programs/ttf2y?track=berakningsteknik')

    expect(backLink()).toHaveAttribute('href', '/programs/ttf2y?track=berakningsteknik')
  })

  it('falls back to the course list when the programme is unknown', async () => {
    (getProgram as jest.Mock).mockReturnValue(null)

    await renderWith('/programs/nosuch')

    expect(backLink()).toHaveAttribute('href', '/programs/nosuch')
    expect(backLink()).toHaveTextContent(/Back to programme/i)
  })

  // `from` is attacker-controlled, so anything that is not a programme path is dropped
  // rather than followed.
  it.each([
    ['https://evil.example', 'an absolute URL'],
    ['//evil.example', 'a protocol-relative URL'],
    ['/admin', 'another route'],
    ['/programs/ttf2y?track=x&next=/admin', 'a smuggled second parameter'],
  ])('ignores %s (%s)', async (from) => {
    await renderWith(from)

    expect(backLink()).toHaveAttribute('href', '/explore')
    expect(backLink()).toHaveTextContent('Back to Courses')
  })
})
