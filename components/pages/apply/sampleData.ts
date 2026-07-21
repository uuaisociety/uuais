// Shared mock data for design examples (no backend).
// This data shape previews what admin-configurable "application campaigns"
// will look like once Phase 3 backend is built.

// ---------------------------------------------------------------------------
// Types — board application (legacy concept examples)
// ---------------------------------------------------------------------------

export type CustomQuestionType = 'text' | 'textarea' | 'select' | 'radio' | 'checkbox';

export interface SampleCustomQuestion {
  id: string;
  question: string;
  type: CustomQuestionType;
  options?: string[];
  required: boolean;
}

export interface SamplePosition {
  id: string;
  title: string;
  short: string;
  description: string;
  tags: string[];
  deadline: string;
  customQuestions: SampleCustomQuestion[];
}

export const COVER_LETTER_MAX_CHARS = 3500;

export const sampleCampaign = {
  title: 'Board Recruitment',
  subtitle: 'Spring General Assembly 2026',
  description: 'Apply now for our board positions ahead of the Spring General Assembly 2026. For specific clarifications, drop us a mail at contact@uuais.com.',
  deadline: '2026-05-10',
};

// ---------------------------------------------------------------------------
// Types — team application (combined concept)
// ---------------------------------------------------------------------------

export interface TeamInfo {
  id: string;
  name: string;
  description: string;
}

export interface AreaOfInterest {
  id: string;
  label: string;
}

export const teamCampaign = {
  title: 'Join Our Teams',
  subtitle: 'UU AI Society — Spring 2026',
  description:
    'We are looking for passionate students to join our teams. Whether you are a developer, a creative mind, an organiser, or a researcher — there is a place for you here. Explore our teams below and apply for the ones that excite you.',
  deadline: '2026-05-10',
};

export const SAMPLE_TEAMS: TeamInfo[] = [
  {
    id: 'it',
    name: 'IT',
    description:
      'Maintain and develop the society\'s website, technological infrastructure, and internal tools. You will work with modern web technologies and keep our digital presence running smoothly.',
  },
  {
    id: 'development',
    name: 'Development',
    description:
      'Build tech-based projects and develop ideas with a team of driven minds. From hackathon prototypes to production tools — this team turns ideas into working software.',
  },
  {
    id: 'growth',
    name: 'Growth',
    description:
      'Organise workshops, seminars, and community events. Manage marketing through social media and other outlets. This team drives our community engagement and visibility.',
  },
  {
    id: 'partnerships_events',
    name: 'Partnerships & Events',
    description:
      'Plan and coordinate events, foster communication with partner organisations, and build relationships with companies and sponsors that support our society.',
  },
  {
    id: 'research',
    name: 'Research',
    description:
      'Explore cutting-edge AI research and bring academic perspectives to the society. Write blog posts, host reading groups, and connect the society with the latest developments in AI.',
  },
];

export const UU_PROGRAMMES: string[] = [
  'Computer Science (BSc)',
  'Information Technology (BSc)',
  'Mathematics (BSc)',
  'Physics (BSc)',
  'Data Science (MSc)',
  'Computational Science (MSc)',
  'Engineering Physics (MSc)',
  'Industrial Engineering and Management (MSc)',
  'Molecular Biotechnology (MSc)',
  'Sociotechnical Systems Engineering (MSc)',
  'Biomedicine (BSc)',
  'Sustainable Development (MSc)',
  'Economics (BSc)',
  'Business and Economics (BSc)',
  'Law (LLM)',
  'Psychology (BSc)',
  'Political Science (BSc)',
  'Sociology (BSc)',
  'Media and Communication Studies (BSc)',
  'Other',
];

export const AREAS_OF_INTEREST: AreaOfInterest[] = [
  { id: 'robotics', label: 'Robotics' },
  { id: 'data_science', label: 'Data Science' },
  { id: 'nlp', label: 'Natural Language Processing' },
  { id: 'computer_vision', label: 'Computer Vision' },
  { id: 'reinforcement_learning', label: 'Reinforcement Learning' },
  { id: 'ai_ethics', label: 'AI Ethics & Fairness' },
  { id: 'generative_ai', label: 'Generative AI' },
  { id: 'ml_engineering', label: 'Machine Learning Engineering' },
];

// Mock profile — simulates a logged-in user with profile data to prefill.
// In Phase 3, this will come from auth.onAuthStateChanged + getUserProfile().
export const mockProfile = {
  displayName: 'Alex Doe',
  name: 'Alexander Doe',
  email: 'alex.doe.1234@student.uu.se',
  gender: 'other',
  university: 'Uppsala',
  program: 'Data Science (MSc)',
  expectedGraduationYear: 2027,
  linkedin: 'https://linkedin.com/in/alexdoe',
};

