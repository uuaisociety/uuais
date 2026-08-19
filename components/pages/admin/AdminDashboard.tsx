'use client'

import React, { useEffect, useRef, useState } from 'react';
import {
  Calendar,
  Users,
  FileText,
  HelpCircle,
  TrendingUp,
  UserRound,
  BriefcaseBusiness,
  Bot,
  Inbox,
  ChevronRight,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import EventsTab from '@/components/pages/admin/tabs/EventsTab';
import TeamTab from '@/components/pages/admin/tabs/TeamTab';
import BlogTab from '@/components/pages/admin/tabs/BlogTab';
import FAQTab from '@/components/pages/admin/tabs/FAQTab';
import BoardTab from '@/components/pages/admin/tabs/BoardTab'
import ApplicationsTab from '@/components/pages/admin/tabs/ApplicationsTab';
import AnalyticsTab from '@/components/pages/admin/tabs/AnalyticsTab';
import MembersTab from '@/components/pages/admin/tabs/membersTab';
import JobsTab from '@/components/pages/admin/tabs/JobsTab';
import AISettingsTab from '@/components/pages/admin/tabs/AISettingsTab';
import BlogAISettingsTab from '@/components/pages/admin/tabs/BlogAISettingsTab';
import { useApp } from '@/contexts/AppContext';
import { updatePageMeta } from '@/utils/seo';
import { TabErrorBoundary } from '@/components/ui/TabErrorBoundary';
import AdminStatusStrip from '@/components/pages/admin/AdminStatusStrip';
import { useAdminOverview, type AdminTabKey } from '@/components/pages/admin/useAdminOverview';
import { ANALYTICS_SUBTABS, type AnalyticsTabKey } from '@/components/pages/admin/tabs/analytics/useAnalyticsData';

const ADMIN_TABS = ['events', 'team', 'blog', 'faq', 'analytics', 'members', 'jobs', 'ai-settings', 'applications', 'board-applications'] as const;

type NavChild = { key: string; label: string };
type NavItem = {
  key: AdminTabKey;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  children?: NavChild[];
};

const NAV_ITEMS: NavItem[] = [
  { key: 'events', label: 'Events', icon: Calendar },
  { key: 'team', label: 'Team', icon: Users },
  {
    key: 'blog', label: 'Blog', icon: FileText, children: [
      { key: 'posts', label: 'Posts' },
      { key: 'ai-settings', label: 'AI News Desk' },
    ],
  },
  { key: 'faq', label: 'FAQ', icon: HelpCircle },
  { key: 'analytics', label: 'Analytics', icon: TrendingUp, children: ANALYTICS_SUBTABS },
  { key: 'members', label: 'Members', icon: UserRound },
  { key: 'jobs', label: 'Jobs', icon: BriefcaseBusiness },
  { key: 'ai-settings', label: 'AI Settings', icon: Bot },
  { key: 'applications', label: 'Applications', icon: Inbox },
];

const AdminDashboard: React.FC = () => {
  const { state } = useApp();
  const tabValues = ADMIN_TABS;
  type Tab = AdminTabKey;
  // Restore the tab from the URL (?tab=...) or last-saved preference. Runs in
  // an effect so the initial render matches the server (avoids hydration
  // mismatch on /admin deep links) before syncing to the stored/URL tab.
  const [activeTab, setActiveTab] = useState<Tab>('events');
  const [blogSubtab, setBlogSubtab] = useState<'posts' | 'ai-settings'>('posts');
  const [analyticsSubtab, setAnalyticsSubtab] = useState<AnalyticsTabKey>('overview');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  useEffect(() => {
    const params = new URL(window.location.href).searchParams;
    const fromUrl = params.get('tab');
    if (tabValues.includes(fromUrl as Tab)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveTab(fromUrl as Tab);
      const sub = params.get('sub');
      if (fromUrl === 'blog' && (sub === 'posts' || sub === 'ai-settings')) {
         
        setBlogSubtab(sub);
      }
      if (fromUrl === 'analytics' && ANALYTICS_SUBTABS.some((s) => s.key === sub)) {
         
        setAnalyticsSubtab(sub as AnalyticsTabKey);
      }
      return;
    }
    const saved = localStorage.getItem('adminDashboardTab');
    if (tabValues.includes(saved as Tab)) {
       
      setActiveTab(saved as Tab);
    }
    try {
      const savedExpanded = localStorage.getItem('adminDashboardExpanded');
      if (savedExpanded) {
         
        setExpandedGroups(JSON.parse(savedExpanded));
      }
    } catch { /* ignore */ }
  }, [tabValues]);
  // The URL is owned by the restore effect until the user clicks a tab (avoids clobbering ?tab= before restore lands).
  const tabClicked = useRef(false);
  // Slide direction for the tab-content transition: content enters from the
  // side the clicked tab is on relative to the currently active tab.
  const [slideFrom, setSlideFrom] = useState<'right' | 'left'>('right');
  const changeTab = (next: Tab) => {
    const curIdx = tabValues.indexOf(activeTab);
    const nextIdx = tabValues.indexOf(next);
    setSlideFrom(nextIdx >= curIdx ? 'right' : 'left');
    tabClicked.current = true;
    setActiveTab(next);
    if (NAV_ITEMS.some((i) => i.key === next && i.children)) {
      setExpandedGroups((prev) => ({ ...prev, [next]: true }));
    }
  };
  const setSub = (tab: Tab, sub: string) => {
    if (tab === 'blog') setBlogSubtab(sub as 'posts' | 'ai-settings');
    else if (tab === 'analytics') setAnalyticsSubtab(sub as AnalyticsTabKey);
  };
  const toggleGroup = (key: AdminTabKey) => {
    setExpandedGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };
  const { items, loaded } = useAdminOverview();

  useEffect(() => {
    updatePageMeta('Admin Dashboard', 'Manage UU AI Society content and events');
  }, []);

  useEffect(() => {
    localStorage.setItem('adminDashboardTab', activeTab);
    localStorage.setItem('adminDashboardExpanded', JSON.stringify(expandedGroups));
    if (!tabClicked.current) return;
    const url = new URL(window.location.href);
    if (url.searchParams.get('tab') !== activeTab) {
      url.searchParams.set('tab', activeTab);
    }
    const sub = activeTab === 'blog' ? blogSubtab : activeTab === 'analytics' ? analyticsSubtab : null;
    if (sub) url.searchParams.set('sub', sub);
    else url.searchParams.delete('sub');
    window.history.replaceState(null, '', url.toString());
  }, [activeTab, blogSubtab, analyticsSubtab, expandedGroups]);

  const isSubActive = (parent: NavItem, childKey: string) =>
    activeTab === parent.key &&
    (parent.key === 'blog' ? blogSubtab === childKey : analyticsSubtab === childKey);

  return (
    <div className="min-h-screen bg-background transition-colors pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-semibold tracking-[-0.032em] text-foreground">Admin Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage your UU AI Society content and events</p>
        </div>

        {/* What needs attention */}
        <AdminStatusStrip items={items} loaded={loaded} onNavigate={changeTab} />

        {/* Sidebar + content */}
        <div className="mt-8 lg:grid lg:grid-cols-[13rem_1fr] lg:gap-8 lg:items-start">
          <nav aria-label="Admin sections" className="flex lg:flex-col gap-1 overflow-x-auto pb-2 mb-6 lg:mb-0 lg:pb-0 lg:sticky lg:top-20 [mask-image:linear-gradient(to_right,black_88%,transparent)] lg:[mask-image:none]">
            {NAV_ITEMS.map((item) => {
              const { key, label, icon: Icon, children } = item;
              const isOpen = expandedGroups[key] !== false && (activeTab === key || expandedGroups[key] === true);
              const isActive = activeTab === key;
              return (
                <div key={key} className="shrink-0">
                  <div className={`flex items-center rounded-md transition-colors duration-200 ${isActive ? 'bg-primary/10' : 'hover:bg-foreground/[0.04]'}`}>
                    <button
                      onClick={() => changeTab(key)}
                      className={`flex items-center gap-2.5 flex-1 px-3 py-3 rounded-md text-sm transition-colors duration-200 cursor-pointer ${
                        isActive ? 'text-primary font-medium' : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" aria-hidden />
                      {label}
                    </button>
                    {children && (
                      <button
                        type="button"
                        onClick={() => toggleGroup(key)}
                        aria-label={`${isOpen ? 'Collapse' : 'Expand'} ${label}`}
                        aria-expanded={isOpen}
                        className="p-2 mr-1 rounded-md text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        <ChevronRight className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`} />
                      </button>
                    )}
                  </div>
                  {children && isOpen && (
                    <div className="ml-4 lg:ml-3 border-l border-border pl-2 lg:pl-3 space-y-0.5 my-1">
                      {children.map((child) => {
                        const subActive = isSubActive(item, child.key);
                        return (
                          <button
                            key={child.key}
                            onClick={() => { setSub(key, child.key); changeTab(key); }}
                            aria-current={subActive ? "page" : undefined}
                            className={`flex items-center w-full px-3 py-2 rounded-md text-sm transition-colors duration-200 cursor-pointer ${
                              subActive
                                ? 'bg-primary/10 text-primary font-medium'
                                : 'text-muted-foreground hover:text-foreground hover:bg-foreground/[0.04]'
                            }`}
                          >
                            {child.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          <div className="min-w-0">
            <Card variant="elevated" className="p-4 md:p-6">
              <CardContent className="p-0">
                <div
                  key={`${activeTab}-${activeTab === 'blog' ? blogSubtab : activeTab === 'analytics' ? analyticsSubtab : ''}`}
                  className={`animate-in fade-in duration-300 ease-out ${slideFrom === 'right' ? 'slide-in-from-right-4' : 'slide-in-from-left-4'}`}
                >
                  {activeTab === 'events' && (
                    <TabErrorBoundary name="Events">
                      <EventsTab events={state.events} />
                    </TabErrorBoundary>
                  )}
                  {activeTab === 'jobs' && (
                    <TabErrorBoundary name="Jobs">
                      <JobsTab />
                    </TabErrorBoundary>
                  )}
                  {activeTab === 'team' && (
                    <TabErrorBoundary name="Team">
                      <TeamTab members={state.teamMembers} />
                    </TabErrorBoundary>
                  )}
                  {activeTab === 'blog' && (
                    <TabErrorBoundary name="Blog">
                      {blogSubtab === 'posts' ? (
                        <BlogTab />
                      ) : (
                        <BlogAISettingsTab />
                      )}
                    </TabErrorBoundary>
                  )}
                  {activeTab === 'analytics' && (
                    <TabErrorBoundary name="Analytics">
                      <AnalyticsTab activeSubtab={analyticsSubtab} onSelectSubtab={(k) => setAnalyticsSubtab(k)} />
                    </TabErrorBoundary>
                  )}
                  {activeTab === 'faq' && (
                    <TabErrorBoundary name="FAQ">
                      <FAQTab />
                    </TabErrorBoundary>
                  )}
                  {activeTab === 'board-applications' && (
                    <TabErrorBoundary name="Board Applications">
                      <BoardTab />
                    </TabErrorBoundary>
                  )}
                  {activeTab === 'members' && (
                    <TabErrorBoundary name="Members">
                      <MembersTab />
                    </TabErrorBoundary>
                  )}
                  {activeTab === 'ai-settings' && (
                    <TabErrorBoundary name="AI Settings">
                      <AISettingsTab />
                    </TabErrorBoundary>
                  )}
                  {activeTab === 'applications' && (
                    <TabErrorBoundary name="Applications">
                      <ApplicationsTab />
                    </TabErrorBoundary>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
