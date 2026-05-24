"use client";

import React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Row } from "./AnalyticsShared";
import type { Event, BlogPost, Job, TeamMember, BoardPosition, Application } from "@/types";
import type { MemberAnalytics } from "@/lib/firestore/member-analytics";
import type { EventFunnel } from "@/lib/firestore/event-funnel";
import type { AIAnalytics } from "@/lib/firestore/ai-analytics";

interface Props {
  events: Event[];
  blogs: BlogPost[];
  jobs: Job[];
  teamMembers: TeamMember[];
  boardPositions: BoardPosition[];
  applicants: Application[];
  eventClicks: Record<string, number>;
  blogReads: Record<string, number>;
  jobClicks: Record<string, number>;
  memberAnalytics: MemberAnalytics | null;
  funnelData: EventFunnel[];
  aiAnalytics: AIAnalytics | null;
  totalClicks: number;
  totalBlogReads: number;
  totalJobClicks: number;
}

const OverviewTab: React.FC<Props> = ({
  events, blogs, jobs, teamMembers, boardPositions, applicants,
  memberAnalytics, funnelData, aiAnalytics,
  totalClicks, totalBlogReads, totalJobClicks,
}) => (
  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
    <Card>
      <CardHeader><h3 className="text-lg font-semibold text-gray-900 dark:text-white">Events</h3></CardHeader>
      <CardContent className="space-y-3">
        <Row label="Total events" value={events.length} />
        <Row label="Unique clicks" value={totalClicks} />
        <Row label="Registrations" value={events.reduce((s, e) => s + (e.currentRegistrations ?? 0), 0)} />
        <Row label="Avg view→reg" value={funnelData.length ? `${Math.round(funnelData.reduce((s, f) => s + f.viewToRegPct, 0) / funnelData.length)}%` : "—"} />
      </CardContent>
    </Card>
    <Card>
      <CardHeader><h3 className="text-lg font-semibold text-gray-900 dark:text-white">Newsletter</h3></CardHeader>
      <CardContent className="space-y-3">
        <Row label="Total posts" value={blogs.length} />
        <Row label="Unique reads" value={totalBlogReads} />
        <Row label="Published" value={`${blogs.filter((b) => b.published).length} / ${blogs.length}`} />
      </CardContent>
    </Card>
    <Card>
      <CardHeader><h3 className="text-lg font-semibold text-gray-900 dark:text-white">Members</h3></CardHeader>
      <CardContent className="space-y-3">
        <Row label="Total users" value={memberAnalytics?.totalUsers ?? "—"} />
        <Row label="Marketing opt-in" value={memberAnalytics?.marketingOptIn ?? "—"} />
        <Row label="Newsletter opt-in" value={memberAnalytics?.newsletter ?? "—"} />
      </CardContent>
    </Card>
    <Card>
      <CardHeader><h3 className="text-lg font-semibold text-gray-900 dark:text-white">Jobs</h3></CardHeader>
      <CardContent className="space-y-3">
        <Row label="Total postings" value={jobs.length} />
        <Row label="Apply clicks" value={totalJobClicks} />
      </CardContent>
    </Card>
    <Card>
      <CardHeader><h3 className="text-lg font-semibold text-gray-900 dark:text-white">AI Assistant</h3></CardHeader>
      <CardContent className="space-y-3">
        <Row label="Total chats" value={aiAnalytics?.totalChats ?? "—"} />
        <Row label="Unique users" value={aiAnalytics?.uniqueUsers ?? "—"} />
        <Row label="Avg messages/chat" value={aiAnalytics?.avgMessagesPerChat ?? "—"} />
      </CardContent>
    </Card>
    <Card>
      <CardHeader><h3 className="text-lg font-semibold text-gray-900 dark:text-white">Team</h3></CardHeader>
      <CardContent className="space-y-3">
        <Row label="Team members" value={teamMembers.length} />
        <Row label="Board positions" value={boardPositions.length} />
        <Row label="Applicants" value={applicants.length} />
      </CardContent>
    </Card>
  </div>
);

export default OverviewTab;
