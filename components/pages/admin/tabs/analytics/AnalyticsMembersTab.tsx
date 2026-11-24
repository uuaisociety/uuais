'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import { Download, ExternalLink } from 'lucide-react';
import {
  dailySignupSeries,
  downloadCsv,
  granularityFor,
  periodKey,
  rollUp,
  StatCard,
  type Granularity,
} from './AnalyticsShared';
import {
  ChartCard,
  ColumnChart,
  Legend,
  RankedBars,
  TimeAreaChart,
  VIZ,
  formatDay,
  formatMonth,
  rankWithOther,
} from './AnalyticsCharts';
import type { MemberAnalytics } from '@/lib/firestore/member-analytics';
import type { Event } from '@/types';

interface Props {
  memberAnalytics: MemberAnalytics | null;
  events: Event[];
}

/** Axis ticks and tooltip headings for each period size. */
const FORMATS: Record<
  Granularity,
  { tick: (s: string) => string; label: (s: string) => string }
> = {
  day: { tick: formatDay, label: formatDay },
  week: { tick: formatDay, label: (s) => `Week of ${formatDay(s)}` },
  month: { tick: formatMonth, label: formatMonth },
};

/** "2026-11-23" → "Nov 23, 2026" (local date, no timezone shift). */
const longDay = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

/** Preset ranges for the signup charts, ending today. */
const RANGES = [
  { key: 'month', label: 'Last month', months: 1 },
  { key: 'year', label: 'Last year', months: 12 },
  { key: 'all', label: 'All time', months: null },
] as const;
type RangeKey = (typeof RANGES)[number]['key'];

const answered = (m: Record<string, number>) =>
  `${Object.values(m)
    .reduce((s, v) => s + v, 0)
    .toLocaleString('en')} answered`;

const plural = (n: number, word: string) =>
  `${n.toLocaleString('en')} ${word}${n === 1 ? '' : 's'}`;

