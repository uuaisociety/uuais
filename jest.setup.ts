import '@testing-library/jest-dom';
import React from 'react';

declare global {
  var __mockPathname: string | undefined;
  var __mockTheme: string | undefined;
  var __setMockTheme: ((theme: 'light' | 'dark') => void) | undefined;
  var __setMockParams: ((params: Record<string, string>) => void) | undefined;
  var __setAppState: ((state: Record<string, unknown> | null) => void) | undefined;
}

beforeEach(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    })),
  });
}

// jsdom lacks Element#scrollIntoView; timer-based calls (e.g. wizard step navigation) would throw.
if (typeof Element !== 'undefined' && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = jest.fn();
}

// jsdom lacks Element#scrollTo; the wizard's step header scrolls the active step into view.
if (typeof Element !== 'undefined' && !Element.prototype.scrollTo) {
  Element.prototype.scrollTo = jest.fn();
}

// Radix Dialog (used by the shared Modal primitive) requires ResizeObserver
// and PointerEvent capture in jsdom to mount its portal content.
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}

if (typeof Element !== 'undefined' && !Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = () => false;
}
if (typeof Element !== 'undefined' && !Element.prototype.setPointerCapture) {
  Element.prototype.setPointerCapture = () => {};
}
if (typeof Element !== 'undefined' && !Element.prototype.releasePointerCapture) {
  Element.prototype.releasePointerCapture = () => {};
}

global.__mockPathname = '';

global.__mockTheme = 'dark';
global.__setMockTheme = (theme: 'light' | 'dark') => {
  global.__mockTheme = theme;
};
jest.mock('@/providers/ThemeProvider', () => ({
  useTheme: () => ({ theme: global.__mockTheme || 'dark', toggleTheme: jest.fn() }),
}));

const mockParams: Record<string, string> = {};
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
    };
  },
  usePathname() {
    return global.__mockPathname || '';
  },
  useParams() {
    return mockParams;
  },
  notFound: jest.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
}));
global.__setMockParams = (params: Record<string, string>) => {
  Object.assign(mockParams, params);
};

jest.mock('@/hooks/useAdmin', () => ({
  useAdmin: () => ({
    user: null,
    loading: false,
    isAdmin: false,
    isSuperAdmin: false,
    claims: null,
    signInWithGoogle: jest.fn(),
    logout: jest.fn(),
  }),
}));

jest.mock('next/image', () => {
  return function NextImage(props: React.ImgHTMLAttributes<HTMLImageElement>) {
    return React.createElement('img', props);
  };
});

let __mockAppState: Record<string, unknown> | null = null;
const __defaultAppState = {
  events: [],
  teamMembers: [],
  blogPosts: [],
  faqs: [],
  jobs: [],
  boardPositions: [],
  applicants: [],
  campaigns: [],
  teamApplications: [],
  registrationQuestions: [],
  showcaseProjects: [],
  isLoading: false,
  error: null,
};
global.__setAppState = (state: Record<string, unknown> | null) => {
  __mockAppState = state;
};
jest.mock('@/contexts/AppContext', () => ({
  useApp: () => ({ state: __mockAppState || __defaultAppState, dispatch: jest.fn() }),
  AppProvider: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock("@/utils/seo", () => ({
  updatePageMeta: jest.fn(),
}));

jest.mock("@/lib/firestore", () => {
  const stub = jest.fn();
  return {
    getEvents: stub,
    getAllEvents: stub,
    getEventById: stub,
    addEvent: stub,
    updateEvent: stub,
    patchEvent: stub,
    deleteEvent: stub,
    subscribeToEvents: jest.fn(() => () => {}),
    getTeamMembers: stub,
    addTeamMember: stub,
    updateTeamMember: stub,
    deleteTeamMember: stub,
    subscribeToTeamMembers: jest.fn(() => () => {}),
    getBlogPosts: stub,
    getBlogPostById: stub,
    addBlogPost: stub,
    updateBlogPost: stub,
    deleteBlogPost: stub,
    subscribeToBlogPosts: jest.fn(() => () => {}),
    getFaqs: stub,
    addFaq: stub,
    updateFaq: stub,
    deleteFaq: stub,
    subscribeToFaqs: jest.fn(() => () => {}),
    registerForEvent: stub,
    getMyRegistrations: stub,
    getEventRegistrations: stub,
    subscribeToEventRegistrations: jest.fn(() => () => {}),
    getEventCustomQuestions: stub,
    subscribeToEventCustomQuestions: jest.fn(() => () => {}),
    addEventCustomQuestion: stub,
    updateEventCustomQuestion: stub,
    deleteEventCustomQuestion: stub,
    incrementEventUniqueClick: stub,
    getEventClicksCounts: stub,
    incrementBlogRead: stub,
    getBlogReadsCounts: stub,
    getJobs: stub,
    addJob: stub,
    updateJob: stub,
    deleteJob: stub,
    subscribeToJobs: jest.fn(() => () => {}),
    getAttendance: stub,
    recordAttendance: stub,
    getUsers: stub,
    getUserById: stub,
    updateUser: stub,
    subscribeToAiChats: jest.fn(() => () => {}),
    addAiChat: stub,
    getFavorites: stub,
    addFavorite: stub,
    removeFavorite: stub,
    getCourseCategories: stub,
    getAiSettings: stub,
    updateAiSetting: stub,
    getCourses: stub,
    moveTeamMember: stub,
    getBoardPositions: stub,
    addPosition: stub,
    updatePosition: stub,
    deletePosition: stub,
    movePosition: stub,
    subscribeToPositions: jest.fn(() => () => {}),
    getBoardApplications: stub,
    subscribeToBoardApplications: jest.fn(() => () => {}),
    deleteBoardApplication: stub,
  };
});
