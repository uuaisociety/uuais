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
  where,
  setDoc,
  DocumentData,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase-client';
import { Event, TeamMember, BlogPost, FAQ, RegistrationQuestion, EventRegistration, EventCustomQuestion } from '@/types';

// Events
export const getEvents = async (): Promise<Event[]> => {
  const eventsRef = collection(db, 'events');
  // Prefer ordering by startAt when present
  const qy = query(eventsRef, orderBy('startAt', 'asc'));
  const snapshot = await getDocs(qy);
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
  // Initialize analytics document so the Admin dashboard always has an entry
  try {
    const analyticsRef = doc(db, 'analyticsEvents', docRef.id);
    await setDoc(
      analyticsRef,
      { clicks: 0, updatedAt: serverTimestamp() },
      { merge: true }
    );
  } catch {}
  return docRef.id;
};

// ----------------------------
// Client-side Analytics Helpers
// ----------------------------

// function todayKey() {
//   const d = new Date();
//   const mm = String(d.getMonth() + 1).padStart(2, '0');
//   const dd = String(d.getDate()).padStart(2, '0');
//   return `${d.getFullYear()}${mm}${dd}`;
// }

/**
 * Increment unique event clicks.
 * Writes to collection 'analyticsEvents', doc {eventId}, field 'clicks'.
 */
export async function incrementEventUniqueClick(eventId: string): Promise<void> {
  try {
    if (typeof window === 'undefined') return;
    const key = `clicked_event_${eventId}`;
    if (localStorage.getItem(key) === '1') return;
    localStorage.setItem(key, '1');
    const ref = doc(db, 'analyticsEvents', eventId);
    // Using setDoc with merge and increment guarantees doc creation and atomic increment
    await setDoc(ref, { clicks: increment(1), updatedAt: serverTimestamp() }, { merge: true });
  } catch (e) {
    // Non-fatal
    console.warn('incrementEventUniqueClick failed', e);
  }
}

/**
 * Increment unique blog reads.
 * Writes to collection 'analyticsBlogs', doc {blogId}, field 'reads'.
 */
export async function incrementBlogRead(blogId: string): Promise<void> {
  try {
    if (typeof window === 'undefined') return;
    const key = `read_blog_${blogId}`;
    if (localStorage.getItem(key) === '1') return;
    localStorage.setItem(key, '1');
    const ref = doc(db, 'analyticsBlogs', blogId);
    await setDoc(ref, { reads: increment(1), updatedAt: serverTimestamp() }, { merge: true });
  } catch (e) {
    console.warn('incrementBlogRead failed', e);
  }
}

/**
 * Fetch clicks counts for a list of event IDs.
 */
export async function getEventClicksCounts(ids: string[]): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  await Promise.all(ids.map(async (id) => {
    const d = await getDoc(doc(db, 'analyticsEvents', id));
    const data: DocumentData | undefined = d.exists() ? d.data() : undefined;
    counts[id] = data?.clicks ?? 0;
  }));
  return counts;
}

/**
 * Fetch reads counts for a list of blog IDs.
 */
