'use client';

import React from 'react';
import { StatCard } from './AnalyticsShared';
import {
  ChartCard,
  RankedBars,
  TimeAreaChart,
  VIZ,
  fillDays,
  seriesSummary,
} from './AnalyticsCharts';
import type { AIAnalytics } from '@/lib/firestore/ai-analytics';

interface Props {
  aiAnalytics: AIAnalytics | null;
}

const AITab: React.FC<Props> = ({ aiAnalytics }) => (
  <div className="space-y-6">
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard title="Total Chats" value={aiAnalytics?.totalChats ?? 0} />
      <StatCard
        title="Total Messages"
        value={aiAnalytics?.totalMessages ?? 0}
      />
      <StatCard title="Unique Users" value={aiAnalytics?.uniqueUsers ?? 0} />
      <StatCard
        title="Avg Msgs/Chat"
        value={aiAnalytics?.avgMessagesPerChat ?? 0}
      />
    </div>

    {aiAnalytics &&
      (() => {
        const chats = fillDays(aiAnalytics.chatsPerDay, ['count']);
        const messages = fillDays(aiAnalytics.messagesPerDay, ['count']);
        return (
          <div className="grid md:grid-cols-2 gap-6">
            <ChartCard
              title="Chats per day"
              summary={seriesSummary(chats, 'count', 'chats')}
            >
              <TimeAreaChart
                data={chats}
                xKey="date"
                series={[{ key: 'count', name: 'Chats', color: VIZ.primary }]}
              />
            </ChartCard>
            <ChartCard
              title="Messages per day"
              summary={seriesSummary(messages, 'count', 'messages')}
            >
              <TimeAreaChart
                data={messages}
                xKey="date"
                series={[
                  { key: 'count', name: 'Messages', color: VIZ.primary },
                ]}
              />
            </ChartCard>
            <ChartCard
              className="md:col-span-2"
              title="Top recommended courses"
              summary="Share of recommendations among the courses listed"
            >
              <RankedBars
                data={aiAnalytics.topRecommendedCourses.map((c) => ({
                  name: c.courseId,
                  value: c.count,
                }))}
              />
            </ChartCard>
          </div>
        );
      })()}

    {!aiAnalytics && (
      <p className="text-muted-foreground text-sm italic">
        No AI chat data available yet.
      </p>
    )}
  </div>
);

export default AITab;
