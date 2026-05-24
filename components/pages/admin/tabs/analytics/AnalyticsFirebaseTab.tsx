"use client";

import React from "react";
import { Flame } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { StatCard } from "./AnalyticsShared";
import type { FirebaseAnalyticsResponse } from "@/lib/firestore/firebase-analytics";

interface Props {
  firebaseData: FirebaseAnalyticsResponse | null;
  firebaseLoading: boolean;
}

const FirebaseTab: React.FC<Props> = ({ firebaseData, firebaseLoading }) => (
  <div className="space-y-4">
    {firebaseLoading && (
      <p className="text-gray-500 dark:text-gray-400">Loading Firebase Analytics…</p>
    )}

    {!firebaseLoading && firebaseData && !firebaseData.configured && (
      <Card>
        <CardContent className="p-6 space-y-3">
          <div className="flex items-center gap-3 text-amber-600">
            <Flame className="h-6 w-6" />
            <h3 className="text-lg font-semibold">Firebase Analytics — Not Configured</h3>
          </div>
          <p className="text-gray-600 dark:text-gray-400 text-sm">{firebaseData.message}</p>
          <div className="text-sm text-gray-500 dark:text-gray-400 space-y-1 border-t border-gray-200 dark:border-gray-700 pt-3">
            <p className="font-medium text-gray-700 dark:text-gray-300">Setup steps:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Find your GA4 property ID: Google Analytics → <strong>Admin → Property Settings</strong> (numeric ID)</li>
              <li>Add <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">GA4_PROPERTY_ID</code> to your <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">.env.local</code></li>
              <li>Enable the <strong>Google Analytics Data API</strong> at <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">console.cloud.google.com/apis/library/analyticsdata.googleapis.com</code></li>
              <li>In GA4 Admin → <strong>Property Access Management</strong>, add your Firebase service account email as a <strong>Viewer</strong></li>
            </ol>
            <p className="mt-2 text-xs">
              Your Firebase service account email is the value of <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">client_email</code> in your service account JSON file.
            </p>
          </div>
        </CardContent>
      </Card>
    )}

    {!firebaseLoading && firebaseData?.configured && firebaseData.rows && (
      <div className="space-y-4">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Active Users" value={Math.round(firebaseData.totals?.activeUsers ?? 0)} />
          <StatCard title="Page Views" value={Math.round(firebaseData.totals?.screenPageViews ?? 0)} />
          <StatCard title="Sessions" value={Math.round(firebaseData.totals?.sessions ?? 0)} />
          <StatCard title="Events" value={Math.round(firebaseData.totals?.eventCount ?? 0)} />
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader><h4 className="font-semibold text-gray-900 dark:text-white">Daily Active Users & Page Views</h4></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={firebaseData.rows} margin={{ left: 10, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="activeUsers" name="Active Users" stroke="#3b82f6" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="screenPageViews" name="Page Views" stroke="#ef4444" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><h4 className="font-semibold text-gray-900 dark:text-white">Sessions & Events</h4></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={firebaseData.rows} margin={{ left: 10, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="sessions" name="Sessions" stroke="#22c55e" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="eventCount" name="Events" stroke="#a855f7" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><h4 className="font-semibold text-gray-900 dark:text-white">New vs Returning Users</h4></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={firebaseData.rows} margin={{ left: 10, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="newUsers" name="New Users" stroke="#06b6d4" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="totalUsers" name="Total Users" stroke="#eab308" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><h4 className="font-semibold text-gray-900 dark:text-white">Avg Session Duration & Bounce Rate</h4></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={firebaseData.rows} margin={{ left: 10, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="averageSessionDuration" name="Avg Session (s)" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                  <Line yAxisId="right" type="monotone" dataKey="bounceRate" name="Bounce Rate %" stroke="#f97316" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><h4 className="font-semibold text-gray-900 dark:text-white">Daily Breakdown</h4></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-600 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                    <th className="py-2 pr-4">Date</th>
                    <th className="py-2 pr-4">Active Users</th>
                    <th className="py-2 pr-4">Page Views</th>
                    <th className="py-2 pr-4">Sessions</th>
                    <th className="py-2 pr-4">Events</th>
                    <th className="py-2 pr-4">New Users</th>
                    <th className="py-2 pr-4">Avg Session</th>
                    <th className="py-2 pr-4">Bounce Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {firebaseData.rows.map((row) => (
                    <tr key={row.date} className="border-b border-gray-100 dark:border-gray-700/50">
                      <td className="py-2 pr-4 font-medium text-gray-900 dark:text-white">{row.date}</td>
                      <td className="py-2 pr-4">{row.activeUsers}</td>
                      <td className="py-2 pr-4">{row.screenPageViews}</td>
                      <td className="py-2 pr-4">{row.sessions}</td>
                      <td className="py-2 pr-4">{row.eventCount}</td>
                      <td className="py-2 pr-4">{row.newUsers}</td>
                      <td className="py-2 pr-4">{row.averageSessionDuration.toFixed(1)}s</td>
                      <td className="py-2 pr-4">{row.bounceRate.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    )}

    {!firebaseLoading && !firebaseData && (
      <p className="text-gray-500 dark:text-gray-400 text-sm italic">No data available.</p>
    )}
  </div>
);

export default FirebaseTab;
