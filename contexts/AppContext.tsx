'use client';

import React, {
  createContext,
  useContext,
  useReducer,
  ReactNode,
  useEffect,
  useRef,
  useState,
} from 'react';
import { usePathname } from 'next/navigation';
import {
  Event,
  TeamMember,
  BlogPost,
  FAQ,
  Job,
  ShowcaseProject,
} from '../types';
import { scheduleIdle } from '@/lib/idle';
import { hasCachedIdentity } from '@/lib/identity-cache';
import { useEventArchive, type EventArchive } from '@/contexts/useEventArchive';
import {
  usePublicTeamDirectory,
  type PublicTeamDirectory,
} from '@/contexts/usePublicTeamDirectory';

interface AppState {
  events: Event[];
  eventsLoaded: boolean;
  teamMembers: TeamMember[];
  blogPosts: BlogPost[];
  blogPostsLoaded: boolean;
  faqs: FAQ[];
  faqsLoaded: boolean;
  jobs: Job[];
  jobsLoaded: boolean;
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
  | { type: 'CLEAR_PRIVATE_EVENTS' }
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
  | {
      type: 'SET_SHOWCASE_PROJECTS';
      payload: ShowcaseProject[];
      fromCache?: boolean;
    }
  | { type: 'SET_SHOWCASE_UNAVAILABLE' }
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
  | {
      firestoreAction: 'MOVE_TEAM_MEMBER';
      payload: { memberId: string; direction: 'up' | 'down'; year?: number };
    }
  | { firestoreAction: 'ADD_BLOG_POST'; payload: Omit<BlogPost, 'id'> }
  | { firestoreAction: 'UPDATE_BLOG_POST'; payload: BlogPost }
  | { firestoreAction: 'DELETE_BLOG_POST'; payload: string }
  | { firestoreAction: 'ADD_FAQS'; payload: Omit<FAQ, 'id'> }
  | { firestoreAction: 'UPDATE_FAQS'; payload: FAQ }
  | { firestoreAction: 'DELETE_FAQS'; payload: string }
  | { firestoreAction: 'ADD_JOB'; payload: Omit<Job, 'id' | 'createdAt'> }
  | { firestoreAction: 'UPDATE_JOB'; payload: Job }
  | { firestoreAction: 'DELETE_JOB'; payload: string }
  | {
      firestoreAction: 'ADD_SHOWCASE_PROJECT';
      payload: Omit<ShowcaseProject, 'id'>;
    }
  | { firestoreAction: 'UPDATE_SHOWCASE_PROJECT'; payload: ShowcaseProject }
  | { firestoreAction: 'DELETE_SHOWCASE_PROJECT'; payload: string };

const initialState: AppState = {
  events: [],
  eventsLoaded: false,
  teamMembers: [],
  blogPosts: [],
  blogPostsLoaded: false,
  faqs: [],
  faqsLoaded: false,
  jobs: [],
  jobsLoaded: false,
  showcaseProjects: [],
  showcaseLoaded: false,
  showcaseUnavailable: false,
  isLoading: false,
  error: null,
};

const appReducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case 'CLEAR_PRIVATE_EVENTS':
      return {
        ...state,
        events: state.events.filter((event) => event.published === true),
      };
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
        events: state.events.map((event) =>
          event.id === action.payload.id ? action.payload : event,
        ),
      };
    case 'DELETE_EVENT':
      return {
        ...state,
        events: state.events.filter((event) => event.id !== action.payload),
      };
    case 'SET_TEAM_MEMBERS':
      return { ...state, teamMembers: action.payload };
    case 'ADD_TEAM_MEMBER':
      return { ...state, teamMembers: [...state.teamMembers, action.payload] };
    case 'UPDATE_TEAM_MEMBER':
      return {
        ...state,
        teamMembers: state.teamMembers.map((member) =>
          member.id === action.payload.id ? action.payload : member,
        ),
      };
    case 'DELETE_TEAM_MEMBER':
      return {
        ...state,
        teamMembers: state.teamMembers.filter(
          (member) => member.id !== action.payload,
        ),
      };
    case 'SET_BLOG_POSTS':
      return { ...state, blogPosts: action.payload, blogPostsLoaded: true };
    case 'ADD_BLOG_POST':
      return { ...state, blogPosts: [...state.blogPosts, action.payload] };
    case 'UPDATE_BLOG_POST':
      return {
        ...state,
        blogPosts: state.blogPosts.map((post) =>
          post.id === action.payload.id ? action.payload : post,
        ),
      };
    case 'DELETE_BLOG_POST':
      return {
        ...state,
        blogPosts: state.blogPosts.filter((post) => post.id !== action.payload),
      };
    case 'SET_FAQS':
      return { ...state, faqs: action.payload, faqsLoaded: true };
    case 'ADD_FAQS':
      return { ...state, faqs: [...state.faqs, action.payload] };
    case 'UPDATE_FAQS':
      return {
        ...state,
        faqs: state.faqs.map((f) =>
          f.id === action.payload.id ? action.payload : f,
        ),
      };
    case 'DELETE_FAQS':
      return {
        ...state,
        faqs: state.faqs.filter((f) => f.id !== action.payload),
      };
    case 'SET_JOBS':
      return { ...state, jobs: action.payload, jobsLoaded: true };
    case 'ADD_JOB':
      return { ...state, jobs: [...state.jobs, action.payload] };
    case 'UPDATE_JOB':
      return {
        ...state,
        jobs: state.jobs.map((j) =>
          j.id === action.payload.id ? action.payload : j,
        ),
      };
    case 'DELETE_JOB':
      return {
        ...state,
        jobs: state.jobs.filter((j) => j.id !== action.payload),
      };
    case 'SET_SHOWCASE_PROJECTS':
      return {
        ...state,
        showcaseProjects: action.payload,
        showcaseLoaded: true,
        // Only an empty cache-served result is unknown; anything the server answered is truth.
        showcaseUnavailable:
          action.fromCache === true && action.payload.length === 0,
      };
    case 'SET_SHOWCASE_UNAVAILABLE':
      return { ...state, showcaseLoaded: true, showcaseUnavailable: true };
    default:
      return state;
  }
};

