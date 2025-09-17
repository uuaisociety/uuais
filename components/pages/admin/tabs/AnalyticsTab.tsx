"use client";

import React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";

export interface AnalyticsTabProps {
  stats: {
    upcomingEvents: number;
    pastEvents: number;
    totalRegistrations: number;
    publishedArticles: number;
    draftArticles: number;
    teamMembers: number;
  };
}

const AnalyticsTab: React.FC<AnalyticsTabProps> = ({ stats }) => {
  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6 dark:text-white">Analytics Overview</h2>
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
    </div>
  );
};

export default AnalyticsTab;
