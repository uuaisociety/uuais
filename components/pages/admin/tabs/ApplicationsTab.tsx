"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  Plus, Edit3, Trash2, Eye, ChevronDown, ChevronUp, Calendar,
  Users, FileQuestion, Search, ArrowLeft,
  Mail, ExternalLink, Download,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import Tag from "@/components/ui/Tag";
import { InputBase, SelectBase } from "@/components/ui/Form";
import ConfirmModal from "@/components/ui/ConfirmModal";
import CampaignBuilderModal from "@/components/pages/admin/modals/CampaignBuilderModal";
import { subscribeToCampaignQuestions } from "@/lib/firestore/campaignQuestions";
import { exportApplicationsZip } from "@/lib/exportApplications";
import { useCollectionData } from "@/lib/firestore/useCollectionData";
import {
  subscribeAllCampaigns, addCampaign, updateCampaign, deleteCampaign,
} from "@/lib/firestore/applicationCampaigns";
import { deleteCampaignQuestionsByCampaign } from "@/lib/firestore/campaignQuestions";
import { subscribeToTeamApplications } from "@/lib/firestore/teamApplications";
import { deleteTeamApplicationWithLimits } from "@/lib/firestore/teamApplications";
import { useNotify } from "@/components/ui/Notifications";
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

const ApplicationsTab: React.FC = () => {
  const { data: campaigns, loaded: campaignsLoaded } = useCollectionData<ApplicationCampaign>(subscribeAllCampaigns, []);
  const { data: applications, loaded: applicationsLoaded } = useCollectionData<TeamApplication>(subscribeToTeamApplications, []);
  const { notify } = useNotify();
  const [filter, setFilter] = useState<"all" | CampaignStatus>("all");
  const [view, setView] = useState<"campaigns" | "submissions">("campaigns");
  const [selectedCampaign, setSelectedCampaign] = useState<ApplicationCampaign | null>(null);
  const [expandApp, setExpandApp] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [subFilter, setSubFilter] = useState("all");
  const [confirmDeleteCampaign, setConfirmDeleteCampaign] = useState<ApplicationCampaign | null>(null);
  const [confirmDeleteApp, setConfirmDeleteApp] = useState<TeamApplication | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<ApplicationCampaign | null>(null);

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

  const handleExportZip = async () => {
    if (filteredSubs.length === 0 || exporting) return;
    setExporting(true);
    setExportError(null);
    try {
      await exportApplicationsZip({
        applications: filteredSubs,
        campaignTitle: selectedCampaign?.title || "All Submissions",
        roleById,
        teamName,
        questionMap,
      });
    } catch (err) {
      console.error("export zip failed", err);
      setExportError("Export failed. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  const handleSaveCampaign = async (data: { id?: string; title: string; subtitle: string; description: string; deadline: string; status: CampaignStatus; teams: string[]; roles: ApplicationCampaign["roles"]; teamInfo?: Record<string, { name?: string; description?: string }>; enabledStandardFields: string[] }): Promise<string | undefined> => {
    if (data.id) {
      await updateCampaign(data.id, { title: data.title, subtitle: data.subtitle, description: data.description, deadline: data.deadline, status: data.status, teams: data.teams, roles: data.roles, teamInfo: data.teamInfo, enabledStandardFields: data.enabledStandardFields });
      return data.id;
    }
    const id = await addCampaign({ title: data.title, subtitle: data.subtitle, description: data.description, deadline: data.deadline, status: data.status, teams: data.teams, roles: data.roles, teamInfo: data.teamInfo, enabledStandardFields: data.enabledStandardFields });
    return id;
  };

  const handleDeleteCampaign = (id: string) => {
    if (window.confirm("Delete this campaign and all its custom questions? Submissions will remain in Firestore.")) {
      deleteCampaign(id)
        .then(() => deleteCampaignQuestionsByCampaign(id))
        .then(() => notify({ type: "success", title: "Campaign deleted", message: "The campaign was removed." }))
        .catch((e) => {
          console.error("Failed to delete campaign:", e);
          notify({ type: "error", title: "Delete failed", message: "Could not delete the campaign. Please try again." });
        });
    }
  };

  const handleDeleteTeamApplication = (id: string, emailNormalized: string, campaignId: string) => {
    if (window.confirm("Delete this submission?")) {
      deleteTeamApplicationWithLimits(id, emailNormalized, campaignId)
        .then(() => notify({ type: "success", title: "Submission deleted", message: "The submission was removed." }))
        .catch((e) => {
          console.error("Failed to delete submission:", e);
          notify({ type: "error", title: "Delete failed", message: "Could not delete the submission. Please try again." });
        });
    }
  };

  const handleUpdateStatus = (id: string, status: CampaignStatus) => {
    updateCampaign(id, { status }).catch((e) => {
      console.error("Failed to update status:", e);
      notify({ type: "error", title: "Update failed", message: "Could not change the campaign status. Please try again." });
    });
  };

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
          <Button size="sm" variant="outline" icon={ArrowLeft} onClick={() => { setView("campaigns"); setSelectedCampaign(null); }}>Back to campaigns</Button>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-semibold tracking-[-0.028em] text-foreground">
              {selectedCampaign ? `Submissions: ${selectedCampaign.title}` : "All Submissions"}
            </h2>
            <p className="text-sm text-muted-foreground mt-1 flex items-center gap-3">
              <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {filteredSubs.length} of {campaignSubs.length}</span>
              {selectedCampaign && <span>· Deadline {selectedCampaign.deadline}</span>}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <Button size="sm" variant="outline" icon={Download} isLoading={exporting} disabled={filteredSubs.length === 0} onClick={handleExportZip}>
              Export .zip
            </Button>
            {exportError && <span className="text-xs text-destructive">{exportError}</span>}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <InputBase placeholder="Search by name, email, or program..." aria-label="Search submissions" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="applications-role-filter" className="text-sm text-muted-foreground whitespace-nowrap">Filter by role:</label>
            <SelectBase
              id="applications-role-filter"
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
        {!applicationsLoaded ? (
          <p className="mono-label text-muted-foreground py-6">Loading…</p>
        ) : filteredSubs.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">No submissions match your filters.</div>
        ) : (
            filteredSubs.map((submission) => {
              const isOpen = expandApp.has(submission.id);
              return (
                <Card key={submission.id}>
                  <div className="p-5">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <button onClick={() => toggleApp(submission.id)} aria-expanded={isOpen} aria-controls={`submission-details-${submission.id}`} className="flex items-center gap-2 text-left group transition-all duration-300 ease-in-out cursor-pointer">
                          <h3 className="text-lg font-semibold text-foreground">{submission.name}</h3>
                          {isOpen
                            ? <ChevronUp className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                            : <ChevronDown className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />}
                        </button>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm text-muted-foreground">
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
                        <div className="border-t border-border pt-4 space-y-3">
                          {submission.linkedin && (
                            <div className="text-sm">
                              <span className="mono-label text-muted-foreground mr-2">LinkedIn</span>
                              <a href={safeUrl(submission.linkedin) || "#"} target="_blank" rel="noreferrer" className="text-primary hover:brightness-110 hover:underline inline-flex items-center gap-1">
                                {submission.linkedin} <ExternalLink className="h-3 w-3" />
                              </a>
                            </div>
                          )}
                          {submission.resume?.url && (
                            <div className="text-sm">
                              <span className="mono-label text-muted-foreground mr-2">Resume</span>
                              <a href={safeUrl(submission.resume.url) || "#"} target="_blank" rel="noreferrer" className="text-primary hover:brightness-110 hover:underline">View PDF</a>
                            </div>
                          )}
                          {(submission.roleRanking && submission.roleRanking.length > 0) && (
                            <div>
                              <span className="mono-label text-muted-foreground block mb-2">Role preferences</span>
                              <div className="space-y-3">
                                {submission.roleRanking.map((c, idx) => (
                                  <div key={c.roleId}>
                                    <span className="text-sm font-medium text-foreground/80">
                                      #{idx + 1} {roleTitle(c.roleId)} <span className="text-muted-foreground">· {teamName(c.teamId)}</span>
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {submission.customRole && (
                            <div className="text-sm">
                              <span className="mono-label text-muted-foreground mr-2">Proposed role</span>
                              <span className="text-foreground/80">{submission.customRole}</span>
                            </div>
                          )}
                          {submission.motivation && (
                            <div>
                              <span className="mono-label text-muted-foreground block mb-1">Motivation</span>
                              <p className="text-sm text-foreground/80 whitespace-pre-wrap break-words border-l border-border pl-3">{submission.motivation}</p>
                            </div>
                          )}
                          {submission.customAnswers && Object.keys(submission.customAnswers).length > 0 && (
                            <div className="pt-2 border-t border-border">
                              <span className="mono-label text-muted-foreground block mb-2">Custom answers</span>
                              <div className="space-y-2">
                                {Object.entries(submission.customAnswers).map(([k, v]) => {
                                  const display = Array.isArray(v) ? v.join(", ") : v;
                                  const label = questionMap?.get(k) || k;
                                  return (
                                    <div key={k}>
                                      <span className="text-xs font-medium text-muted-foreground">{label}</span>
                                      <p className="text-sm text-foreground/80 mt-0.5">{display || <span className="italic text-muted-foreground">No answer</span>}</p>
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
          onConfirm={async () => { if (confirmDeleteApp) handleDeleteTeamApplication(confirmDeleteApp.id, confirmDeleteApp.emailNormalized || confirmDeleteApp.email.toLowerCase(), confirmDeleteApp.campaignId); setConfirmDeleteApp(null); }}
        />
      </div>
    );
  }

  // Campaigns list view
  return (
    <div key="campaigns" className="animate-in fade-in slide-in-from-right-4 duration-300 ease-out">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-semibold tracking-[-0.028em] text-foreground">Applications</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Create and manage recruitment campaigns. Each campaign has its own roles, form, deadline, and submissions.
          </p>
        </div>
        <Button variant="outline" icon={Plus} onClick={() => { setEditingCampaign(null); setShowCampaignModal(true); }}>New campaign</Button>
      </div>

      <div className="flex items-center gap-1 mb-6 border-b border-border">
        {(["all", "open", "closed", "draft"] as const).map((f) => {
          const isActive = filter === f;
          const label = f === "all" ? "All" : STATUS_STYLES[f].label;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-all duration-200 cursor-pointer ${
                isActive ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              }`}
            >
              {label}
              <span className={`ml-2 inline-flex items-center justify-center text-xs rounded-full px-1.5 ${
                isActive ? "bg-primary/10 text-primary" : "bg-foreground/[0.06] text-muted-foreground"
              }`}>{counts[f]}</span>
            </button>
          );
        })}
      </div>

      <div className="grid gap-4">
        {!campaignsLoaded ? (
          <p className="mono-label text-muted-foreground py-6">Loading…</p>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            No campaigns with status &ldquo;{filter !== "all" ? STATUS_STYLES[filter].label : "all"}&rdquo;.
          </div>
        ) : (
          filtered.map((c) => {
            const subCount = applications.filter((s) => s.campaignId === c.id).length;
            const roleCount = c.roles?.length || 0;
            return (
              <Card key={c.id}>
                <div className="p-5">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <h2 className="text-lg font-semibold text-foreground">{c.title}</h2>
                        <div
                          role="group"
                          aria-label={`Status for ${c.title}`}
                          className="relative inline-flex items-center rounded-full border border-border bg-foreground/[0.04] p-0.5"
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
                              onClick={() => handleUpdateStatus(c.id, s)}
                              aria-pressed={c.status === s}
                              className={`relative z-10 flex-1 px-2.5 py-1 text-xs font-medium rounded-full transition-all duration-300 cursor-pointer ${
                                c.status === s
                                  ? "text-white"
                                  : "text-muted-foreground hover:text-foreground"
                              }`}
                            >
                              {STATUS_STYLES[s].label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">{c.subtitle} · {c.description}</p>
                      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> Deadline {c.deadline}</span>
                        <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {subCount} submission{subCount !== 1 ? "s" : ""}</span>
                        <span className="flex items-center gap-1"><FileQuestion className="h-3.5 w-3.5" /> {roleCount} role{roleCount !== 1 ? "s" : ""}</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {subCount > 0 && (
                        <Button size="sm" variant="outline" icon={Eye} onClick={() => { setSelectedCampaign(c); setView("submissions"); }}>View submissions</Button>
                      )}
                      <Button size="sm" variant="outline" icon={Edit3} onClick={() => { setEditingCampaign(c); setShowCampaignModal(true); }}>Edit</Button>
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

      <CampaignBuilderModal
        open={showCampaignModal}
        campaign={editingCampaign}
        isNew={!editingCampaign}
        onClose={() => { setShowCampaignModal(false); setEditingCampaign(null); }}
        onSaveCampaign={handleSaveCampaign}
      />

      <ConfirmModal
        open={!!confirmDeleteCampaign}
        title="Delete campaign?"
        description={`This will permanently delete "${confirmDeleteCampaign?.title}" and all its custom questions. Submissions will remain in Firestore.`}
        confirmText="Delete"
        onClose={() => setConfirmDeleteCampaign(null)}
        onConfirm={async () => { if (confirmDeleteCampaign) handleDeleteCampaign(confirmDeleteCampaign.id); setConfirmDeleteCampaign(null); }}
      />
    </div>
  );
};

export default ApplicationsTab;
