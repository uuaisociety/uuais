"use client";

import React from "react";
import { TrendingUp, Users, Calendar, FileText, BriefcaseBusiness, Bot, Flame } from "lucide-react";
import { useAnalyticsData, type AnalyticsTabKey } from "./analytics/useAnalyticsData";
import AnalyticsOverviewTab from "./analytics/AnalyticsOverviewTab";
import AnalyticsEventsTab from "./analytics/AnalyticsEventsTab";
import AnalyticsMembersTab from "./analytics/AnalyticsMembersTab";
import AnalyticsNewsletterTab from "./analytics/AnalyticsNewsletterTab";
import AnalyticsJobsTab from "./analytics/AnalyticsJobsTab";
import AnalyticsAITab from "./analytics/AnalyticsAITab";
import AnalyticsFirebaseTab from "./analytics/AnalyticsFirebaseTab";

const tabs: { key: AnalyticsTabKey; label: string; icon: React.FC<{ className?: string }> }[] = [
  { key: "overview", label: "Summary", icon: TrendingUp },
  { key: "events", label: "Events", icon: Calendar },
  { key: "members", label: "Members", icon: Users },
  { key: "newsletter", label: "Newsletter", icon: FileText },
  { key: "jobs", label: "Jobs", icon: BriefcaseBusiness },
  { key: "ai", label: "AI Assistant", icon: Bot },
  { key: "firebase", label: "Firebase", icon: Flame },
];

const AnalyticsTab: React.FC = () => {
  const d = useAnalyticsData();

  return (
    <div className="flex gap-6">
      <nav className="w-44 shrink-0 space-y-1">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 px-3">Analytics</h2>
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => d.setActiveSubtab(key)}
            className={`cursor-pointer w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ease-in-out ${
              d.activeSubtab === key
                ? "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400"
                : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="truncate">{label}</span>
          </button>
        ))}
      </nav>

      <div className="flex-1 min-w-0">
        {d.activeSubtab === "overview" && (
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
        )}
        {d.activeSubtab === "events" && (
          <AnalyticsEventsTab funnelData={d.funnelData} events={d.events} regAnalytics={d.regAnalytics} />
        )}
        {d.activeSubtab === "members" && (
          <AnalyticsMembersTab memberAnalytics={d.memberAnalytics} chartData={d.chartData} eventMarkers={d.eventMarkers} />
        )}
        {d.activeSubtab === "newsletter" && (
          <AnalyticsNewsletterTab blogs={d.blogs} blogReads={d.blogReads} />
        )}
        {d.activeSubtab === "jobs" && (
          <AnalyticsJobsTab jobs={d.jobs} jobClicks={d.jobClicks} />
        )}
        {d.activeSubtab === "ai" && <AnalyticsAITab aiAnalytics={d.aiAnalytics} />}
        {d.activeSubtab === "firebase" && (
          <AnalyticsFirebaseTab firebaseData={d.firebaseData} firebaseLoading={d.firebaseLoading} />
        )}
      </div>
    </div>
  );
};

export default AnalyticsTab;