type AppDispatch = (
  action: AppAction | FirestoreAction,
) => Promise<string | boolean | void>;

const AppContext = createContext<
  | {
      state: AppState;
      dispatch: AppDispatch;
      eventArchive: EventArchive;
      teamDirectory: PublicTeamDirectory;
    }
  | undefined
>(undefined);

let firstIdlePromise: Promise<void> | null = null;

/** Resolves once the first page load has gone idle, keeping listeners out of the critical
 *  network chain (LCP). After that, listeners opened by client navigation start at once. */
function firstIdle(): Promise<void> {
  firstIdlePromise ??= new Promise((resolve) =>
    scheduleIdle(resolve, hasCachedIdentity() ? 0 : 3500),
  );
  return firstIdlePromise;
}

/** Opens a Firestore listener after the first idle period. The returned cleanup closes it,
 *  and `live()` turns false at the same moment so a late snapshot from it is dropped. */
function openStream(
  open: (live: () => boolean) => Promise<() => void>,
): () => void {
  let closed = false;
  let unsubscribe: (() => void) | null = null;
  const close = (unsub: () => void) => {
    try {
      unsub();
    } catch {
      /* ignore */
    }
  };
  void firstIdle()
    .then(() => (closed ? null : open(() => !closed)))
    .then((unsub) => {
      if (!unsub) return;
      if (closed) close(unsub);
      else unsubscribe = unsub;
    });
  return () => {
    closed = true;
    if (unsubscribe) close(unsubscribe);
  };
}

/** The public team directory is cached for a day; an admin edit clears it (best effort). */
function refreshPublicTeamDirectory(): void {
  void fetch('/api/admin/team-directory', { method: 'POST' }).catch(() => {});
}

