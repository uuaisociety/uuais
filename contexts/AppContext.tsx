'use client'

import React, { createContext, useContext, useReducer, ReactNode, useEffect } from 'react';
import { Event, TeamMember, BlogPost, FAQ, Job } from '../types';
import { subscribeToEvents, addEvent as addEventToFirestore, updateEvent as updateEventInFirestore, deleteEvent as deleteEventFromFirestore } from '@/lib/firestore/events';
import { auth } from '@/lib/firebase-client';
import { onIdTokenChanged } from 'firebase/auth';
import { subscribeToTeamMembers, addTeamMember as addTeamMemberToFirestore, updateTeamMember as updateTeamMemberInFirestore, deleteTeamMember as deleteTeamMemberFromFirestore } from '@/lib/firestore/team';
import { subscribeToBlogPosts, addBlogPost as addBlogPostToFirestore, updateBlogPost as updateBlogPostInFirestore, deleteBlogPost as deleteBlogPostFromFirestore } from '@/lib/firestore/blog';
import { subscribeToFaqs, addFaq as addFaqToFirestore, updateFaq as updateFaqInFirestore, deleteFaq as deleteFaqFromFirestore } from '@/lib/firestore/faqs';
import { subscribeToJobs, addJob as addJobToFirestore, updateJob as updateJobInFirestore, deleteJob as deleteJobFromFirestore } from '@/lib/firestore/jobs';

interface AppState {
  events: Event[];
  teamMembers: TeamMember[];
  blogPosts: BlogPost[];
  faqs: FAQ[];
  jobs: Job[];
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
  | { type: 'DELETE_JOB'; payload: string };

type FirestoreAction = 
  | { firestoreAction: 'ADD_EVENT'; payload: Omit<Event, 'id'> }
  | { firestoreAction: 'UPDATE_EVENT'; payload: Event }
  | { firestoreAction: 'DELETE_EVENT'; payload: string }
  | { firestoreAction: 'ADD_TEAM_MEMBER'; payload: Omit<TeamMember, 'id'> }
  | { firestoreAction: 'UPDATE_TEAM_MEMBER'; payload: TeamMember }
  | { firestoreAction: 'DELETE_TEAM_MEMBER'; payload: string }
  | { firestoreAction: 'ADD_BLOG_POST'; payload: Omit<BlogPost, 'id'> }
  | { firestoreAction: 'UPDATE_BLOG_POST'; payload: BlogPost }
  | { firestoreAction: 'DELETE_BLOG_POST'; payload: string }
  | { firestoreAction: 'ADD_FAQS'; payload: Omit<FAQ, 'id'> }
  | { firestoreAction: 'UPDATE_FAQS'; payload: FAQ }
  | { firestoreAction: 'DELETE_FAQS'; payload: string }
  | { firestoreAction: 'ADD_JOB'; payload: Omit<Job, 'id' | 'createdAt'> }
  | { firestoreAction: 'UPDATE_JOB'; payload: Job }
  | { firestoreAction: 'DELETE_JOB'; payload: string };

const initialState: AppState = {
  events: [],
  teamMembers: [],
  blogPosts: [],
  faqs: [],
  jobs: [],
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
      return { ...state, events: action.payload };
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
      return { ...state, blogPosts: action.payload };
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
    default:
      return state;
  }
};

const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction | FirestoreAction>;
} | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Set up real-time listeners for Firestore
  useEffect(() => {
    // Track the unsubscribe function for events so we can re-subscribe when admin status changes
    let unsubscribeEvents: (() => void) | null = null;
    let unsubscribeJobs: (() => void) | null = null;

    const subscribe = (includeUnpublished = false) => {
      // includeUnpublished: boolean indicates admin status

      // Unsubscribe previous
      if (unsubscribeEvents) {
        try { unsubscribeEvents(); } catch { /* ignore */ }
        unsubscribeEvents = null;
      }
      unsubscribeEvents = subscribeToEvents((events) => {
        dispatch({ type: 'SET_EVENTS', payload: events });
      }, { includeUnpublished });

      if (unsubscribeJobs)  {
        try { unsubscribeJobs(); } catch { /* ignore */ }
        unsubscribeJobs = null;
      }
      unsubscribeJobs = subscribeToJobs((jobs) => {
        dispatch({ type: 'SET_JOBS', payload: jobs });
      }, { includeUnpublished });

    };

    // Initial subscription: assume not admin (public)
    subscribe(false);

    // Other static subscriptions that don't depend on auth
    const unsubscribeTeamMembers = subscribeToTeamMembers((members) => {
      dispatch({ type: 'SET_TEAM_MEMBERS', payload: members });
    });

    const unsubscribeBlogPosts = subscribeToBlogPosts((posts) => {
      dispatch({ type: 'SET_BLOG_POSTS', payload: posts });
    });
    const unsubscribeFaqs = subscribeToFaqs((faqs) => {
      dispatch({ type: 'SET_FAQS', payload: faqs });
    });
    

    // Listen for ID token changes to detect admin claim changes.
    const idTokenUnsub = onIdTokenChanged(auth, async (user) => {
      if (!user) {
        // Not signed in — ensure public subscription
        subscribe(false);
        return;
      }

      // Refresh token to ensure custom claims are present
      const tokenResult = await user.getIdTokenResult(true);
      const adminClaim = !!tokenResult.claims.admin;
      // Re-subscribe with adminClaim (true/false)
      subscribe(adminClaim);
    });

    // Cleanup subscriptions on unmount
    return () => {
      if (unsubscribeEvents) {
        try { unsubscribeEvents(); } catch { /* ignore */ }
      }
      unsubscribeTeamMembers();
      unsubscribeBlogPosts();
      unsubscribeFaqs();
      idTokenUnsub();
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
            await addEventToFirestore(action.payload);
            // Real-time listener will update the state
            break;
          case 'UPDATE_EVENT':
            await updateEventInFirestore(action.payload.id, action.payload);
            break;
          case 'DELETE_EVENT':
            await deleteEventFromFirestore(action.payload);
            break;
          case 'ADD_TEAM_MEMBER':
            await addTeamMemberToFirestore(action.payload);
            break;
          case 'UPDATE_TEAM_MEMBER':
            await updateTeamMemberInFirestore(action.payload.id, action.payload);
            break;
          case 'DELETE_TEAM_MEMBER':
            await deleteTeamMemberFromFirestore(action.payload);
            break;
          case 'ADD_BLOG_POST':
            await addBlogPostToFirestore(action.payload);
            break;
          case 'UPDATE_BLOG_POST':
            await updateBlogPostInFirestore(action.payload.id, action.payload);
            break;
          case 'DELETE_BLOG_POST':
            await deleteBlogPostFromFirestore(action.payload);
            break;
          case 'ADD_FAQS':
            await addFaqToFirestore(action.payload);
            break;
          case 'UPDATE_FAQS':
            await updateFaqInFirestore(action.payload.id, action.payload);
            break;
          case 'DELETE_FAQS':
            await deleteFaqFromFirestore(action.payload);
            break;
          case 'ADD_JOB':
            await addJobToFirestore(action.payload);
            break;
          case 'UPDATE_JOB':
            await updateJobInFirestore(action.payload.id, action.payload);
            break;
          case 'DELETE_JOB':
            await deleteJobFromFirestore(action.payload);
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