export const MOTIVATION_MAX_CHARS = 1500;

export const samplePositions: SamplePosition[] = [
  {
    id: 'chairman',
    title: 'Chairman of the Board',
    short: 'Deadline: May 10, 2026',
    deadline: '2026-05-10',
    tags: ['Leadership', 'External'],
    description:
      'Responsible for overall leadership, meeting facilitation, mentorship, and representing UU AI Society to internal and external stakeholders. The Chairman sets the strategic direction and ensures the society runs smoothly throughout the academic year.',
    customQuestions: [],
  },
  {
    id: 'vice-chairman',
    title: 'Vice Chairman of the Board',
    short: 'Deadline: May 10, 2026',
    deadline: '2026-05-10',
    tags: ['Leadership', 'Coordination'],
    description:
      'Second-highest management role, for technical coordination, decision-making and mentorship of the board members and members in UU AI Society.',
    customQuestions: [],
  },
  {
    id: 'head-of-internal-it',
    title: 'Head of Internal IT',
    short: 'Deadline: May 10, 2026',
    deadline: '2026-05-10',
    tags: ['IT', 'Infrastructure'],
    description:
      'Management of IT services of UU AI Society, such as the website and technological assets.',
    customQuestions: [
      {
        id: 'it-experience',
        question: 'Describe your experience with web development and server infrastructure.',
        type: 'textarea',
        required: true,
      },
      {
        id: 'it-stack',
        question: 'Which technologies are you most comfortable with?',
        type: 'checkbox',
        options: ['React/Next.js', 'Firebase', 'Node.js', 'Python', 'Docker', 'Other'],
        required: false,
      },
    ],
  },
  {
    id: 'head-of-dev',
    title: 'Head of Development',
    short: 'Deadline: May 10, 2026',
    deadline: '2026-05-10',
    tags: ['Dev', 'Projects'],
    description:
      'Managing development, and a team of driven minds to develop ideas for tech-based projects built at UU AI Society.',
    customQuestions: [
      {
        id: 'dev-projects',
        question: 'What project idea would you bring to the society in your first semester?',
        type: 'textarea',
        required: true,
      },
      {
        id: 'dev-team-size',
        question: 'How many people have you led on a project team before?',
        type: 'select',
        options: ['1-3', '4-6', '7-10', '10+'],
        required: false,
      },
    ],
  },
  {
    id: 'head-of-partnerships',
    title: 'Head of Partnerships & Events',
    short: 'Deadline: May 10, 2026',
    deadline: '2026-05-10',
    tags: ['Events', 'Outreach'],
    description:
      'As Head of Partnerships & Events, you are in charge of planning and coordinating events, along with fostering communication and collaborating with partner organizations.',
    customQuestions: [
      {
        id: 'events-experience',
        question: 'What is the largest event you have organized or co-organized?',
        type: 'radio',
        options: ['Under 50 attendees', '50-200 attendees', '200+ attendees', 'No event experience'],
        required: true,
      },
    ],
  },
  {
    id: 'head-of-growth',
    title: 'Head of Growth',
    short: 'Deadline: May 10, 2026',
    deadline: '2026-05-10',
    tags: ['Marketing', 'Community'],
    description:
      'Organizing workshops, seminars, talks and community events by UU AI Society. You shall also manage marketing through social media and other outlets, along with communication with participants and visitors.',
    customQuestions: [],
  },
];

// ---------------------------------------------------------------------------
// Admin mock data — campaigns + submissions
// ---------------------------------------------------------------------------

export type CampaignStatus = 'open' | 'closed' | 'draft';

export interface AdminCampaign {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  deadline: string;
  status: CampaignStatus;
  teamIds: string[];
  customQuestionCount: number;
  submissionCount: number;
  createdAt: string;
}

export interface AdminSubmission {
  id: string;
  campaignId: string;
  name: string;
  email: string;
  program: string;
  graduationYear: string;
  linkedin: string;
  interests: string[];
  teamRanking: string[];
  weeklyHours: number;
  motivation: string;
  customAnswers: Record<string, string>;
  submittedAt: string;
}

export interface AdminCampaignQuestion {
  id: string;
  campaignId: string;
  question: string;
  type: CustomQuestionType;
  options?: string[];
  required: boolean;
  order: number;
}

