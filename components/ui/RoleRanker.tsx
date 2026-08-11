"use client";

import React, { useState } from "react";
import {
  ArrowUp, ArrowDown, ChevronDown, GripVertical,
  Server, Code2, Megaphone, CalendarDays, FlaskConical, Rocket, X, Award,
} from "lucide-react";
import type { CampaignRole } from "@/types";
import FormattedText from "@/components/ui/FormattedText";
import { MAX_ROLE_RANKING } from "@/lib/constants";

export interface RoleRankEntry {
  roleId: string;
  teamId: string;
  title: string;
  teamName: string;
  justification: string;
  custom?: boolean;
}

export interface RoleRankerProps {
  ranking: RoleRankEntry[];
  onChange: (ranking: RoleRankEntry[]) => void;
  /** Open roles available to rank (each belongs to a team). */
  availableRoles: CampaignRole[];
  /** Maps a team id to a display name. */
  teamName: (teamId: string) => string;
  /** Optional icon map keyed by team id. */
  iconMap?: Record<string, React.ComponentType<{ className?: string }>>;
  /** Max number of roles a user may rank (excluding the "Other" custom entry). */
  maxRanking?: number;
  customRole: string;
  onCustomRoleChange: (val: string) => void;
}

const DEFAULT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  it: Server,
  development: Code2,
  growth: Megaphone,
  partnerships_events: CalendarDays,
  research: FlaskConical,
  vp: Award,
  other: Rocket,
};

