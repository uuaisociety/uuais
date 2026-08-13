import type { ApplicationCampaign, BoardPosition, Event, FAQ, Job, TeamMember } from '@/types';

export interface PublicSeed {
  events: Event[];
  jobs: Job[];
  faqs: FAQ[];
  teamMembers: TeamMember[];
  boardPositions: BoardPosition[];
  campaigns: ApplicationCampaign[];
}

const EMPTY_SEED: PublicSeed = {
  events: [],
  jobs: [],
  faqs: [],
  teamMembers: [],
  boardPositions: [],
  campaigns: [],
};

function isTimestampLike(value: unknown): value is { toDate: () => Date } {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { toDate?: unknown }).toDate === 'function' &&
    typeof (value as { seconds?: unknown }).seconds === 'number' &&
    typeof (value as { nanoseconds?: unknown }).nanoseconds === 'number'
  );
}

function sanitize(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (isTimestampLike(value)) return value.toDate().toISOString();
  if (Array.isArray(value)) {
    const arr = value.map(sanitize).filter((v) => v !== undefined);
    return arr;
  }
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(obj)) {
      const v = sanitize(obj[key]);
      if (v !== undefined) out[key] = v;
    }
    return out;
  }
  return value;
}

function normalizeDoc<T>(doc: { id: string; data: () => Record<string, unknown> }): T {
  const raw = sanitize(doc.data()) as Record<string, unknown>;
  return { id: doc.id, ...raw } as unknown as T;
}

/**
 * Server-side fetch of all public data so SSR HTML ships real content instead
 * of empty arrays + pulse skeletons. Degrades to empty arrays on any error
 * (including the admin SDK failing to init) so the app never breaks.
 */
export async function getPublicSeed(): Promise<PublicSeed> {
  try {
    // Dynamic import so a failed admin SDK init degrades gracefully instead of
    // throwing during module evaluation.
    const { adminDb } = await import('@/lib/firebase-admin');

    const [eventsSnap, jobsSnap, faqsSnap, teamSnap, positionsSnap, campaignsSnap] = await Promise.all([
      adminDb.collection('events').where('published', '==', true).orderBy('eventStartAt', 'desc').get(),
      adminDb.collection('jobs').where('published', '==', true).orderBy('createdAt', 'desc').get(),
      adminDb.collection('faqs').orderBy('order', 'asc').get(),
      adminDb.collection('teamMembers').orderBy('order', 'asc').get(),
      adminDb.collection('board-positions').orderBy('order', 'asc').get(),
      adminDb.collection('applicationCampaigns').where('status', '==', 'open').get(),
    ]);

    return {
      events: eventsSnap.docs.map((d) => normalizeDoc<Event>(d)),
      jobs: jobsSnap.docs.map((d) => normalizeDoc<Job>(d)),
      faqs: faqsSnap.docs.map((d) => normalizeDoc<FAQ>(d)),
      teamMembers: teamSnap.docs.map((d) => normalizeDoc<TeamMember>(d)),
      boardPositions: positionsSnap.docs.map((d) => normalizeDoc<BoardPosition>(d)),
      campaigns: campaignsSnap.docs.map((d) => normalizeDoc<ApplicationCampaign>(d)),
    };
  } catch (error) {
    console.error('getPublicSeed failed, falling back to empty seed:', error);
    return { ...EMPTY_SEED };
  }
}
