import { unstable_cache } from 'next/cache';
import type { TeamMember } from '@/types';
import { isLocalBuildFixtureEnabled } from '@/lib/local-build-fixture';
import {
  getPublicSeed,
  getPublicTeamDirectoryIndex,
  getPublicTeamMembersForSelection,
  publicTeamIdsForSelection,
} from '@/lib/server-data';
import type { TeamCategory } from '@/types';
import type {
  TeamDirectoryMetadata,
  TeamDirectoryResponse,
  TeamDirectoryYear,
} from '@/lib/team-directory-types';

const EMPTY_SEED = { events: [], jobs: [], faqs: [], teamMembers: [] };
const CACHE_SECONDS = 24 * 60 * 60;
/** Cleared by POST /api/admin/team-directory after an admin edit, so a day's cache never
 *  shows a stale roster. */
export const TEAM_DIRECTORY_TAG = 'team-directory';
/** The pages that render the seed take this revalidate. Live Firestore listeners replace
 *  the seed seconds after load, so it only has to be fresh enough for crawlers and the
 *  first paint, and every refresh re-runs the events, jobs and FAQ queries. */
const SEED_CACHE_SECONDS = 15 * 60;
const EMPTY_TEAM_COUNTS = {
  board: 0,
  development: 0,
  research: 0,
  it: 0,
  growth: 0,
  partnerships_events: 0,
  founders: 0,
  finance: 0,
  alumni: 0,
};
const EMPTY_TEAM_INDEX = {
  metadata: {
    years: [],
    defaultYear: 'all' as const,
    countsByYear: { all: EMPTY_TEAM_COUNTS },
  },
  rows: [],
};

function projectId(): string {
  return process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'default';
}

const getCachedSeed = unstable_cache(
  async () =>
    getPublicSeed({
      throwOnError: true,
      recentEventsOnly: true,
      includeTeamMembers: false,
    }),
  ['public-ssr-seed-v3-recent-events-no-team', projectId()],
  { revalidate: SEED_CACHE_SECONDS },
);

const getCachedTeamDirectoryIndex = unstable_cache(
  async () => getPublicTeamDirectoryIndex(),
  ['public-team-directory-index-v1', projectId()],
  { revalidate: CACHE_SECONDS, tags: [TEAM_DIRECTORY_TAG] },
);

const getCachedTeamProfiles = unstable_cache(
  async (team: TeamCategory, year: TeamDirectoryYear, ids: string[]) =>
    getPublicTeamMembersForSelection(team, year, ids),
  ['public-team-selected-profiles-v1', projectId()],
  { revalidate: CACHE_SECONDS, tags: [TEAM_DIRECTORY_TAG] },
);

export async function getCachedPublicSeed() {
  if (isLocalBuildFixtureEnabled()) return { ...EMPTY_SEED };
  try {
    return await getCachedSeed();
  } catch (error) {
    console.error(
      'getCachedPublicSeed failed, falling back to empty seed:',
      error,
    );
    return { ...EMPTY_SEED };
  }
}

export async function getCachedPublicTeamDirectory(
  requestedTeam?: TeamCategory,
  requestedYear?: TeamDirectoryYear,
): Promise<TeamDirectoryResponse> {
  const index = isLocalBuildFixtureEnabled()
    ? EMPTY_TEAM_INDEX
    : await getCachedTeamDirectoryIndex();
  const team = requestedTeam ?? 'board';
  const year = requestedYear ?? index.metadata.defaultYear;
  const ids = publicTeamIdsForSelection(index.rows, team, year);
  const teamMembers: TeamMember[] = isLocalBuildFixtureEnabled()
    ? []
    : await getCachedTeamProfiles(team, year, ids);
  return {
    metadata: index.metadata as TeamDirectoryMetadata,
    team,
    year,
    teamMembers,
  };
}
