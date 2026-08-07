"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  Plus, Edit3, Trash2, Eye, ChevronDown, ChevronUp, Calendar,
  Users, FileQuestion, Search, ArrowLeft,
  Mail, ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import Tag from "@/components/ui/Tag";
import { InputBase, SelectBase } from "@/components/ui/Form";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { subscribeToCampaignQuestions } from "@/lib/firestore/campaignQuestions";
import {
  ApplicationCampaign, TeamApplication, CampaignStatus,
} from "@/types";

const TEAM_NAMES: Record<string, string> = {
  it: "IT",
  development: "Development",
  growth: "Growth",
  partnerships_events: "Partnerships & Events",
  research: "Research",
  vp: "Vice President",
};

const STATUS_STYLES: Record<CampaignStatus, { label: string; tagVariant: "green" | "red" | "yellow" }> = {
  open: { label: "Open", tagVariant: "green" },
  closed: { label: "Closed", tagVariant: "red" },
  draft: { label: "Draft", tagVariant: "yellow" },
};

const STATUS_ORDER: CampaignStatus[] = ["open", "draft", "closed"];

const STATUS_TOGGLE_ACTIVE: Record<CampaignStatus, string> = {
  open: "bg-green-600 text-white border-green-600",
  draft: "bg-yellow-500 text-white border-yellow-500",
  closed: "bg-gray-600 text-white border-gray-600",
};

const formatDate = (createdAt: TeamApplication["createdAt"]): string => {
  if (!createdAt) return "—";
  if (typeof createdAt === "string") {
    const d = new Date(createdAt);
    return Number.isNaN(d.getTime()) ? createdAt : d.toDateString();
  }
  return createdAt.toDate().toDateString();
};

/** Only allow http/https URLs to prevent javascript: XSS in href attributes. */
function safeUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") return url;
  } catch { /* invalid URL */ }
  return undefined;
}

interface ApplicationsTabProps {
  campaigns: ApplicationCampaign[];
  applications: TeamApplication[];
  onAddCampaign: () => void;
  onEditCampaign: (campaign: ApplicationCampaign) => void;
  onDeleteCampaign: (id: string) => void;
  onUpdateCampaignStatus: (id: string, status: CampaignStatus) => void;
  onDeleteApplication: (id: string, emailNormalized: string, campaignId: string) => void;
}

