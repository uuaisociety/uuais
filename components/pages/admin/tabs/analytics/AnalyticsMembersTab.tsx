"use client";

import React, { useCallback } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Download } from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ReferenceLine, ResponsiveContainer,
} from "recharts";
import { downloadCsv, topN, StatCard } from "./AnalyticsShared";
import type { MemberAnalytics } from "@/lib/firestore/member-analytics";

interface Props {
  memberAnalytics: MemberAnalytics | null;
  chartData: { month: string; signups: number; cumulative: number }[];
  eventMarkers: string[];
}

const MembersTab: React.FC<Props> = ({ memberAnalytics, chartData, eventMarkers }) => {
  const downloadMembersCsv = useCallback(() => {
    if (!memberAnalytics) return;
    const rows = [
      ["Metric", "Value"],
      ["Total Users", String(memberAnalytics.totalUsers)],
      ["Marketing Opt-In", String(memberAnalytics.marketingOptIn)],
      ["Partner Contact Opt-In", String(memberAnalytics.partnerContactOptIn)],
      ["Analytics Opt-In", String(memberAnalytics.analyticsOptIn)],
      ["Looking for Job", String(memberAnalytics.lookingForJob)],
      ["Newsletter Opt-In", String(memberAnalytics.newsletter)],
      [],
      ["heardOfUs", "Count"],
      ...Object.entries(memberAnalytics.heardOfUs).sort(([, a], [, b]) => b - a).map(([k, v]) => [k, String(v)]),
      [],
      ["Gender", "Count"],
      ...Object.entries(memberAnalytics.gender).sort(([, a], [, b]) => b - a).map(([k, v]) => [k, String(v)]),
      [],
      ["Student Status", "Count"],
      ...Object.entries(memberAnalytics.studentStatus).sort(([, a], [, b]) => b - a).map(([k, v]) => [k, String(v)]),
      [],
      ["Month", "Signups"],
      ...memberAnalytics.monthlySignups.map((m) => [m.month, String(m.count)]),
    ];
    downloadCsv(rows, `members-analytics-${new Date().toISOString().slice(0, 10)}.csv`);
  }, [memberAnalytics]);

  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard title="Total Users" value={memberAnalytics?.totalUsers ?? 0} />
        <StatCard title="Marketing Opt-In" value={memberAnalytics?.marketingOptIn ?? 0} />
        <StatCard title="Partner Contact Opt-In" value={memberAnalytics?.partnerContactOptIn ?? 0} />
        <StatCard title="Analytics Opt-In" value={memberAnalytics?.analyticsOptIn ?? 0} />
        <StatCard title="Looking for Job" value={memberAnalytics?.lookingForJob ?? 0} />
        <StatCard title="Newsletter Opt-In" value={memberAnalytics?.newsletter ?? 0} />
      </div>

      {memberAnalytics && (
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader><h4 className="font-semibold text-gray-900 dark:text-white">How users heard of us</h4></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={topN(memberAnalytics.heardOfUs, 6)} layout="vertical" margin={{ left: 20, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#ef4444" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><h4 className="font-semibold text-gray-900 dark:text-white">Gender balance</h4></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={topN(memberAnalytics.gender, 8)} margin={{ left: 20, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><h4 className="font-semibold text-gray-900 dark:text-white">Student status</h4></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={topN(memberAnalytics.studentStatus, 8)} margin={{ left: 20, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#22c55e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><h4 className="font-semibold text-gray-900 dark:text-white">Users over time</h4></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={chartData} margin={{ left: 10, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="cumulative" name="Total users" stroke="#ef4444" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="signups" name="New signups" stroke="#3b82f6" strokeWidth={1} dot={false} />
                  {eventMarkers.map((m) => (
                    <ReferenceLine key={m} x={m} stroke="#f97316" strokeDasharray="4 4" label={{ value: "📅", position: "top", fontSize: 10 }} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
              {eventMarkers.length > 0 && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Orange dashed lines mark months with events.</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex justify-end">
        <Button size="sm" variant="outline" icon={Download} onClick={downloadMembersCsv}>Download CSV</Button>
      </div>
    </div>
  );
};

export default MembersTab;
