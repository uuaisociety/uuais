"use client";

import { useMemo } from "react";
import { useApp } from "@/contexts/AppContext";
import { useCollectionData } from "@/lib/firestore/useCollectionData";
import { subscribeOpenCampaigns } from "@/lib/firestore/applicationCampaigns";
import { subscribeToTeamApplications } from "@/lib/firestore/teamApplications";
import type { ApplicationCampaign, TeamApplication } from "@/types";

export type AdminTabKey =
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
}

/** Live "what needs attention" signals for the admin shell; subscribes to the admin-only collections while the dashboard is mounted. */
export function useAdminOverview(): { items: AdminActionItem[]; loaded: boolean } {
  const { state } = useApp();
  const { data: campaigns, loaded: campaignsLoaded } = useCollectionData<ApplicationCampaign>(subscribeOpenCampaigns, []);
  const { data: teamApplications, loaded: teamApplicationsLoaded } = useCollectionData<TeamApplication>(subscribeToTeamApplications, []);

  return useMemo(() => {
    const items: AdminActionItem[] = [];

    for (const campaign of campaigns) {
      if (campaign.status !== "open") continue;
      const subs = teamApplications.filter((s) => s.campaignId === campaign.id).length;
      if (subs > 0) {
        items.push({ tab: "applications", label: `New submission${subs !== 1 ? "s" : ""} · ${campaign.title}`, count: subs });
      }
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
      campaignsLoaded && teamApplicationsLoaded && state.blogPostsLoaded && state.eventsLoaded && state.showcaseLoaded;

    return { items, loaded };
  }, [campaigns, campaignsLoaded, teamApplications, teamApplicationsLoaded, state.blogPosts, state.blogPostsLoaded, state.events, state.eventsLoaded, state.showcaseProjects, state.showcaseLoaded]);
}
