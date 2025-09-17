export interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  image: string;
  category: 'workshop' | 'seminar' | 'competition' | 'social';
  status: 'upcoming' | 'past';
  registrationRequired: boolean;
  maxCapacity?: number;
  currentRegistrations?: number;
  published?: boolean;
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
  status: 'registered' | 'waitlist' | 'cancelled';
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