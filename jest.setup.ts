import '@testing-library/jest-dom';
import React from 'react';

global.__mockPathname = '';

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
}));

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

jest.mock('@/contexts/AppContext', () => {
  const defaultState = {
    events: [],
    teamMembers: [],
    blogPosts: [],
    faqs: [],
    jobs: [],
    boardPositions: [],
    applicants: [],
    registrationQuestions: [],
    isLoading: false,
    error: null,
  };
  return {
    useApp: () => ({ state: defaultState, dispatch: jest.fn() }),
    AppProvider: ({ children }: { children: React.ReactNode }) => children,
  };
});

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
