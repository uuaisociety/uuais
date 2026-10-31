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

export function cumulativeSignups(
  monthly: { month: string; count: number }[],
): { month: string; signups: number; cumulative: number }[] {
  if (monthly.length === 0) return [];
  // Months with no signups are absent from `monthly`; fill them in as zeros so
  // the time axis is even.
  const counts = new Map(monthly.map((m) => [m.month, m.count]));
  const sorted = [...counts.keys()].sort();
  let [y, mo] = sorted[0].split('-').map(Number);
  const [endY, endMo] = sorted[sorted.length - 1].split('-').map(Number);
  const out: { month: string; signups: number; cumulative: number }[] = [];
  let running = 0;
  while (y < endY || (y === endY && mo <= endMo)) {
    const month = `${y}-${String(mo).padStart(2, '0')}`;
    const signups = counts.get(month) ?? 0;
    running += signups;
    out.push({ month, signups, cumulative: running });
    if (++mo > 12) {
      mo = 1;
      y++;
    }
  }
  return out;
}

export function eventMonthKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
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
