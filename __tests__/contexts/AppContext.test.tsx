import { renderHook, act } from '@testing-library/react';
import React from 'react';

const mockUnsubscribe = jest.fn();

jest.mock('@/contexts/AppContext', () => jest.requireActual('@/contexts/AppContext'));

jest.mock('firebase/auth', () => ({
  onIdTokenChanged: jest.fn(),
}));

jest.mock('@/lib/firebase-client', () => ({
  auth: {},
}));

jest.mock('@/lib/firestore/events', () => ({
  subscribeToEvents: jest.fn(() => mockUnsubscribe),
  addEvent: jest.fn(),
  updateEvent: jest.fn(),
  deleteEvent: jest.fn(),
}));

jest.mock('@/lib/firestore/team', () => ({
  subscribeToTeamMembers: jest.fn(() => mockUnsubscribe),
  addTeamMember: jest.fn(),
  updateTeamMember: jest.fn(),
  deleteTeamMember: jest.fn(),
  moveTeamMember: jest.fn(),
}));

jest.mock('@/lib/firestore/blog', () => ({
  subscribeToBlogPosts: jest.fn(() => mockUnsubscribe),
  addBlogPost: jest.fn(),
  updateBlogPost: jest.fn(),
  deleteBlogPost: jest.fn(),
}));

jest.mock('@/lib/firestore/faqs', () => ({
  subscribeToFaqs: jest.fn(() => mockUnsubscribe),
  addFaq: jest.fn(),
  updateFaq: jest.fn(),
  deleteFaq: jest.fn(),
}));

jest.mock('@/lib/firestore/jobs', () => ({
  subscribeToJobs: jest.fn(() => mockUnsubscribe),
  addJob: jest.fn(),
  updateJob: jest.fn(),
  deleteJob: jest.fn(),
}));

jest.mock('@/lib/firestore/board-positions', () => ({
  subscribeToPositions: jest.fn(() => mockUnsubscribe),
  addPosition: jest.fn(),
  updatePosition: jest.fn(),
  deletePosition: jest.fn(),
  movePosition: jest.fn(),
}));

jest.mock('@/lib/firestore/boardApplications', () => ({
  subscribeToBoardApplications: jest.fn(() => mockUnsubscribe),
  deleteBoardApplication: jest.fn(),
}));

import { AppProvider, useApp } from '@/contexts/AppContext';
import {
  subscribeToEvents, addEvent, updateEvent, deleteEvent,
} from '@/lib/firestore/events';
import {
  subscribeToTeamMembers, addTeamMember, moveTeamMember,
} from '@/lib/firestore/team';
import {
  subscribeToBlogPosts, addBlogPost, updateBlogPost, deleteBlogPost,
} from '@/lib/firestore/blog';
import {
  subscribeToFaqs, addFaq, updateFaq, deleteFaq,
} from '@/lib/firestore/faqs';
import {
  subscribeToJobs, addJob, updateJob, deleteJob,
} from '@/lib/firestore/jobs';
import {
  subscribeToPositions, addPosition, deletePosition, movePosition,
} from '@/lib/firestore/board-positions';
import { deleteBoardApplication } from '@/lib/firestore/boardApplications';
import { onIdTokenChanged } from 'firebase/auth';

const mockEvent = { id: 'evt-1', title: 'Test Event', description: 'Desc', location: 'Loc', image: '', category: 'workshop' as const, status: 'upcoming' as const, registrationRequired: false, eventStartAt: '2026-01-01T00:00:00Z' };
const mockTeamMember = { id: 'tm-1', name: 'Alice', position: 'Dev' };
const mockBlogPost = { id: 'bp-1', title: 'Post', excerpt: 'Excerpt', content: 'Content', author: 'Bob', date: '2026-01-01', image: '', tags: [], published: true };
const mockFaq = { id: 'faq-1', question: 'Q?', answer: 'A!', category: 'general', order: 0, published: true };
const mockJob = { id: 'job-1', type: 'job' as const, title: 'Engineer', company: 'Co', description: 'desc', published: true };
const mockBoardPosition = { id: 'bp-1', title: 'Chair', short: 'CH', description: 'Lead', order: 1 };

function renderApp() {
  return renderHook(() => useApp(), { wrapper: AppProvider as React.FC<{ children: React.ReactNode }> });
}

