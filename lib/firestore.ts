import { 
  collection, 
  doc, 
  getDocs, 
  getDoc,
  addDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  increment,
  where 
} from 'firebase/firestore';
import { db } from './firebase-client';
import { Event, TeamMember, BlogPost, FAQ, RegistrationQuestion, EventRegistration, EventCustomQuestion } from '@/types';

// Events
export const getEvents = async (): Promise<Event[]> => {
  const eventsRef = collection(db, 'events');
  const q = query(eventsRef, orderBy('date', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Event));
};

export const getAllEvents = async (): Promise<Event[]> => {
  return getEvents();
};

export const getEventById = async (id: string): Promise<Event | null> => {
  const eventRef = doc(db, 'events', id);
  const eventSnap = await getDoc(eventRef);
  
  if (eventSnap.exists()) {
    return { id: eventSnap.id, ...eventSnap.data() } as Event;
  } else {
    return null;
  }
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

export const getBlogPostById = async (id: string): Promise<BlogPost | null> => {
  const postRef = doc(db, 'blogPosts', id);
  const postSnap = await getDoc(postRef);
  
  if (postSnap.exists()) {
    return { id: postSnap.id, ...postSnap.data() } as BlogPost;
  } else {
    return null;
  }
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

// FAQs
export const getFaqs = async (): Promise<FAQ[]> => {
  const faqsRef = collection(db, 'faqs');
  const q = query(faqsRef, orderBy('order', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FAQ));
};

export const addFaq = async (faq: Omit<FAQ, 'id'>): Promise<string> => {
  const faqsRef = collection(db, 'faqs');
  const docRef = await addDoc(faqsRef, faq);
  return docRef.id;
};

export const updateFaq = async (id: string, faq: Partial<FAQ>): Promise<void> => {
  const faqRef = doc(db, 'faqs', id);
  await updateDoc(faqRef, faq);
};

export const deleteFaq = async (id: string): Promise<void> => {
  const faqRef = doc(db, 'faqs', id);
  await deleteDoc(faqRef);
};

export const subscribeToFaqs = (callback: (faqs: FAQ[]) => void) => {
  const faqsRef = collection(db, 'faqs');
  const q = query(faqsRef, orderBy('order', 'asc'));
  return onSnapshot(q, (snapshot) => {
    const faqs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FAQ));
    callback(faqs);
  });
};

// Registration Questions
export const getRegistrationQuestions = async (): Promise<RegistrationQuestion[]> => {
  const rqRef = collection(db, 'registrationQuestions');
  const snapshot = await getDocs(rqRef);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RegistrationQuestion));
};

export const addRegistrationQuestion = async (rq: Omit<RegistrationQuestion, 'id'>): Promise<string> => {
  const rqRef = collection(db, 'registrationQuestions');
  const docRef = await addDoc(rqRef, rq);
  return docRef.id;
};

export const updateRegistrationQuestion = async (id: string, rq: Partial<RegistrationQuestion>): Promise<void> => {
  const rqRef = doc(db, 'registrationQuestions', id);
  await updateDoc(rqRef, rq);
};

export const deleteRegistrationQuestion = async (id: string): Promise<void> => {
  const rqRef = doc(db, 'registrationQuestions', id);
  await deleteDoc(rqRef);
};

export const subscribeToRegistrationQuestions = (callback: (qs: RegistrationQuestion[]) => void) => {
  const rqRef = collection(db, 'registrationQuestions');
  return onSnapshot(rqRef, (snapshot) => {
    const questions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RegistrationQuestion));
    callback(questions);
  });
};

// Event-specific Custom Questions
export const getEventCustomQuestions = async (eventId: string): Promise<EventCustomQuestion[]> => {
  const cqRef = collection(db, 'eventCustomQuestions');
  const q = query(cqRef, where('eventId', '==', eventId), orderBy('order', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as EventCustomQuestion));
};

export const subscribeToEventCustomQuestions = (
  eventId: string,
  callback: (qs: EventCustomQuestion[]) => void
) => {
  const cqRef = collection(db, 'eventCustomQuestions');
  const qy = query(cqRef, where('eventId', '==', eventId), orderBy('order', 'asc'));
  return onSnapshot(qy, (snapshot) => {
    const qs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as EventCustomQuestion));
    callback(qs);
  });
};

export const addEventCustomQuestion = async (
  question: Omit<EventCustomQuestion, 'id'>
): Promise<string> => {
  const cqRef = collection(db, 'eventCustomQuestions');
  const docRef = await addDoc(cqRef, question);
  return docRef.id;
};

export const updateEventCustomQuestion = async (
  id: string,
  patch: Partial<EventCustomQuestion>
): Promise<void> => {
  const cqDoc = doc(db, 'eventCustomQuestions', id);
  await updateDoc(cqDoc, patch);
};

export const deleteEventCustomQuestion = async (id: string): Promise<void> => {
  const cqDoc = doc(db, 'eventCustomQuestions', id);
  await deleteDoc(cqDoc);
};

// Event Registrations
export const registerForEvent = async (
  eventId: string,
  payload: Omit<EventRegistration, 'id' | 'eventId' | 'registeredAt' | 'status' | 'userId'> & {
    registrationData: EventRegistration['registrationData'];
    userEmail?: string;
    userName?: string;
  },
  options?: { waitlist?: boolean }
): Promise<string> => {
  // Create registration entry
  const regRef = collection(db, 'registrations');
  const status: EventRegistration['status'] = options?.waitlist ? 'waitlist' : 'registered';
  type EventRegistrationDoc = {
    eventId: string;
    registrationData: EventRegistration['registrationData'];
    registeredAt: ReturnType<typeof serverTimestamp>;
    status: EventRegistration['status'];
    userEmail: string | null;
    userName: string | null;
  };
  const regDoc: EventRegistrationDoc = {
    eventId,
    registrationData: payload.registrationData,
    registeredAt: serverTimestamp(),
    status,
    userEmail: payload.userEmail || null,
    userName: payload.userName || null,
  };
  const docRef = await addDoc(regRef, regDoc);

  // If not waitlist, increment currentRegistrations on event
  if (!options?.waitlist) {
    const eventRef = doc(db, 'events', eventId);
    await updateDoc(eventRef, { currentRegistrations: increment(1) });
  }

  return docRef.id;
};
