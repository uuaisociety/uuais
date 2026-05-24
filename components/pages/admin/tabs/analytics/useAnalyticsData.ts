"use client";
// setState in useEffect is intentional — analytics data resets when IDs change
/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useMemo, useState } from "react";
import { useApp } from "@/contexts/AppContext";
import { getJobClicksCounts } from "@/lib/firestore/analytics";
import { getBlogReadsCounts } from "@/lib/firestore/blog";
import { getMemberAnalytics, type MemberAnalytics } from "@/lib/firestore/member-analytics";
import { getEventFunnel, type EventFunnel } from "@/lib/firestore/event-funnel";
import { getRegistrationAnalytics, type RegistrationAnalytics } from "@/lib/firestore/registration-analytics";
import { getAIAnalytics, type AIAnalytics } from "@/lib/firestore/ai-analytics";
import { fetchFirebaseAnalytics, type FirebaseAnalyticsResponse } from "@/lib/firestore/firebase-analytics";
import { cumulativeSignups, eventMonthKey } from "./AnalyticsShared";
import type { Event, BlogPost, Job, TeamMember, BoardPosition, Application } from "@/types";

export type AnalyticsTabKey = "overview" | "events" | "members" | "newsletter" | "jobs" | "ai" | "firebase";

export interface AnalyticsData {
  activeSubtab: AnalyticsTabKey;
  setActiveSubtab: (tab: AnalyticsTabKey) => void;
  eventClicks: Record<string, number>;
  blogReads: Record<string, number>;
  jobClicks: Record<string, number>;
  memberAnalytics: MemberAnalytics | null;
  funnelData: EventFunnel[];
  regAnalytics: RegistrationAnalytics | null;
  aiAnalytics: AIAnalytics | null;
  firebaseData: FirebaseAnalyticsResponse | null;
  firebaseLoading: boolean;
  totalClicks: number;
  totalBlogReads: number;
  totalJobClicks: number;
  chartData: { month: string; signups: number; cumulative: number }[];
  eventMarkers: string[];
  events: Event[];
  blogs: BlogPost[];
  jobs: Job[];
  teamMembers: TeamMember[];
  boardPositions: BoardPosition[];
  applicants: Application[];
}

export function useAnalyticsData(): AnalyticsData {
  const { state } = useApp();

  const [activeSubtab, setActiveSubtab] = useState<AnalyticsTabKey>("overview");
  const [blogReads, setBlogReads] = useState<Record<string, number>>({});
  const [jobClicks, setJobClicks] = useState<Record<string, number>>({});
  const [memberAnalytics, setMemberAnalytics] = useState<MemberAnalytics | null>(null);
  const [funnelData, setFunnelData] = useState<EventFunnel[]>([]);
  const [regAnalytics, setRegAnalytics] = useState<RegistrationAnalytics | null>(null);
  const [aiAnalytics, setAIAnalytics] = useState<AIAnalytics | null>(null);
  const [firebaseData, setFirebaseData] = useState<FirebaseAnalyticsResponse | null>(null);
  const [firebaseLoading, setFirebaseLoading] = useState(false);

  const eventIds = useMemo(() => state.events.map((e) => e.id), [state.events]);
  const blogIds = useMemo(() => state.blogPosts.map((b) => b.id), [state.blogPosts]);
  const jobIds = useMemo(() => state.jobs.map((j) => j.id), [state.jobs]);

  const eventIdsKey = useMemo(() => eventIds.join(","), [eventIds]);
  const blogIdsKey = useMemo(() => blogIds.join(","), [blogIds]);
  const jobIdsKey = useMemo(() => jobIds.join(","), [jobIds]);

  useEffect(() => {
    if (blogIds.length) {
      getBlogReadsCounts(blogIds).then(setBlogReads).catch(() => {});
    } else {
      setBlogReads({});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blogIdsKey]);

  useEffect(() => {
    if (jobIds.length) {
      getJobClicksCounts(jobIds).then(setJobClicks).catch(() => {});
    } else {
      setJobClicks({});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobIdsKey]);

  useEffect(() => {
    getMemberAnalytics().then(setMemberAnalytics).catch(() => {});
  }, []);

  useEffect(() => {
    if (eventIds.length) {
      getEventFunnel(eventIds).then(setFunnelData).catch(() => {});
      getRegistrationAnalytics(eventIds).then(setRegAnalytics).catch(() => {});
    } else {
      setFunnelData([]);
      setRegAnalytics(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventIdsKey]);

  useEffect(() => {
    if (activeSubtab !== "overview" && activeSubtab !== "ai") return;
    if (aiAnalytics) return;
    getAIAnalytics().then(setAIAnalytics).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSubtab]);

  useEffect(() => {
    if (activeSubtab !== "firebase") return;
    setFirebaseLoading(true);
    fetchFirebaseAnalytics()
      .then(setFirebaseData)
      .catch(() => setFirebaseData({ configured: false, message: "Failed to fetch" }))
      .finally(() => setFirebaseLoading(false));
  }, [activeSubtab]);

  const eventClicks = useMemo(() => {
    const map: Record<string, number> = {};
    funnelData.forEach((f) => { map[f.eventId] = f.clicks; });
    return map;
  }, [funnelData]);

  const totalClicks = Object.values(eventClicks).reduce((a, b) => a + b, 0);
  const totalBlogReads = Object.values(blogReads).reduce((a, b) => a + b, 0);
  const totalJobClicks = Object.values(jobClicks).reduce((a, b) => a + b, 0);

  const chartData = useMemo(
    () => (memberAnalytics ? cumulativeSignups(memberAnalytics.monthlySignups) : []),
    [memberAnalytics],
  );

  const eventMarkers = useMemo(() => {
    const seen = new Set<string>();
    return state.events
      .filter((e) => e.eventStartAt)
      .map((e) => eventMonthKey(e.eventStartAt))
      .filter((k) => {
        if (seen.has(k)) return false;
        seen.add(k);
        return chartData.some((d) => d.month === k);
      });
  }, [state.events, chartData]);

  return {
    activeSubtab, setActiveSubtab,
    eventClicks, blogReads, jobClicks,
    memberAnalytics, funnelData, regAnalytics,
    aiAnalytics, firebaseData, firebaseLoading,
    totalClicks, totalBlogReads, totalJobClicks,
    chartData, eventMarkers,
    events: state.events,
    blogs: state.blogPosts,
    jobs: state.jobs,
    teamMembers: state.teamMembers,
    boardPositions: state.boardPositions,
    applicants: state.applicants,
  };
}
