import { 
  collection, 
  doc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot,
  query,
  orderBy 
} from 'firebase/firestore';
import { db } from './firebase-client';
import { Event, TeamMember, BlogPost } from '@/types';

// Events
export const getEvents = async (): Promise<Event[]> => {
  const eventsRef = collection(db, 'events');
  const q = query(eventsRef, orderBy('date', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Event));
};

export const addEvent = async (event: Omit<Event, 'id'>): Promise<string> => {
  const eventsRef = collection(db, 'events');
  const docRef = await addDoc(eventsRef, event);
  return docRef.id;
};

export const updateEvent = async (id: string, event: Partial<Event>): Promise<void> => {
  const eventRef = doc(db, 'events', id);
  await updateDoc(eventRef, event);
};

export const deleteEvent = async (id: string): Promise<void> => {
  const eventRef = doc(db, 'events', id);
  await deleteDoc(eventRef);
};

// Team Members
export const getTeamMembers = async (): Promise<TeamMember[]> => {
  const membersRef = collection(db, 'teamMembers');
  const snapshot = await getDocs(membersRef);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TeamMember));
};

export const addTeamMember = async (member: Omit<TeamMember, 'id'>): Promise<string> => {
  const membersRef = collection(db, 'teamMembers');
  const docRef = await addDoc(membersRef, member);
  return docRef.id;
};

export const updateTeamMember = async (id: string, member: Partial<TeamMember>): Promise<void> => {
  const memberRef = doc(db, 'teamMembers', id);
  await updateDoc(memberRef, member);
};

export const deleteTeamMember = async (id: string): Promise<void> => {
  const memberRef = doc(db, 'teamMembers', id);
  await deleteDoc(memberRef);
};

// Blog Posts
export const getBlogPosts = async (): Promise<BlogPost[]> => {
  const postsRef = collection(db, 'blogPosts');
  const q = query(postsRef, orderBy('date', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BlogPost));
};

export const addBlogPost = async (post: Omit<BlogPost, 'id'>): Promise<string> => {
  const postsRef = collection(db, 'blogPosts');
  const docRef = await addDoc(postsRef, post);
  return docRef.id;
};

export const updateBlogPost = async (id: string, post: Partial<BlogPost>): Promise<void> => {
  const postRef = doc(db, 'blogPosts', id);
  await updateDoc(postRef, post);
};

export const deleteBlogPost = async (id: string): Promise<void> => {
  const postRef = doc(db, 'blogPosts', id);
  await deleteDoc(postRef);
};

// Real-time listeners
export const subscribeToEvents = (callback: (events: Event[]) => void) => {
  const eventsRef = collection(db, 'events');
  const q = query(eventsRef, orderBy('date', 'asc'));
  return onSnapshot(q, (snapshot) => {
    const events = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Event));
    callback(events);
  });
};

export const subscribeToTeamMembers = (callback: (members: TeamMember[]) => void) => {
  const membersRef = collection(db, 'teamMembers');
  return onSnapshot(membersRef, (snapshot) => {
    const members = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TeamMember));
    callback(members);
  });
};

export const subscribeToBlogPosts = (callback: (posts: BlogPost[]) => void) => {
  const postsRef = collection(db, 'blogPosts');
  const q = query(postsRef, orderBy('date', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const posts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BlogPost));
    callback(posts);
  });
};