const MembersTab: React.FC<Props> = ({ memberAnalytics, events }) => {
  // A preset, or a range dragged out on a chart (inclusive "YYYY-MM-DD").
  const [view, setView] = useState<RangeKey | { from: string; to: string }>(
    'month',
  );

  const days = useMemo(
    () => dailySignupSeries(memberAnalytics?.dailySignups ?? []),
    [memberAnalytics],
  );
  const visibleDays = useMemo(() => {
    if (typeof view === 'object')
      return days.filter((d) => d.date >= view.from && d.date <= view.to);
    const months = RANGES.find((r) => r.key === view)!.months;
    if (months === null) return days;
    // Up to and including today, e.g. Oct 24 – Nov 23.
    const from = new Date();
    from.setMonth(from.getMonth() - months);
    from.setDate(from.getDate() + 1);
    const fromKey = periodKey(from, 'day');
    return days.filter((d) => d.date >= fromKey);
  }, [days, view]);
  // The fewer days in view, the finer the columns: zooming in reaches days.
  const granularity = granularityFor(visibleDays.length);
  const chartData = useMemo(
    () => rollUp(visibleDays, granularity),
    [visibleDays, granularity],
  );
  const fmt = FORMATS[granularity];
  const zoomTo = (from: number, to: number) =>
    setView({ from: chartData[from].start, to: chartData[to].end });

  const thisMonth = periodKey(new Date(), 'month');
  const newThisMonth = days
    .filter((d) => d.date.startsWith(thisMonth))
    .reduce((s, d) => s + d.signups, 0);

  const eventPeriods = useMemo(
    () =>
      new Set(
        events
          .filter((e) => e.eventStartAt)
          .map((e) => periodKey(new Date(e.eventStartAt), granularity)),
      ),
    [events, granularity],
  );

  // Top 10, ranked so ties share a place (1, 2, 2, 4).
  const topReferrers = useMemo(() => {
    const list = memberAnalytics?.referrers.slice(0, 10) ?? [];
    return list.map((r) => ({
      ...r,
      rank: list.findIndex((x) => x.count === r.count) + 1,
    }));
  }, [memberAnalytics]);
  const referralCount = (memberAnalytics?.referrers ?? []).reduce(
    (s, r) => s + r.count,
    0,
  );

  const downloadMembersCsv = useCallback(() => {
    if (!memberAnalytics) return;
    const rows = [
      ['Metric', 'Value'],
      ['Total Users', String(memberAnalytics.totalUsers)],
      ['Marketing Opt-In', String(memberAnalytics.marketingOptIn)],
      ['Partner Contact Opt-In', String(memberAnalytics.partnerContactOptIn)],
      ['Analytics Opt-In', String(memberAnalytics.analyticsOptIn)],
      ['Looking for Job', String(memberAnalytics.lookingForJob)],
      ['Newsletter Opt-In', String(memberAnalytics.newsletter)],
      ['Shared CVs', String(memberAnalytics.sharedCvs)],
      [],
      ['heardOfUs', 'Count'],
      ...Object.entries(memberAnalytics.heardOfUs)
        .sort(([, a], [, b]) => b - a)
        .map(([k, v]) => [k, String(v)]),
      [],
      ['Referred by', 'Referrals'],
      ...memberAnalytics.referrers.map((r) => [r.name, String(r.count)]),
      [],
      ['Gender', 'Count'],
      ...Object.entries(memberAnalytics.gender)
        .sort(([, a], [, b]) => b - a)
        .map(([k, v]) => [k, String(v)]),
      [],
      ['Student Status', 'Count'],
      ...Object.entries(memberAnalytics.studentStatus)
        .sort(([, a], [, b]) => b - a)
        .map(([k, v]) => [k, String(v)]),
      [],
      ['Month', 'Signups'],
      ...memberAnalytics.monthlySignups.map((m) => [m.month, String(m.count)]),
    ];
    downloadCsv(
      rows,
      `members-analytics-${new Date().toISOString().slice(0, 10)}.csv`,
    );
  }, [memberAnalytics]);

  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          title="Total Users"
          value={memberAnalytics?.totalUsers ?? 0}
        />
        <StatCard
          title="Marketing Opt-In"
          value={memberAnalytics?.marketingOptIn ?? 0}
        />
        <StatCard
          title="Partner Contact Opt-In"
          value={memberAnalytics?.partnerContactOptIn ?? 0}
        />
        <StatCard
          title="Analytics Opt-In"
          value={memberAnalytics?.analyticsOptIn ?? 0}
        />
        <StatCard
          title="Looking for Job"
          value={memberAnalytics?.lookingForJob ?? 0}
        />
        <StatCard
          title="Newsletter Opt-In"
          value={memberAnalytics?.newsletter ?? 0}
        />
        <StatCard title="Shared CVs" value={memberAnalytics?.sharedCvs ?? 0} />
      </div>
      <Link
        href="/partners/cvs"
        className="inline-flex items-center gap-1 text-sm text-primary hover:brightness-110 hover:underline"
      >
        View shared CVs <ExternalLink className="h-3 w-3" />
      </Link>

      {memberAnalytics && (
        <div className="grid md:grid-cols-2 gap-6">
          <ChartCard
            className="md:col-span-2"
            title="Members over time"
            summary={`${memberAnalytics.totalUsers.toLocaleString('en')} members · ${newThisMonth} new this month · ${
              visibleDays.length
                ? `${longDay(visibleDays[0].date)} – ${longDay(visibleDays.at(-1)!.date)}`
                : 'no signups yet'
            }`}
            action={
              <div
                className="flex flex-wrap bg-foreground/[0.05] rounded-md p-1 gap-1"
                role="group"
                aria-label="Signup chart range"
              >
                {RANGES.map((r) => (
                  <button
                    key={r.key}
                    type="button"
                    aria-pressed={view === r.key}
                    onClick={() => setView(r.key)}
                    className={`px-3 py-1 rounded text-sm font-medium transition-colors duration-300 ${
                      view === r.key
                        ? 'bg-primary text-primary-foreground'
                        : 'text-foreground/60 hover:text-foreground'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            }
          >
            <p className="text-xs text-muted-foreground mb-2">
              Total members · drag across either chart to zoom in
            </p>
            <TimeAreaChart
              data={chartData}
              xKey="period"
              height={160}
              xFormat={fmt.tick}
              labelFormat={fmt.label}
              syncId="member-signups"
              banded
              onZoom={zoomTo}
              series={[
                {
                  key: 'cumulative',
                  name: 'Total members',
                  color: VIZ.primary,
                },
              ]}
            />
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 mt-5 mb-2">
              <p className="text-xs text-muted-foreground">
                New signups per {granularity}
              </p>
              <Legend
                items={[
                  {
                    label: `${granularity[0].toUpperCase()}${granularity.slice(1)} with an event`,
                    color: VIZ.primary,
                  },
                  { label: 'No event', color: VIZ.muted },
                ]}
              />
            </div>
            <ColumnChart
              data={chartData}
              xKey="period"
              yKey="signups"
              name="New signups"
              height={160}
              xFormat={fmt.tick}
              labelFormat={fmt.label}
              syncId="member-signups"
              onZoom={zoomTo}
              colorFor={(r) =>
                eventPeriods.has(r.period) ? VIZ.primary : VIZ.muted
              }
            />
          </ChartCard>
          <ChartCard
            title="How members heard of us"
            summary={answered(memberAnalytics.heardOfUs)}
          >
            <RankedBars data={rankWithOther(memberAnalytics.heardOfUs, 6)} />
          </ChartCard>
          <div className="grid gap-6">
            <ChartCard
              title="Gender"
              summary={answered(memberAnalytics.gender)}
            >
              <RankedBars
                data={rankWithOther(memberAnalytics.gender, 4)}
                capitalize
              />
            </ChartCard>
            <ChartCard
              title="Student status"
              summary={answered(memberAnalytics.studentStatus)}
            >
              <RankedBars
                data={rankWithOther(memberAnalytics.studentStatus, 4)}
                capitalize
              />
            </ChartCard>
          </div>
          <ChartCard
            title="Top referrers"
            summary={`${plural(referralCount, 'referral')} · ${plural(memberAnalytics.referrers.length, 'referrer')}`}
          >
            {topReferrers.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">
                No referrals yet
              </p>
            ) : (
              <ol className="space-y-2">
                {topReferrers.map((r) => (
                  <li
                    key={r.name}
                    className="flex items-baseline gap-3 text-sm"
                  >
                    <span className="w-6 text-right text-xs text-muted-foreground tabular-nums">
                      {r.rank}
                    </span>
                    <span className="flex-1 min-w-0 truncate text-foreground/80">
                      {r.name}
                    </span>
                    <span className="font-semibold text-foreground tabular-nums">
                      {r.count.toLocaleString('en')}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </ChartCard>
        </div>
      )}

      <div className="flex justify-end">
        <Button
          size="sm"
          variant="outline"
          icon={Download}
          onClick={downloadMembersCsv}
        >
          Download CSV
        </Button>
      </div>
    </div>
  );
};

export default MembersTab;
