'use client'

import React, { createContext, useContext, useReducer, ReactNode, useEffect } from 'react';
import { Event, TeamMember, BlogPost, FAQ, Job, BoardPosition, Application, ApplicationCampaign, TeamApplication } from '../types';
import type { CampaignInput } from '@/lib/firestore/applicationCampaigns';
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
  boardPositions: BoardPosition[];
  applicants: Application[];
  campaigns: ApplicationCampaign[];
  campaignsLoaded: boolean;
  teamApplications: TeamApplication[];
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
  | { type: 'SET_BOARDPOS'; payload: BoardPosition[] }
  | { type: 'ADD_BOARDPOS'; payload: BoardPosition }
  | { type: 'UPDATE_BOARDPOS'; payload: BoardPosition }
  | { type: 'DELETE_BOARDPOS'; payload: string }
  | { type: 'SET_JOBS'; payload: Job[] }
  | { type: 'ADD_JOB'; payload: Job }
  | { type: 'UPDATE_JOB'; payload: Job }
  | { type: 'DELETE_JOB'; payload: string }
  | { type: 'SET_APPLICANTS'; payload: Application[] }
  | { type: 'SET_CAMPAIGNS'; payload: ApplicationCampaign[] }
  | { type: 'SET_CAMPAIGNS_LOADED'; payload: boolean }
  | { type: 'SET_TEAM_APPLICATIONS'; payload: TeamApplication[] };

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
  | { firestoreAction: 'ADD_BOARDPOS'; payload: Omit<BoardPosition, 'id' | 'order'> }
  | { firestoreAction: 'UPDATE_BOARDPOS'; payload: BoardPosition }
  | { firestoreAction: 'DELETE_BOARDPOS'; payload: string }
  | { firestoreAction: 'MOVE_BOARDPOS'; payload: { positionId: string; direction: 'up' | 'down' } }
  | { firestoreAction: 'ADD_JOB'; payload: Omit<Job, 'id' | 'createdAt'> }
  | { firestoreAction: 'UPDATE_JOB'; payload: Job }
  | { firestoreAction: 'DELETE_JOB'; payload: string }
  | { firestoreAction: 'DELETE_BOARD_APPLICATION'; payload: string }
  | { firestoreAction: 'ADD_CAMPAIGN'; payload: CampaignInput }
  | { firestoreAction: 'UPDATE_CAMPAIGN'; payload: Partial<ApplicationCampaign> }
  | { firestoreAction: 'DELETE_CAMPAIGN'; payload: string }
  | { firestoreAction: 'DELETE_TEAM_APPLICATION'; payload: string };

