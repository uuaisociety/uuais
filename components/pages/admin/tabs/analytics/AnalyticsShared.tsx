'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/Card';

// Cells can hold member-typed text, and a spreadsheet runs a leading =, +, - or @
// as a formula. Same guard as lib/export-cvs.ts: flatten line breaks, drop
// invisible format characters, and see through leading whitespace and
// full-width ＝＋－＠.
export function csvCell(value: unknown): string {
  const text = String(value ?? '')
    .replace(/[\r\n\t\v\f\u2028\u2029]+/g, ' ')
    .replace(/\p{Cf}/gu, '');
  const safe = /^\s*[=+\-@\uFF1D\uFF0B\uFF0D\uFF20]/.test(text)
    ? `'${text}`
    : text;
  return `"${safe.replace(/"/g, '""')}"`;
}

export function downloadCsv(rows: unknown[][], filename: string) {
  const csv = rows.map((r) => r.map(csvCell).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function shortDate(iso: string | undefined | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString();
}

export type Granularity = 'day' | 'week' | 'month';

const pad = (n: number) => String(n).padStart(2, '0');

/** Local midnight at the start of d's day, week (from Monday) or month. */
function periodStart(d: Date, g: Granularity): Date {
  if (g === 'month') return new Date(d.getFullYear(), d.getMonth(), 1);
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  if (g === 'week') start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  return start;
}

/** "2026-11-23" for a day, the week's Monday for a week, "2026-11" for a month. */
export function periodKey(d: Date, g: Granularity): string {
  const s = periodStart(d, g);
  const month = `${s.getFullYear()}-${pad(s.getMonth() + 1)}`;
  return g === 'month' ? month : `${month}-${pad(s.getDate())}`;
}

const parseLocalDay = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export type SignupDay = { date: string; signups: number; cumulative: number };

/**
 * Signups per day with a running total, from the first signup through today.
 * Days with no signups are filled in as zeros so the time axis is even.
 */
export function dailySignupSeries(
  daily: { date: string; count: number }[],
  now = new Date(),
): SignupDay[] {
  const counts = new Map(daily.map((d) => [d.date, d.count]));
  const days = daily
    .map((d) => parseLocalDay(d.date).getTime())
    .filter((t) => !Number.isNaN(t));
  if (days.length === 0) return [];
  const last = Math.max(now.getTime(), ...days);
  const out: SignupDay[] = [];
  let running = 0;
  // Calendar steps, not fixed milliseconds, so DST changes don't skip a day.
  for (
    let p = new Date(Math.min(...days));
    p.getTime() <= last;
    p.setDate(p.getDate() + 1)
  ) {
    const date = periodKey(p, 'day');
    const signups = counts.get(date) ?? 0;
    running += signups;
    out.push({ date, signups, cumulative: running });
  }
  return out;
}

export type SignupPoint = {
  /** periodKey of the day, week or month. */
  period: string;
  /** First and last day of the series inside this period. */
  start: string;
  end: string;
  signups: number;
  /** Running total at the end of the period. */
  cumulative: number;
};

/** Days up to ~4 months, weeks up to ~2 years, months beyond: about 120 points at most. */
export function granularityFor(days: number): Granularity {
  return days <= 120 ? 'day' : days <= 7 * 120 ? 'week' : 'month';
}

/** Group a daily series into periods (consecutive days, so one pass). */
export function rollUp(days: SignupDay[], g: Granularity): SignupPoint[] {
  const out: SignupPoint[] = [];
  for (const d of days) {
    const period = periodKey(parseLocalDay(d.date), g);
    const last = out.at(-1);
    if (last?.period === period) {
      last.end = d.date;
      last.signups += d.signups;
      last.cumulative = d.cumulative;
    } else {
      out.push({
        period,
        start: d.date,
        end: d.date,
        signups: d.signups,
        cumulative: d.cumulative,
      });
    }
  }
  return out;
}

export const Row: React.FC<{
  label: string;
  value: string | number;
}> = ({ label, value }) => (
  <div className="flex justify-between text-sm">
    <span className="text-muted-foreground">{label}</span>
    <span className="font-semibold text-foreground">{value}</span>
  </div>
);

export const StatCard: React.FC<{ title: string; value: number }> = ({
  title,
  value,
}) => (
  <Card>
    <CardContent className="p-4 flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{title}</span>
      <span className="text-xl font-bold text-foreground">{value}</span>
    </CardContent>
  </Card>
);
