import '@testing-library/jest-dom';
import React from 'react';
import { TextEncoder, TextDecoder } from 'util';
import { ReadableStream } from 'stream/web';

// jsdom doesn't expose these Node web globals (confirmed via bare probe).
if (typeof globalThis.TextEncoder === 'undefined') globalThis.TextEncoder = TextEncoder as unknown as typeof globalThis.TextEncoder;
if (typeof globalThis.TextDecoder === 'undefined') globalThis.TextDecoder = TextDecoder as unknown as typeof globalThis.TextDecoder;
if (typeof globalThis.ReadableStream === 'undefined') globalThis.ReadableStream = ReadableStream as unknown as typeof globalThis.ReadableStream;

// jsdom lacks Response (Headers is provided). Minimal Response used by route tests.
if (typeof globalThis.Response === 'undefined') {
  class HeadersMock {
    private map = new Map<string, string>();
    constructor(init?: Record<string, string> | [string, string][]) {
      if (init) {
        if (Array.isArray(init)) for (const [k, v] of init) this.set(k, v);
        else for (const [k, v] of Object.entries(init)) this.set(k, String(v));
      }
    }
    get(name: string) { return this.map.get(name.toLowerCase()) ?? null; }
    has(name: string) { return this.map.has(name.toLowerCase()); }
    set(name: string, value: string) { this.map.set(name.toLowerCase(), value); }
  }
  class ResponseMock {
    status: number;
    ok: boolean;
    headers: HeadersMock;
    private bodyText: string;
    constructor(body?: unknown, init?: { status?: number; headers?: Record<string, string> | [string, string][] }) {
      this.bodyText = typeof body === 'string' ? body : '';
      this.status = init?.status ?? 200;
      this.ok = this.status >= 200 && this.status < 300;
      this.headers = new HeadersMock(init?.headers);
    }
    async text() { return this.bodyText; }
    async json() { return JSON.parse(this.bodyText); }
  }
  globalThis.Response = ResponseMock as unknown as typeof globalThis.Response;
}

declare global {
  var __mockPathname: string | undefined;
  var __mockTheme: string | undefined;
  var __setMockTheme: ((theme: 'light' | 'dark') => void) | undefined;
  var __setMockParams: ((params: Record<string, string>) => void) | undefined;
  var __setAppState: ((state: Record<string, unknown> | null) => void) | undefined;
  var __setAdminState: ((state: Record<string, unknown> | null) => void) | undefined;
  var __setCollectionData: ((entries: Record<string, unknown> | null) => void) | undefined;
}

beforeEach(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  global.__setCollectionData?.(null);
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
  useSearchParams() {
    return new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  },
  notFound: jest.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
}));
global.__setMockParams = (params: Record<string, string>) => {
  Object.assign(mockParams, params);
};

let __mockAdminState: Record<string, unknown> | null = null;
const __defaultAdminState = {
  user: null,
  loading: false,
  profileLoading: false,
  profile: null,
  isAdmin: false,
  isSuperAdmin: false,
  claims: null,
  signInWithGoogle: jest.fn(),
  logout: jest.fn(),
};
global.__setAdminState = (state: Record<string, unknown> | null) => {
  __mockAdminState = state;
};
jest.mock('@/hooks/useAdmin', () => ({
  useAdmin: () => __mockAdminState || __defaultAdminState,
  refreshProfile: jest.fn().mockResolvedValue(undefined),
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

let __mockCollectionData: Record<string, unknown> = {};
const __defaultCollectionData = { data: [], loaded: false };
// Keyed by the subscribe function's name so re-renders (filters, expands) get the same data; 'default' covers anonymous/inline subscribe functions.
global.__setCollectionData = (entries: Record<string, unknown> | null) => {
  __mockCollectionData = entries || {};
};
jest.mock('@/lib/firestore/useCollectionData', () => ({
  useCollectionData: (subscribe: unknown) => {
    const name = typeof subscribe === 'function' && subscribe.name ? subscribe.name : 'default';
    const entry = __mockCollectionData[name];
    return entry !== undefined ? entry : __defaultCollectionData;
  },
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
    getUserProfile: stub,
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
