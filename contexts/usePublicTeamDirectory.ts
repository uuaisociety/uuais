'use client';

import { useCallback, useRef, useState } from 'react';
import type { TeamCategory } from '@/types';
import type {
  TeamDirectoryResponse,
  TeamDirectoryYear,
} from '@/lib/team-directory-types';

export interface PublicTeamDirectory {
  directory: TeamDirectoryResponse | null;
  loading: boolean;
  error: string | null;
  ensureLoaded: () => Promise<TeamDirectoryResponse | undefined>;
  loadSelection: (team: TeamCategory, year: TeamDirectoryYear) => void;
  retry: () => void;
}

function selectionKey(team: TeamCategory, year: TeamDirectoryYear) {
  return `${team}:${year}`;
}

export function usePublicTeamDirectory(): PublicTeamDirectory {
  const [directory, setDirectory] = useState<TeamDirectoryResponse | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const cache = useRef(new Map<string, TeamDirectoryResponse>());
  const inFlight = useRef(new Map<string, Promise<TeamDirectoryResponse>>());
  const requestGeneration = useRef(0);
  const directoryRef = useRef<TeamDirectoryResponse | null>(null);
  const updateDirectory = useCallback(
    (
      next:
        | TeamDirectoryResponse
        | null
        | ((
            current: TeamDirectoryResponse | null,
          ) => TeamDirectoryResponse | null),
    ) => {
      const value =
        typeof next === 'function' ? next(directoryRef.current) : next;
      directoryRef.current = value;
      setDirectory(value);
    },
    [],
  );

  const load = useCallback(
    async (team?: TeamCategory, year?: TeamDirectoryYear) => {
      const key =
        team && year !== undefined ? selectionKey(team, year) : 'default';
      const generation = ++requestGeneration.current;
      const cached = team && year !== undefined ? cache.current.get(key) : null;
      if (cached) {
        updateDirectory(cached);
        setLoading(false);
        setError(null);
        return cached;
      }
      setLoading(true);
      setError(null);
      if (team && year !== undefined) {
        updateDirectory((current) =>
          current ? { ...current, team, year, teamMembers: [] } : null,
        );
      }

      let request = inFlight.current.get(key);
      if (!request) {
        const params =
          team && year !== undefined
            ? `?team=${encodeURIComponent(team)}&year=${encodeURIComponent(String(year))}`
            : '';
        request = fetch(`/api/team${params}`).then(async (response) => {
          if (!response.ok) throw new Error('Could not load team profiles.');
          return (await response.json()) as TeamDirectoryResponse;
        });
        inFlight.current.set(key, request);
        void request
          .finally(() => {
            if (inFlight.current.get(key) === request)
              inFlight.current.delete(key);
          })
          .catch(() => {});
      }

      try {
        const result = await request;
        cache.current.set(selectionKey(result.team, result.year), result);
        if (generation === requestGeneration.current) updateDirectory(result);
        return result;
      } catch (loadError) {
        if (generation === requestGeneration.current) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'Could not load team profiles.',
          );
        }
      } finally {
        if (generation === requestGeneration.current) setLoading(false);
      }
    },
    [updateDirectory],
  );

  const ensureLoaded = useCallback(
    () =>
      directoryRef.current ? Promise.resolve(directoryRef.current) : load(),
    [load],
  );

  const loadSelection = useCallback(
    (team: TeamCategory, year: TeamDirectoryYear) => {
      void load(team, year);
    },
    [load],
  );

  const retry = useCallback(() => {
    const current = directoryRef.current;
    if (current) void load(current.team, current.year);
    else void load();
  }, [load]);

  return { directory, loading, error, ensureLoaded, loadSelection, retry };
}
