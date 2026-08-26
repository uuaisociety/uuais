'use client'

import React, { createContext, useContext, useReducer, ReactNode, useEffect } from 'react';
import { Event, TeamMember, BlogPost, FAQ, Job, ShowcaseProject } from '../types';
import { scheduleIdle } from '@/lib/idle';
import { hasCachedIdentity } from '@/lib/identity-cache';

interface AppState {
  events: Event[];
  eventsLoaded: boolean;
  teamMembers: TeamMember[];
  blogPosts: BlogPost[];
  blogPostsLoaded: boolean;
  faqs: FAQ[];
  jobs: Job[];
  showcaseProjects: ShowcaseProject[];
  showcaseLoaded: boolean;
  /** The showcase could not be read from the server — an empty list here means "unknown", not "none". */
  showcaseUnavailable: boolean;
  isLoading: boolean;
  error: string | null;
}

type AppAction = 
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_EVENTS'; payload: Event[] }
  | { type: 'ADD_EVENT'; payload: Event }
  | { type: 'UPDATE_EVENT'; payload: Event }
  | { type: 'DELETE_EVENT'; payload: string }
  | { type: 'SET_TEAM_MEMBERS'; payload: TeamMember[] }
  | { type: 'ADD_TEAM_MEMBER'; payload: TeamMember }
  | { type: 'UPDATE_TEAM_MEMBER'; payload: TeamMember }
  | { type: 'DELETE_TEAM_MEMBER'; payload: string }
  | { type: 'SET_BLOG_POSTS'; payload: BlogPost[] }
  | { type: 'ADD_BLOG_POST'; payload: BlogPost }
  | { type: 'UPDATE_BLOG_POST'; payload: BlogPost }
  | { type: 'DELETE_BLOG_POST'; payload: string }
  | { type: 'SET_FAQS'; payload: FAQ[] }
  | { type: 'ADD_FAQS'; payload: FAQ }
  | { type: 'UPDATE_FAQS'; payload: FAQ }
  | { type: 'DELETE_FAQS'; payload: string }
  | { type: 'SET_JOBS'; payload: Job[] }
  | { type: 'ADD_JOB'; payload: Job }
  | { type: 'UPDATE_JOB'; payload: Job }
  | { type: 'DELETE_JOB'; payload: string }
  | { type: 'SET_SHOWCASE_PROJECTS'; payload: ShowcaseProject[]; fromCache?: boolean }
  | { type: 'SET_SHOWCASE_UNAVAILABLE' }
  | { type: 'SET_SHOWCASE_LOADED'; payload: boolean }
  | { type: 'ADD_SHOWCASE_PROJECT'; payload: ShowcaseProject }
  | { type: 'UPDATE_SHOWCASE_PROJECT'; payload: ShowcaseProject }
  | { type: 'DELETE_SHOWCASE_PROJECT'; payload: string };

type FirestoreAction = 
  | { firestoreAction: 'ADD_EVENT'; payload: Omit<Event, 'id'> }
  | { firestoreAction: 'UPDATE_EVENT'; payload: Event }
  | { firestoreAction: 'DELETE_EVENT'; payload: string }
  | { firestoreAction: 'ADD_TEAM_MEMBER'; payload: Omit<TeamMember, 'id'> }
  | { firestoreAction: 'UPDATE_TEAM_MEMBER'; payload: TeamMember }
  | { firestoreAction: 'DELETE_TEAM_MEMBER'; payload: string }
  | { firestoreAction: 'MOVE_TEAM_MEMBER'; payload: { memberId: string; direction: 'up' | 'down'; year?: number } }
  | { firestoreAction: 'ADD_BLOG_POST'; payload: Omit<BlogPost, 'id'> }
  | { firestoreAction: 'UPDATE_BLOG_POST'; payload: BlogPost }
  | { firestoreAction: 'DELETE_BLOG_POST'; payload: string }
  | { firestoreAction: 'ADD_FAQS'; payload: Omit<FAQ, 'id'> }
  | { firestoreAction: 'UPDATE_FAQS'; payload: FAQ }
  | { firestoreAction: 'DELETE_FAQS'; payload: string }
  | { firestoreAction: 'ADD_JOB'; payload: Omit<Job, 'id' | 'createdAt'> }
  | { firestoreAction: 'UPDATE_JOB'; payload: Job }
  | { firestoreAction: 'DELETE_JOB'; payload: string }
  | { firestoreAction: 'ADD_SHOWCASE_PROJECT'; payload: Omit<ShowcaseProject, 'id'> }
  | { firestoreAction: 'UPDATE_SHOWCASE_PROJECT'; payload: ShowcaseProject }
  | { firestoreAction: 'DELETE_SHOWCASE_PROJECT'; payload: string };