export const adminCampaigns: AdminCampaign[] = [
  {
    id: 'spring2026',
    title: 'Spring 2026 Recruitment',
    subtitle: 'UU AI Society — Spring 2026',
    description: 'Main yearly recruitment drive for all society teams.',
    deadline: '2026-05-10',
    status: 'open',
    teamIds: ['it', 'development', 'growth', 'partnerships_events', 'research'],
    customQuestionCount: 2,
    submissionCount: 47,
    createdAt: '2026-02-01',
  },
  {
    id: 'autumn2025',
    title: 'Autumn 2025 Recruitment',
    subtitle: 'UU AI Society — Autumn 2025',
    description: 'Autumn recruitment drive, now closed.',
    deadline: '2025-10-15',
    status: 'closed',
    teamIds: ['it', 'development', 'growth'],
    customQuestionCount: 0,
    submissionCount: 23,
    createdAt: '2025-08-15',
  },
  {
    id: 'research-summer2026',
    title: 'Research Team Summer Intake',
    subtitle: 'Specialised intake — Research team only',
    description: 'Targeted intake for students interested in producing AI research content.',
    deadline: '2026-06-01',
    status: 'draft',
    teamIds: ['research'],
    customQuestionCount: 4,
    submissionCount: 0,
    createdAt: '2026-04-20',
  },
];

export const adminSubmissions: AdminSubmission[] = [
  {
    id: 's1',
    campaignId: 'spring2026',
    name: 'Alex Doe',
    email: 'alex.doe.1234@student.uu.se',
    program: 'Data Science (MSc)',
    graduationYear: '2027',
    linkedin: 'https://linkedin.com/in/alexdoe',
    interests: ['robotics', 'data_science', 'generative_ai'],
    teamRanking: ['development', 'it', 'research'],
    weeklyHours: 8,
    motivation:
      'Excited to contribute to the AI community at Uppsala and grow alongside passionate peers. My background in data science and my interest in generative AI tools would let me hit the ground running.',
    customAnswers: {
      'portfolio': 'https://github.com/alexdoe',
      'project-idea': 'Build an AI-powered course recommendation tool for UU students.',
    },
    submittedAt: '2026-04-12',
  },
  {
    id: 's2',
    campaignId: 'spring2026',
    name: 'Maria Lind',
    email: 'maria.lind.5678@student.uu.se',
    program: 'Computer Science (BSc)',
    graduationYear: '2028',
    linkedin: 'https://linkedin.com/in/marialind',
    interests: ['nlp', 'ai_ethics'],
    teamRanking: ['growth', 'partnerships_events'],
    weeklyHours: 5,
    motivation: 'I want to help organise events that bring AI researchers and students together.',
    customAnswers: { 'portfolio': '', 'project-idea': '' },
    submittedAt: '2026-04-14',
  },
  {
    id: 's3',
    campaignId: 'spring2026',
    name: 'Jonas Berg',
    email: 'jonas.berg.9012@student.uu.se',
    program: 'Engineering Physics (MSc)',
    graduationYear: '2026',
    linkedin: 'https://linkedin.com/in/jonasberg',
    interests: ['reinforcement_learning', 'ml_engineering'],
    teamRanking: ['research', 'development', 'it', 'partnerships_events'],
    weeklyHours: 12,
    motivation:
      'As an engineering physics student with an interest in RL, I want to apply my skills to real-world AI projects and connect with researchers in the field.',
    customAnswers: {
      'portfolio': 'https://github.com/jonasb',
      'project-idea': 'Reinforcement learning sandbox for optimising campus bus routes.',
    },
    submittedAt: '2026-04-15',
  },
];

export const adminCampaignQuestions: AdminCampaignQuestion[] = [
  {
    id: 'portfolio',
    campaignId: 'spring2026',
    question: 'Portfolio URL (GitHub, personal website, etc.)',
    type: 'text',
    required: false,
    order: 1,
  },
  {
    id: 'project-idea',
    campaignId: 'spring2026',
    question: 'What project idea would you bring to the society in your first semester?',
    type: 'textarea',
    required: true,
    order: 2,
  },
];

export const STANDARD_FIELDS_CATALOG = [
  { id: 'name', label: 'Full name', defaultRequired: true },
  { id: 'email', label: 'Email', defaultRequired: true },
  { id: 'gender', label: 'Gender', defaultRequired: false },
  { id: 'university', label: 'University', defaultRequired: true },
  { id: 'program', label: 'Programme', defaultRequired: true },
  { id: 'graduationYear', label: 'Expected graduation year', defaultRequired: false },
  { id: 'linkedin', label: 'LinkedIn URL', defaultRequired: true },
  { id: 'resume', label: 'Resume / CV upload', defaultRequired: false },
  { id: 'interests', label: 'Areas of interest', defaultRequired: false },
  { id: 'teamRanking', label: 'Team preference ranking', defaultRequired: true },
  { id: 'weeklyHours', label: 'Weekly availability', defaultRequired: true },
  { id: 'motivation', label: 'Personal motivation', defaultRequired: true },
] as const;