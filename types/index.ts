import { Timestamp } from 'firebase/firestore';

export interface AIChat {
  id: string;
  userId: string;
  title: string;
  messages: { role: 'user' | 'assistant'; content: string; timestamp: string; recommendations?: string[] }[];
  recommendedCourseIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CourseFavorite {
  courseId: string;
  userId: string;
  createdAt: string;
}

export interface CourseCategory {
  id: string;
  userId: string;
  name: string;
  color?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AISettings {
  systemPrompt: string;
  model: string;
  apiProvider: 'moonshot' | 'openrouter';
  costPer1kTokensUsd: number;
  rateLimitRequestsPerDay: number;
  maxTokensPerRequest: number;
  maxConversationHistory: number;
  maxStoredChatsPerUser: number;
  updatedAt: string;
  updatedBy: string;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  location: string;
  image: string;
  category: 'workshop' | 'guest_lecture' | 'hackathon' | 'other';
  status: 'upcoming' | 'past';
  registrationRequired: boolean;
  maxCapacity?: number;
  currentRegistrations?: number;
  published?: boolean;
  /** ISO datetime when the event starts (IRL start). */
  eventStartAt: string;
  /** ISO datetime when normal registrations close (optional). */
  registrationClosesAt?: string;
  /** ISO datetime when the event should start being published/visible (optional, UI-driven; rules may still use `published`). */
  publishAt?: string;
  /** Optional third-party registration page (https URL). Shown on the event detail page when set. */
  externalRegistrationUrl?: string;
  /** If true, only signed-in users can open the external registration link; others see a disabled control. */
  externalRegistrationMembersOnly?: boolean;
  /** Optional Google Form (or other) URL for post-event feedback collection. */
  feedbackFormUrl?: string;
  attendees?: {
    userId: string;
    attended: boolean | null;
    timestamp: number | null;
  }[];
}

export type TeamCategory = 'board' | 'development' | 'it' | 'growth' | 'partnerships_events' | 'founders' | 'alumni';

export const TEAM_CATEGORIES: TeamCategory[] = [
  'board',
  'development',
  'it',
  'growth',
  'partnerships_events',
  'founders',
  'alumni',
];

export const TEAM_CATEGORY_LABELS: Record<TeamCategory, string> = {
  board: 'Board',
  development: 'Development',
  it: 'IT',
  growth: 'Growth',
  partnerships_events: 'Partnerships & Events',
  founders: 'Founders',
  alumni: 'Alumni',
};

export interface TeamMember {
  id: string;
  name: string;
  position: string;
  bio?: string;
  image?: string;
  linkedin?: string;
  twitter?: string;
  email?: string;
  github?: string;
  personalEmail?: string;
  companyEmail?: string;
  website?: string;
  published?: boolean;
  teams?: TeamCategory[];
  order?: number;
  years?: number[];
  badge?: string;
  notes?: string;
}

export interface BlogSourceItem {
  title: string;
  url: string;
}

export interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  author: string;
  date: string;
  image: string;
  tags: string[];
  published: boolean;
  /** Which stream this post belongs to. Missing/undefined = human-written editorial from the growth team. */
  authorType?: 'human' | 'ai';
  /** Source links cited in AI-generated posts (shown at the bottom of the article). */
  sources?: BlogSourceItem[];
  /** Events referenced by the post (recaps/previews) — enables event <-> blog cross-linking. */
  relatedEventIds?: string[];
  /** Model used to generate an AI post (transparency). */
  aiModel?: string;
  /** Display name of the admin who reviewed/published an AI post. */
  reviewedBy?: string;
  /** URL-safe identifier for /blog/[slug]. Fallback to `id` when absent. */
  slug?: string;
  /** Full model reasoning captured during generation (AI posts only). */
  reasoningTrace?: string;
  /** Admin-pinned hero article. When unset, the newest post is featured. */
  featured?: boolean;
}

export type ShowcaseCategory = 'app' | 'website' | 'github' | 'model' | 'video' | 'research' | 'demo' | 'other';

export const SHOWCASE_CATEGORIES: ShowcaseCategory[] = [
  'app',
  'website',
  'github',
  'model',
  'video',
  'research',
  'demo',
  'other',
];

export const SHOWCASE_CATEGORY_LABELS: Record<ShowcaseCategory, string> = {
  app: 'Apps',
  website: 'Websites',
  github: 'Open Source',
  model: 'Models',
  video: 'Videos',
  research: 'Research',
  demo: 'Demos',
  other: 'Other',
};

/** Showcase submission limits, shared by the form, the submit validation, and (by hand) the Firestore rules. */
export const SHOWCASE_LIMITS = {
  title: 80,
  description: 600,
  details: 4000,
  link: 500,
  tag: 30,
  tagCount: 5,
} as const;

export interface ShowcaseProject {
  id: string;
  /** URL-safe segment derived from the title; falls back to `id` on older records. */
  slug?: string;
  title: string;
  description: string;
  /** Optional long-form write-up shown on the project page, as plain paragraphs. */
  details?: string;
  category: ShowcaseCategory;
  creatorUserId: string;
  creatorName: string;
  links: { github?: string; website?: string; demo?: string; video?: string };
  coverImage?: string;
  coverImagePath?: string;
  tags: string[];
  votes: number;
  published: boolean;
  featured: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface JoinFormData {
  firstName: string;
  lastName: string;
  email: string;
  studentId: string;
  university: string;
  major: string;
  year: string;
  experience: string;
  interests: string[];
  motivation: string;
  portfolio?: string;
  linkedin?: string;
}

export interface ContactFormData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export interface NewsletterData {
  email: string;
}

export interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
  order: number;
  published: boolean;
}

export interface RegistrationQuestion {
  id: string;
  question: string;
  type: 'text' | 'textarea' | 'select' | 'checkbox' | 'radio';
  options?: string[];
  required: boolean;
  order: number;
  eventTypes: string[];
}

export interface EventRegistration {
  id: string;
  eventId: string;
  userId: string;
  registrationData: Record<string, string | number | boolean | string[]>;
  registeredAt: string;
  status: 'registered' | 'waitlist' | 'invited' | 'confirmed' | 'declined' | 'cancelled';
  userName?: string | null;
  userEmail?: string | null;
  selectedAt?: string | null;
  confirmedAt?: string | null;
  confirmationToken?: string | null;
}

export interface EventCustomQuestion {
  id: string;
  eventId: string;
  question: string;
  type: 'text' | 'textarea' | 'select' | 'checkbox' | 'radio';
  options?: string[];
  required: boolean;
  order: number;
}

export type JobType = 'startup' | 'internship' | 'master_thesis' | 'job' | 'other';

export interface Job {
  id: string;
  type: JobType;
  title: string;
  company: string;
  location?: string;
  description: string;
  applyUrl?: string;
  applyEmail?: string;
  tags?: string[];
  published: boolean;
  createdAt?: Timestamp; // ISO string for client convenience
}

export interface BoardPosition {
  id: string;
  title: string;
  short: string;
  description: string;
  order: number;
}

export interface Application {
  id: string;
  name: string;
  email: string;
  /** normalized lowercased email used for server-side limits */
  emailNormalized?: string;
  phone?: string;
  role: string;
  /** stable role id (matches `BoardPosition.id`) when available */
  roleId?: string;
  cv?: { path?: string; url?: string } | null;
  coverOption?: 'text' | 'file';
  coverText?: string | null;
  coverFile?: { path?: string; url?: string } | null;
  /** ISO string from some writes; Firestore Timestamp from server / API */
  createdAt?: string | Timestamp;
};

// ---------------------------------------------------------------------------
// Application campaigns (team applications) — replaces board-apply
// ---------------------------------------------------------------------------

export type CampaignStatus = 'open' | 'closed' | 'draft';

export type CustomQuestionType = 'text' | 'textarea' | 'select' | 'radio' | 'checkbox';

export interface CampaignQuestion {
  id: string;
  campaignId: string;
  question: string;
  type: CustomQuestionType;
  options?: string[];
  required: boolean;
  order: number;
}

/** A role applicants can apply to within a campaign. Belongs to a team.
 *  Roles have their own lifecycle so a role can open (or close) after the
 *  main campaign window has started. */
export interface CampaignRole {
  id: string;
  teamId: string;
  title: string;
  description?: string;
  headcount?: number;
  status: 'open' | 'closed';
  /** Optional per-role deadline; falls back to the campaign deadline when unset. */
  deadline?: string;
  order: number;
}

export interface ApplicationCampaign {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  deadline: string;
  status: CampaignStatus;
  teams: string[];
  /** Roles up for application, grouped by teamId. Campaigns created before roles
   *  existed have an empty array and fall back to team-level selection. */
  roles: CampaignRole[];
  /** Optional per-team overrides keyed by team id. Use this to customise the team name or
   *  description shown to applicants in step 1 instead of the generic fallback text. */
  teamInfo?: Record<string, { name?: string; description?: string }>;
  enabledStandardFields: string[];
  createdAt?: string | Timestamp;
}

/** One ranked role choice inside an application. Ordered (index 0 = first choice). */
export interface RoleChoice {
  roleId: string;
  teamId: string;
  justification: string;
}

export interface TeamApplication {
  id: string;
  campaignId: string;
  name: string;
  email: string;
  emailNormalized?: string;
  /** Verified Firebase uid of the applicant (server-set). */
  uid?: string;
  gender?: string;
  university?: string;
  program?: string;
  graduationYear?: string;
  linkedin?: string;
  resume?: { path?: string; url?: string } | null;
  interests?: string[];
  /** Ordered ranked roles (index 0 = first choice). Replaces teamRanking for new submissions. */
  roleRanking?: RoleChoice[];
  /** Legacy field — ranked team ids from before role-level applications existed. */
  teamRanking?: string[];
  customTeam?: string;
  /** "Propose your own role" free-text from the role selection step. */
  customRole?: string;
  weeklyHours?: number;
  motivation?: string;
  customAnswers?: Record<string, string | string[]>;
  agree?: boolean;
  newsletter?: boolean;
  updatedAt?: string | Timestamp;
  createdAt?: string | Timestamp;
}