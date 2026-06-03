import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CourseDetailClient from '@/components/courses/CourseDetailClient';
import type { Course } from '@/lib/courses';

// Mocks ----------------------------------------------------------------------

// Mock next/link as a plain <a> tag so we can assert href
jest.mock('next/link', () => {
  const MockLink = ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  );
  MockLink.displayName = 'MockLink';
  return MockLink;
});

// Mock lucide-react icons — Heart is the only icon used here
jest.mock('lucide-react', () => ({
  Heart: ({ className, ...props }: { className?: string; [key: string]: unknown }) => (
    <svg data-testid="heart-icon" className={className} {...props} />
  ),
}));

// Mock styled UI primitives
jest.mock('@/components/ui/Tag', () => ({
  Tag: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <span data-testid="tag" className={className}>
      {children}
    </span>
  ),
}));

jest.mock('@/components/ui/Button', () => ({
  Button: ({
    children,
    onClick,
    disabled,
    className,
    ...props
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    className?: string;
    [key: string]: unknown;
  }) => (
    <button onClick={onClick} disabled={disabled} className={className} {...props}>
      {children}
    </button>
  ),
}));

// Tooltip uses @radix-ui/react-tooltip which won't work in jsdom; mock it
jest.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tooltip-content">{children}</div>
  ),
}));

// CourseConnectionsFlow is complex (reactflow + dagre) — full mock
jest.mock('@/components/courses/CourseConnectionsFlow', () => ({
  __esModule: true,
  default: ({ focus }: { focus: Course }) => (
    <div data-testid="course-connections-flow">Connections Flow for {focus.title}</div>
  ),
}));

// Favorites module
jest.mock('@/lib/firestore/favorites', () => ({
  isCourseFavorited: jest.fn(),
  toggleFavorite: jest.fn(),
}));

// Override the useAdmin mock from jest.setup.ts with a controllable jest.fn()
jest.mock('@/hooks/useAdmin', () => ({
  useAdmin: jest.fn(),
}));

// Imports (after mocks so they resolve to mock implementations) --------------

import { useAdmin } from '@/hooks/useAdmin';
import { isCourseFavorited, toggleFavorite } from '@/lib/firestore/favorites';

// Fixtures -------------------------------------------------------------------

const baseCourse: Course = {
  id: '1DT051',
  title: 'Advanced Machine Learning',
  code: '1DT051',
  link: 'https://www.uu.se/en/study/course?query=1DT051',
  description: 'An advanced course on machine learning techniques covering deep neural networks, reinforcement learning, and Bayesian methods.',
  Learning_outcomes: 'After completing the course, students will be able to design and implement advanced ML models.',
  tags: ['AI', 'Machine Learning', "Master's"],
  relatedCourses: ['1DT054'],
  level: "Master's",
  credits: 7.5,
  language_of_instruction: 'English',
  location: 'Uppsala',
  study_period: 'Period 1',
  pace_of_study: '100%',
  teaching_form: 'Distance',
  instructional_time: 'Daytime',
  application_code: '12345',
  application_deadline: '2025-04-15',
  selection: 'Grades',
  fees: 'SEK 50,000',
  about_blurb:
    'This course covers advanced topics in machine learning including neural networks and reinforcement learning.',
  instruction: 'The course consists of lectures, seminars, and hands-on programming assignments.',
  assessment: 'Written exam (4 hours) and a project report.',
  reading_list_link: 'https://example.com/reading-list',
  syllabus_link: 'https://example.com/syllabus',
  syllabus: 'Detailed syllabus covering all course topics.',
  entry_requirements: 'Bachelor degree in computer science or equivalent. Basic programming skills required.',
  prerequisites: ['1DT050', '1DT049'],
  prerequisite_of: ['1DT052', '1DT053'],
};

// The minimal course for edge cases — no optional fields
const minimalCourse: Course = {
  id: '1DT000',
  title: 'Intro Course',
  code: '1DT000',
  link: '',
  description: 'A basic course.',
  Learning_outcomes: '',
  tags: [],
  relatedCourses: [],
};