describe('AppContext', () => {
  let idTokenCallback: ((user: { uid: string; getIdTokenResult?: () => Promise<{ claims: Record<string, boolean> }> } | null) => void) | null = null;

  beforeEach(() => {
    jest.clearAllMocks();
    idTokenCallback = null;
    (onIdTokenChanged as jest.Mock).mockImplementation((_auth, cb) => {
      idTokenCallback = cb;
      return mockUnsubscribe;
    });
  });

  it('provides default state', () => {
    const { result } = renderApp();
    expect(result.current.state.events).toEqual([]);
    expect(result.current.state.teamMembers).toEqual([]);
    expect(result.current.state.blogPosts).toEqual([]);
    expect(result.current.state.faqs).toEqual([]);
    expect(result.current.state.jobs).toEqual([]);
    expect(result.current.state.boardPositions).toEqual([]);
    expect(result.current.state.applicants).toEqual([]);
    expect(result.current.state.isLoading).toBe(false);
    expect(result.current.state.error).toBeNull();
  });

  it('subscribes to firestore collections and id token changes on mount', () => {
    renderApp();
    expect(subscribeToEvents).toHaveBeenCalledTimes(1);
    expect(subscribeToTeamMembers).toHaveBeenCalledTimes(1);
    expect(subscribeToBlogPosts).toHaveBeenCalledTimes(1);
    expect(subscribeToFaqs).toHaveBeenCalledTimes(1);
    expect(subscribeToJobs).toHaveBeenCalledTimes(1);
    expect(subscribeToPositions).toHaveBeenCalledTimes(1);
    expect(onIdTokenChanged).toHaveBeenCalledTimes(1);
    expect(idTokenCallback).not.toBeNull();
  });

  it('throws useApp outside provider', () => {
    expect(() => renderHook(() => useApp())).toThrow('useApp must be used within an AppProvider');
  });

  describe('dispatch regular actions', () => {
    it('SET_EVENTS', async () => {
      const { result } = renderApp();
      await act(async () => {
        await result.current.dispatch({ type: 'SET_EVENTS', payload: [mockEvent] });
      });
      expect(result.current.state.events).toEqual([mockEvent]);
      expect(result.current.state.isLoading).toBe(false);
    });

    it('ADD_EVENT', async () => {
      const { result } = renderApp();
      await act(async () => {
        await result.current.dispatch({ type: 'ADD_EVENT', payload: mockEvent });
      });
      expect(result.current.state.events).toEqual([mockEvent]);
    });

    it('UPDATE_EVENT', async () => {
      const { result } = renderApp();
      await act(async () => {
        await result.current.dispatch({ type: 'SET_EVENTS', payload: [mockEvent] });
      });
      const updated = { ...mockEvent, title: 'Updated' };
      await act(async () => {
        await result.current.dispatch({ type: 'UPDATE_EVENT', payload: updated });
      });
      expect(result.current.state.events).toEqual([updated]);
    });

    it('DELETE_EVENT', async () => {
      const { result } = renderApp();
      await act(async () => {
        await result.current.dispatch({ type: 'SET_EVENTS', payload: [mockEvent] });
      });
      await act(async () => {
        await result.current.dispatch({ type: 'DELETE_EVENT', payload: mockEvent.id });
      });
      expect(result.current.state.events).toEqual([]);
    });

    it('SET_TEAM_MEMBERS', async () => {
      const { result } = renderApp();
      await act(async () => {
        await result.current.dispatch({ type: 'SET_TEAM_MEMBERS', payload: [mockTeamMember] });
      });
      expect(result.current.state.teamMembers).toEqual([mockTeamMember]);
    });

    it('ADD_TEAM_MEMBER', async () => {
      const { result } = renderApp();
      await act(async () => {
        await result.current.dispatch({ type: 'ADD_TEAM_MEMBER', payload: mockTeamMember });
      });
      expect(result.current.state.teamMembers).toEqual([mockTeamMember]);
    });

    it('UPDATE_TEAM_MEMBER', async () => {
      const { result } = renderApp();
      await act(async () => {
        await result.current.dispatch({ type: 'SET_TEAM_MEMBERS', payload: [mockTeamMember] });
      });
      const updated = { ...mockTeamMember, name: 'Updated Alice' };
      await act(async () => {
        await result.current.dispatch({ type: 'UPDATE_TEAM_MEMBER', payload: updated });
      });
      expect(result.current.state.teamMembers).toEqual([updated]);
    });

    it('DELETE_TEAM_MEMBER', async () => {
      const { result } = renderApp();
      await act(async () => {
        await result.current.dispatch({ type: 'SET_TEAM_MEMBERS', payload: [mockTeamMember] });
      });
      await act(async () => {
        await result.current.dispatch({ type: 'DELETE_TEAM_MEMBER', payload: mockTeamMember.id });
      });
      expect(result.current.state.teamMembers).toEqual([]);
    });

    it('SET_BLOG_POSTS', async () => {
      const { result } = renderApp();
      await act(async () => {
        await result.current.dispatch({ type: 'SET_BLOG_POSTS', payload: [mockBlogPost] });
      });
      expect(result.current.state.blogPosts).toEqual([mockBlogPost]);
    });

    it('SET_FAQS', async () => {
      const { result } = renderApp();
      await act(async () => {
        await result.current.dispatch({ type: 'SET_FAQS', payload: [mockFaq] });
      });
      expect(result.current.state.faqs).toEqual([mockFaq]);
    });

    it('SET_JOBS', async () => {
      const { result } = renderApp();
      await act(async () => {
        await result.current.dispatch({ type: 'SET_JOBS', payload: [mockJob] });
      });
      expect(result.current.state.jobs).toEqual([mockJob]);
    });

    it('SET_BOARDPOS', async () => {
      const { result } = renderApp();
      await act(async () => {
        await result.current.dispatch({ type: 'SET_BOARDPOS', payload: [mockBoardPosition] });
      });
      expect(result.current.state.boardPositions).toEqual([mockBoardPosition]);
    });

    it('SET_LOADING and SET_ERROR', async () => {
      const { result } = renderApp();
      await act(async () => {
        await result.current.dispatch({ type: 'SET_LOADING', payload: true });
      });
      expect(result.current.state.isLoading).toBe(false);

      await act(async () => {
        await result.current.dispatch({ type: 'SET_ERROR', payload: 'oops' });
      });
      expect(result.current.state.error).toBe('oops');
    });
  });

  describe('firestoreAction dispatching', () => {
    it('ADD_EVENT calls addEvent', async () => {
      const { result } = renderApp();
      const payload = { title: 'New Event', description: 'Desc', location: 'Loc', image: '', category: 'workshop' as const, status: 'upcoming' as const, registrationRequired: false, eventStartAt: '2026-01-01T00:00:00Z' };
      await act(async () => {
        await result.current.dispatch({ firestoreAction: 'ADD_EVENT', payload });
      });
      expect(addEvent).toHaveBeenCalledWith(payload);
    });

    it('UPDATE_EVENT calls updateEvent', async () => {
      const { result } = renderApp();
      await act(async () => {
        await result.current.dispatch({ firestoreAction: 'UPDATE_EVENT', payload: mockEvent });
      });
      expect(updateEvent).toHaveBeenCalledWith(mockEvent.id, mockEvent);
    });

    it('DELETE_EVENT calls deleteEvent', async () => {
      const { result } = renderApp();
      await act(async () => {
        await result.current.dispatch({ firestoreAction: 'DELETE_EVENT', payload: 'evt-1' });
      });
      expect(deleteEvent).toHaveBeenCalledWith('evt-1');
    });

    it('ADD_TEAM_MEMBER calls addTeamMember', async () => {
      const { result } = renderApp();
      const payload = { name: 'Bob', position: 'Dev' };
      await act(async () => {
        await result.current.dispatch({ firestoreAction: 'ADD_TEAM_MEMBER', payload });
      });
      expect(addTeamMember).toHaveBeenCalledWith(payload);
    });

    it('MOVE_TEAM_MEMBER calls moveTeamMember with current state', async () => {
      const { result } = renderApp();
      await act(async () => {
        await result.current.dispatch({ type: 'SET_TEAM_MEMBERS', payload: [mockTeamMember] });
      });
      await act(async () => {
        await result.current.dispatch({ firestoreAction: 'MOVE_TEAM_MEMBER', payload: { memberId: 'tm-1', direction: 'up' } });
      });
      expect(moveTeamMember).toHaveBeenCalledWith([mockTeamMember], 'tm-1', 'up');
    });

    it('ADD_BLOG_POST calls addBlogPost', async () => {
      const { result } = renderApp();
      const payload = { title: 'New Post', excerpt: 'Excerpt', content: 'Content', author: 'A', date: '2026-01-01', image: '', tags: [], published: true };
      await act(async () => {
        await result.current.dispatch({ firestoreAction: 'ADD_BLOG_POST', payload });
      });
      expect(addBlogPost).toHaveBeenCalledWith(payload);
    });

    it('UPDATE_BLOG_POST calls updateBlogPost', async () => {
      const { result } = renderApp();
      await act(async () => {
        await result.current.dispatch({ firestoreAction: 'UPDATE_BLOG_POST', payload: mockBlogPost });
      });
      expect(updateBlogPost).toHaveBeenCalledWith(mockBlogPost.id, mockBlogPost);
    });

    it('DELETE_BLOG_POST calls deleteBlogPost', async () => {
      const { result } = renderApp();
      await act(async () => {
        await result.current.dispatch({ firestoreAction: 'DELETE_BLOG_POST', payload: 'bp-1' });
      });
      expect(deleteBlogPost).toHaveBeenCalledWith('bp-1');
    });

    it('ADD_FAQS calls addFaq', async () => {
      const { result } = renderApp();
      const payload = { question: 'Q?', answer: 'A!', category: 'general', order: 0, published: true };
      await act(async () => {
        await result.current.dispatch({ firestoreAction: 'ADD_FAQS', payload });
      });
      expect(addFaq).toHaveBeenCalledWith(payload);
    });

    it('UPDATE_FAQS calls updateFaq', async () => {
      const { result } = renderApp();
      await act(async () => {
        await result.current.dispatch({ firestoreAction: 'UPDATE_FAQS', payload: mockFaq });
      });
      expect(updateFaq).toHaveBeenCalledWith(mockFaq.id, mockFaq);
    });

    it('DELETE_FAQS calls deleteFaq', async () => {
      const { result } = renderApp();
      await act(async () => {
        await result.current.dispatch({ firestoreAction: 'DELETE_FAQS', payload: 'faq-1' });
      });
      expect(deleteFaq).toHaveBeenCalledWith('faq-1');
    });

    it('ADD_JOB calls addJob and returns the id', async () => {
      (addJob as jest.Mock).mockResolvedValue('new-job-id');
      const { result } = renderApp();
      const payload = { type: 'job' as const, title: 'Eng', company: 'Co', description: 'desc', published: true };
      const returned = await act(async () => result.current.dispatch({ firestoreAction: 'ADD_JOB', payload }));
      expect(addJob).toHaveBeenCalledWith(payload);
      expect(returned).toBe('new-job-id');
    });

    it('UPDATE_JOB calls updateJob', async () => {
      const { result } = renderApp();
      await act(async () => {
        await result.current.dispatch({ firestoreAction: 'UPDATE_JOB', payload: mockJob });
      });
      expect(updateJob).toHaveBeenCalledWith(mockJob.id, mockJob);
    });

    it('DELETE_JOB calls deleteJob', async () => {
      const { result } = renderApp();
      await act(async () => {
        await result.current.dispatch({ firestoreAction: 'DELETE_JOB', payload: 'job-1' });
      });
      expect(deleteJob).toHaveBeenCalledWith('job-1');
    });

    it('ADD_BOARDPOS calls addPosition', async () => {
      const { result } = renderApp();
      const payload = { title: 'Chair', short: 'CH', description: 'Lead' };
      await act(async () => {
        await result.current.dispatch({ firestoreAction: 'ADD_BOARDPOS', payload });
      });
      expect(addPosition).toHaveBeenCalledWith(payload);
    });

    it('MOVE_BOARDPOS calls movePosition with current state', async () => {
      const { result } = renderApp();
      await act(async () => {
        await result.current.dispatch({ type: 'SET_BOARDPOS', payload: [mockBoardPosition] });
      });
      await act(async () => {
        await result.current.dispatch({ firestoreAction: 'MOVE_BOARDPOS', payload: { positionId: 'bp-1', direction: 'down' } });
      });
      expect(movePosition).toHaveBeenCalledWith([mockBoardPosition], 'bp-1', 'down');
    });

    it('DELETE_BOARDPOS calls deletePosition', async () => {
      const { result } = renderApp();
      await act(async () => {
        await result.current.dispatch({ firestoreAction: 'DELETE_BOARDPOS', payload: 'bp-1' });
      });
      expect(deletePosition).toHaveBeenCalledWith('bp-1');
    });

    it('DELETE_BOARD_APPLICATION calls deleteBoardApplication', async () => {
      const { result } = renderApp();
      await act(async () => {
        await result.current.dispatch({ firestoreAction: 'DELETE_BOARD_APPLICATION', payload: 'app-1' });
      });
      expect(deleteBoardApplication).toHaveBeenCalledWith('app-1');
    });
  });

  it('sets error when firestore action throws', async () => {
    (addEvent as jest.Mock).mockRejectedValue(new Error('db error'));
    const { result } = renderApp();
    await act(async () => {
      await result.current.dispatch({ firestoreAction: 'ADD_EVENT', payload: { title: 'X', description: 'Desc', location: 'L', image: '', category: 'workshop' as const, status: 'upcoming' as const, registrationRequired: false, eventStartAt: '2026-01-01T00:00:00Z' } });
    });
    expect(result.current.state.error).toBe('Failed to sync with database');
  });
});
