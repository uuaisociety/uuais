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
  'BSc in Archaeology and Ancient History',
  'BSc in Archaeology and Osteology',
  'BSc in Behavioural Sciences',
  'BSc in Biology/Molecular Biology',
  'BSc in Biomedical Engineering',
  'BSc in Building Conservation',
  'BSc in Business and Economics',
  'BSc in Chemistry',
  'BSc in Computer Science',
  'BSc in Construction Engineering',
  'BSc in Culture, Society and Ethnography',
  'BSc in Digital Business Development',
  'BSc in Earth Science',
  'BSc in Earth Science (Including Preparatory Course in Bioscience)',
  'BSc in Education with a Focus on Children and Youth',
  'BSc in Egyptology',
  'BSc in Electrical Engineering',
  'BSc in Energy Transition – Sustainability and Leadership',
  'BSc in Foodservice and Nutrition',
  'BSc in Game Design and Graphics',
  'BSc in Game Design and Level Design',
  'BSc in Game Design and Programming',
  'BSc in Game Design and Project Management',
  'BSc in Global English Studies',
  'BSc in Historical Sciences',
  'BSc in Holocaust and Genocide Studies',
  'BSc in Human Resource Management and Working Life',
  'BSc in Information Systems – Game Design',
  'BSc in Information Systems – Software Engineering',
  'BSc in Information Systems – Systems Development',
  'BSc in Land Management',
  'BSc in Languages',
  'BSc in Leadership – Quality Management – Improvement',
  'BSc in Leadership – Quality Management – Improvement (Distance)',
  'BSc in Literature',
  'BSc in Mathematics',
  'BSc in Mechanical Engineering',
  'BSc in Media, Communication and Journalism Studies',
  'BSc in Musicology',
  'BSc in Nordic Studies',
  'BSc in Nuclear Engineering',
  'BSc in Objects Conservation',
  'BSc in Peace and Development Studies',
  'BSc in Pharmacy',
  'BSc in Physics – Astronomy',
  'BSc in Physics – Geophysics',
  'BSc in Physics – Meteorology and Climate Physics',
  'BSc in Physics – Physics',
  'BSc in Political Science',
  'BSc in Religious Studies',
  'BSc in Rhetoric',
  'BSc in Social Sciences',
  'BSc in Social Sustainability',
  'BSc in Sociology',
  'BSc in Theology – Christianity: Past and Present',
  'BSc in Theology – Islam: Past and Present',
  'BSc in Urban and Regional Planning',
  'Biomedical Laboratory Science Programme',
  'Biomedicine Programme',
  'Bridging Teacher Education Programme – Secondary Education',
  'Bridging Teacher Education Programme – Secondary Education (Condensed Course)',
  'Bridging Teacher Education Programme – Upper Secondary Education',
  'Bridging Teacher Education Programme – Upper Secondary Education (Condensed Course)',
  'Complementary Programme for Biomedical Laboratory Scientists with a Foreign Degree',
  'Complementary Programme for Pharmacists with a Foreign Degree',
  'Complementary Programme for Psychologists with a Foreign Degree',
  'Dietetics Programme',
  'International MSc in Innovative Medicine',
  'Joint Nordic MSc in Environmental Law',
  'Law Programme',
  'MSc in Accounting and Financial Management – Accounting, Governance and Financial Analysis',
  'MSc in Accounting and Financial Management – Strategic Management Control',
  'MSc in Aesthetics',
  'MSc in All-Electric Propulsion Systems',
  'MSc in Analytical Chemistry – EACH',
  'MSc in Archaeology',
  'MSc in Archive, Library and Museum Studies – Archival Science',
  'MSc in Archive, Library and Museum Studies – Library and Information Science',
  'MSc in Archive, Library and Museum Studies – Museum and Cultural Heritage Studies',
  'MSc in Art History',
  'MSc in Battery Technology and Energy Storage',
  'MSc in Bioinformatics – Biology Background',
  'MSc in Bioinformatics – Computer Science Background',
  'MSc in Biology – Cell and Molecular Biology',
  'MSc in Biology – Ecology and Conservation',
  'MSc in Biology – Ecosystems and Aquatic Ecology',
  'MSc in Biology – Environmental Toxicology',
  'MSc in Biology – Evolutionary Biology',
  'MSc in Biology – Immunology and Microbiology',
  'MSc in Biology – NABiS – Nordic Master in Biodiversity and Systematics',
  'MSc in Biomedical Laboratory Science',
  'MSc in Biomedicine',
  'MSc in Biopharmaceuticals',
  'MSc in Business and Management – Entrepreneurship',
  'MSc in Business and Management – International Business',
  'MSc in Business and Management – Marketing',
  'MSc in Business and Management – Organisation',
  'MSc in Chemical Engineering',
  'MSc in Chemistry – Analytical Chemistry',
  'MSc in Chemistry – Bio and Nano Materials',
  'MSc in Chemistry – Biochemistry',
  'MSc in Chemistry – Chemical Biology',
  'MSc in Chemistry – Chemistry for Renewable Energy',
  'MSc in Chemistry – Organic Chemistry',
  'MSc in Chemistry – Physical and Computational Chemistry',
  'MSc in Classical Archaeology and Ancient History',
  'MSc in Clinical Pharmacy',
  'MSc in Computer Science',
  'MSc in Computer and Information Engineering',
  'MSc in Cultural Anthropology',
  'MSc in Cultural Heritage and Sustainability',
  'MSc in Data Science – Data Engineering',
  'MSc in Data Science – Image Analysis and Machine Learning',
  'MSc in Data Science – Machine Learning and Statistics',
  'MSc in Digital Art History',
  'MSc in Digital Humanities',
  'MSc in Digital Media and Society',
  'MSc in Drug Discovery and Development',
  'MSc in Drug Management',
  'MSc in Earth Science – Geology',
  'MSc in Earth Science – Hydrology/Hydrogeology',
  'MSc in Earth Science – Palaeobiology',
  'MSc in Earth Science – Physical Geography',
  'MSc in Economics',
  'MSc in Educational Management',
  'MSc in Educational Sciences – Child and Youth Studies',
  'MSc in Educational Sciences – Curriculum Studies',
  'MSc in Educational Sciences – Education',
  'MSc in Educational Sciences – Sociology of Education',
  'MSc in Educational Sciences – Special Education',
  'MSc in Egyptology',
  'MSc in Electrical Engineering',
  'MSc in Embedded Systems',
  'MSc in Energy Systems Engineering',
  'MSc in Engineering Mathematics',
  'MSc in Engineering Physics',
  'MSc in English – American Literature and Culture',
  'MSc in English – English Linguistics',
  'MSc in English – English Literature',
  'MSc in Environmental and Water Engineering',
  'MSc in Ethnology and Folkloristics',
  'MSc in Euroculture',
  'MSc in Evolutionary Biology – MEME',
  'MSc in Experimental Game Design and Development',
  'MSc in Forensic Science',
  'MSc in Game Design',
  'MSc in Gender Studies',
  'MSc in Global Environmental History',
  'MSc in Global Health',
  'MSc in Global Markets, Local Creativities',
  'MSc in History of Science and Ideas',
  'MSc in Holocaust and Genocide Studies',
  'MSc in Human Geography',
  'MSc in Human Rights',
  'MSc in Humanitarian Action and Conflict',
  'MSc in Human–Computer Interaction',
  'MSc in Implementation, Transformative Learning and Sustainability',
  'MSc in Industrial Engineering and Management',
  'MSc in Industrial Management and Innovation',
  'MSc in Infection Biology',
  'MSc in Information Systems',
  'MSc in International Humanitarian Action',
  'MSc in Investment Treaty Arbitration',
  'MSc in Language Technology',
  'MSc in Languages – Chinese',
  'MSc in Languages – Finno-Ugric Languages',
  'MSc in Languages – General Linguistics',
  'MSc in Languages – German',
  'MSc in Languages – Greek and Byzantine Studies',
  'MSc in Languages – Romance Languages',
  'MSc in Languages – Slavic Languages',
  'MSc in Languages – Turkic Languages',
  'MSc in Law for Social Work',
  'MSc in Literature',
  'MSc in Management, Communication and IT',
  'MSc in Materials Engineering',
  'MSc in Materials Science',
  'MSc in Mathematics',
  'MSc in Medical Nuclide Techniques',
  'MSc in Medical Research',
  'MSc in Molecular Biotechnology Engineering',
  'MSc in Molecular Medicine',
  'MSc in Musicology',
  'MSc in Palaeobiology – PANGEA',
  'MSc in Peace and Conflict Studies',
  'MSc in Pharmaceutical Modelling',
  'MSc in Pharmacy',
  'MSc in Philosophy',
  'MSc in Physics – Astronomy and Space Physics',
  'MSc in Physics – Geophysics',
  'MSc in Physics – Mathematical Physics',
  'MSc in Physics – Meteorology and Climate Physics',
  'MSc in Physics – Nuclear and Particle Physics',
  'MSc in Physics – Physics of Sustainable Energy and Complex Systems',
  'MSc in Physics – Theoretical Physics: Quantum Fields and Strings',
  'MSc in Political Science',
  'MSc in Precision Medicine',
  'MSc in Psychology',
  'MSc in Public Health',
  'MSc in Quantum Technology',
  'MSc in Religion and European Public Life',
  'MSc in Religion in Peace and Conflict',
  'MSc in Renewable Electricity Production',
  'MSc in Rhetoric',
  'MSc in Russian and Eurasian Studies',
  'MSc in Scandinavian Studies',
  'MSc in Social Work',
  'MSc in Sociology',
  'MSc in Sociology of Education',
  'MSc in Sociotechnical Systems Engineering',
  'MSc in Statistics and Data Science',
  'MSc in Sustainable Development',
  'MSc in Sustainable Development of Coastal Areas',
  'MSc in Sustainable Management',
  'MSc in Sustainable and Innovative Natural Resource Management – SINReM',
  'MSc in Swedish – Multilingualism and Swedish as a Second Language',
  'MSc in Swedish – Swedish and Scandinavian Languages',
  'MSc in Theology and Religious Studies – Biblical Studies',
  'MSc in Theology and Religious Studies – Church History and Mission History',
  'MSc in Theology and Religious Studies – Ethics and Philosophy of Religion',
  'MSc in Theology and Religious Studies – General',
  'MSc in Theology and Religious Studies – History of Religions and World Christianity',
  'MSc in Theology and Religious Studies – Social Sciences of Religion and Practical Theology',
  'MSc in Theology and Religious Studies – Systematic Theology',
  'MSc in Transformative Game Design',
  'MSc in Turkic Studies',
  'MSc in Wind Power Project Management',
  'Medicine Programme',
  'Midwifery Programme',
  'Nursing Programme',
  'Occupational Therapy Programme',
  'Open BSc in the Humanities',
  'Physiotherapy Programme',
  'Preschool Teacher Education Programme',
  'Primary School Teacher Education Programme – Primary Education – Pre-School and School Years 1-3',
  'Primary School Teacher Education Programme – Primary Education – School Years 4-6',
  'Psychology Programme',
  'Psychotherapy Programme',
  'Radiography Programme',
  'Science and Technology Foundation Semester Programme – Reserved Place on a BSc in Engineering, 20 weeks (BASTN)',
  'Science and Technology Foundation Semester Programme – Reserved Place on a MSc in Engineering, 20 weeks (BASTN)',
  'Science and Technology Foundation Semester Programme – Reserved Place on the BSc in Biology, Chemistry or Earth Science, 20 weeks (BASTN)',
  'Science and Technology Foundation Semester Programme – Reserved Place on the BSc in Computer Science, Physics or Mathematics, 20 weeks (BASTN)',
  'Science and Technology Foundation Year Programme – Reserved Place on a BSc in Engineering, 40 weeks (BASAR)',
  'Science and Technology Foundation Year Programme – Reserved Place on a BSc in Natural Sciences, 40 weeks (BASAR)',
  'Science and Technology Foundation Year Programme – Reserved Place on a MSc in Engineering, 40 weeks (BASAR)',
  'Science and Technology Foundation Year Programme – Reserved Place on the Teacher Education Programme, Mathematics, Technology or Natural Science Subjects, 40 weeks (BASAR)',
  'Social Work Programme',
  'Special Needs Teacher Education Programme – The Development of Language, Writing and Reading',
  'Special Needs Teacher Education Programme – The Development of Language, Writing and Reading - Included in the Teacher Initiative',
  'Specialist Nursing Programme – Anaesthesia Care',
  'Specialist Nursing Programme – Diabetes Care',
  'Specialist Nursing Programme – Emergency Care',
  'Specialist Nursing Programme – Intensive Care',
  'Specialist Nursing Programme – Mental Health Care',
  'Specialist Nursing Programme – Oncology Care',
  'Specialist Nursing Programme – Paediatric Care',
  'Specialist Nursing Programme – Pre-Hospital Emergency Care',
  'Specialist Nursing Programme – Primary Health Care',
  'Specialist Nursing Programme – Surgical Care',
  'Specialist Nursing Programme – Theatre Care',
  'Speech and Language Pathology Programme',
  'The Uppsala Culture and Society Programme',
  'Upper Secondary School Teacher Education Programme – Biology',
  'Upper Secondary School Teacher Education Programme – Chemistry',
  'Upper Secondary School Teacher Education Programme – Chemistry and Biology',
  'Upper Secondary School Teacher Education Programme – English',
  'Upper Secondary School Teacher Education Programme – French',
  'Upper Secondary School Teacher Education Programme – German',
  'Upper Secondary School Teacher Education Programme – History',
  'Upper Secondary School Teacher Education Programme – Mathematics',
  'Upper Secondary School Teacher Education Programme – Physics and Mathematics',
  'Upper Secondary School Teacher Education Programme – Religion',
  'Upper Secondary School Teacher Education Programme – Social Studies',
  'Upper Secondary School Teacher Education Programme – Spanish',
  'Upper Secondary School Teacher Education Programme – Swedish',
  'Upper Secondary School Teacher Education Programme – Swedish as a Second Language',
  'Upper Secondary School Teacher Education Programme – Technology and Mathematics',
  'Other',
];



