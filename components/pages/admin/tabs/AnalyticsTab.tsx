"use client";

import React from "react";
import { useAnalyticsData, type AnalyticsTabKey } from "./analytics/useAnalyticsData";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import dynamic from "next/dynamic";
import AnalyticsOverviewTab from "./analytics/AnalyticsOverviewTab";
import AnalyticsNewsletterTab from "./analytics/AnalyticsNewsletterTab";
import AnalyticsJobsTab from "./analytics/AnalyticsJobsTab";

const AnalyticsEventsTab = dynamic(() => import("./analytics/AnalyticsEventsTab"), { ssr: false });
const AnalyticsMembersTab = dynamic(() => import("./analytics/AnalyticsMembersTab"), { ssr: false });
const AnalyticsAITab = dynamic(() => import("./analytics/AnalyticsAITab"), { ssr: false });
const AnalyticsFirebaseTab = dynamic(() => import("./analytics/AnalyticsFirebaseTab"), { ssr: false });

interface AnalyticsTabProps {
  activeSubtab: AnalyticsTabKey;
  onSelectSubtab: (key: AnalyticsTabKey) => void;
}

const AnalyticsTab: React.FC<AnalyticsTabProps> = ({ activeSubtab, onSelectSubtab }) => {
  const d = useAnalyticsData(activeSubtab, onSelectSubtab);

  return (
    <div>
      <h2 className="text-xl font-semibold tracking-[-0.028em] text-foreground mb-4">Analytics</h2>
      {activeSubtab === "overview" && (
        <ErrorBoundary>
          <AnalyticsOverviewTab
            events={d.events}
            blogs={d.blogs}
            jobs={d.jobs}
            teamMembers={d.teamMembers}
            boardPositions={d.boardPositions}
            applicants={d.applicants}
            eventClicks={d.eventClicks}
            blogReads={d.blogReads}
            jobClicks={d.jobClicks}
            memberAnalytics={d.memberAnalytics}
            funnelData={d.funnelData}
            aiAnalytics={d.aiAnalytics}
            totalClicks={d.totalClicks}
            totalBlogReads={d.totalBlogReads}
            totalJobClicks={d.totalJobClicks}
          />
        </ErrorBoundary>
      )}
      {activeSubtab === "events" && (
        <ErrorBoundary>
          <AnalyticsEventsTab funnelData={d.funnelData} events={d.events} regAnalytics={d.regAnalytics} />
        </ErrorBoundary>
      )}
      {activeSubtab === "members" && (
        <ErrorBoundary>
          <AnalyticsMembersTab memberAnalytics={d.memberAnalytics} chartData={d.chartData} eventMarkers={d.eventMarkers} />
        </ErrorBoundary>
      )}
      {activeSubtab === "newsletter" && (
        <ErrorBoundary>
          <AnalyticsNewsletterTab blogs={d.blogs} blogReads={d.blogReads} />
        </ErrorBoundary>
      )}
      {activeSubtab === "jobs" && (
        <ErrorBoundary>
          <AnalyticsJobsTab jobs={d.jobs} jobClicks={d.jobClicks} />
        </ErrorBoundary>
      )}
      {activeSubtab === "ai" && (
        <ErrorBoundary>
          <AnalyticsAITab aiAnalytics={d.aiAnalytics} />
        </ErrorBoundary>
      )}
      {activeSubtab === "firebase" && (
        <ErrorBoundary>
          <AnalyticsFirebaseTab firebaseData={d.firebaseData} firebaseLoading={d.firebaseLoading} />
        </ErrorBoundary>
      )}
    </div>
  );
};

export default AnalyticsTab;
