'use client';

import React from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent } from '@/components/ui/Card';

// Shared look for every analytics chart: solid hairline grid, muted mono ticks,
// 2px lines over a 10% wash, bars capped at 24px. Colours come from --viz-*
// in globals.css (light and dark steps of the same hues).

export const VIZ = {
  primary: 'var(--viz-1)',
  secondary: 'var(--viz-2)',
  muted: 'var(--viz-muted)',
} as const;

const TICK = {
  fill: 'var(--muted-foreground)',
  fontSize: 11,
  fontFamily: 'var(--font-mono)',
};
const nf = new Intl.NumberFormat('en', {
  notation: 'compact',
  maximumFractionDigits: 1,
});
export const compact = (n: number) =>
  Math.abs(n) < 10_000 ? n.toLocaleString('en') : nf.format(n);

/** "2026-10-03" or GA4's "20261003" → Date (UTC), else null. */
function parseDay(s: string): Date | null {
  const m = /^(\d{4})-?(\d{2})-?(\d{2})$/.exec(s);
  return m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])) : null;
}

const dayKey = (d: Date) => d.toISOString().slice(0, 10);

export function formatDay(s: string): string {
  const d = parseDay(s);
  return d
    ? d.toLocaleDateString('en', {
        month: 'short',
        day: 'numeric',
        timeZone: 'UTC',
      })
    : s;
}

export function formatMonth(s: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(s);
  if (!m) return s;
  // "Oct ’25", not "Oct 25", which reads as a day.
  const month = new Date(Date.UTC(+m[1], +m[2] - 1, 1)).toLocaleDateString(
    'en',
    { month: 'short', timeZone: 'UTC' },
  );
  return `${month} ’${m[1].slice(2)}`;
}

/**
 * Sort a per-day series and insert the missing days as zeros, so the x-axis is
 * real time (sparse data would otherwise squash quiet weeks together).
 */
export function fillDays<T extends { date: string }>(
  rows: T[],
  keys: (keyof T)[],
): T[] {
  const parsed = rows
    .map((r) => ({ r, d: parseDay(r.date) }))
    .filter((x): x is { r: T; d: Date } => x.d !== null)
    .sort((a, b) => a.d.getTime() - b.d.getTime());
  if (parsed.length === 0) return [];
  const byDay = new Map(parsed.map(({ r, d }) => [dayKey(d), r]));
  const out: T[] = [];
  const last = parsed[parsed.length - 1].d.getTime();
  for (let t = parsed[0].d.getTime(); t <= last; t += 86_400_000) {
    const key = dayKey(new Date(t));
    const hit = byDay.get(key);
    if (hit) out.push({ ...hit, date: key });
    else
      out.push({
        ...Object.fromEntries(keys.map((k) => [k, 0])),
        date: key,
      } as T);
  }
  return out;
}

/** Top n entries; the tail is folded into a single "Other" row. */
export function rankWithOther(
  map: Record<string, number>,
  n: number,
): { name: string; value: number }[] {
  const sorted = Object.entries(map).sort(([, a], [, b]) => b - a);
  const head = sorted.slice(0, n).map(([name, value]) => ({ name, value }));
  const rest = sorted.slice(n).reduce((s, [, v]) => s + v, 0);
  return rest > 0 ? [...head, { name: 'Other', value: rest }] : head;
}

export const ChartCard: React.FC<{
  title: string;
  summary?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}> = ({ title, summary, className, children }) => (
  <Card className={className}>
    <CardContent className="p-5">
      <div className="mb-4">
        <h4 className="font-semibold text-foreground">{title}</h4>
        {summary && (
          <p className="mono-meta text-muted-foreground mt-0.5">{summary}</p>
        )}
      </div>
      {children}
    </CardContent>
  </Card>
);

export const Legend: React.FC<{
  items: { label: string; color: string }[];
}> = ({ items }) => (
  <div className="flex flex-wrap gap-x-4 gap-y-1 mb-3 text-xs text-muted-foreground">
    {items.map((i) => (
      <span key={i.label} className="inline-flex items-center gap-1.5">
        <span
          className="h-2 w-2 rounded-full"
          style={{ background: i.color }}
        />
        {i.label}
      </span>
    ))}
  </div>
);

type TooltipEntry = {
  name?: string | number;
  value?: number | string;
  color?: string;
  dataKey?: string | number;
};

const ChartTooltip: React.FC<{
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string | number;
  labelFormat: (l: string) => string;
  valueFormat: (v: number) => string;
}> = ({ active, payload, label, labelFormat, valueFormat }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="mono-meta text-muted-foreground mb-1">
        {labelFormat(String(label))}
      </p>
      {payload.map((p) => (
        <p
          key={String(p.dataKey)}
          className="flex items-center gap-2 text-popover-foreground"
        >
          {/* One series needs no key (and a highlighted bar's colour isn't p.color). */}
          {payload.length > 1 && (
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: p.color }}
            />
          )}
          <span className="text-muted-foreground">{p.name}</span>
          <span className="ml-auto pl-3 font-semibold tabular-nums">
            {valueFormat(Number(p.value))}
          </span>
        </p>
      ))}
    </div>
  );
};

export type Series = { key: string; name: string; color: string };