export const AREAS_OF_INTEREST: AreaOfInterest[] = [
  { id: 'data_science', label: 'Data Science & Big Data' },
  { id: 'nlp', label: 'Natural Language Processing & LLMs' },
  { id: 'computer_vision', label: 'Computer Vision & VLM' },
  { id: 'ai_ethics', label: 'AI Ethics & Fairness' },
  { id: 'robotics', label: 'AI Research & Theoretical ML' },
  { id: 'ml_engineering', label: 'Machine Learning Engineering' },
  { id: 'agent_orch', label: 'Agent Orchestration'},
  { id: 'creative', label: 'Creative AI usage'},
  { id: 'startups', label: 'Startups'},
  { id: 'cyber', label: 'Cybersecurity & AI Safety'}
];

// Mock profile — simulates a logged-in user with profile data to prefill.
// In Phase 3, this will come from auth.onAuthStateChanged + getUserProfile().
export const mockProfile = {
  displayName: 'Alex Doe',
  name: 'Alexander Doe',
  email: 'alex.doe.1234@student.uu.se',
  gender: 'other',
  university: 'Uppsala',
  program: 'MSc in Data Science – Machine Learning and Statistics',
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
    program: 'MSc in Data Science – Machine Learning and Statistics',
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
    program: 'MSc in Computer Science',
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
    program: 'MSc in Physics – Theoretical Physics: Quantum Fields and Strings',
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
  { id: 'program', label: 'Program', defaultRequired: true },
  { id: 'graduationYear', label: 'Expected graduation year', defaultRequired: false },
  { id: 'linkedin', label: 'LinkedIn URL', defaultRequired: true },
  { id: 'resume', label: 'Resume / CV upload', defaultRequired: false },
  { id: 'interests', label: 'Areas of interest', defaultRequired: false },
  { id: 'teamRanking', label: 'Team preference ranking', defaultRequired: true },
  { id: 'weeklyHours', label: 'Weekly availability', defaultRequired: true },
  { id: 'motivation', label: 'Personal motivation', defaultRequired: true },
] as const;