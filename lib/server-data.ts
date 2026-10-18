import type { Event, FAQ, Job, TeamMember } from '@/types';
import { TEAM_CATEGORIES, type TeamCategory } from '@/types';
import type {
  TeamDirectoryMetadata,
  TeamDirectoryYear,
} from '@/lib/team-directory-types';
import { isLocalBuildFixtureEnabled } from '@/lib/local-build-fixture';
import { recentEventsLowerBound } from '@/lib/event-pagination';

export interface PublicSeed {
  events: Event[];
  jobs: Job[];
  faqs: FAQ[];
  teamMembers: TeamMember[];
}

const EMPTY_SEED: PublicSeed = {
  events: [],
  jobs: [],
  faqs: [],
  teamMembers: [],
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

function normalizeDoc<T>(doc: {
  id: string;
  data: () => Record<string, unknown>;
}): T {
  const raw = sanitize(doc.data()) as Record<string, unknown>;
  return { id: doc.id, ...raw } as unknown as T;
}

const PUBLIC_TEAM_FIELDS = [
  'name',
  'position',
  'bio',
  'image',
  'linkedin',
  'twitter',
  'github',
  'website',
  'published',
  'teams',
  'order',
  'years',
  'badge',
  'companyEmail',
  'email',
] as const;

function normalizePublicTeamDoc(doc: {
  id: string;
  data: () => Record<string, unknown>;
}): TeamMember {
  const raw = sanitize(doc.data()) as Record<string, unknown>;
  const projected: Record<string, unknown> = { id: doc.id };
  for (const field of PUBLIC_TEAM_FIELDS) {
    if (raw[field] !== undefined) projected[field] = raw[field];
  }
  return projected as unknown as TeamMember;
}

/**
 * Server-side fetch of all public data so SSR HTML ships real content instead
 * of empty arrays + pulse skeletons. Degrades to empty arrays on any error
 * (including the admin SDK failing to init) so the app never breaks.
 *
 * Pass `{ throwOnError: true }` (used by the MCP layer) to rethrow instead so
 * callers can distinguish "empty site" from "data source unavailable".
 */
export async function getPublicSeed(options?: {
  throwOnError?: boolean;
  recentEventsOnly?: boolean;
  includeTeamMembers?: boolean;
}): Promise<PublicSeed> {
  if (isLocalBuildFixtureEnabled()) return { ...EMPTY_SEED };
  try {
    // Dynamic import so a failed admin SDK init degrades gracefully instead of
    // throwing during module evaluation.
    const { adminDb } = await import('@/lib/firebase-admin');

    const eventsQuery = adminDb
      .collection('events')
      .where('published', '==', true);
    const boundedEventsQuery = options?.recentEventsOnly
      ? eventsQuery.where(
          'eventStartAt',
          '>=',
          recentEventsLowerBound(new Date()),
        )
      : eventsQuery;

    const [eventsSnap, jobsSnap, faqsSnap, teamSnap] = await Promise.all([
      boundedEventsQuery.orderBy('eventStartAt', 'desc').get(),
      adminDb
        .collection('jobs')
        .where('published', '==', true)
        .orderBy('createdAt', 'desc')
        .get(),
      adminDb.collection('faqs').orderBy('order', 'asc').get(),
      options?.includeTeamMembers === false
        ? Promise.resolve({ docs: [] })
        : adminDb.collection('teamMembers').orderBy('order', 'asc').get(),
    ]);

    return {
      events: eventsSnap.docs.map((d) => normalizeDoc<Event>(d)),
      jobs: jobsSnap.docs.map((d) => normalizeDoc<Job>(d)),
      faqs: faqsSnap.docs.map((d) => normalizeDoc<FAQ>(d)),
      teamMembers: teamSnap.docs
        .filter((d) => d.data().published !== false)
        .map(normalizePublicTeamDoc),
    };
  } catch (error) {
    if (options?.throwOnError) throw error;
    console.error('getPublicSeed failed, falling back to empty seed:', error);
    return { ...EMPTY_SEED };
  }
}

/** Fetch only the public team data used by the team API. */
export async function getPublicTeamMembers(): Promise<TeamMember[]> {
  const { adminDb } = await import('@/lib/firebase-admin');
  const teamSnap = await adminDb
    .collection('teamMembers')
    .orderBy('order', 'asc')
    .get();
  return teamSnap.docs
    .filter((d) => d.data().published !== false)
    .map(normalizePublicTeamDoc);
}

type TeamDirectoryMetadataRow = {
  id: string;
  teams?: TeamCategory[];
  years?: number[];
};

function belongsToTeam(
  row: TeamDirectoryMetadataRow,
  team: TeamCategory,
): boolean {
  return Array.isArray(row.teams) && row.teams.length > 0
    ? row.teams.includes(team)
    : team === 'board';
}

function belongsToYear(
  row: TeamDirectoryMetadataRow,
  year: TeamDirectoryYear,
): boolean {
  return (
    year === 'all' ||
    !Array.isArray(row.years) ||
    row.years.length === 0 ||
    row.years.includes(year)
  );
}

function emptyTeamCounts(): Record<TeamCategory, number> {
  return Object.fromEntries(TEAM_CATEGORIES.map((team) => [team, 0])) as Record<
    TeamCategory,
    number
  >;
}

export async function getPublicTeamDirectoryIndex(): Promise<{
  metadata: TeamDirectoryMetadata;
  rows: TeamDirectoryMetadataRow[];
}> {
  const { adminDb } = await import('@/lib/firebase-admin');
  const snapshot = await adminDb
    .collection('teamMembers')
    .select('teams', 'years', 'published')
    .get();
  const rows: TeamDirectoryMetadataRow[] = snapshot.docs
    .filter((doc) => doc.data().published !== false)
    .map((doc) => ({
      id: doc.id,
      teams: doc.data().teams,
      years: doc.data().years,
    }));
  const years = [
    ...new Set(
      rows.flatMap((row) =>
        Array.isArray(row.years)
          ? row.years.filter((year): year is number => Number.isInteger(year))
          : [],
      ),
    ),
  ].sort((a, b) => b - a);
  const countsByYear: TeamDirectoryMetadata['countsByYear'] = {
    all: emptyTeamCounts(),
  };
  for (const year of years) countsByYear[String(year)] = emptyTeamCounts();
  for (const row of rows) {
    for (const key of ['all', ...years.map(String)]) {
      const year = key === 'all' ? 'all' : Number(key);
      if (!belongsToYear(row, year)) continue;
      for (const team of TEAM_CATEGORIES) {
        if (belongsToTeam(row, team)) countsByYear[key][team] += 1;
      }
    }
  }
  const currentYear = new Date().getFullYear();
  const defaultYear: TeamDirectoryYear = years.includes(currentYear)
    ? currentYear
    : years.includes(currentYear - 1)
      ? currentYear - 1
      : (years[0] ?? 'all');
  return { metadata: { years, defaultYear, countsByYear }, rows };
}

export async function getPublicTeamMembersForSelection(
  team: TeamCategory,
  year: TeamDirectoryYear,
  eligibleIds: string[],
): Promise<TeamMember[]> {
  if (eligibleIds.length === 0) return [];
  const { adminDb } = await import('@/lib/firebase-admin');
  const refs = eligibleIds.map((id) =>
    adminDb.collection('teamMembers').doc(id),
  );
  const docs = await adminDb.getAll(...refs);
  return docs
    .filter((doc) => doc.exists && doc.data()?.published !== false)
    .filter((doc) => {
      const raw = doc.data() ?? {};
      return (
        belongsToTeam({ id: doc.id, teams: raw.teams }, team) &&
        belongsToYear({ id: doc.id, years: raw.years }, year)
      );
    })
    .map((doc) =>
      normalizePublicTeamDoc(
        doc as { id: string; data: () => Record<string, unknown> },
      ),
    )
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

export function publicTeamIdsForSelection(
  rows: TeamDirectoryMetadataRow[],
  team: TeamCategory,
  year: TeamDirectoryYear,
): string[] {
  return rows
    .filter((row) => belongsToTeam(row, team) && belongsToYear(row, year))
    .map((row) => row.id);
}
