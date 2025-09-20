"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { getBlogReadsCounts, getEventClicksCounts } from "@/lib/firestore";

export interface AnalyticsTabProps {
  stats: {
    upcomingEvents: number;
    pastEvents: number;
    totalRegistrations: number;
    publishedArticles: number;
    draftArticles: number;
    teamMembers: number;
  };
  // Optional: pass events to render per-event stats
  events?: Array<{
    id: string;
    title: string;
    date: string;
    currentRegistrations?: number;
  }>;
  blogs?: Array<{
    id: string;
    title: string;
    date: string;
  }>;
}

const AnalyticsTab: React.FC<AnalyticsTabProps> = ({ stats, events = [], blogs = [] }) => {
  const [activeSubtab, setActiveSubtab] = useState<'overview' | 'events' | 'blogs'>('overview');
  const eventIds = useMemo(() => events.map(e => e.id), [events]);
  const blogIds = useMemo(() => blogs.map(b => b.id), [blogs]);
  const [eventClicks, setEventClicks] = useState<Record<string, number>>({});
  const [blogReads, setBlogReads] = useState<Record<string, number>>({});
  const eventIdsKey = useMemo(() => eventIds.join(','), [eventIds]);
  const blogIdsKey = useMemo(() => blogIds.join(','), [blogIds]);

  useEffect(() => {
    if (eventIds.length) {
      getEventClicksCounts(eventIds).then(setEventClicks).catch(() => {});
    } else {
      setEventClicks({});
    }
  }, [eventIdsKey, eventIds]);

  useEffect(() => {
    if (blogIds.length) {
      getBlogReadsCounts(blogIds).then(setBlogReads).catch(() => {});
    } else {
      setBlogReads({});
    }
  }, [blogIdsKey, blogIds]);
  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6 dark:text-white">Analytics Overview</h2>
      {/* Subtabs */}
      <div className="mb-4 border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-6 pb-4">
          {([
            { key: 'overview', label: 'Summary' },
            { key: 'events', label: 'Events' },
            { key: 'blogs', label: 'Newsletter' },
          ] as const).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveSubtab(key)}
              className={`py-2 px-4 border-b-2 text-sm font-medium ${activeSubtab === key
                ? 'border-red-500 text-red-600 dark:text-red-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              {label}
            </button>
          ))}
        </nav>
      </div>

      {activeSubtab === 'overview' && (
        <div className="grid md:grid-cols-2 gap-6">
          <Card className='bg-white dark:bg-gray-800 text-black dark:text-white'>
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Event Statistics</h3>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Upcoming Events</span>
                  <span className="font-semibold">{stats.upcomingEvents}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Past Events</span>
                  <span className="font-semibold">{stats.pastEvents}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Total Registrations</span>
                  <span className="font-semibold">{stats.totalRegistrations}</span>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className='bg-white dark:bg-gray-800 text-black dark:text-white'>
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Content Statistics</h3>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Published Articles</span>
                  <span className="font-semibold">{stats.publishedArticles}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Draft Articles</span>
                  <span className="font-semibold">{stats.draftArticles}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Team Members</span>
                  <span className="font-semibold">{stats.teamMembers}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeSubtab === 'events' && (
        <Card className='bg-white dark:bg-gray-800 text-black dark:text-white'>
          <CardHeader>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Events</h3>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-600 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                    <th className="py-2 pr-4">Event</th>
                    <th className="py-2 pr-4">Date</th>
                    <th className="py-2 pr-4">Registrations</th>
                    <th className="py-2 pr-4">Attended</th>
                    <th className="py-2 pr-4">Unique Clicks</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map(evt => (
                    <tr key={evt.id} className="border-b border-gray-100 dark:border-gray-700/50">
                      <td className="py-2 pr-4 font-medium text-gray-900 dark:text-white">{evt.title}</td>
                      <td className="py-2 pr-4 text-gray-700 dark:text-gray-300">{evt.date}</td>
                      <td className="py-2 pr-4">{evt.currentRegistrations ?? 0}</td>
                      <td className="py-2 pr-4">—</td>
                      <td className="py-2 pr-4">{eventClicks[evt.id] ?? 0}</td>
                    </tr>
                  ))}
                  {events.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-4 text-gray-500 dark:text-gray-400 text-center">No events found</td>
                    </tr>
                  )}
                </tbody>
              </table>
              <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">Note: &quot;Attended&quot; requires additional instrumentation (e.g., check-in flow). &quot;Unique Clicks&quot; are deduped client-side per day.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {activeSubtab === 'blogs' && (
        <Card className='bg-white dark:bg-gray-800 text-black dark:text-white'>
          <CardHeader>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Newsletter Reads</h3>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-600 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                    <th className="py-2 pr-4">Title</th>
                    <th className="py-2 pr-4">Date</th>
                    <th className="py-2 pr-4">Reads (unique/day)</th>
                  </tr>
                </thead>
                <tbody>
                  {blogs.map(b => (
                    <tr key={b.id} className="border-b border-gray-100 dark:border-gray-700/50">
                      <td className="py-2 pr-4 font-medium text-gray-900 dark:text-white">{b.title}</td>
                      <td className="py-2 pr-4 text-gray-700 dark:text-gray-300">{b.date}</td>
                      <td className="py-2 pr-4">{blogReads[b.id] ?? 0}</td>
                    </tr>
                  ))}
                  {blogs.length === 0 && (
                    <tr>
                      <td colSpan={3} className="py-4 text-gray-500 dark:text-gray-400 text-center">No blog posts found</td>
                    </tr>
                  )}
                </tbody>
              </table>
              <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">Reads are deduped client-side per day per browser. For stronger guarantees, move to server-side instrumentation.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AnalyticsTab;
