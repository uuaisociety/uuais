"use client";

import { useMemo } from "react";
import { useApp } from "@/contexts/AppContext";
import { useCollectionData } from "@/lib/firestore/useCollectionData";
import { subscribeOpenCampaigns } from "@/lib/firestore/applicationCampaigns";
import { subscribeToTeamApplications } from "@/lib/firestore/teamApplications";
import { subscribeOpenProgramFeedback } from "@/lib/firestore/program-feedback";
import type { ProgramFeedback } from "@/lib/firestore/program-feedback";
import type { ApplicationCampaign, TeamApplication } from "@/types";

export type AdminTabKey =
  | "programs"
  | "events"
  | "team"
  | "blog"
  | "showcase"
  | "faq"
  | "analytics"
  | "members"
  | "jobs"
  | "ai-settings"
  | "applications"
  | "board-applications";

export interface AdminActionItem {
  tab: AdminTabKey;
  label: string;
  count: number;
  /** Subtab to open with the tab, where the work actually lives. */
  sub?: string;
}

/** Live "what needs attention" signals for the admin shell; subscribes to the admin-only collections while the dashboard is mounted. */
export function useAdminOverview(): { items: AdminActionItem[]; loaded: boolean } {
  const { state } = useApp();
  const { data: campaigns, loaded: campaignsLoaded } = useCollectionData<ApplicationCampaign>(subscribeOpenCampaigns, []);
  const { data: teamApplications, loaded: teamApplicationsLoaded } = useCollectionData<TeamApplication>(subscribeToTeamApplications, []);
  const { data: openReports, loaded: reportsLoaded } = useCollectionData<ProgramFeedback>(subscribeOpenProgramFeedback, []);

  return useMemo(() => {
    const items: AdminActionItem[] = [];

    for (const campaign of campaigns) {
      if (campaign.status !== "open") continue;
      const subs = teamApplications.filter((s) => s.campaignId === campaign.id).length;
      if (subs > 0) {
        items.push({ tab: "applications", label: `New submission${subs !== 1 ? "s" : ""} · ${campaign.title}`, count: subs });
      }
    }

    // Readers report errors in the generated maps; unread, they are the only signal that a
    // machine-extracted prerequisite is wrong.
    if (openReports.length > 0) {
      items.push({
        tab: "programs",
        sub: "feedback",
        label: `Programme error report${openReports.length !== 1 ? "s" : ""} to review`,
        count: openReports.length,
      });
    }

    // Member submissions land unpublished and are invisible until someone reviews them.
    const pendingProjects = state.showcaseProjects.filter((p) => !p.published).length;
    if (pendingProjects > 0) {
      items.push({
        tab: "showcase",
        label: `Showcase submission${pendingProjects !== 1 ? "s" : ""} to review`,
        count: pendingProjects,
      });
    }

    const drafts = state.blogPosts.filter((p) => !p.published).length;
    if (drafts > 0) {
      items.push({ tab: "blog", label: `Draft post${drafts !== 1 ? "s" : ""} to review`, count: drafts });
    }

    const unpublishedEvents = state.events.filter((e) => e.published === false).length;
    if (unpublishedEvents > 0) {
      items.push({ tab: "events", label: `Unpublished event${unpublishedEvents !== 1 ? "s" : ""}`, count: unpublishedEvents });
    }

    // Positive signal: real registrations on the most recent published event.
    const latest = state.events
      .filter((e) => e.published && e.eventStartAt && Number.isFinite(Date.parse(e.eventStartAt)))
      .sort((a, b) => Date.parse(b.eventStartAt) - Date.parse(a.eventStartAt))[0];
    if (latest && (latest.currentRegistrations ?? 0) > 0) {
      items.push({ tab: "events", label: `registered for ${latest.title}`, count: latest.currentRegistrations ?? 0 });
    }

    const loaded =
      campaignsLoaded && teamApplicationsLoaded && reportsLoaded && state.blogPostsLoaded && state.eventsLoaded && state.showcaseLoaded;

    return { items, loaded };
  }, [campaigns, campaignsLoaded, teamApplications, teamApplicationsLoaded, openReports, reportsLoaded, state.blogPosts, state.blogPostsLoaded, state.events, state.eventsLoaded, state.showcaseProjects, state.showcaseLoaded]);
}
