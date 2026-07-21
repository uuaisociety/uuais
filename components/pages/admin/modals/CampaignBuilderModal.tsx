"use client";

import React, { useState, useEffect } from "react";
import { X, Plus, Trash2, GripVertical, ArrowUp, ArrowDown, FileQuestion } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FieldGroup, InputBase, TextareaBase, SelectBase } from "@/components/ui/Form";
import {
  ApplicationCampaign, CampaignStatus, CustomQuestionType, CampaignQuestion,
} from "@/types";
import {
  getCampaignQuestions, addCampaignQuestion, updateCampaignQuestion,
  deleteCampaignQuestion,
} from "@/lib/firestore/campaignQuestions";
import { useNotify } from "@/components/ui/Notifications";

const QUESTION_TYPES: { value: CustomQuestionType; label: string }[] = [
  { value: "text", label: "Short text" },
  { value: "textarea", label: "Long text" },
  { value: "select", label: "Dropdown" },
  { value: "radio", label: "Single choice" },
  { value: "checkbox", label: "Multiple choice" },
];

const TEAM_IDS = ["it", "development", "growth", "partnerships_events", "research"];
const TEAM_NAME: Record<string, string> = {
  it: "IT", development: "Development", growth: "Growth",
  partnerships_events: "Partnerships & Events", research: "Research",
};

interface QDraft {
  id: string;
  question: string;
  type: CustomQuestionType;
  options: string[];
  required: boolean;
}

let qSeq = 1;
const newQId = () => `new_${Date.now()}_${qSeq++}`;

function toDrafts(qs: CampaignQuestion[]): QDraft[] {
  return [...qs]
    .sort((a, b) => a.order - b.order)
    .map((q) => ({ id: q.id, question: q.question, type: q.type, options: q.options || [], required: q.required }));
}

interface Props {
  open: boolean;
  campaign?: ApplicationCampaign | null;
  isNew?: boolean;
  onClose: () => void;
  onSaveCampaign: (data: { id?: string; title: string; subtitle: string; description: string; deadline: string; status: CampaignStatus; teams: string[]; teamInfo?: Record<string, { name?: string; description?: string }>; enabledStandardFields: string[] }) => Promise<string | undefined | void>;
}

