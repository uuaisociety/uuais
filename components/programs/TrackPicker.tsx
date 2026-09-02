"use client";

import React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ProgramSpecialisation } from "@/lib/programs";

/** So the map's "choose a specialisation" marker can send the reader straight here. */
export const TRACK_PICKER_ID = "programme-specialisation";

/**
 * Selecting a track navigates rather than setting local state, so the server renders
 * only the chosen slice of the programme and the selection stays shareable in the URL.
 */
export default function TrackPicker({
  specialisations,
  selected,
}: {
  specialisations: ProgramSpecialisation[];
  selected: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const select = (trackId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (trackId) params.set("track", trackId);
    else params.delete("track");
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return (
    <label className="block">
      <span className="font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground">
        Specialisation
      </span>
      <select
        id={TRACK_PICKER_ID}
        value={selected ?? ""}
        onChange={(event) => select(event.target.value)}
        className="mt-2 w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      >
        <option value="">Common courses only</option>
        {specialisations.map((spec) => (
          <optgroup key={spec.id} label={spec.nameSv}>
            {spec.baseTrackId ? (
              <option value={spec.baseTrackId}>
                {/* "All profiles" only means something where profiles exist. */}
                {spec.profiles.length > 0 ? `${spec.nameSv} — all profiles` : spec.nameSv}
              </option>
            ) : null}
            {spec.profiles.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {spec.nameSv} — {profile.profileSv}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </label>
  );
}