const ApplicationsTab: React.FC<ApplicationsTabProps> = ({
  campaigns, applications, onAddCampaign, onEditCampaign, onDeleteCampaign, onUpdateCampaignStatus, onDeleteApplication,
}) => {
  const [filter, setFilter] = useState<"all" | CampaignStatus>("all");
  const [view, setView] = useState<"campaigns" | "submissions">("campaigns");
  const [selectedCampaign, setSelectedCampaign] = useState<ApplicationCampaign | null>(null);
  const [expandApp, setExpandApp] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [subFilter, setSubFilter] = useState("all");
  const [confirmDeleteCampaign, setConfirmDeleteCampaign] = useState<ApplicationCampaign | null>(null);
  const [confirmDeleteApp, setConfirmDeleteApp] = useState<TeamApplication | null>(null);

  // Load the selected campaign's questions so admins see readable labels for
  // custom answers (falls back to the raw question id while loading).
  const [questionsByCampaign, setQuestionsByCampaign] = useState<{ campaignId: string; questions: { id: string; question: string }[] } | null>(null);
  useEffect(() => {
    if (!selectedCampaign) return;
    let active = true;
    const unsub = subscribeToCampaignQuestions(selectedCampaign.id, (questions) => {
      if (active) setQuestionsByCampaign({ campaignId: selectedCampaign.id, questions });
    });
    return () => { active = false; unsub(); };
  }, [selectedCampaign]);

  const questionMap = useMemo(() => {
    if (!selectedCampaign || questionsByCampaign?.campaignId !== selectedCampaign.id) return null;
    return new Map(questionsByCampaign.questions.map((q) => [q.id, q.question]));
  }, [questionsByCampaign, selectedCampaign]);

  const roleOptions = useMemo(() => {
    if (!selectedCampaign?.roles?.length) return [];
    return selectedCampaign.roles
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((r) => ({ id: r.id, title: r.title, teamId: r.teamId }));
  }, [selectedCampaign]);

  const roleById = useMemo(() => {
    const m = new Map<string, { title: string; teamId: string }>();
    roleOptions.forEach((r) => m.set(r.id, { title: r.title, teamId: r.teamId }));
    return m;
  }, [roleOptions]);

  const roleTitle = (roleId: string): string => roleById.get(roleId)?.title || roleId;
  const teamName = (teamId: string): string => TEAM_NAMES[teamId] || teamId;

  const filtered = filter === "all" ? campaigns : campaigns.filter((c) => c.status === filter);
  const counts = {
    all: campaigns.length,
    open: campaigns.filter((c) => c.status === "open").length,
    closed: campaigns.filter((c) => c.status === "closed").length,
    draft: campaigns.filter((c) => c.status === "draft").length,
  };

  // Submissions for selected campaign (or all)
  const campaignSubs = useMemo(
    () => applications.filter((s) => !selectedCampaign || s.campaignId === selectedCampaign.id),
    [applications, selectedCampaign]
  );
  const filteredSubs = useMemo(() => {
    return campaignSubs.filter((s) => {
      if (search.trim()) {
        const q = search.toLowerCase();
        if (!s.name.toLowerCase().includes(q) && !s.email.toLowerCase().includes(q) && !(s.program || "").toLowerCase().includes(q)) return false;
      }
      if (subFilter !== "all") {
        if (subFilter.startsWith("role:")) {
          const roleId = subFilter.slice(5);
          if (!(s.roleRanking || []).some((c) => c.roleId === roleId)) return false;
        } else if (subFilter.startsWith("team:")) {
          const teamId = subFilter.slice(5);
          const inRole = (s.roleRanking || []).some((c) => c.teamId === teamId);
          const inLegacy = (s.teamRanking || []).includes(teamId);
          if (!inRole && !inLegacy) return false;
        }
      }
      return true;
    });
  }, [campaignSubs, search, subFilter]);

  const toggleApp = (id: string) =>
    setExpandApp((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const renderRoleTags = (submission: TeamApplication) => {
    if (submission.roleRanking && submission.roleRanking.length > 0) {
      return submission.roleRanking.slice(0, 3).map((c, idx) => (
        <Tag key={c.roleId} variant={idx === 0 ? "red" : "green"} size="sm">#{idx + 1} {roleTitle(c.roleId)}</Tag>
      ));
    }
    return (submission.teamRanking || []).slice(0, 3).map((tid, idx) => (
      <Tag key={tid} variant={idx === 0 ? "red" : "green"} size="sm">#{idx + 1} {teamName(tid)}</Tag>
    ));
  };

  if (view === "submissions") {
    return (
      <div key="submissions" className="animate-in fade-in slide-in-from-right-4 duration-300 ease-out">
        <div className="flex items-center gap-3 mb-6">
          <Button size="sm" icon={ArrowLeft} onClick={() => { setView("campaigns"); setSelectedCampaign(null); }}>Back to campaigns</Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {selectedCampaign ? `Submissions: ${selectedCampaign.title}` : "All Submissions"}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-3">
              <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {filteredSubs.length} of {campaignSubs.length}</span>
              {selectedCampaign && <span>· Deadline {selectedCampaign.deadline}</span>}
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <InputBase placeholder="Search by name, email, or program..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">Filter by role:</span>
            <SelectBase
              value={subFilter}
              onChange={(e) => setSubFilter(e.target.value)}
              className="w-auto min-w-[140px]"
            >
              <option value="all">All roles</option>
              {roleOptions.length > 0
                ? roleOptions.map((r) => (
                  <option key={r.id} value={`role:${r.id}`}>{teamName(r.teamId)} · {r.title}</option>
                ))
                : Object.entries(TEAM_NAMES).map(([id, name]) => (
                  <option key={id} value={`team:${id}`}>{name}</option>
                ))}
            </SelectBase>
          </div>
        </div>

        <div className="grid gap-3">
          {filteredSubs.length === 0 ? (
            <div className="text-center py-16 text-gray-500 dark:text-gray-400">No submissions match your filters.</div>
          ) : (
            filteredSubs.map((submission) => {
              const isOpen = expandApp.has(submission.id);
              return (
                <Card key={submission.id} className="bg-white dark:bg-gray-800">
                  <div className="p-5">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <button onClick={() => toggleApp(submission.id)} aria-expanded={isOpen} aria-controls={`submission-details-${submission.id}`} className="flex items-center gap-2 text-left group transition-all duration-300 ease-in-out cursor-pointer">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{submission.name}</h3>
                          {isOpen
                            ? <ChevronUp className="h-4 w-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
                            : <ChevronDown className="h-4 w-4 text-gray-400 group-hover:text-gray-600 transition-colors" />}
                        </button>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm text-gray-500 dark:text-gray-400">
                          <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" /> {submission.email}</span>
                          <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {formatDate(submission.createdAt)}</span>
                        </div>
                      </div>
                      <Button size="sm" variant="destructive" icon={Trash2} onClick={() => setConfirmDeleteApp(submission)}>
                        <span className="sr-only">Delete</span>
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {submission.program && <Tag variant="red" size="sm">{submission.program}</Tag>}
                      {submission.graduationYear && <Tag variant="green" size="sm">Class of {submission.graduationYear}</Tag>}
                      {typeof submission.weeklyHours === "number" && <Tag variant="yellow" size="sm">{submission.weeklyHours} hr/wk</Tag>}
                      {renderRoleTags(submission)}
                    </div>
                    <div id={`submission-details-${submission.id}`} inert={!isOpen} className={`grid overflow-hidden transition-all duration-500 ease-in-out ${isOpen ? "mt-4 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
                      <div className="min-h-0">
                        <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-3">
                          {submission.linkedin && (
                            <div className="text-sm">
                              <span className="text-xs font-medium text-gray-500 uppercase mr-2">LinkedIn</span>
                              <a href={safeUrl(submission.linkedin) || "#"} target="_blank" rel="noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1">
                                {submission.linkedin} <ExternalLink className="h-3 w-3" />
                              </a>
                            </div>
                          )}
                          {submission.resume?.url && (
                            <div className="text-sm">
                              <span className="text-xs font-medium text-gray-500 uppercase mr-2">Resume</span>
                              <a href={safeUrl(submission.resume.url) || "#"} target="_blank" rel="noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">View PDF</a>
                            </div>
                          )}
                          {(submission.roleRanking && submission.roleRanking.length > 0) && (
                            <div>
                              <span className="block text-xs font-medium text-gray-500 uppercase mb-2">Role preferences</span>
                              <div className="space-y-3">
                                {submission.roleRanking.map((c, idx) => (
                                  <div key={c.roleId}>
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                      #{idx + 1} {roleTitle(c.roleId)} <span className="text-gray-400">· {teamName(c.teamId)}</span>
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {submission.customRole && (
                            <div className="text-sm">
                              <span className="text-xs font-medium text-gray-500 uppercase mr-2">Proposed role</span>
                              <span className="text-gray-700 dark:text-gray-300">{submission.customRole}</span>
                            </div>
                          )}
                          {submission.motivation && (
                            <div>
                              <span className="block text-xs font-medium text-gray-500 uppercase mb-1">Motivation</span>
                              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words border-l-2 border-gray-300 dark:border-gray-600 pl-3">{submission.motivation}</p>
                            </div>
                          )}
                          {submission.customAnswers && Object.keys(submission.customAnswers).length > 0 && (
                            <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                              <span className="block text-xs font-medium text-gray-500 uppercase mb-2">Custom answers</span>
                              <div className="space-y-2">
                                {Object.entries(submission.customAnswers).map(([k, v]) => {
                                  const display = Array.isArray(v) ? v.join(", ") : v;
                                  const label = questionMap?.get(k) || k;
                                  return (
                                    <div key={k}>
                                      <span className="text-xs font-medium text-gray-600 dark:text-gray-400">{label}</span>
                                      <p className="text-sm text-gray-700 dark:text-gray-300 mt-0.5">{display || <span className="italic text-gray-400">No answer</span>}</p>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>

        <ConfirmModal
          open={!!confirmDeleteApp}
          title="Delete submission?"
          description={`This will permanently delete the submission from ${confirmDeleteApp?.name || "this applicant"}.`}
          confirmText="Delete"
          onClose={() => setConfirmDeleteApp(null)}
          onConfirm={async () => { if (confirmDeleteApp) onDeleteApplication(confirmDeleteApp.id, confirmDeleteApp.emailNormalized || confirmDeleteApp.email.toLowerCase(), confirmDeleteApp.campaignId); setConfirmDeleteApp(null); }}
        />
      </div>
    );
  }

  // Campaigns list view
  return (
    <div key="campaigns" className="animate-in fade-in slide-in-from-right-4 duration-300 ease-out">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Application Campaigns</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Create and manage recruitment campaigns. Each campaign has its own roles, form, deadline, and submissions.
          </p>
        </div>
        <Button icon={Plus} onClick={onAddCampaign}>New campaign</Button>
      </div>

      <div className="flex items-center gap-1 mb-6 border-b border-gray-200 dark:border-gray-700">
        {(["all", "open", "closed", "draft"] as const).map((f) => {
          const isActive = filter === f;
          const label = f === "all" ? "All" : STATUS_STYLES[f].label;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-all duration-200 ${
                isActive ? "border-red-600 text-red-600 dark:text-red-400" : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              {label}
              <span className={`ml-2 inline-flex items-center justify-center text-xs rounded-full px-1.5 ${
                isActive ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400" : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
              }`}>{counts[f]}</span>
            </button>
          );
        })}
      </div>

      <div className="grid gap-4">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-500 dark:text-gray-400">
            No campaigns with status &ldquo;{filter !== "all" ? STATUS_STYLES[filter].label : "all"}&rdquo;.
          </div>
        ) : (
          filtered.map((c) => {
            const subCount = applications.filter((s) => s.campaignId === c.id).length;
            const roleCount = c.roles?.length || 0;
            return (
              <Card key={c.id} className="bg-white dark:bg-gray-800">
                <div className="p-5">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{c.title}</h2>
                        <div
                          role="group"
                          aria-label={`Status for ${c.title}`}
                          className="relative inline-flex items-center rounded-full border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-0.5"
                        >
                          <span
                            aria-hidden
                            className={`absolute inset-y-0.5 left-0.5 w-[calc((100%_-_4px)/3)] rounded-full shadow-sm transition-all duration-300 ease-out ${STATUS_TOGGLE_ACTIVE[c.status]}`}
                            style={{ transform: `translateX(${STATUS_ORDER.indexOf(c.status) * 100}%)` }}
                          />
                          {STATUS_ORDER.map((s) => (
                            <button
                              key={s}
                              type="button"
                              onClick={() => onUpdateCampaignStatus(c.id, s)}
                              aria-pressed={c.status === s}
                              className={`relative z-10 flex-1 px-2.5 py-1 text-xs font-medium rounded-full transition-all duration-300 cursor-pointer ${
                                c.status === s
                                  ? "text-white"
                                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                              }`}
                            >
                              {STATUS_STYLES[s].label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{c.subtitle} · {c.description}</p>
                      <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                        <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> Deadline {c.deadline}</span>
                        <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {subCount} submission{subCount !== 1 ? "s" : ""}</span>
                        <span className="flex items-center gap-1"><FileQuestion className="h-3.5 w-3.5" /> {roleCount} role{roleCount !== 1 ? "s" : ""}</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {subCount > 0 && (
                        <Button size="sm" variant="outline" icon={Eye} onClick={() => { setSelectedCampaign(c); setView("submissions"); }}>View submissions</Button>
                      )}
                      <Button size="sm" variant="outline" icon={Edit3} onClick={() => onEditCampaign(c)}>Edit</Button>
                      <Button size="sm" variant="destructive" icon={Trash2} onClick={() => setConfirmDeleteCampaign(c)}>
                        <span className="sr-only">Delete campaign</span>
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>

      <ConfirmModal
        open={!!confirmDeleteCampaign}
        title="Delete campaign?"
        description={`This will permanently delete "${confirmDeleteCampaign?.title}" and all its custom questions. Submissions will remain in Firestore.`}
        confirmText="Delete"
        onClose={() => setConfirmDeleteCampaign(null)}
        onConfirm={async () => { if (confirmDeleteCampaign) onDeleteCampaign(confirmDeleteCampaign.id); setConfirmDeleteCampaign(null); }}
      />
    </div>
  );
};

export default ApplicationsTab;
