// import '@testing-library/jest-dom';
// import React from 'react';

// // Mock Next.js router
// jest.mock('next/navigation', () => ({
//   useRouter() {
//     return {
//       push: jest.fn(),
//       replace: jest.fn(),
//       prefetch: jest.fn(),
//     };
//   },
//   usePathname() {
//     return '';
//   },
// }));

// // Mock next/image to a plain img for JSDOM
// jest.mock('next/image', () => {
//   return function NextImage(props: React.ImgHTMLAttributes<HTMLImageElement>) {
//     return React.createElement('img', props);
//   };
// });

// // Mock App Context to avoid Firestore subscriptions in tests
// jest.mock('@/contexts/AppContext', () => {
//   const defaultState = {
//     events: [],
//     teamMembers: [],
//     blogPosts: [],
//     faqs: [],
//     registrationQuestions: [],
//     isLoading: false,
//     error: null,
//   };
//   return {
//     useApp: () => ({ state: defaultState, dispatch: jest.fn() }),
//     AppProvider: ({ children }: { children: React.ReactNode }) => children,
//   };
// });

// // Mock SEO utilities
// jest.mock("@/utils/seo", () => ({
//   updatePageMeta: jest.fn(),
// }));

// // Mock Firestore module to avoid real network and side effects in unit tests
// // Tests can override per-file using jest.mock("@/lib/firestore", ...) with specific behaviors.
// jest.mock("@/lib/firestore", () => {
//   return {
//     // Events
//     getEvents: jest.fn(async () => []),
//     getAllEvents: jest.fn(async () => []),
//     getEventById: jest.fn(async () => null),
//     addEvent: jest.fn(async () => 'test-id'),
//     updateEvent: jest.fn(async () => undefined),
//     patchEvent: jest.fn(async () => undefined),
//     deleteEvent: jest.fn(async () => undefined),
//     subscribeToEvents: jest.fn(() => () => {}),

//     // Team
//     getTeamMembers: jest.fn(async () => []),
//     addTeamMember: jest.fn(async () => 'member-id'),
//     updateTeamMember: jest.fn(async () => undefined),
//     deleteTeamMember: jest.fn(async () => undefined),
//     subscribeToTeamMembers: jest.fn(() => () => {}),

//     // Blog
//     getBlogPosts: jest.fn(async () => []),
//     getBlogPostById: jest.fn(async () => null),
//     addBlogPost: jest.fn(async () => 'post-id'),
//     updateBlogPost: jest.fn(async () => undefined),
//     deleteBlogPost: jest.fn(async () => undefined),
//     subscribeToBlogPosts: jest.fn(() => () => {}),

//     // FAQs
//     getFaqs: jest.fn(async () => []),
//     addFaq: jest.fn(async () => 'faq-id'),
//     updateFaq: jest.fn(async () => undefined),
//     deleteFaq: jest.fn(async () => undefined),
//     subscribeToFaqs: jest.fn(() => () => {}),

//     // Registrations
//     registerForEvent: jest.fn(async () => 'reg-id'),
//     getMyRegistrations: jest.fn(async () => []),
//     getEventRegistrations: jest.fn(async () => []),
//     subscribeToEventRegistrations: jest.fn(() => () => {}),

//     // Custom Questions
//     getEventCustomQuestions: jest.fn(async () => []),
//     subscribeToEventCustomQuestions: jest.fn(() => () => {}),
//     addEventCustomQuestion: jest.fn(async () => 'cq-id'),
//     updateEventCustomQuestion: jest.fn(async () => undefined),
//     deleteEventCustomQuestion: jest.fn(async () => undefined),

//     // Analytics
//     incrementEventUniqueClick: jest.fn(async () => undefined),
//     getEventClicksCounts: jest.fn(async () => ({})),
//     incrementBlogRead: jest.fn(async () => undefined),
//     getBlogReadsCounts: jest.fn(async () => ({})),
//   };
// });