const CampaignBuilderModal: React.FC<Props> = ({ open, campaign, isNew, onClose, onSaveCampaign }) => {
  const { notify } = useNotify();
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [status, setStatus] = useState<CampaignStatus>("draft");
  const [enabledTeams, setEnabledTeams] = useState<string[]>([]);
  const [teamInfo, setTeamInfo] = useState<Record<string, { name?: string; description?: string }>>({});
  const [enabledStandardFields, setEnabledStandardFields] = useState<string[]>([
    "name", "email", "gender", "university", "program", "graduationYear",
    "linkedin", "resume", "interests", "teamRanking", "weeklyHours", "motivation",
  ]);
  const [questions, setQuestions] = useState<QDraft[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [optionsExpanded, setOptionsExpanded] = useState<Set<string>>(new Set());
  const [removedQuestionIds, setRemovedQuestionIds] = useState<string[]>([]);

  // Load campaign data + questions when opening
  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTitle(campaign?.title ?? "");
     
    setSubtitle(campaign?.subtitle ?? "");
     
    setDescription(campaign?.description ?? "");
     
    setDeadline(campaign?.deadline ?? "");
     
    setStatus(campaign?.status ?? "draft");
     
    setEnabledTeams(campaign?.teams ?? []);

    setTeamInfo(campaign?.teamInfo ? { ...campaign.teamInfo } : {});
     
    setEnabledStandardFields(campaign?.enabledStandardFields?.length ? campaign.enabledStandardFields : [
      "name", "email", "gender", "university", "program", "graduationYear",
      "linkedin", "resume", "interests", "teamRanking", "weeklyHours", "motivation",
    ]);
     
    setRemovedQuestionIds([]);
     
    setOptionsExpanded(new Set());

    if (campaign?.id && !isNew) {
      setLoading(true);
      getCampaignQuestions(campaign.id)
        .then((qs) => { setQuestions(toDrafts(qs)); })
        .catch((e) => { console.error("Failed to load campaign questions", e); setQuestions([]); })
        .finally(() => setLoading(false));
    } else {
       
      setQuestions([]);
    }
  }, [open, campaign, isNew]);

  if (!open) return null;

  const toggleTeam = (id: string) =>
    setEnabledTeams((prev) => prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]);
  const toggleField = (id: string) =>
    setEnabledStandardFields((prev) => prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]);
  const setTeamNameByUser = (id: string, value: string) =>
    setTeamInfo((prev) => ({
      ...prev,
      [id]: { ...prev[id], name: value || undefined },
    }));
  const setTeamDescription = (id: string, value: string) =>
    setTeamInfo((prev) => ({
      ...prev,
      [id]: { ...prev[id], description: value || undefined },
    }));

  const addQuestion = () =>
    setQuestions((prev) => [...prev, { id: newQId(), question: "", type: "text", options: [], required: false }]);
  const removeQuestion = (id: string) => {
    setQuestions((prev) => prev.filter((q) => q.id !== id));
    // Mark for deletion from Firestore if it existed there (id is not a temp id)
    if (campaign?.id && !id.startsWith("new_")) {
      setRemovedQuestionIds((prev) => [...prev, id]);
    }
  };
  const moveQuestion = (id: string, dir: -1 | 1) =>
    setQuestions((prev) => {
      const idx = prev.findIndex((q) => q.id === id);
      if (idx < 0) return prev;
      const newIdx = idx + dir;
      if (newIdx < 0 || newIdx >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
      return next;
    });
  const updateQuestion = (id: string, patch: Partial<QDraft>) =>
    setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, ...patch } : q)));
  const toggleOptionsExpanded = (id: string) =>
    setOptionsExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const hasOptions = (t: CustomQuestionType) => t === "select" || t === "radio" || t === "checkbox";
  const STANDARD_FIELDS = [
    { id: "name", label: "Full name" },
    { id: "email", label: "Email" },
    { id: "gender", label: "Gender" },
    { id: "university", label: "University" },
    { id: "program", label: "Programme" },
    { id: "graduationYear", label: "Expected graduation year" },
    { id: "linkedin", label: "LinkedIn URL" },
    { id: "resume", label: "Resume / CV upload" },
    { id: "interests", label: "Areas of interest" },
    { id: "teamRanking", label: "Team preference ranking" },
    { id: "weeklyHours", label: "Weekly availability" },
    { id: "motivation", label: "Personal motivation" },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || enabledTeams.length === 0) return;
    setSaving(true);
    try {
      const campaignId = await onSaveCampaign({
        id: campaign?.id,
        title: title.trim(),
        subtitle: subtitle.trim(),
        description: description.trim(),
        deadline,
        status,
        teams: enabledTeams,
        teamInfo,
        enabledStandardFields,
      });

      // Save custom questions (only if we have a campaign id — either editing existing or just created)
      const targetCampaignId = (typeof campaignId === 'string' ? campaignId : undefined) || campaign?.id;
      if (targetCampaignId) {
        // Delete removed questions
        await Promise.all(removedQuestionIds.map((qid) => deleteCampaignQuestion(qid).catch(() => {})));

        // Upsert remaining questions with fresh order
        for (let i = 0; i < questions.length; i++) {
          const q = questions[i];
          if (!q.question.trim()) continue;
          const isNewQuestion = q.id.startsWith("new_");
          if (isNewQuestion) {
            await addCampaignQuestion({
              campaignId: targetCampaignId,
              question: q.question.trim(),
              type: q.type,
              options: hasOptions(q.type) ? q.options : [],
              required: q.required,
              order: i,
            });
          } else {
            await updateCampaignQuestion(q.id, {
              question: q.question.trim(),
              type: q.type,
              options: hasOptions(q.type) ? q.options : [],
              required: q.required,
              order: i,
            });
          }
        }
      }

      notify({ type: "success", title: isNew ? "Campaign created" : "Campaign updated", message: isNew ? "The campaign is now available." : "Changes saved." });
      onClose();
    } catch (err) {
      console.error("Save campaign error", err);
      notify({ type: "error", title: "Save failed", message: "Could not save campaign. Please try again." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 dark:bg-black/70" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-lg bg-white dark:bg-gray-800 shadow-2xl"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="flex items-center gap-2">
            <FileQuestion className="h-5 w-5 text-red-600 dark:text-red-400" />
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              {isNew ? "New campaign" : `Edit: ${campaign?.title}`}
            </h2>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300">
            <X className="h-6 w-6" />
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-gray-500 dark:text-gray-400">
            <div className="h-6 w-6 border-2 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            Loading campaign…
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6 p-6">
            {/* Metadata */}
            <section>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-4">Campaign details</h3>
              <div className="grid gap-4">
                <FieldGroup label="Campaign title" requiredHint="Required.">
                  <InputBase maxLength={150} placeholder="e.g. Spring 2026 Recruitment" value={title} onChange={(e) => setTitle(e.target.value)} />
                </FieldGroup>
                <FieldGroup label="Subtitle" requiredHint="Optional.">
                  <InputBase maxLength={300} placeholder="e.g. UU AI Society — Spring 2026" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} />
                </FieldGroup>
                <FieldGroup label="Description" requiredHint="Shown to applicants on step 1.">
                  <TextareaBase maxLength={2000} placeholder="Describe who you're looking for and what this campaign is about." value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />
                </FieldGroup>
                <div className="grid md:grid-cols-2 gap-4">
                  <FieldGroup label="Application deadline" requiredHint="Required.">
                    <InputBase type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
                  </FieldGroup>
                  <FieldGroup label="Status" requiredHint="Controls visibility.">
                    <SelectBase value={status} onChange={(e) => setStatus(e.target.value as CampaignStatus)}>
                      <option value="draft">Draft (not visible)</option>
                      <option value="open">Open (accepting submissions)</option>
                      <option value="closed">Closed (read-only)</option>
                    </SelectBase>
                  </FieldGroup>
                </div>
              </div>
            </section>

            {/* Team selection */}
            <section className="pt-2 border-t border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-1 mt-4">Teams available in this campaign</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Applicants will rank the selected teams in step 4.</p>
              <div className="flex flex-wrap gap-2">
                {TEAM_IDS.map((id) => {
                  const enabled = enabledTeams.includes(id);
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => toggleTeam(id)}
                      className={`px-3 py-2 rounded-lg border text-sm font-medium transition-all duration-200 ${
                        enabled ? "border-red-600 bg-red-600 text-white shadow-sm" : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600"
                      }`}
                    >
                      {TEAM_NAME[id]}
                    </button>
                  );
                })}
              </div>
              {enabledTeams.length === 0 && (
                <p className="text-xs text-amber-600 dark:text-amber-500 mt-2">Select at least one team.</p>
              )}

              {/* Per-team flavor text overrides (shown only when teams are selected) */}
              {enabledTeams.length > 0 && (
                <div className="mt-4 space-y-3">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Customise the team name and description shown to applicants in step 1. Leave blank to use the default.
                  </p>
                  {enabledTeams.map((id) => {
                    const info = teamInfo[id] || {};
                    return (
                      <div key={id} className="border border-gray-200 dark:border-gray-700 rounded-md p-3 bg-gray-50/50 dark:bg-gray-900/30">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{TEAM_NAME[id]} (override)</span>
                        </div>
                        <div className="grid gap-2">
                          <InputBase
                            maxLength={100}
                            placeholder={`Custom name (default: ${TEAM_NAME[id]})`}
                            value={info.name || ""}
                            onChange={(e) => setTeamNameByUser(id, e.target.value)}
                          />
                          <TextareaBase
                            maxLength={500}
                            placeholder="Custom description shown under the team name in step 1"
                            rows={2}
                            value={info.description || ""}
                            onChange={(e) => setTeamDescription(id, e.target.value)}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Standard fields */}
            <section className="pt-2 border-t border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-1 mt-4">Standard applicant fields</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Toggle which fields appear in the applicant form.</p>
              <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-2">
                {STANDARD_FIELDS.map((field) => {
                  const enabled = enabledStandardFields.includes(field.id);
                  return (
                    <label
                      key={field.id}
                      className={`flex items-center gap-2 p-2.5 rounded-md border text-sm cursor-pointer transition-colors ${
                        enabled ? "border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/20" : "border-gray-200 dark:border-gray-700"
                      }`}
                    >
                      <input type="checkbox" checked={enabled} onChange={() => toggleField(field.id)} className="accent-red-600" />
                      <span className="text-gray-700 dark:text-gray-300">{field.label}</span>
                    </label>
                  );
                })}
              </div>
            </section>

            {/* Custom questions builder */}
            <section className="pt-2 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-1 mt-4">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">Custom questions</h3>
                <Button type="button" size="sm" variant="outline" icon={Plus} onClick={addQuestion}>Add question</Button>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Add custom questions unique to this campaign. They appear in the applicant form after the standard fields.</p>

              {questions.length === 0 ? (
                <div className="text-center py-8 text-sm text-gray-400 dark:text-gray-500 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-md">
                  No custom questions yet. Click &ldquo;Add question&rdquo; to create one.
                </div>
              ) : (
                <div className="space-y-3">
                  {questions.map((q, idx) => {
                    const expanded = optionsExpanded.has(q.id);
                    return (
                      <div key={q.id} className="border border-gray-200 dark:border-gray-700 rounded-md p-4 bg-gray-50/50 dark:bg-gray-900/30">
                        <div className="flex items-start gap-2 mb-3">
                          <div className="shrink-0 flex flex-col items-center pt-1">
                            <GripVertical className="h-4 w-4 text-gray-300 dark:text-gray-600" />
                            <span className="text-xs font-bold text-gray-400 mt-0.5">{idx + 1}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <InputBase
                              maxLength={500}
                              placeholder="Question text"
                              value={q.question}
                              onChange={(e) => updateQuestion(q.id, { question: e.target.value })}
                            />
                          </div>
                          <div className="shrink-0 flex items-center gap-0.5">
                            <button type="button" onClick={() => moveQuestion(q.id, -1)} disabled={idx === 0} className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-30 transition-colors" title="Move up">
                              <ArrowUp className="h-4 w-4" />
                            </button>
                            <button type="button" onClick={() => moveQuestion(q.id, 1)} disabled={idx === questions.length - 1} className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-30 transition-colors" title="Move down">
                              <ArrowDown className="h-4 w-4" />
                            </button>
                            <button type="button" onClick={() => removeQuestion(q.id)} className="p-1.5 text-red-500 hover:text-red-600 transition-colors" title="Delete question">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 pl-7">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Type:</span>
                            <SelectBase
                              value={q.type}
                              onChange={(e) => updateQuestion(q.id, { type: e.target.value as CustomQuestionType })}
                              className="w-36 py-1 text-sm"
                            >
                              {QUESTION_TYPES.map((t) => (
                                <option key={t.value} value={t.value}>{t.label}</option>
                              ))}
                            </SelectBase>
                          </div>
                          <label className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
                            <input type="checkbox" checked={q.required} onChange={(e) => updateQuestion(q.id, { required: e.target.checked })} className="accent-red-600" />
                            Required
                          </label>
                          {hasOptions(q.type) && (
                            <button type="button" onClick={() => toggleOptionsExpanded(q.id)} className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
                              {expanded ? "Hide options" : `Options (${q.options.length})`}
                            </button>
                          )}
                        </div>
                        {hasOptions(q.type) && expanded && (
                          <div className="pl-7 mt-3">
                            <textarea
                              maxLength={2000}
                              placeholder="One option per line (e.g. Yes&#10;No&#10;Maybe)"
                              value={q.options.join("\n")}
                              onChange={(e) => updateQuestion(q.id, { options: e.target.value.split("\n").filter((o) => o.trim() !== "") })}
                              rows={4}
                              className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                            />
                            <p className="text-xs text-gray-400 mt-1">Type one option per line. These will appear as {q.type === "checkbox" ? "checkboxes" : q.type === "radio" ? "radio buttons" : "dropdown options"}.</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Footer */}
            <div className="flex justify-between items-center pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={!title.trim() || enabledTeams.length === 0 || saving}>
                {saving ? "Saving…" : isNew ? "Create campaign" : "Save changes"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default CampaignBuilderModal;