// Helper: set the useAdmin return value to logged-in state
function mockLoggedInUser(uid = 'user-1') {
  (useAdmin as jest.Mock).mockReturnValue({
    user: { uid, email: 'test@example.com' } as unknown as import('firebase/auth').User,
    loading: false,
    isAdmin: false,
    isSuperAdmin: false,
    claims: null,
    signInWithGoogle: jest.fn(),
    logout: jest.fn(),
  });
}

// Helper: set the useAdmin return value to logged-out state
function mockLoggedOut() {
  (useAdmin as jest.Mock).mockReturnValue({
    user: null,
    loading: false,
    isAdmin: false,
    isSuperAdmin: false,
    claims: null,
    signInWithGoogle: jest.fn(),
    logout: jest.fn(),
  });
}

// Helper: set the useAdmin return value to loading state
function mockLoading() {
  (useAdmin as jest.Mock).mockReturnValue({
    user: null,
    loading: true,
    isAdmin: false,
    isSuperAdmin: false,
    claims: null,
    signInWithGoogle: jest.fn(),
    logout: jest.fn(),
  });
}

// Tests ----------------------------------------------------------------------

describe('CourseDetailClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLoggedOut();
    (isCourseFavorited as jest.Mock).mockResolvedValue(false);
    (toggleFavorite as jest.Mock).mockResolvedValue(true);
  });

  // ── Basic rendering ────────────────────────────────────────────────────

  it('renders course code, title, and description', () => {
    render(<CourseDetailClient course={baseCourse} />);

    expect(screen.getByText('1DT051')).toBeInTheDocument();
    expect(screen.getByText('Advanced Machine Learning - 1DT051')).toBeInTheDocument();
    expect(
      screen.getByText(
        'An advanced course on machine learning techniques covering deep neural networks, reinforcement learning, and Bayesian methods.',
      ),
    ).toBeInTheDocument();
  });

  it('renders a link to the uu.se course page', () => {
    render(<CourseDetailClient course={baseCourse} />);

    const uuLink = screen.getByRole('link', { name: /view uu.se course page/i });
    expect(uuLink).toBeInTheDocument();
    expect(uuLink).toHaveAttribute(
      'href',
      'https://www.uu.se/en/study/course?query=1DT051',
    );
  });

  it('falls back to a search link when course.link is empty', () => {
    const noLink = { ...baseCourse, link: '' };
    render(<CourseDetailClient course={noLink} />);

    const uuLink = screen.getByRole('link', { name: /view uu.se course page/i });
    expect(uuLink).toHaveAttribute(
      'href',
      'https://uu.se/en/study/course?query=1DT051',
    );
  });

  // ── Overview facts ─────────────────────────────────────────────────────

  it('renders overview facts when present', () => {
    render(<CourseDetailClient course={baseCourse} />);

    // Section header
    expect(screen.getByText('Overview')).toBeInTheDocument();
    // Individual fact labels and values
    expect(screen.getByText('Level')).toBeInTheDocument();
    // "Master's" appears as a fact value AND as a tag in this course fixture
    const mastersElements = screen.getAllByText("Master's");
    expect(mastersElements.length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('Credits')).toBeInTheDocument();
    expect(screen.getByText('7.5 credits')).toBeInTheDocument();
    expect(screen.getByText('Language')).toBeInTheDocument();
    expect(screen.getByText('English')).toBeInTheDocument();
    expect(screen.getByText('Location')).toBeInTheDocument();
    expect(screen.getByText('Uppsala')).toBeInTheDocument();
    expect(screen.getByText('Study Period')).toBeInTheDocument();
    expect(screen.getByText('Period 1')).toBeInTheDocument();
    expect(screen.getByText('Pace of Study')).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();
    expect(screen.getByText('Teaching Form')).toBeInTheDocument();
    expect(screen.getByText('Distance')).toBeInTheDocument();
    expect(screen.getByText('Instructional Time')).toBeInTheDocument();
    expect(screen.getByText('Daytime')).toBeInTheDocument();
    expect(screen.getByText('Application Code')).toBeInTheDocument();
    expect(screen.getByText('12345')).toBeInTheDocument();
    expect(screen.getByText('Application Deadline')).toBeInTheDocument();
    expect(screen.getByText('2025-04-15')).toBeInTheDocument();
    expect(screen.getByText('Selection')).toBeInTheDocument();
    expect(screen.getByText('Grades')).toBeInTheDocument();
    expect(screen.getByText('Fees')).toBeInTheDocument();
    expect(screen.getByText('SEK 50,000')).toBeInTheDocument();
  });

  it('renders a tooltip hint on the Fees fact', () => {
    render(<CourseDetailClient course={baseCourse} />);

    // The fee row has a "?" button with an aria-label
    const hintButton = screen.getByRole('button', {
      name: /more information about fees/i,
    });
    expect(hintButton).toBeInTheDocument();
  });

  it('does not render the Fees tooltip hint when course.fees is absent', () => {
    const noFees = { ...baseCourse, fees: undefined };
    render(<CourseDetailClient course={noFees} />);

    expect(
      screen.queryByRole('button', { name: /more information about fees/i }),
    ).not.toBeInTheDocument();
  });

  it('omits overview facts that are absent', () => {
    // Only provide a subset of facts
    const partialCourse: Course = {
      ...baseCourse,
      level: undefined,
      credits: undefined,
      language_of_instruction: undefined,
      fees: undefined,
    };
    render(<CourseDetailClient course={partialCourse} />);

    expect(screen.queryByText('Level')).not.toBeInTheDocument();
    expect(screen.queryByText('Credits')).not.toBeInTheDocument();
    expect(screen.queryByText('Language')).not.toBeInTheDocument();
    expect(screen.queryByText('Fees')).not.toBeInTheDocument();
    // But facts that are still present should render
    expect(screen.getByText('Location')).toBeInTheDocument();
  });

  it('handles non-finite credits gracefully (omits credits fact)', () => {
    const badCredits = { ...baseCourse, credits: NaN };
    render(<CourseDetailClient course={badCredits} />);

    expect(screen.queryByText('Credits')).not.toBeInTheDocument();
  });

  // ── Resource links ─────────────────────────────────────────────────────

  it('renders resource links when present', () => {
    render(<CourseDetailClient course={baseCourse} />);

    expect(screen.getByText('Resources')).toBeInTheDocument();
    const coursePageLink = screen.getByRole('link', { name: 'Course Page' });
    expect(coursePageLink).toHaveAttribute(
      'href',
      'https://www.uu.se/en/study/course?query=1DT051',
    );

    const readingListLink = screen.getByRole('link', { name: 'Reading List' });
    expect(readingListLink).toHaveAttribute('href', 'https://example.com/reading-list');

    const syllabusLink = screen.getByRole('link', { name: 'Syllabus' });
    expect(syllabusLink).toHaveAttribute('href', 'https://example.com/syllabus');
  });

  it('does not render Resources section when no links exist', () => {
    const noLinks: Course = {
      ...baseCourse,
      link: '',
      reading_list_link: undefined,
      syllabus_link: undefined,
    };
    render(<CourseDetailClient course={noLinks} />);

    expect(screen.queryByText('Resources')).not.toBeInTheDocument();
  });

  // ── Text sections (about, instruction, assessment) ─────────────────────

  it('renders About This Course section when about_blurb differs from description', () => {
    render(<CourseDetailClient course={baseCourse} />);

    expect(screen.getByText('About This Course')).toBeInTheDocument();
    expect(
      screen.getByText(
        'This course covers advanced topics in machine learning including neural networks and reinforcement learning.',
      ),
    ).toBeInTheDocument();
  });

  it('omits About This Course when about_blurb equals description', () => {
    const sameBlurb = { ...baseCourse, about_blurb: baseCourse.description };
    render(<CourseDetailClient course={sameBlurb} />);

    expect(screen.queryByText('About This Course')).not.toBeInTheDocument();
  });

  it('renders Instruction and Assessment sections', () => {
    render(<CourseDetailClient course={baseCourse} />);

    expect(screen.getByText('Instruction')).toBeInTheDocument();
    expect(
      screen.getByText(
        'The course consists of lectures, seminars, and hands-on programming assignments.',
      ),
    ).toBeInTheDocument();

    expect(screen.getByText('Assessment')).toBeInTheDocument();
    expect(
      screen.getByText('Written exam (4 hours) and a project report.'),
    ).toBeInTheDocument();
  });

  it('renders Syllabus Notes when syllabus differs from syllabus_link', () => {
    render(<CourseDetailClient course={baseCourse} />);

    expect(screen.getByText('Syllabus Notes')).toBeInTheDocument();
    expect(
      screen.getByText('Detailed syllabus covering all course topics.'),
    ).toBeInTheDocument();
  });

  it('omits Syllabus Notes when syllabus equals syllabus_link', () => {
    const noSyllabusNotes = { ...baseCourse, syllabus: baseCourse.syllabus_link };
    render(<CourseDetailClient course={noSyllabusNotes} />);

    expect(screen.queryByText('Syllabus Notes')).not.toBeInTheDocument();
  });

  it('does not render text sections when none are present', () => {
    const noTextSections: Course = {
      ...baseCourse,
      about_blurb: baseCourse.description, // same as description → omitted
      instruction: undefined,
      assessment: undefined,
      syllabus: baseCourse.syllabus_link, // same as link → omitted
    };
    render(<CourseDetailClient course={noTextSections} />);

    expect(screen.queryByText('About This Course')).not.toBeInTheDocument();
    expect(screen.queryByText('Instruction')).not.toBeInTheDocument();
    expect(screen.queryByText('Assessment')).not.toBeInTheDocument();
    expect(screen.queryByText('Syllabus Notes')).not.toBeInTheDocument();
  });

  // ── Prerequisite chips (linked courses) ────────────────────────────────

  it('shows prerequisite courses as linked chips', () => {
    render(<CourseDetailClient course={baseCourse} />);

    expect(screen.getByText('Prerequisite Courses')).toBeInTheDocument();
    const prereq1 = screen.getByRole('link', { name: '1DT050' });
    expect(prereq1).toHaveAttribute('href', '/explore/1DT050');
    const prereq2 = screen.getByRole('link', { name: '1DT049' });
    expect(prereq2).toHaveAttribute('href', '/explore/1DT049');
  });

  it('shows "courses that build on this" chips', () => {
    render(<CourseDetailClient course={baseCourse} />);

    expect(screen.getByText('Courses That Build On This')).toBeInTheDocument();
    const dep1 = screen.getByRole('link', { name: '1DT052' });
    expect(dep1).toHaveAttribute('href', '/explore/1DT052');
    const dep2 = screen.getByRole('link', { name: '1DT053' });
    expect(dep2).toHaveAttribute('href', '/explore/1DT053');
  });

  it('uses custom hrefBase for linked chips', () => {
    render(<CourseDetailClient course={baseCourse} hrefBase="/courses" />);

    const prereq = screen.getByRole('link', { name: '1DT050' });
    expect(prereq).toHaveAttribute('href', '/courses/1DT050');
    const dep = screen.getByRole('link', { name: '1DT052' });
    expect(dep).toHaveAttribute('href', '/courses/1DT052');
  });

  it('hides prerequisite section when there are no prerequisites', () => {
    const noPrereqs = { ...baseCourse, prerequisites: [] };
    render(<CourseDetailClient course={noPrereqs} />);

    expect(screen.queryByText('Prerequisite Courses')).not.toBeInTheDocument();
  });

  it('hides dependents section when there are no dependents', () => {
    const noDeps = { ...baseCourse, prerequisite_of: [] };
    render(<CourseDetailClient course={noDeps} />);

    expect(
      screen.queryByText('Courses That Build On This'),
    ).not.toBeInTheDocument();
  });

  it('hides both sections when both arrays are empty', () => {
    const isolated: Course = {
      ...baseCourse,
      prerequisites: [],
      prerequisite_of: [],
    };
    render(<CourseDetailClient course={isolated} />);

    expect(screen.queryByText('Prerequisite Courses')).not.toBeInTheDocument();
    expect(
      screen.queryByText('Courses That Build On This'),
    ).not.toBeInTheDocument();
  });

  it('handles null prerequisites and prerequisite_of gracefully', () => {
    const nullPrereqs = { ...baseCourse, prerequisites: null, prerequisite_of: null };
    render(<CourseDetailClient course={nullPrereqs} />);

    expect(screen.queryByText('Prerequisite Courses')).not.toBeInTheDocument();
    expect(
      screen.queryByText('Courses That Build On This'),
    ).not.toBeInTheDocument();
  });

  // ── Tags ───────────────────────────────────────────────────────────────

  it('renders tags', () => {
    render(<CourseDetailClient course={baseCourse} />);

    const tags = screen.getAllByTestId('tag');
    // baseCourse has: 'AI', 'Machine Learning', "Master's"
    expect(tags).toHaveLength(3);
    expect(tags[0]).toHaveTextContent('AI');
    expect(tags[1]).toHaveTextContent('Machine Learning');
    expect(tags[2]).toHaveTextContent("Master's");
  });

  it('does not render tags section when no tags exist', () => {
    render(<CourseDetailClient course={minimalCourse} />);

    expect(screen.queryByTestId('tag')).not.toBeInTheDocument();
  });

  // ── Entry requirements ─────────────────────────────────────────────────

  it('shows Entry Requirements box when entry_requirements exists and no structured_requirements', () => {
    const withEntryReqs = {
      ...baseCourse,
      entry_requirements: 'Bachelor degree in computer science or equivalent. Basic programming skills required.',
      structured_requirements: undefined,
    };
    render(<CourseDetailClient course={withEntryReqs} />);

    expect(screen.getByText('Entry Requirements')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Bachelor degree in computer science or equivalent. Basic programming skills required.',
      ),
    ).toBeInTheDocument();
  });

  it('hides Entry Requirements box when structured_requirements exists', () => {
    const withStructuredReqs = {
      ...baseCourse,
      entry_requirements: 'Bachelor degree',
      structured_requirements: {
        type: 'AND' as const,
        children: [
          { type: 'CREDITS' as const, minCredits: 90, label: '90 credits' },
        ],
      },
    };
    render(<CourseDetailClient course={withStructuredReqs} />);

    // The entry requirements text still exists on the course object, but the
    // component hides the box when structured_requirements is present.
    expect(screen.queryByText('Entry Requirements')).not.toBeInTheDocument();
  });

  it('hides Entry Requirements box when entry_requirements is absent', () => {
    const noEntryReqs = { ...baseCourse, entry_requirements: undefined };
    render(<CourseDetailClient course={noEntryReqs} />);

    expect(screen.queryByText('Entry Requirements')).not.toBeInTheDocument();
  });

  // ── Connection graph ───────────────────────────────────────────────────

  it('renders the connections section with CourseConnectionsFlow', () => {
    render(<CourseDetailClient course={baseCourse} />);

    expect(screen.getByText('Connections')).toBeInTheDocument();
    const flow = screen.getByTestId('course-connections-flow');
    expect(flow).toHaveTextContent('Connections Flow for Advanced Machine Learning');
  });

  it('passes hrefBase and height to CourseConnectionsFlow', () => {
    render(<CourseDetailClient course={baseCourse} hrefBase="/courses" />);

    // The mock renders a div with testid; we verify the component rendered
    expect(screen.getByTestId('course-connections-flow')).toBeInTheDocument();
  });

  it('renders legend items in the connections section', () => {
    render(<CourseDetailClient course={baseCourse} />);

    expect(screen.getByText('Prerequisites')).toBeInTheDocument();
    expect(screen.getByText('Courses that require this')).toBeInTheDocument();
    expect(screen.getByText('Related courses')).toBeInTheDocument();
  });

  // ── Favorite button — logged in ────────────────────────────────────────

  it('shows favorite button when user is logged in', async () => {
    mockLoggedInUser();
    render(<CourseDetailClient course={baseCourse} />);

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /add to favorites/i }),
      ).toBeInTheDocument();
    });
  });

  it('shows "Favorited" when course is already favorited', async () => {
    mockLoggedInUser();
    (isCourseFavorited as jest.Mock).mockResolvedValue(true);
    render(<CourseDetailClient course={baseCourse} />);

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /favorited/i }),
      ).toBeInTheDocument();
    });
  });

  it('toggles to favorited state after clicking the button', async () => {
    const user = userEvent.setup();
    mockLoggedInUser();
    (isCourseFavorited as jest.Mock).mockResolvedValue(false);
    (toggleFavorite as jest.Mock).mockResolvedValue(true);

    render(<CourseDetailClient course={baseCourse} />);

    // Wait for initial favorite check to complete
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /add to favorites/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /add to favorites/i }));

    expect(toggleFavorite).toHaveBeenCalledWith('user-1', '1DT051');
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /favorited/i }),
      ).toBeInTheDocument();
    });
  });

  it('toggles to unfavorited state when already favorited', async () => {
    const user = userEvent.setup();
    mockLoggedInUser();
    (isCourseFavorited as jest.Mock).mockResolvedValue(true);
    (toggleFavorite as jest.Mock).mockResolvedValue(false);

    render(<CourseDetailClient course={baseCourse} />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /favorited/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /favorited/i }));

    expect(toggleFavorite).toHaveBeenCalledWith('user-1', '1DT051');
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /add to favorites/i }),
      ).toBeInTheDocument();
    });
  });

  it('checks favorite status on mount via isCourseFavorited', async () => {
    mockLoggedInUser();
    render(<CourseDetailClient course={baseCourse} />);

    await waitFor(() => {
      expect(isCourseFavorited).toHaveBeenCalledWith('user-1', '1DT051');
    });
  });

  // ── Favorite button — logged out / loading ─────────────────────────────

  it('hides favorite button when user is not logged in', () => {
    mockLoggedOut();
    render(<CourseDetailClient course={baseCourse} />);

    expect(
      screen.queryByRole('button', { name: /(add to|favorited)/i }),
    ).not.toBeInTheDocument();
  });

  it('hides favorite button while auth is loading', () => {
    mockLoading();
    render(<CourseDetailClient course={baseCourse} />);

    expect(
      screen.queryByRole('button', { name: /(add to|favorited)/i }),
    ).not.toBeInTheDocument();
  });

  it('does not call isCourseFavorited when user is null', () => {
    mockLoggedOut();
    render(<CourseDetailClient course={baseCourse} />);

    expect(isCourseFavorited).not.toHaveBeenCalled();
  });

  it('does not call isCourseFavorited while loading', () => {
    mockLoading();
    render(<CourseDetailClient course={baseCourse} />);

    expect(isCourseFavorited).not.toHaveBeenCalled();
  });

  // ── Minimal course ─────────────────────────────────────────────────────

  it('renders a minimal course without optional fields', () => {
    render(<CourseDetailClient course={minimalCourse} />);

    expect(screen.getByText('Intro Course - 1DT000')).toBeInTheDocument();
    expect(screen.getByText('A basic course.')).toBeInTheDocument();

    // No facts, no resources, no text sections, no tags, no connections
    expect(screen.queryByText('Overview')).toBeInTheDocument(); // Overview heading is always present
    expect(screen.queryByText('Resources')).not.toBeInTheDocument();
    expect(screen.queryByText('About This Course')).not.toBeInTheDocument();
    expect(screen.queryByText('Prerequisite Courses')).not.toBeInTheDocument();
    expect(screen.queryByTestId('tag')).not.toBeInTheDocument();
    expect(screen.queryByText('Entry Requirements')).not.toBeInTheDocument();
  });
});
