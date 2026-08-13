export const defaultAppState = {
  events: [],
  eventsLoaded: true,
  teamMembers: [],
  blogPosts: [],
  faqs: [],
  jobs: [],
  boardPositions: [],
  applicants: [],
  campaigns: [],
  campaignsLoaded: false,
  teamApplications: [],
  registrationQuestions: [],
  showcaseProjects: [],
  isLoading: false,
  error: null,
}

export function createMockCourse(overrides: Record<string, unknown> = {}) {
  return {
    id: 'course-1',
    title: 'Advanced Machine Learning',
    code: 'ML501',
    link: '',
    description: 'Deep dive into machine learning',
    Learning_outcomes: '',
    tags: ['AI', 'Machine Learning'],
    relatedCourses: [] as string[],
    level: "Master's",
    credits: 10,
    language_of_instruction: 'English',
    pace_of_study: 'Full-time',
    location: 'Uppsala',
    study_period: 'Autumn 2026',
    fees: 'SEK 0',
    application_code: 'UU-12345',
    application_deadline: '2026-04-15',
    selection: 'Grades',
    instructional_time: 'Daytime',
    teaching_form: 'On-campus',
    about_blurb: 'About this course',
    instruction: 'Lectures and seminars',
    assessment: 'Written exam',
    syllabus: 'Syllabus notes',
    reading_list_link: 'https://example.com/reading',
    syllabus_link: 'https://example.com/syllabus',
    entry_requirements: 'Basic math',
    prerequisites: ['course-0'],
    prerequisite_of: ['course-2'],
    ...overrides,
  }
}

export function createMockEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: 'event-1',
    title: 'Test Event',
    description: 'Test description',
    location: 'Room 101',
    image: '/test.jpg',
    category: 'workshop',
    status: 'upcoming',
    registrationRequired: false,
    maxCapacity: 100,
    currentRegistrations: 50,
    published: true,
    eventStartAt: '2030-06-15T18:00:00Z',
    registrationClosesAt: '2030-06-14T23:59:00Z',
    ...overrides,
  }
}

export function createMockBlogPost(overrides: Record<string, unknown> = {}) {
  return {
    id: 'post-1',
    title: 'Test Article',
    author: 'Alice',
    date: '2026-01-15',
    tags: ['AI', 'ML'],
    excerpt: 'An excerpt about AI',
    image: '/test.jpg',
    content: '<p>HTML content</p>',
    published: true,
    ...overrides,
  }
}

export function createMockTeamMember(overrides: Record<string, unknown> = {}) {
  return {
    id: 'member-1',
    name: 'Alice Smith',
    position: 'Developer',
    teams: ['board'],
    published: true,
    ...overrides,
  }
}

export function createMockJob(overrides: Record<string, unknown> = {}) {
  return {
    id: 'job-1',
    title: 'Software Engineer',
    company: 'Tech AB',
    location: 'Uppsala',
    description: 'Build cool stuff',
    type: 'job',
    published: true,
    tags: ['Python', 'React'],
    applyUrl: 'https://example.com/apply',
    ...overrides,
  }
}