const initialState: AppState = {
  events: [],
  eventsLoaded: false,
  teamMembers: [],
  blogPosts: [],
  blogPostsLoaded: false,
  faqs: [],
  jobs: [],
  showcaseProjects: [],
  showcaseLoaded: false,
  showcaseUnavailable: false,
  isLoading: false,
  error: null
};

const appReducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_EVENTS':
      return { ...state, events: action.payload, eventsLoaded: true };
    case 'ADD_EVENT':
      return { ...state, events: [...state.events, action.payload] };
    case 'UPDATE_EVENT':
      return { 
        ...state, 
        events: state.events.map(event => 
          event.id === action.payload.id ? action.payload : event
        ) 
      };
    case 'DELETE_EVENT':
      return { 
        ...state, 
        events: state.events.filter(event => event.id !== action.payload) 
      };
    case 'SET_TEAM_MEMBERS':
      return { ...state, teamMembers: action.payload };
    case 'ADD_TEAM_MEMBER':
      return { ...state, teamMembers: [...state.teamMembers, action.payload] };
    case 'UPDATE_TEAM_MEMBER':
      return { 
        ...state, 
        teamMembers: state.teamMembers.map(member => 
          member.id === action.payload.id ? action.payload : member
        ) 
      };
    case 'DELETE_TEAM_MEMBER':
      return { 
        ...state, 
        teamMembers: state.teamMembers.filter(member => member.id !== action.payload) 
      };
    case 'SET_BLOG_POSTS':
      return { ...state, blogPosts: action.payload, blogPostsLoaded: true };
    case 'ADD_BLOG_POST':
      return { ...state, blogPosts: [...state.blogPosts, action.payload] };
    case 'UPDATE_BLOG_POST':
      return { 
        ...state, 
        blogPosts: state.blogPosts.map(post => 
          post.id === action.payload.id ? action.payload : post
        ) 
      };
    case 'DELETE_BLOG_POST':
      return { 
        ...state, 
        blogPosts: state.blogPosts.filter(post => post.id !== action.payload) 
      };
    case 'SET_FAQS':
      return { ...state, faqs: action.payload };
    case 'ADD_FAQS':
      return { ...state, faqs: [...state.faqs, action.payload] };
    case 'UPDATE_FAQS':
      return {
        ...state,
        faqs: state.faqs.map(f => f.id === action.payload.id ? action.payload : f)
      };
    case 'DELETE_FAQS':
      return {
        ...state,
        faqs: state.faqs.filter(f => f.id !== action.payload)
      };
    case 'SET_JOBS':
      return { ...state, jobs: action.payload };
    case 'ADD_JOB':
      return { ...state, jobs: [...state.jobs, action.payload] };
    case 'UPDATE_JOB':
      return {
        ...state,
        jobs: state.jobs.map(j => j.id === action.payload.id ? action.payload : j)
      };
    case 'DELETE_JOB':
      return {
        ...state,
        jobs: state.jobs.filter(j => j.id !== action.payload)
      };
    case 'SET_SHOWCASE_PROJECTS':
      return {
        ...state,
        showcaseProjects: action.payload,
        showcaseLoaded: true,
        // Only an empty cache-served result is unknown; anything the server answered is truth.
        showcaseUnavailable: action.fromCache === true && action.payload.length === 0,
      };
    case 'SET_SHOWCASE_UNAVAILABLE':
      return { ...state, showcaseLoaded: true, showcaseUnavailable: true };
    case 'SET_SHOWCASE_LOADED':
      return { ...state, showcaseLoaded: action.payload };
    case 'ADD_SHOWCASE_PROJECT':
      return { ...state, showcaseProjects: [...state.showcaseProjects, action.payload] };
    case 'UPDATE_SHOWCASE_PROJECT':
      return {
        ...state,
        showcaseProjects: state.showcaseProjects.map((p) =>
          p.id === action.payload.id ? action.payload : p
        ),
      };
    case 'DELETE_SHOWCASE_PROJECT':
      return {
        ...state,
        showcaseProjects: state.showcaseProjects.filter((p) => p.id !== action.payload),
      };
    default:
      return state;
  }
};