const initialState: AppState = {
  events: [],
  eventsLoaded: false,
  teamMembers: [],
  blogPosts: [],
  blogPostsLoaded: false,
  faqs: [],
  jobs: [],
  boardPositions: [],
  applicants: [],
  campaigns: [],
  campaignsLoaded: false,
  teamApplications: [],
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
    case 'SET_BOARDPOS':
      return { ...state, boardPositions: action.payload };
    case 'ADD_BOARDPOS':
      return { ...state, boardPositions: [...state.boardPositions, action.payload] };
    case 'UPDATE_BOARDPOS':
      return {
        ...state,
        boardPositions: state.boardPositions.map(j => j.id === action.payload.id ? action.payload : j)
      };
    case 'DELETE_BOARDPOS':
      return {
        ...state,
        boardPositions: state.boardPositions.filter(j => j.id !== action.payload)
      };
    case 'SET_APPLICANTS':
      return { ...state, applicants: action.payload };
    case 'SET_CAMPAIGNS':
      return { ...state, campaigns: action.payload };
    case 'SET_CAMPAIGNS_LOADED':
      return { ...state, campaignsLoaded: action.payload };
    case 'SET_TEAM_APPLICATIONS':
      return { ...state, teamApplications: action.payload };
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
    Pick<AppState, 'events' | 'jobs' | 'faqs' | 'teamMembers' | 'boardPositions' | 'campaigns' | 'blogPosts'>
  >;
}> = ({ children, seed }) => {
  const initState: AppState = {
    ...initialState,
    ...(seed || {}),
    eventsLoaded: !!seed?.events,
    campaignsLoaded: !!seed?.campaigns,
    blogPostsLoaded: seed ? seed.blogPosts !== undefined : false,
  };
  const [state, dispatch] = useReducer(appReducer, initState);

  // Realtime Firestore listeners start after the main thread goes idle so they stay out of the critical network chain (LCP); SSR-seeded data already paints the content.
  useEffect(() => {
    // Listener refs are mutated async (dynamic import) so a late chunk from a superseded subscribe() can't clobber the active one.
    const unsubscribeEvents: { current: (() => void) | null } = { current: null };
    const unsubscribeJobs: { current: (() => void) | null } = { current: null };
    const unsubscribeBoardPositions: { current: (() => void) | null } = { current: null };
    const unsubscribeBoardApplications: { current: (() => void) | null } = { current: null };
    const unsubscribeCampaigns: { current: (() => void) | null } = { current: null };
    const unsubscribeTeamApplications: { current: (() => void) | null } = { current: null };
    const unsubscribeBlogPosts: { current: (() => void) | null } = { current: null };
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

      if (unsubscribeBoardPositions.current) {
        try { unsubscribeBoardPositions.current(); } catch { /* ignore */ }
        unsubscribeBoardPositions.current = null;
      }
      attach(import('@/lib/firestore/board-positions'), unsubscribeBoardPositions, ({ subscribeToPositions }) =>
        subscribeToPositions((positions) => {
          dispatch({ type: 'SET_BOARDPOS', payload: positions });
        }),
      );

      if (unsubscribeBoardApplications.current) {
        try { unsubscribeBoardApplications.current(); } catch { /* ignore */ }
        unsubscribeBoardApplications.current = null;
      }
      if (includeUnpublished) {
        attach(import('@/lib/firestore/boardApplications'), unsubscribeBoardApplications, ({ subscribeToBoardApplications }) =>
          subscribeToBoardApplications((applications) => {
            dispatch({ type: 'SET_APPLICANTS', payload: applications as Application[] });
          }),
        );
      } else {
        dispatch({ type: 'SET_APPLICANTS', payload: [] });
      }

      // Team applications: admin-only subscription
      if (unsubscribeTeamApplications.current) {
        try { unsubscribeTeamApplications.current(); } catch { /* ignore */ }
        unsubscribeTeamApplications.current = null;
      }
      if (includeUnpublished) {
        attach(import('@/lib/firestore/teamApplications'), unsubscribeTeamApplications, ({ subscribeToTeamApplications }) =>
          subscribeToTeamApplications((applications) => {
            dispatch({ type: 'SET_TEAM_APPLICATIONS', payload: applications as TeamApplication[] });
          }),
        );
      } else {
        dispatch({ type: 'SET_TEAM_APPLICATIONS', payload: [] });
      }

      // Campaigns: public visitors only see open campaigns; admins see all (incl. drafts)
      if (unsubscribeCampaigns.current) {
        try { unsubscribeCampaigns.current(); } catch { /* ignore */ }
        unsubscribeCampaigns.current = null;
      }
      attach(import('@/lib/firestore/applicationCampaigns'), unsubscribeCampaigns, ({ subscribeToCampaigns }) =>
        subscribeToCampaigns((campaigns) => {
          dispatch({ type: 'SET_CAMPAIGNS', payload: campaigns });
          dispatch({ type: 'SET_CAMPAIGNS_LOADED', payload: true });
        }, { includeAll: includeUnpublished }),
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
      if (unsubscribeBoardPositions.current) {
        try { unsubscribeBoardPositions.current(); } catch { /* ignore */ }
      }
      if (unsubscribeBoardApplications.current) {
        try { unsubscribeBoardApplications.current(); } catch { /* ignore */ }
      }
      if (unsubscribeCampaigns.current) {
        try { unsubscribeCampaigns.current(); } catch { /* ignore */ }
      }
      if (unsubscribeTeamApplications.current) {
        try { unsubscribeTeamApplications.current(); } catch { /* ignore */ }
      }
      if (unsubscribeBlogPosts.current) {
        try { unsubscribeBlogPosts.current(); } catch { /* ignore */ }
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
          case 'ADD_BOARDPOS':
            await (await import('@/lib/firestore/board-positions')).addPosition(action.payload);
            break;
          case 'UPDATE_BOARDPOS':
            await (await import('@/lib/firestore/board-positions')).updatePosition(action.payload.id, action.payload);
            break;
          case 'DELETE_BOARDPOS':
            await (await import('@/lib/firestore/board-positions')).deletePosition(action.payload);
            break;
          case 'MOVE_BOARDPOS':
            await (await import('@/lib/firestore/board-positions')).movePosition(state.boardPositions, action.payload.positionId, action.payload.direction);
            break;
          case 'ADD_JOB':
            return await (await import('@/lib/firestore/jobs')).addJob(action.payload);
          case 'UPDATE_JOB':
            await (await import('@/lib/firestore/jobs')).updateJob(action.payload.id, action.payload);
            break;
          case 'DELETE_JOB':
            await (await import('@/lib/firestore/jobs')).deleteJob(action.payload);
            break;
          case 'DELETE_BOARD_APPLICATION':
            await (await import('@/lib/firestore/boardApplications')).deleteBoardApplication(action.payload);
            break;
          case 'ADD_CAMPAIGN':
            return await (await import('@/lib/firestore/applicationCampaigns')).addCampaign(action.payload);
          case 'UPDATE_CAMPAIGN':
            if (action.payload.id) {
              await (await import('@/lib/firestore/applicationCampaigns')).updateCampaign(action.payload.id, action.payload);
            }
            break;
          case 'DELETE_CAMPAIGN':
            await (await import('@/lib/firestore/applicationCampaigns')).deleteCampaign(action.payload);
            // Also clean up campaign questions
            try { await (await import('@/lib/firestore/campaignQuestions')).deleteCampaignQuestionsByCampaign(action.payload); } catch { /* ignore */ }
            break;
          case 'DELETE_TEAM_APPLICATION':
            await (await import('@/lib/firestore/teamApplications')).deleteTeamApplication(action.payload);
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