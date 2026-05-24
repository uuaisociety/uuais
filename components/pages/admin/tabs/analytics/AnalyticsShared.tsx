"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/Card";

export function downloadCsv(rows: string[][], filename: string) {
  const csv = rows
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function shortDate(iso: string | undefined | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString();
}

export function topN(
  map: Record<string, number>,
  n: number,
): { name: string; value: number }[] {
  return Object.entries(map)
    .sort(([, a], [, b]) => b - a)
    .slice(0, n)
    .map(([name, value]) => ({ name, value }));
}

export function cumulativeSignups(
  monthly: { month: string; count: number }[],
): { month: string; signups: number; cumulative: number }[] {
  let running = 0;
  return monthly.map((m) => {
    running += m.count;
    return { month: m.month, signups: m.count, cumulative: running };
  });
}

export function eventMonthKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export const Row: React.FC<{
  label: string;
  value: string | number;
}> = ({ label, value }) => (
  <div className="flex justify-between text-sm">
    <span className="text-gray-600 dark:text-gray-400">{label}</span>
    <span className="font-semibold text-gray-900 dark:text-white">{value}</span>
  </div>
);

export const StatCard: React.FC<{ title: string; value: number }> = ({
  title,
  value,
}) => (
  <Card>
    <CardContent className="p-4 flex items-center justify-between">
      <span className="text-sm text-gray-600 dark:text-gray-400">{title}</span>
      <span className="text-xl font-bold text-gray-900 dark:text-white">
        {value}
      </span>
    </CardContent>
  </Card>
);