type AppDispatch = (action: AppAction | FirestoreAction) => Promise<string | void>;

const AppContext = createContext<{
  state: AppState;
  dispatch: AppDispatch;
} | undefined>(undefined);

export const AppProvider: React.FC<{
  children: ReactNode;
  seed?: Partial<
    Pick<AppState, 'events' | 'jobs' | 'faqs' | 'teamMembers' | 'blogPosts'>
  >;
}> = ({ children, seed }) => {
  const initState: AppState = {
    ...initialState,
    ...(seed || {}),
    eventsLoaded: !!seed?.events,
    blogPostsLoaded: seed ? seed.blogPosts !== undefined : false,
  };
  const [state, dispatch] = useReducer(appReducer, initState);

  // Swallow only the Firestore SDK's unhandled internal assertions (thrown when a denied watch stream is torn down) so they can't brick a screen via an error boundary.
  useEffect(() => {
    const isFirestoreInternal = (msg: string) =>
      msg.includes("INTERNAL ASSERTION FAILED") || msg.includes("INTERNAL UNHANDLED ERROR");
    const onError = (event: ErrorEvent) => {
      if (isFirestoreInternal(event.message || "")) {
        event.preventDefault();
      }
    };
    const onRejection = (event: PromiseRejectionEvent) => {
      if (isFirestoreInternal(String((event.reason as { message?: string })?.message || ""))) {
        event.preventDefault();
      }
    };
    window.addEventListener("error", onError, true);
    window.addEventListener("unhandledrejection", onRejection, true);
    return () => {
      window.removeEventListener("error", onError, true);
      window.removeEventListener("unhandledrejection", onRejection, true);
    };
  }, []);

  // Realtime Firestore listeners start after the main thread goes idle so they stay out of the critical network chain (LCP); SSR-seeded data already paints the content.
  useEffect(() => {
    // Listener refs are mutated async (dynamic import) so a late chunk from a superseded subscribe() can't clobber the active one.
    const unsubscribeEvents: { current: (() => void) | null } = { current: null };
    const unsubscribeJobs: { current: (() => void) | null } = { current: null };
    const unsubscribeBlogPosts: { current: (() => void) | null } = { current: null };
    const unsubscribeShowcase: { current: (() => void) | null } = { current: null };
    const unsubscribeTeamMembers: { current: (() => void) | null } = { current: null };
    const unsubscribeFaqs: { current: (() => void) | null } = { current: null };
    let idTokenUnsub: (() => void) | null = null;
    let disposed = false;
    // Bumped on every subscribe() so a listener from an older call drops itself instead of replacing the current one.
    let subscriptionGeneration = 0;

    const subscribe = (includeUnpublished = false) => {
      // includeUnpublished: boolean indicates admin status
      const gen = ++subscriptionGeneration;

      // Subscribe once the chunk loads, dropping the listener if a newer subscribe() superseded us.
      const attach = <T,>(
        importPromise: Promise<T>,
        ref: { current: (() => void) | null },
        make: (mod: T) => () => void,
      ) => {
        void importPromise.then((mod) => {
          if (disposed) return;
          const unsub = make(mod);
          if (gen !== subscriptionGeneration) {
            try { unsub(); } catch { /* ignore */ }
            return;
          }
          ref.current = unsub;
        });
      };

      // Unsubscribe previous
      if (unsubscribeEvents.current) {
        try { unsubscribeEvents.current(); } catch { /* ignore */ }
        unsubscribeEvents.current = null;
      }
      attach(import('@/lib/firestore/events'), unsubscribeEvents, ({ subscribeToEvents }) =>
        subscribeToEvents((events) => {
          dispatch({ type: 'SET_EVENTS', payload: events });
        }, { includeUnpublished }),
      );

      if (unsubscribeJobs.current) {
        try { unsubscribeJobs.current(); } catch { /* ignore */ }
        unsubscribeJobs.current = null;
      }
      attach(import('@/lib/firestore/jobs'), unsubscribeJobs, ({ subscribeToJobs }) =>
        subscribeToJobs((jobs) => {
          dispatch({ type: 'SET_JOBS', payload: jobs });
        }, { includeUnpublished }),
      );

      // Showcase: public visitors only see published projects; admins see all (incl. drafts)
      if (unsubscribeShowcase.current) {
        try { unsubscribeShowcase.current(); } catch { /* ignore */ }
        unsubscribeShowcase.current = null;
      }
      attach(import('@/lib/firestore/showcase'), unsubscribeShowcase, ({ subscribeToShowcaseProjects }) =>
        subscribeToShowcaseProjects(
          (projects, meta) => {
            dispatch({ type: 'SET_SHOWCASE_PROJECTS', payload: projects, fromCache: meta.fromCache });
          },
          {
            includeUnpublished,
            onError: () => dispatch({ type: 'SET_SHOWCASE_UNAVAILABLE' }),
          },
        ),
      );

      // Blog posts: public visitors see published posts; admins see all (incl. drafts)
      if (unsubscribeBlogPosts.current) {
        try { unsubscribeBlogPosts.current(); } catch { /* ignore */ }
        unsubscribeBlogPosts.current = null;
      }
      attach(import('@/lib/firestore/blog'), unsubscribeBlogPosts, ({ subscribeToBlogPosts }) =>
        subscribeToBlogPosts((posts) => {
          dispatch({ type: 'SET_BLOG_POSTS', payload: posts });
        }, { includeUnpublished }),
      );
    };

    // Returning visitors (cached identity) get realtime data immediately; anonymous visitors defer the firestore streams until after LCP / first interaction.
    scheduleIdle(
      () => {
        // Initial subscription: assume not admin (public)
        subscribe(false);

        // Other static subscriptions that don't depend on auth
        void import('@/lib/firestore/team').then(({ subscribeToTeamMembers }) => {
          if (disposed) return;
          unsubscribeTeamMembers.current = subscribeToTeamMembers((members) => {
            dispatch({ type: 'SET_TEAM_MEMBERS', payload: members });
          });
        });

        void import('@/lib/firestore/faqs').then(({ subscribeToFaqs }) => {
          if (disposed) return;
          unsubscribeFaqs.current = subscribeToFaqs((faqs) => {
            dispatch({ type: 'SET_FAQS', payload: faqs });
          });
        });

        // Listen for ID token changes; starts false so the first fire is a no-op for non-admins.
        let currentAdminClaim: boolean | null = false;
        let authGeneration = 0;
        void Promise.all([import('firebase/auth'), import('@/lib/firebase-client')]).then(([{ onIdTokenChanged }, { auth }]) => {
          if (disposed) return;
          idTokenUnsub = onIdTokenChanged(auth, async (user) => {
            const gen = ++authGeneration;
            let adminClaim = false;
            if (user) {
              // Read cached claims without forcing a network refresh; onIdTokenChanged fires on token refresh.
              try {
                const tokenResult = await user.getIdTokenResult();
                adminClaim = !!tokenResult.claims.admin;
              } catch (err) {
                console.warn('Failed to refresh ID token', err);
                return;
              }
            }
            // Ignore stale auth events that resolved after a newer one applied.
            if (gen !== authGeneration) return;
            // Avoid re-subscribing when the admin claim did not change.
            if (currentAdminClaim === adminClaim) return;
            currentAdminClaim = adminClaim;
            // Re-subscribe with adminClaim (true/false)
            subscribe(adminClaim);
          });
        });
      },
      hasCachedIdentity() ? 0 : 3500
    );

    // Cleanup subscriptions on unmount
    return () => {
      disposed = true;
      if (unsubscribeEvents.current) {
        try { unsubscribeEvents.current(); } catch { /* ignore */ }
      }
      if (unsubscribeJobs.current) {
        try { unsubscribeJobs.current(); } catch { /* ignore */ }
      }
      if (unsubscribeBlogPosts.current) {
        try { unsubscribeBlogPosts.current(); } catch { /* ignore */ }
      }
      if (unsubscribeShowcase.current) {
        try { unsubscribeShowcase.current(); } catch { /* ignore */ }
      }
      if (unsubscribeTeamMembers.current) {
        try { unsubscribeTeamMembers.current(); } catch { /* ignore */ }
      }
      if (unsubscribeFaqs.current) {
        try { unsubscribeFaqs.current(); } catch { /* ignore */ }
      }
      if (idTokenUnsub) {
        try { idTokenUnsub(); } catch { /* ignore */ }
      }
    };
  }, []);

  // Enhanced dispatch with Firestore sync
  const enhancedDispatch = async (action: AppAction | FirestoreAction) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });

      if ('firestoreAction' in action) {
        // Handle Firestore actions
        switch (action.firestoreAction) {
          case 'ADD_EVENT':
            await (await import('@/lib/firestore/events')).addEvent(action.payload);
            // Real-time listener will update the state
            break;
          case 'UPDATE_EVENT':
            await (await import('@/lib/firestore/events')).updateEvent(action.payload.id, action.payload);
            break;
          case 'DELETE_EVENT':
            await (await import('@/lib/firestore/events')).deleteEvent(action.payload);
            break;
          case 'ADD_TEAM_MEMBER':
            await (await import('@/lib/firestore/team')).addTeamMember(action.payload);
            break;
          case 'UPDATE_TEAM_MEMBER':
            await (await import('@/lib/firestore/team')).updateTeamMember(action.payload.id, action.payload);
            break;
          case 'DELETE_TEAM_MEMBER':
            await (await import('@/lib/firestore/team')).deleteTeamMember(action.payload);
            break;
          case 'MOVE_TEAM_MEMBER':
            await (await import('@/lib/firestore/team')).moveTeamMember(state.teamMembers, action.payload.memberId, action.payload.direction, action.payload.year);
            break;
          case 'ADD_BLOG_POST':
            await (await import('@/lib/firestore/blog')).addBlogPost(action.payload);
            break;
          case 'UPDATE_BLOG_POST':
            await (await import('@/lib/firestore/blog')).updateBlogPost(action.payload.id, action.payload);
            break;
          case 'DELETE_BLOG_POST':
            await (await import('@/lib/firestore/blog')).deleteBlogPost(action.payload);
            break;
          case 'ADD_FAQS':
            await (await import('@/lib/firestore/faqs')).addFaq(action.payload);
            break;
          case 'UPDATE_FAQS':
            await (await import('@/lib/firestore/faqs')).updateFaq(action.payload.id, action.payload);
            break;
          case 'DELETE_FAQS':
            await (await import('@/lib/firestore/faqs')).deleteFaq(action.payload);
            break;
          case 'ADD_JOB':
            return await (await import('@/lib/firestore/jobs')).addJob(action.payload);
          case 'UPDATE_JOB':
            await (await import('@/lib/firestore/jobs')).updateJob(action.payload.id, action.payload);
            break;
          case 'DELETE_JOB':
            await (await import('@/lib/firestore/jobs')).deleteJob(action.payload);
            break;
          case 'ADD_SHOWCASE_PROJECT':
            return await (await import('@/lib/firestore/showcase')).addShowcaseProject(action.payload);
          case 'UPDATE_SHOWCASE_PROJECT':
            await (await import('@/lib/firestore/showcase')).updateShowcaseProject(action.payload.id, action.payload);
            break;
          case 'DELETE_SHOWCASE_PROJECT':
            await (await import('@/lib/firestore/showcase')).deleteShowcaseProject(action.payload);
            break;
        }
      } else {
        // Handle regular state actions
        dispatch(action);
      }
    } catch (error) {
      console.error('Firestore operation failed:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to sync with database' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  return (
    <AppContext.Provider value={{ state, dispatch: enhancedDispatch }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};