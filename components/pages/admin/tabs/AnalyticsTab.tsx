"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { TrendingUp, Users, Calendar, FileText, BriefcaseBusiness, Bot, Flame, Menu, X } from "lucide-react";
import { useAnalyticsData, type AnalyticsTabKey } from "./analytics/useAnalyticsData";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const isMounted = useRef(false);

  const selectTab = useCallback((key: AnalyticsTabKey) => {
    d.setActiveSubtab(key);
    setSidebarOpen(false);
    menuButtonRef.current?.focus();
  }, [d]);

  useEffect(() => {
    if (!isMounted.current) {
      isMounted.current = true;
      return;
    }
    if (!sidebarOpen) {
      menuButtonRef.current?.focus();
      return;
    }
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSidebarOpen(false);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [sidebarOpen]);

  return (
    <div className="relative">
      {/* Mobile toggle bar */}
      <div className="flex md:hidden items-center gap-2 mb-4">
        <button
          ref={menuButtonRef}
          onClick={() => setSidebarOpen((prev) => !prev)}
          className="p-2 rounded-md text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
          aria-label={sidebarOpen ? 'Close analytics menu' : 'Open analytics menu'}
          aria-expanded={sidebarOpen}
        >
          <div className="relative h-5 w-5">
            <Menu className={`absolute h-5 w-5 transition-all duration-300 ${sidebarOpen ? 'rotate-90 opacity-0 scale-75' : 'rotate-0 opacity-100 scale-100'}`} />
            <X className={`absolute h-5 w-5 transition-all duration-300 ${sidebarOpen ? 'rotate-0 opacity-100 scale-100' : '-rotate-90 opacity-0 scale-75'}`} />
          </div>
        </button>
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Analytics</h2>
      </div>

      <div className="relative">
        {/* Mobile overlay */}
        {sidebarOpen && (
          <div className="absolute inset-0 z-40 bg-black/50 md:hidden rounded-lg" onClick={() => setSidebarOpen(false)} />
        )}

        <div className="flex gap-6">
          <nav
            className={`
              w-44 shrink-0 space-y-1
              absolute inset-y-0 left-0 z-40 bg-white dark:bg-gray-900 p-4 shadow-xl
              transition-all duration-200 ease-in-out overflow-y-auto
              ${sidebarOpen ? 'translate-x-0 visible pointer-events-auto' : '-translate-x-full invisible pointer-events-none'}
              md:relative md:translate-x-0 md:visible md:pointer-events-auto md:shadow-none md:p-0 md:bg-transparent md:dark:bg-transparent md:z-0
            `}
            aria-label="Analytics sections"
          >
          {tabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => selectTab(key)}
              className={`cursor-pointer w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ease-in-out ${
                d.activeSubtab === key
                  ? "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400"
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              }`}
              aria-current={d.activeSubtab === key ? "page" : undefined}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{label}</span>
            </button>
          ))}
          </nav>

          <div className="flex-1 min-w-0">
            <h2 className="hidden md:block text-lg font-bold text-gray-900 dark:text-white mb-4">Analytics</h2>
          {d.activeSubtab === "overview" && (
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
        {d.activeSubtab === "events" && (
          <ErrorBoundary>
            <AnalyticsEventsTab funnelData={d.funnelData} events={d.events} regAnalytics={d.regAnalytics} />
          </ErrorBoundary>
        )}
        {d.activeSubtab === "members" && (
          <ErrorBoundary>
            <AnalyticsMembersTab memberAnalytics={d.memberAnalytics} chartData={d.chartData} eventMarkers={d.eventMarkers} />
          </ErrorBoundary>
        )}
        {d.activeSubtab === "newsletter" && (
          <ErrorBoundary>
            <AnalyticsNewsletterTab blogs={d.blogs} blogReads={d.blogReads} />
          </ErrorBoundary>
        )}
        {d.activeSubtab === "jobs" && (
          <ErrorBoundary>
            <AnalyticsJobsTab jobs={d.jobs} jobClicks={d.jobClicks} />
          </ErrorBoundary>
        )}
        {d.activeSubtab === "ai" && (
          <ErrorBoundary>
            <AnalyticsAITab aiAnalytics={d.aiAnalytics} />
          </ErrorBoundary>
        )}
        {d.activeSubtab === "firebase" && (
          <ErrorBoundary>
            <AnalyticsFirebaseTab firebaseData={d.firebaseData} firebaseLoading={d.firebaseLoading} />
          </ErrorBoundary>
        )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsTab;