/** Area chart over a date (or month) axis. One y-scale only; `stacked` sums the series. */
export function TimeAreaChart<T extends object>({
  data,
  xKey,
  series,
  height = 200,
  stacked = false,
  xFormat = formatDay,
  valueFormat = compact,
}: {
  data: T[];
  xKey: string;
  series: Series[];
  height?: number;
  stacked?: boolean;
  xFormat?: (s: string) => string;
  valueFormat?: (v: number) => string;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis
          dataKey={xKey}
          tick={TICK}
          tickLine={false}
          axisLine={{ stroke: 'var(--border)' }}
          tickFormatter={xFormat}
          minTickGap={24}
        />
        <YAxis
          tick={TICK}
          tickLine={false}
          axisLine={false}
          width={40}
          allowDecimals={false}
          tickFormatter={(v: number) => compact(v)}
        />
        <Tooltip
          cursor={{ stroke: 'var(--muted-foreground)', strokeWidth: 1 }}
          content={
            <ChartTooltip labelFormat={xFormat} valueFormat={valueFormat} />
          }
        />
        {series.map((s) => (
          <Area
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.name}
            stroke={s.color}
            strokeWidth={2}
            fill={s.color}
            fillOpacity={stacked ? 0.18 : 0.1}
            stackId={stacked ? '1' : undefined}
            isAnimationActive={false}
            dot={false}
            activeDot={{
              r: 4,
              fill: s.color,
              stroke: 'var(--card)',
              strokeWidth: 2,
            }}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}

/** Vertical columns over months/days; `colorFor` lets a column be highlighted. */
export function ColumnChart<T extends object>({
  data,
  xKey,
  yKey,
  name,
  height = 200,
  colorFor,
  xFormat = (s: string) => s,
}: {
  data: T[];
  xKey: string;
  yKey: string;
  name: string;
  height?: number;
  colorFor?: (row: T) => string;
  xFormat?: (s: string) => string;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        margin={{ top: 4, right: 8, bottom: 0, left: 0 }}
        barCategoryGap={2}
      >
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis
          dataKey={xKey}
          tick={TICK}
          tickLine={false}
          axisLine={{ stroke: 'var(--border)' }}
          tickFormatter={xFormat}
          minTickGap={16}
        />
        <YAxis
          tick={TICK}
          tickLine={false}
          axisLine={false}
          width={40}
          allowDecimals={false}
          tickFormatter={(v: number) => compact(v)}
        />
        <Tooltip
          cursor={{ fill: 'var(--foreground)', fillOpacity: 0.04 }}
          content={<ChartTooltip labelFormat={xFormat} valueFormat={compact} />}
        />
        <Bar
          dataKey={yKey}
          name={name}
          maxBarSize={24}
          radius={[4, 4, 0, 0]}
          fill={VIZ.primary}
          isAnimationActive={false}
        >
          {colorFor &&
            data.map((row, i) => <Cell key={i} fill={colorFor(row)} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/**
 * Ranked horizontal bars in plain HTML: labels never clip, every row shows its
 * count and share. Bar length is relative to the largest row.
 */
export const RankedBars: React.FC<{
  data: { name: string; value: number }[];
  color?: string;
  capitalize?: boolean;
}> = ({ data, color = VIZ.primary, capitalize = false }) => {
  const total = data.reduce((s, d) => s + d.value, 0);
  const max = Math.max(1, ...data.map((d) => d.value));
  if (data.length === 0)
    return (
      <p className="text-sm text-muted-foreground italic">No answers yet</p>
    );
  return (
    <ul className="space-y-2.5">
      {data.map((d) => {
        const pct = total > 0 ? Math.round((d.value / total) * 100) : 0;
        return (
          <li key={d.name} title={`${d.name}: ${d.value} (${pct}%)`}>
            <div className="flex items-baseline gap-3 text-sm mb-1">
              <span
                className={`flex-1 min-w-0 truncate text-foreground/80 ${capitalize ? 'first-letter:uppercase' : ''}`}
              >
                {d.name}
              </span>
              <span className="font-semibold text-foreground tabular-nums">
                {d.value.toLocaleString('en')}
              </span>
              <span className="w-9 text-right text-xs text-muted-foreground tabular-nums">
                {pct}%
              </span>
            </div>
            <div className="h-2 rounded-full bg-foreground/[0.06]">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${(d.value / max) * 100}%`,
                  background: color,
                }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
};

/**
 * "312 chats · peak 42 on Oct 3" for a per-day series. Pass unit null where a
 * sum over days means nothing (daily active users): then only the peak.
 */
export function seriesSummary<T extends { date: string }>(
  rows: T[],
  key: keyof T,
  unit: string | null = 'total',
): string {
  if (rows.length === 0) return 'No data yet';
  let total = 0;
  let peak = rows[0];
  for (const r of rows) {
    total += Number(r[key]) || 0;
    if (Number(r[key]) > Number(peak[key])) peak = r;
  }
  const peakText = `peak ${compact(Number(peak[key]))} on ${formatDay(peak.date)}`;
  return unit === null
    ? peakText.replace(/^p/, 'P')
    : `${compact(total)} ${unit} · ${peakText}`;
}
