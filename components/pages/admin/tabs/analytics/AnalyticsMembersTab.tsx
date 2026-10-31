'use client';

import React, { useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import { Download, ExternalLink } from 'lucide-react';
import { downloadCsv, eventMonthKey, StatCard } from './AnalyticsShared';
import {
  ChartCard,
  ColumnChart,
  Legend,
  RankedBars,
  TimeAreaChart,
  VIZ,
  formatMonth,
  rankWithOther,
} from './AnalyticsCharts';
import type { MemberAnalytics } from '@/lib/firestore/member-analytics';

interface Props {
  memberAnalytics: MemberAnalytics | null;
  chartData: { month: string; signups: number; cumulative: number }[];
  eventMarkers: string[];
}

const answered = (m: Record<string, number>) =>
  `${Object.values(m)
    .reduce((s, v) => s + v, 0)
    .toLocaleString('en')} answered`;

const MembersTab: React.FC<Props> = ({
  memberAnalytics,
  chartData,
  eventMarkers,
}) => {
  const eventMonths = useMemo(() => new Set(eventMarkers), [eventMarkers]);
  const currentMonth = eventMonthKey(new Date().toISOString());
  const thisMonth =
    chartData.find((d) => d.month === currentMonth)?.signups ?? 0;

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
            title="Members over time"
            summary={`${memberAnalytics.totalUsers.toLocaleString('en')} members · ${thisMonth} new this month`}
          >
            <TimeAreaChart
              data={chartData}
              xKey="month"
              xFormat={formatMonth}
              series={[
                {
                  key: 'cumulative',
                  name: 'Total members',
                  color: VIZ.primary,
                },
              ]}
            />
          </ChartCard>
          <ChartCard
            title="New signups per month"
            summary="Months with an event are highlighted"
          >
            <Legend
              items={[
                { label: 'Month with an event', color: VIZ.primary },
                { label: 'No event', color: VIZ.muted },
              ]}
            />
            <ColumnChart
              data={chartData}
              xKey="month"
              yKey="signups"
              name="New signups"
              height={176}
              xFormat={formatMonth}
              colorFor={(r) =>
                eventMonths.has(r.month) ? VIZ.primary : VIZ.muted
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