const RoleRanker: React.FC<RoleRankerProps> = ({
  ranking,
  onChange,
  availableRoles,
  teamName,
  iconMap = DEFAULT_ICONS,
  maxRanking = MAX_ROLE_RANKING,
  customRole,
  onCustomRoleChange,
}) => {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropZoneOver, setDropZoneOver] = useState(false);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const [expandedRoleIds, setExpandedRoleIds] = useState<Set<string>>(new Set());

  const IconFor = (teamId: string) => iconMap[teamId] || Rocket;

  const realRanking = ranking.filter((r) => !r.custom);
  const otherEntry = ranking.find((r) => r.custom);
  const atCap = realRanking.length >= maxRanking;
  const rankedRoleIds = new Set(realRanking.map((r) => r.roleId));
  const available = availableRoles.filter((r) => !rankedRoleIds.has(r.id));

  // Group available roles by team (stable order of first appearance).
  const availableByTeam: { teamId: string; roles: CampaignRole[] }[] = [];
  const teamOrder = new Set<string>();
  available.forEach((r) => {
    if (!teamOrder.has(r.teamId)) {
      teamOrder.add(r.teamId);
      availableByTeam.push({ teamId: r.teamId, roles: [] });
    }
    availableByTeam.find((g) => g.teamId === r.teamId)?.roles.push(r);
  });

  const addRole = (role: CampaignRole) => {
    if (atCap) return;
    onChange([...ranking, {
      roleId: role.id,
      teamId: role.teamId,
      title: role.title,
      teamName: teamName(role.teamId),
      justification: "",
    }]);
  };
  const removeRole = (roleId: string) => {
    onChange(ranking.filter((r) => r.roleId !== roleId));
  };
  const removeOther = () => {
    onChange(ranking.filter((r) => r.roleId !== "other"));
    onCustomRoleChange("");
  };
  const toggleExpanded = (roleId: string) => {
    setExpandedRoleIds((prev) => {
      const next = new Set(prev);
      if (next.has(roleId)) next.delete(roleId);
      else next.add(roleId);
      return next;
    });
  };
  const move = (from: number, to: number) => {
    if (from === to || from < 0 || to < 0 || from >= ranking.length || to >= ranking.length) return;
    const next = [...ranking];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
  };

  // Reorder within preferences
  const handlePrefDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverIdx(idx);
  };
  const handlePrefDrop = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedId && draggedId !== "other" && !rankedRoleIds.has(draggedId)) {
      const role = availableRoles.find((r) => r.id === draggedId);
      if (role) {
        const newEntry: RoleRankEntry = {
          roleId: role.id,
          teamId: role.teamId,
          title: role.title,
          teamName: teamName(role.teamId),
          justification: "",
        };
        const next = [...ranking];
        next.splice(idx, 0, newEntry);
        onChange(next);
      }
    } else {
      const fromIdx = ranking.findIndex((r) => r.roleId === draggedId);
      if (fromIdx >= 0) move(fromIdx, idx);
    }
    setDraggedId(null); setDragOverIdx(null);
  };

  // Drop into the available zone (removes from preferences)
  const handleAvailableDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDropZoneOver(false);
    if (draggedId && draggedId !== "other" && rankedRoleIds.has(draggedId)) {
      removeRole(draggedId);
    }
    setDraggedId(null);
  };

  // Drop into the preferences zone (outside any specific item — appends to end)
  const handlePreferencesDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDropZoneOver(false);
    if (draggedId && draggedId !== "other" && !rankedRoleIds.has(draggedId)) {
      const role = availableRoles.find((r) => r.id === draggedId);
      if (role) {
        const newEntry: RoleRankEntry = {
          roleId: role.id,
          teamId: role.teamId,
          title: role.title,
          teamName: teamName(role.teamId),
          justification: "",
        };
        onChange([...ranking, newEntry]);
      }
    }
    setDraggedId(null);
    setDragOverIdx(null);
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setDropZoneOver(true); };
  const handleDragLeave = () => setDropZoneOver(false);

  const realCount = realRanking.length;

  return (
    <div>
      <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-2">
        Role Selection
      </h3>
      <p className="text-xs text-muted-foreground mb-5">
        Rank up to {maxRanking}&nbsp;roles by preference, #1 is your first choice. Click a role to read its
        description, then add the ones you&apos;re interested in.
      </p>

      {/* ── Your Preferences zone ── */}
      <div
        className={`rounded-lg border-2 border-dashed p-4 transition-colors duration-200 ${
          dropZoneOver ? "border-primary bg-primary/10" : "border-border"
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handlePreferencesDrop}
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-muted-foreground dark:text-muted-foreground uppercase tracking-wider">
            Your Preferences {realCount > 0 && <span className="text-primary">({realCount}/{maxRanking})</span>}
          </span>
          {realCount > 0 && <span className="text-xs text-muted-foreground">#1 = first choice</span>}
        </div>

        {ranking.length === 0 ? (
          <div className="text-center py-6">
            <GripVertical className="h-5 w-5 text-foreground/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              Drag roles from &ldquo;Available Roles&rdquo; below, or click them to add.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {ranking.map((entry, idx) => {
              const Icon = IconFor(entry.teamId);
              const isDragging = draggedId === entry.roleId;
              const isDragOver = dragOverIdx === idx && draggedId !== null && draggedId !== entry.roleId;
              return (
                <div
                  key={entry.roleId}
                  draggable
                  onDragStart={(e) => { e.dataTransfer.setData("text/plain", entry.roleId); e.dataTransfer.effectAllowed = "move"; setDraggedId(entry.roleId); }}
                  onDragOver={(e) => handlePrefDragOver(e, idx)}
                  onDrop={(e) => handlePrefDrop(e, idx)}
                  onDragEnd={() => { setDraggedId(null); setDragOverIdx(null); }}
                  className={`rounded-lg border transition-all duration-200 ${
                    isDragging ? "opacity-50" : ""
                  } ${
                    isDragOver ? "border-primary bg-primary/10 ring-2 ring-ring/20" : "border-border bg-card"
                  } cursor-grab active:cursor-grabbing`}
                >
                  <div className="flex items-center gap-3 p-3">
                    <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-bold shrink-0 ${
                      idx === 0 ? "bg-primary text-white" : "bg-foreground/8 text-muted-foreground"
                    }`}>
                      {idx + 1}
                    </span>
                    <div className="shrink-0 w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-foreground">{entry.title}</div>
                      <div className="text-xs text-muted-foreground">{entry.teamName}</div>
                    </div>
                    <div className="shrink-0 flex items-center gap-1">
                      <button type="button" onClick={() => move(idx, idx - 1)} disabled={idx === 0} className="p-2.5 text-muted-foreground hover:text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors" title="Move up" aria-label={`Move ${entry.title} up`}>
                      <ArrowUp className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => move(idx, idx + 1)} disabled={idx === ranking.length - 1} className="p-2.5 text-muted-foreground hover:text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors" title="Move down" aria-label={`Move ${entry.title} down`}>
                      <ArrowDown className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => entry.custom ? removeOther() : removeRole(entry.roleId)} className="p-2.5 text-primary hover:text-primary/80 transition-colors" title="Remove from preferences" aria-label={`Remove ${entry.title}`}>
                      <X className="h-4 w-4" />
                    </button>
                    </div>
                  </div>
                  {entry.custom ? (
                    <div className="px-3 pb-3 pl-[7.5rem]">
                      <input
                        type="text"
                        maxLength={200}
                        placeholder="Describe your proposed role / interest"
                        value={customRole}
                        onChange={(e) => onCustomRoleChange(e.target.value)}
                        className="w-full px-2 py-1 text-sm rounded-md border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary transition-colors duration-300"
                      />
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Available Roles zone ── */}
      <div className="mt-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-muted-foreground dark:text-muted-foreground uppercase tracking-wider">
            Available Roles {available.length > 0 && <span className="text-muted-foreground">({available.length})</span>}
          </span>
        </div>

        <div
          className={`rounded-lg border-2 border-dashed p-4 transition-colors duration-200 ${
            dropZoneOver ? "border-primary bg-primary/10" : "border-border"
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleAvailableDrop}
        >
          {available.length === 0 && !otherEntry ? (
            <p className="text-xs text-muted-foreground italic text-center py-4">
              {atCap ? `You've reached the limit of ${maxRanking} roles.` : "All roles have been added to your preferences."}
            </p>
          ) : (
            <div className="space-y-4">
              {availableByTeam.map((group) => {
                const Icon = IconFor(group.teamId);
                return (
                  <div key={group.teamId}>
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className="h-3.5 w-3.5 text-primary" />
                      <span className="text-xs font-semibold text-foreground uppercase tracking-wide">
                        {teamName(group.teamId)}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {group.roles.map((role) => {
                        const RoleIcon = IconFor(role.teamId);
                        const expanded = expandedRoleIds.has(role.id);
                        return (
                          <div
                            key={role.id}
                            className={`rounded-lg border transition-colors ${
                              atCap
                                ? "border-border opacity-60"
                                : "border-border bg-card"
                            }`}
                          >
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                draggable
                                disabled={atCap}
                                onDragStart={(e) => { e.dataTransfer.setData("text/plain", role.id); e.dataTransfer.effectAllowed = "move"; setDraggedId(role.id); }}
                                onClick={() => addRole(role)}
                                title={atCap ? `You can rank at most ${maxRanking} roles` : "Drag to Your Preferences, or click to add"}
                                aria-label={`Add ${role.title} to preferences`}
                                className={`flex-1 flex items-center gap-2 px-3 py-2 text-sm font-medium text-left transition-all duration-200 ${
                                  atCap
                                    ? "text-muted-foreground cursor-not-allowed"
                                    : "text-foreground hover:bg-primary/10 cursor-grab active:cursor-grabbing"
                                }`}
                              >
                                <RoleIcon className="h-4 w-4 text-primary" />
                                <span>{role.title}</span>
                                <span className="ml-auto text-foreground/40" aria-hidden>+</span>
                              </button>
                              {role.description && (
                                <button
                                  type="button"
                                  onClick={() => toggleExpanded(role.id)}
                                  aria-expanded={expanded}
                                  aria-label={`${expanded ? "Hide" : "Show"} description for ${role.title}`}
                                  className="shrink-0 p-2 text-muted-foreground hover:text-muted-foreground hover:text-foreground transition-colors"
                                >
                                  <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} />
                                </button>
                              )}
                            </div>
                            {expanded && role.description && (
                              <div className="px-3 pb-3">
                                <FormattedText text={role.description} className="text-sm text-muted-foreground" />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              {otherEntry && (
                <p className="text-xs text-muted-foreground">
                  You&apos;ve added an &ldquo;Other&rdquo; entry — describe it above in your preferences.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RoleRanker;