export async function getBlogReadsCounts(ids: string[]): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  await Promise.all(ids.map(async (id) => {
    const d = await getDoc(doc(db, 'analyticsBlogs', id));
    const data: DocumentData | undefined = d.exists() ? d.data() : undefined;
    counts[id] = data?.reads ?? 0;
  }));
  return counts;
}

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
  // Initialize analytics document so the Admin dashboard always has an entry
  try {
    const analyticsRef = doc(db, 'analyticsBlogs', docRef.id);
    await setDoc(
      analyticsRef,
      { reads: 0, updatedAt: serverTimestamp() },
      { merge: true }
    );
  } catch {}
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
  const qy = query(eventsRef, orderBy('startAt', 'asc'));
  return onSnapshot(qy, (snapshot) => {
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
  // Create registration entry with validations
  const regRef = collection(db, 'registrations');

  // Normalize inputs for uniqueness checks
  const normalizedEmail = (payload.userEmail || '').trim().toLowerCase();
  const rawPhone = String(payload.registrationData?.phone ?? '').trim();
  const normalizedPhone = rawPhone.replace(/[\s\-()]/g, '');

  // Load event for capacity and lastRegistrationAt checks
  const eventRef = doc(db, 'events', eventId);
  const eventSnap = await getDoc(eventRef);
  const eventData = eventSnap.exists() ? (eventSnap.data() as Partial<Event>) : {};

  const maxCapacity = typeof eventData.maxCapacity === 'number' ? eventData.maxCapacity : undefined;
  const currentRegistrations = typeof eventData.currentRegistrations === 'number' ? eventData.currentRegistrations : 0;
  const isCapacityFull = typeof maxCapacity === 'number' ? currentRegistrations >= maxCapacity : false;

  const lastRegistrationAtIso = eventData.lastRegistrationAt;
  const now = new Date();
  const isAfterLastRegistration = typeof lastRegistrationAtIso === 'string' && lastRegistrationAtIso
    ? now.getTime() > new Date(lastRegistrationAtIso).getTime()
    : false;

  // Enforce single registration per event by email or phone (no login required)
  // Prefer efficient queries; if missing index, fall back to client-side filter by event.
  const duplicates: string[] = [];
  try {
    if (normalizedEmail) {
      const q1 = query(regRef, where('eventId', '==', eventId), where('registrationData.email', '==', normalizedEmail));
      const s1 = await getDocs(q1);
      if (!s1.empty) duplicates.push('email');
    }
    if (normalizedPhone) {
      const q2 = query(regRef, where('eventId', '==', eventId), where('registrationData.phone', '==', normalizedPhone));
      const s2 = await getDocs(q2);
      if (!s2.empty) duplicates.push('phone');
    }
  } catch {
    // Likely missing index. Fallback to fetch-by-event and filter client-side.
    const qAll = query(regRef, where('eventId', '==', eventId));
    const all = await getDocs(qAll);
    for (const d of all.docs) {
      const data = d.data() as DocumentData;
      const eEmail = String((data?.registrationData as DocumentData | undefined)?.email ?? '').trim().toLowerCase();
      const ePhone = String((data?.registrationData as DocumentData | undefined)?.phone ?? '').trim().replace(/[\s\-()]/g, '');
      if (normalizedEmail && eEmail && eEmail === normalizedEmail) duplicates.push('email');
      if (normalizedPhone && ePhone && ePhone === normalizedPhone) duplicates.push('phone');
      if (duplicates.length) break;
    }
  }

  if (duplicates.length) {
    throw new Error('You have already registered for this event using the same contact details.');
  }

  // Determine final status
  const status: EventRegistration['status'] = (options?.waitlist || isCapacityFull || isAfterLastRegistration)
    ? 'waitlist'
    : 'registered';
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
  if (status === 'registered') {
    await updateDoc(eventRef, { currentRegistrations: increment(1) });
  }

  return docRef.id;
};

// Fetch registrations for a specific event
export const getEventRegistrations = async (
  eventId: string
): Promise<EventRegistration[]> => {
  const regRef = collection(db, 'registrations');
  const qy = query(regRef, where('eventId', '==', eventId));
  const snapshot = await getDocs(qy);
  return snapshot.docs.map((d) => {
    const data: DocumentData | undefined = d.exists() ? d.data() : undefined;
    const ts = data?.registeredAt;
    const registeredAt = ts instanceof Timestamp
      ? ts.toDate().toISOString()
      : '';
    const registrationData = (data?.registrationData ?? {}) as EventRegistration['registrationData'];
    return {
      id: d.id,
      eventId: data?.eventId ?? '',
      userId: data?.userId ?? '',
      registrationData,
      registeredAt,
      status: data?.status ?? 'registered',
    } as EventRegistration;
  });
};

// Subscribe to registrations for a specific event
export const subscribeToEventRegistrations = (
  eventId: string,
  callback: (regs: EventRegistration[]) => void
) => {
  const regRef = collection(db, 'registrations');
  const qy = query(regRef, where('eventId', '==', eventId));
  return onSnapshot(qy, (snapshot) => {
    const regs: EventRegistration[] = snapshot.docs.map((d) => {
      const data: DocumentData | undefined = d.exists() ? d.data() : undefined;
      const ts = data?.registeredAt;
      const registeredAt = ts instanceof Timestamp
        ? ts.toDate().toISOString()
        : '';
      const registrationData = (data?.registrationData ?? {}) as EventRegistration['registrationData'];
      return {
        id: d.id,
        eventId: data?.eventId ?? '',
        userId: data?.userId ?? '',
        registrationData,
        registeredAt,
        status: data?.status ?? 'registered',
      } as EventRegistration;
    });
    callback(regs);
  });
};
