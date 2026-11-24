import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import {
  dailySignupSeries,
  granularityFor,
  periodKey,
  rollUp,
} from '@/components/pages/admin/tabs/analytics/AnalyticsShared';
import AnalyticsMembersTab from '@/components/pages/admin/tabs/analytics/AnalyticsMembersTab';
import type { MemberAnalytics } from '@/lib/firestore/member-analytics';

const daily = [
  { date: '2026-10-30', count: 2 },
  { date: '2026-11-02', count: 1 },
  { date: '2026-11-03', count: 4 },
];
// Wednesday 4 Nov 2026, local time.
const now = new Date(2026, 10, 4, 15);

describe('periodKey', () => {
  it('keys a day, its Monday-start week, and its month in local time', () => {
    const sunday = new Date(2026, 10, 8, 23, 30);
    expect(periodKey(sunday, 'day')).toBe('2026-11-08');
    expect(periodKey(sunday, 'week')).toBe('2026-11-02');
    expect(periodKey(sunday, 'month')).toBe('2026-11');
  });
});

describe('dailySignupSeries', () => {
  it('fills empty days through today, with a running total', () => {
    expect(dailySignupSeries(daily, now)).toEqual([
      { date: '2026-10-30', signups: 2, cumulative: 2 },
      { date: '2026-10-31', signups: 0, cumulative: 2 },
      { date: '2026-11-01', signups: 0, cumulative: 2 },
      { date: '2026-11-02', signups: 1, cumulative: 3 },
      { date: '2026-11-03', signups: 4, cumulative: 7 },
      { date: '2026-11-04', signups: 0, cumulative: 7 },
    ]);
  });

  it('is empty with no signups', () => {
    expect(dailySignupSeries([], now)).toEqual([]);
  });
});

describe('rollUp', () => {
  const days = dailySignupSeries(daily, now);

  it('keeps one point per day', () => {
    expect(rollUp(days, 'day').map((p) => [p.period, p.signups])).toEqual(
      days.map((d) => [d.date, d.signups]),
    );
  });

  it('groups days into Monday-start weeks, noting the days covered', () => {
    expect(rollUp(days, 'week')).toEqual([
      {
        period: '2026-10-26',
        start: '2026-10-30',
        end: '2026-11-01',
        signups: 2,
        cumulative: 2,
      },
      {
        period: '2026-11-02',
        start: '2026-11-02',
        end: '2026-11-04',
        signups: 5,
        cumulative: 7,
      },
    ]);
  });

  it('groups days into months', () => {
    expect(
      rollUp(days, 'month').map((p) => [p.period, p.signups, p.cumulative]),
    ).toEqual([
      ['2026-10', 2, 2],
      ['2026-11', 5, 7],
    ]);
  });
});

describe('granularityFor', () => {
  it('uses days up to ~4 months, then weeks up to ~2 years, then months', () => {
    expect(granularityFor(120)).toBe('day');
    expect(granularityFor(121)).toBe('week');
    expect(granularityFor(840)).toBe('week');
    expect(granularityFor(841)).toBe('month');
  });
});

describe('Members analytics: signup charts', () => {
  const analytics = {
    totalUsers: 7,
    marketingOptIn: 0,
    partnerContactOptIn: 0,
    analyticsOptIn: 0,
    lookingForJob: 0,
    newsletter: 0,
    sharedCvs: 0,
    heardOfUs: {},
    referrers: [],
    gender: {},
    studentStatus: {},
    monthlySignups: [],
    dailySignups: daily,
  } satisfies MemberAnalytics;

  beforeEach(() => jest.useFakeTimers().setSystemTime(now));
  afterEach(() => jest.useRealTimers());

  it('defaults to the last month, per day', () => {
    render(<AnalyticsMembersTab memberAnalytics={analytics} events={[]} />);
    expect(screen.getByRole('button', { name: 'Last month' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByText('New signups per day')).toBeInTheDocument();
    expect(
      screen.getByText(
        '7 members · 5 new this month · Oct 30, 2026 – Nov 4, 2026',
      ),
    ).toBeInTheDocument();
  });

  it('switches between the preset ranges', () => {
    render(<AnalyticsMembersTab memberAnalytics={analytics} events={[]} />);
    fireEvent.click(screen.getByRole('button', { name: 'All time' }));
    expect(screen.getByRole('button', { name: 'All time' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: 'Last month' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('leaves out signups from before the last month', () => {
    const older = {
      ...analytics,
      dailySignups: [{ date: '2026-01-15', count: 3 }, ...daily],
    };
    render(<AnalyticsMembersTab memberAnalytics={older} events={[]} />);
    expect(screen.getByText(/Oct 5, 2026 – Nov 4, 2026$/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Last year' }));
    expect(screen.getByText('New signups per week')).toBeInTheDocument();
    expect(screen.getByText(/Jan 15, 2026 – Nov 4, 2026$/)).toBeInTheDocument();
  });
});
