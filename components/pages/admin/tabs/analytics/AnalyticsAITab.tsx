"use client";

import React from "react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { StatCard } from "./AnalyticsShared";
import type { AIAnalytics } from "@/lib/firestore/ai-analytics";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";

interface Props {
  aiAnalytics: AIAnalytics | null;
}

const AITab: React.FC<Props> = ({ aiAnalytics }) => (
  <div className="space-y-6">
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard title="Total Chats" value={aiAnalytics?.totalChats ?? 0} />
      <StatCard title="Total Messages" value={aiAnalytics?.totalMessages ?? 0} />
      <StatCard title="Unique Users" value={aiAnalytics?.uniqueUsers ?? 0} />
      <StatCard title="Avg Msgs/Chat" value={aiAnalytics?.avgMessagesPerChat ?? 0} />
    </div>

    {aiAnalytics && (
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><h4 className="font-semibold text-gray-900 dark:text-white">Chats Per Day</h4></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={aiAnalytics.chatsPerDay} margin={{ left: 10, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="count" name="Chats" stroke="#a855f7" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><h4 className="font-semibold text-gray-900 dark:text-white">Messages Per Day</h4></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={aiAnalytics.messagesPerDay} margin={{ left: 10, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="count" name="Messages" stroke="#6366f1" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader><h4 className="font-semibold text-gray-900 dark:text-white">Top Recommended Courses</h4></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={aiAnalytics.topRecommendedCourses} layout="vertical" margin={{ left: 20, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="courseId" width={180} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#a855f7" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    )}

    {!aiAnalytics && (
      <p className="text-gray-500 dark:text-gray-400 text-sm italic">
        No AI chat data available yet.
      </p>
    )}
  </div>
);

export default AITab;