export const AppProvider: React.FC<{
  children: ReactNode;
}> = ({ children }) => {
  const pathname = usePathname() ?? '';
  const [isAdmin, setIsAdmin] = useState(false);
  const isAdminRef = useRef(false);
  const needsEvents =
    pathname === '/' ||
    pathname === '/events' ||
    pathname.startsWith('/blog/') ||
    pathname === '/admin' ||
    pathname.startsWith('/admin/');
  const isAdminRoute = pathname === '/admin' || pathname.startsWith('/admin/');
  const eventSubscriptionMode = !(pathname === '/' || pathname === '/events')
    ? 'full'
    : 'recent';
  // Each listener below runs only on the routes that render its collection: every new visit
  // re-reads the whole collection, and Firestore reads are capped at 50K/day.
  const needsBlogPosts =
    pathname === '/' ||
    pathname === '/blog' ||
    pathname.startsWith('/blog/') ||
    isAdminRoute;
  const needsShowcase =
    pathname === '/' ||
    pathname === '/showcase' ||
    pathname.startsWith('/showcase/') ||
    isAdminRoute;
  const needsJobs = pathname === '/careers' || isAdminRoute;
  const needsFaqs = pathname === '/about' || isAdminRoute;
  const [state, dispatch] = useReducer(appReducer, initialState);
  const eventArchive = useEventArchive();
  const teamDirectory = usePublicTeamDirectory();

  // Swallow only the Firestore SDK's unhandled internal assertions (thrown when a denied watch stream is torn down) so they can't brick a screen via an error boundary.
  useEffect(() => {
    const isFirestoreInternal = (msg: string) =>
      msg.includes('INTERNAL ASSERTION FAILED') ||
      msg.includes('INTERNAL UNHANDLED ERROR');
    const onError = (event: ErrorEvent) => {
      if (isFirestoreInternal(event.message || '')) {
        event.preventDefault();
      }
    };
    const onRejection = (event: PromiseRejectionEvent) => {
      if (
        isFirestoreInternal(
          String((event.reason as { message?: string })?.message || ''),
        )
      ) {
        event.preventDefault();
      }
    };
    window.addEventListener('error', onError, true);
    window.addEventListener('unhandledrejection', onRejection, true);
    return () => {
      window.removeEventListener('error', onError, true);
      window.removeEventListener('unhandledrejection', onRejection, true);
    };
  }, []);

  // Admin claim: decides whether the listeners below include drafts.
  useEffect(() => {
    let disposed = false;
    let idTokenUnsub: (() => void) | null = null;
    // Starts false so the first fire is a no-op for non-admins.
    let currentAdminClaim = false;
    let authGeneration = 0;
    void firstIdle()
      .then(() =>
        Promise.all([import('firebase/auth'), import('@/lib/firebase-client')]),
      )
      .then(([{ onIdTokenChanged }, { auth }]) => {
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
          if (disposed || gen !== authGeneration) return;
          // Avoid restarting the listeners when the admin claim did not change.
          if (currentAdminClaim === adminClaim) return;
          currentAdminClaim = adminClaim;
          isAdminRef.current = adminClaim;
          if (!adminClaim) {
            dispatch({ type: 'CLEAR_PRIVATE_EVENTS' });
            dispatch({ type: 'SET_TEAM_MEMBERS', payload: [] });
          }
          setIsAdmin(adminClaim);
        });
      });
    return () => {
      disposed = true;
      try {
        idTokenUnsub?.();
      } catch {
        /* ignore */
      }
    };
  }, []);

  // Public visitors see published items; admins see all (incl. drafts).
  useEffect(() => {
    if (!needsJobs) return;
    return openStream((live) =>
      import('@/lib/firestore/jobs').then(({ subscribeToJobs }) =>
        subscribeToJobs(
          (jobs) => {
            if (live()) dispatch({ type: 'SET_JOBS', payload: jobs });
          },
          { includeUnpublished: isAdmin },
        ),
      ),
    );
  }, [needsJobs, isAdmin]);

  useEffect(() => {
    if (!needsBlogPosts) return;
    return openStream((live) =>
      import('@/lib/firestore/blog').then(({ subscribeToBlogPosts }) =>
        subscribeToBlogPosts(
          (posts) => {
            if (live()) dispatch({ type: 'SET_BLOG_POSTS', payload: posts });
          },
          { includeUnpublished: isAdmin },
        ),
      ),
    );
  }, [needsBlogPosts, isAdmin]);

  useEffect(() => {
    if (!needsShowcase) return;
    // Flips only on a server-answered snapshot: the SDK's first snapshot is often cache-only, so before that an empty cache result is a cold start, not "could not ask" (the flash bug).
    let hasReceivedServerSnapshot = false;
    return openStream((live) =>
      import('@/lib/firestore/showcase').then(
        ({ subscribeToShowcaseProjects }) =>
          subscribeToShowcaseProjects(
            (projects, meta) => {
              if (!live()) return;
              if (!meta.fromCache) hasReceivedServerSnapshot = true;
              dispatch({
                type: 'SET_SHOWCASE_PROJECTS',
                payload: projects,
                fromCache: meta.fromCache && hasReceivedServerSnapshot,
              });
            },
            {
              includeUnpublished: isAdmin,
              // A listener already closed (admin or route change) must not mark a healthy stream unavailable.
              onError: () => {
                if (live()) dispatch({ type: 'SET_SHOWCASE_UNAVAILABLE' });
              },
            },
          ),
      ),
    );
  }, [needsShowcase, isAdmin]);

  useEffect(() => {
    if (!needsFaqs) return;
    return openStream((live) =>
      import('@/lib/firestore/faqs').then(({ subscribeToFaqs }) =>
        subscribeToFaqs((faqs) => {
          if (live()) dispatch({ type: 'SET_FAQS', payload: faqs });
        }),
      ),
    );
  }, [needsFaqs]);

  useEffect(() => {
    if (!isAdmin || !isAdminRoute) {
      if (isAdminRef.current)
        dispatch({ type: 'SET_TEAM_MEMBERS', payload: [] });
      return;
    }
    let disposed = false;
    let unsubscribe: (() => void) | null = null;
    void import('@/lib/firestore/team').then(({ subscribeToTeamMembers }) => {
      if (disposed) return;
      unsubscribe = subscribeToTeamMembers((members) => {
        if (!disposed && isAdminRef.current && isAdminRoute)
          dispatch({ type: 'SET_TEAM_MEMBERS', payload: members });
      });
    });
    return () => {
      disposed = true;
      unsubscribe?.();
    };
  }, [isAdmin, isAdminRoute]);

  // Route changes only restart the event stream when its visibility or need changes.
  useEffect(() => {
    if (!needsEvents) return;
    return openStream((live) =>
      import('@/lib/firestore/events').then(({ subscribeToEvents }) =>
        subscribeToEvents(
          (events) => {
            if (live() && (!isAdmin || isAdminRef.current)) {
              dispatch({ type: 'SET_EVENTS', payload: events });
            }
          },
          {
            includeUnpublished: isAdmin,
            recentOnly: eventSubscriptionMode === 'recent',
          },
        ),
      ),
    );
  }, [needsEvents, isAdmin, eventSubscriptionMode]);

  // Enhanced dispatch with Firestore sync
  const enhancedDispatch = async (action: AppAction | FirestoreAction) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });

      if ('firestoreAction' in action) {
        // Handle Firestore actions
        switch (action.firestoreAction) {
          case 'ADD_EVENT':
            await (
              await import('@/lib/firestore/events')
            ).addEvent(action.payload);
            // Real-time listener will update the state
            break;
          case 'UPDATE_EVENT':
            await (
              await import('@/lib/firestore/events')
            ).updateEvent(action.payload.id, action.payload);
            break;
          case 'DELETE_EVENT':
            await (
              await import('@/lib/firestore/events')
            ).deleteEvent(action.payload);
            break;
          case 'ADD_TEAM_MEMBER':
            await (
              await import('@/lib/firestore/team')
            ).addTeamMember(action.payload);
            refreshPublicTeamDirectory();
            break;
          case 'UPDATE_TEAM_MEMBER':
            await (
              await import('@/lib/firestore/team')
            ).updateTeamMember(action.payload.id, action.payload);
            refreshPublicTeamDirectory();
            break;
          case 'DELETE_TEAM_MEMBER':
            await (
              await import('@/lib/firestore/team')
            ).deleteTeamMember(action.payload);
            refreshPublicTeamDirectory();
            break;
          case 'MOVE_TEAM_MEMBER':
            await (
              await import('@/lib/firestore/team')
            ).moveTeamMember(
              state.teamMembers,
              action.payload.memberId,
              action.payload.direction,
              action.payload.year,
            );
            refreshPublicTeamDirectory();
            break;
          case 'ADD_BLOG_POST':
            await (
              await import('@/lib/firestore/blog')
            ).addBlogPost(action.payload);
            break;
          case 'UPDATE_BLOG_POST':
            await (
              await import('@/lib/firestore/blog')
            ).updateBlogPost(action.payload.id, action.payload);
            break;
          case 'DELETE_BLOG_POST':
            await (
              await import('@/lib/firestore/blog')
            ).deleteBlogPost(action.payload);
            break;
          case 'ADD_FAQS':
            await (await import('@/lib/firestore/faqs')).addFaq(action.payload);
            break;
          case 'UPDATE_FAQS':
            await (
              await import('@/lib/firestore/faqs')
            ).updateFaq(action.payload.id, action.payload);
            break;
          case 'DELETE_FAQS':
            await (
              await import('@/lib/firestore/faqs')
            ).deleteFaq(action.payload);
            break;
          case 'ADD_JOB':
            return await (
              await import('@/lib/firestore/jobs')
            ).addJob(action.payload);
          case 'UPDATE_JOB':
            await (
              await import('@/lib/firestore/jobs')
            ).updateJob(action.payload.id, action.payload);
            break;
          case 'DELETE_JOB':
            await (
              await import('@/lib/firestore/jobs')
            ).deleteJob(action.payload);
            break;
          case 'ADD_SHOWCASE_PROJECT':
            return await (
              await import('@/lib/firestore/showcase')
            ).addShowcaseProject(action.payload);
          case 'UPDATE_SHOWCASE_PROJECT':
            await (
              await import('@/lib/firestore/showcase')
            ).updateShowcaseProject(action.payload.id, action.payload);
            break;
          case 'DELETE_SHOWCASE_PROJECT':
            await (
              await import('@/lib/firestore/showcase')
            ).deleteShowcaseProject(action.payload);
            break;
        }
      } else {
        // Handle regular state actions
        dispatch(action);
      }
      return true;
    } catch (error) {
      console.error('Firestore operation failed:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to sync with database' });
      return false;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  return (
    <AppContext.Provider
      value={{ state, dispatch: enhancedDispatch, eventArchive, teamDirectory }}
    >
      {children}
    </AppContext.Provider>
  );
};

/** SSR seed for one page. Kept out of the root layout: data there lands in every page's
 *  cached output, so one registration rewrote all ~300 ISR pages. Each seeded value shows
 *  until the realtime stream for that collection delivers. */
export const AppSeed: React.FC<{
  children: ReactNode;
  seed: Partial<Pick<AppState, 'events' | 'jobs' | 'faqs'>>;
}> = ({ children, seed }) => {
  const app = useApp();
  const { state } = app;
  const seeded: AppState = {
    ...state,
    ...(seed.events && !state.eventsLoaded
      ? { events: seed.events, eventsLoaded: true }
      : {}),
    ...(seed.jobs && !state.jobsLoaded ? { jobs: seed.jobs } : {}),
    ...(seed.faqs && !state.faqsLoaded ? { faqs: seed.faqs } : {}),
  };
  return (
    <AppContext.Provider value={{ ...app, state: seeded }}>
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
