import { Timestamp } from 'firebase/firestore';

export interface AIChat {
  id: string;
  userId: string;
  title: string;
  messages: { role: 'user' | 'assistant'; content: string; timestamp: string }[];
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
  attendees?: {
    userId: string;
    attended: boolean | null;
    timestamp: number | null;
  }[];
}

export interface TeamMember {
  id: string;
  name: string;
  position: string;
  bio: string;
  image: string;
  linkedin?: string;
  twitter?: string;
  email?: string;
  github?: string;
  personalEmail?: string;
  companyEmail?: string;
  website?: string;
  published?: boolean;
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