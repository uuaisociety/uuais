import type { TeamCategory, TeamMember } from '@/types';

export type TeamDirectoryYear = number | 'all';

export interface TeamDirectoryMetadata {
  years: number[];
  defaultYear: TeamDirectoryYear;
  countsByYear: Record<string, Record<TeamCategory, number>>;
}

export interface TeamDirectoryResponse {
  metadata: TeamDirectoryMetadata;
  team: TeamCategory;
  year: TeamDirectoryYear;
  teamMembers: TeamMember[];
}
