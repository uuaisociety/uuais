"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import Tag from "@/components/ui/Tag";
import { useNotify } from "@/components/ui/Notifications";
import { listUsers } from "@/lib/firestore/users";
import { programTitleParts } from "@/lib/programs/format";
import { RefreshCw, Users } from "lucide-react";

type IndexEntry = {
  file: string;
  code: string;
  nameSv: string;
  programmeTitle: string;
  totalCredits: number | null;
  semesters: number;
  courses: number;
  tracks: number;
  planFormat: "legacy" | "ladok";
  validFrom: string | null;
  validFromYear: number | null;
  edges: number;
  rules: number;
  reviewed: boolean;
};

type Payload = { scrapedAt: string; faculty: string; programmes: IndexEntry[] };

/** Loose match between a member's free-text programme and a catalogue entry. */
function normalise(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export default function ProgramsTab() {
  const { notify } = useNotify();
  const [data, setData] = useState<Payload | null>(null);
  const [members, setMembers] = useState<{ program?: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");

  const refresh = useCallback(
    async (opts?: { notify?: boolean }) => {
      setLoading(true);
      try {
        const [statsResponse, users] = await Promise.all([
          fetch("/api/admin/programs").then((r) => (r.ok ? r.json() : null)),
          listUsers().catch(() => []),
        ]);
        if (statsResponse) setData(statsResponse);
        setMembers(users as { program?: string }[]);
        if (opts?.notify) notify({ type: "success", message: "Programmes refreshed." });
      } finally {
        setLoading(false);
      }
    },
    [notify]
  );

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    refresh();
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [refresh]);

  /** Typed by hand at sign-up, so matched loosely: exact code first, then name containment. */
  const memberCounts = useMemo(() => {
    const counts = new Map<string, number>();
    if (!data) return counts;
    const entries = data.programmes.map((p) => ({
      file: p.file,
      code: p.code.toLowerCase(),
      name: normalise(programTitleParts(p.programmeTitle).name),
    }));
    for (const member of members) {
      const raw = (member.program || "").trim();
      if (!raw) continue;
      const needle = normalise(raw);
      const hit =
        entries.find((e) => e.code === raw.toLowerCase()) ??
        entries.find((e) => needle.includes(e.name) || e.name.includes(needle));
      if (hit) counts.set(hit.file, (counts.get(hit.file) ?? 0) + 1);
    }
    return counts;
  }, [data, members]);

  const unmatched = useMemo(() => {
    const named = members.filter((m) => (m.program || "").trim()).length;
    const matched = [...memberCounts.values()].reduce((a, b) => a + b, 0);
    return { named, matched, missing: named - matched };
  }, [members, memberCounts]);

  const rows = useMemo(() => {
    if (!data) return [];
    const needle = query.trim().toLowerCase();
    return data.programmes
      .filter(
        (p) =>
          !needle ||
          `${p.programmeTitle} ${p.code}`.toLowerCase().includes(needle)
      )
      .map((p) => ({ ...p, members: memberCounts.get(p.file) ?? 0 }))
      .sort((a, b) => b.members - a.members || a.programmeTitle.localeCompare(b.programmeTitle));
  }, [data, query, memberCounts]);

  const totals = useMemo(() => {
    if (!data) return null;
    const p = data.programmes;
    return {
      programmes: p.length,
      courses: p.reduce((sum, x) => sum + x.courses, 0),
      edges: p.reduce((sum, x) => sum + x.edges, 0),
      rules: p.reduce((sum, x) => sum + x.rules, 0),
      awaiting: p.filter((x) => x.edges === 0).length,
      reviewed: p.filter((x) => x.reviewed).length,
    };
  }, [data]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Programmes</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {data
              ? `${data.faculty} — retrieved ${new Date(data.scrapedAt).toLocaleDateString("en-GB")}`
              : "Loading the programme catalogue…"}
          </p>
        </div>
        <Button variant="outline" onClick={() => refresh({ notify: true })} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {totals ? (
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {[
            ["Programmes", totals.programmes],
            ["Courses", totals.courses],
            ["Prerequisite links", totals.edges],
            ["Study-plan rules", totals.rules],
            ["Awaiting extraction", totals.awaiting],
            ["Human-reviewed", totals.reviewed],
          ].map(([label, value]) => (
            <Card key={label as string}>
              <CardContent className="p-4">
                <p className="font-mono text-[0.6875rem] uppercase tracking-[0.1em] text-muted-foreground">
                  {label}
                </p>
                <p className="mt-1 text-2xl font-semibold text-foreground">{value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Filter by name or code"
              className="w-72 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              {unmatched.matched} of {unmatched.named} members matched to a programme
              {unmatched.missing > 0 ? (
                <span className="text-foreground"> · {unmatched.missing} unmatched</span>
              ) : null}
            </p>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[52rem] text-sm">
              <thead>
                <tr className="border-b border-border text-left font-mono text-[0.6875rem] uppercase tracking-[0.1em] text-muted-foreground">
                  <th className="px-2 py-2">Programme</th>
                  <th className="px-2 py-2">Code</th>
                  <th className="px-2 py-2 text-right">Members</th>
                  <th className="px-2 py-2 text-right">Courses</th>
                  <th className="px-2 py-2 text-right">Links</th>
                  <th className="px-2 py-2 text-right">Rules</th>
                  <th className="px-2 py-2">Plan</th>
                  <th className="px-2 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((program) => {
                  const { name, variant } = programTitleParts(program.programmeTitle);
                  return (
                    <tr key={program.file} className="border-b border-border/60">
                      <td className="max-w-sm px-2 py-2">
                        <a
                          href={`/programs/${program.file.replace(/\.json$/, "")}`}
                          className="text-foreground underline-offset-2 hover:underline"
                        >
                          {name}
                          {variant ? (
                            <span className="text-muted-foreground"> — {variant}</span>
                          ) : null}
                        </a>
                      </td>
                      <td className="px-2 py-2 font-mono text-xs text-muted-foreground">
                        {program.code}
                      </td>
                      <td className="px-2 py-2 text-right font-medium text-foreground">
                        {program.members || <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="px-2 py-2 text-right text-muted-foreground">
                        {program.courses}
                      </td>
                      <td className="px-2 py-2 text-right text-muted-foreground">
                        {program.edges}
                      </td>
                      <td className="px-2 py-2 text-right text-muted-foreground">
                        {program.rules}
                      </td>
                      <td className="px-2 py-2 text-xs text-muted-foreground">
                        {program.validFromYear ?? "—"}
                      </td>
                      <td className="px-2 py-2">
                        {program.edges === 0 ? (
                          <Tag variant="yellow">Needs extraction</Tag>
                        ) : program.reviewed ? (
                          <Tag variant="green">Reviewed</Tag>
                        ) : (
                          <Tag variant="gray">Unreviewed</Tag>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
