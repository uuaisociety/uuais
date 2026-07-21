"use client";

import React, { useState } from "react";
import { ArrowUp, ArrowDown, GripVertical, Server, Code2, Megaphone, CalendarDays, FlaskConical, Rocket } from "lucide-react";

export interface TeamRankEntry {
  id: string;
  name: string;
  custom?: boolean;
}

export interface TeamRankerProps {
  ranking: TeamRankEntry[];
  onChange: (ranking: TeamRankEntry[]) => void;
  availableTeamIds: string[];
  /** Maps a team id to a display name (used for the available list). */
  teamName: (id: string) => string;
  /** Optional icon map for team pills. */
  iconMap?: Record<string, React.ComponentType<{ className?: string }>>;
  customTeam: string;
  onCustomTeamChange: (val: string) => void;
}

const DEFAULT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  it: Server,
  development: Code2,
  growth: Megaphone,
  partnerships_events: CalendarDays,
  research: FlaskConical,
  other: Rocket,
};

const TeamRanker: React.FC<TeamRankerProps> = ({
  ranking,
  onChange,
  availableTeamIds,
  teamName,
  iconMap = DEFAULT_ICONS,
  customTeam,
  onCustomTeamChange,
}) => {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropZoneOver, setDropZoneOver] = useState(false);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  const IconFor = (id: string) => iconMap[id] || Rocket;

  const available = availableTeamIds.filter((id) => !ranking.find((r) => r.id === id));
  const otherEntry = ranking.find((r) => r.custom);

  const addTeam = (id: string) => {
    onChange([...ranking, { id, name: teamName(id) }]);
  };
  const removeTeam = (id: string) => {
    onChange(ranking.filter((r) => r.id !== id));
  };
  const addOther = () => {
    onChange([...ranking, { id: "other", name: "Other", custom: true }]);
    onCustomTeamChange("");
  };
  const move = (from: number, to: number) => {
    if (from === to || from < 0 || to < 0 || from >= ranking.length || to >= ranking.length) return;
    const next = [...ranking];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
  };
  const appendToPreferences = (id: string) => {
    if (id === "other") { addOther(); return; }
    if (available.includes(id)) addTeam(id);
  };
  const moveFromPreferencesToAvailable = (id: string) => {
    if (id === "other") { removeTeam(id); onCustomTeamChange(""); return; }
    removeTeam(id);
  };

  // Reorder within preferences
  const handlePrefDragOver = (e: React.DragEvent, idx: number) => { e.preventDefault(); setDragOverIdx(idx); };
  const handlePrefDrop = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (draggedId && available.includes(draggedId)) {
      // Dropped from Available zone into Preferences list at a specific position
      const newEntry = { id: draggedId, name: teamName(draggedId) };
      const next = [...ranking];
      next.splice(idx, 0, newEntry);
      onChange(next);
    } else {
      const fromIdx = ranking.findIndex((r) => r.id === draggedId);
      if (fromIdx >= 0) move(fromIdx, idx);
    }
    setDraggedId(null); setDragOverIdx(null);
  };

  // Drop into the available zone (removes from preferences)
  const handleAvailableDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDropZoneOver(false);
    if (draggedId && !available.includes(draggedId)) {
      moveFromPreferencesToAvailable(draggedId);
    }
    setDraggedId(null);
  };

  // Drop into the preferences zone (outside any specific item — appends to end)
  const handlePreferencesDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDropZoneOver(false);
    if (draggedId && available.includes(draggedId)) {
      appendToPreferences(draggedId);
    }
    setDraggedId(null);
    setDragOverIdx(null);
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setDropZoneOver(true); };
  const handleDragLeave = () => setDropZoneOver(false);

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-2">
        Draggable Team Selection
      </h3>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-5">
        Drag teams between the two zones, or click to quickly add/remove. Order within &ldquo;Your Preferences&rdquo;
        determines your ranking — #1 = first choice.
      </p>

      {/* ── Your Preferences zone ── */}
      <div
        className={`rounded-lg border-2 border-dashed p-4 transition-colors duration-200 ${
          dropZoneOver ? "border-red-500 bg-red-50/50 dark:bg-red-950/20" : "border-gray-300 dark:border-gray-700"
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handlePreferencesDrop}
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
            Your Preferences {ranking.length > 0 && <span className="text-red-600 dark:text-red-400">({ranking.length})</span>}
          </span>
          {ranking.length > 0 && (
            <span className="text-xs text-gray-400 dark:text-gray-500">#1 = first choice</span>
          )}
        </div>

        {ranking.length === 0 ? (
          <div className="text-center py-6">
            <GripVertical className="h-5 w-5 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Drag teams from &ldquo;Available&rdquo; below, or click them to add.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {ranking.map((entry, idx) => {
              const Icon = IconFor(entry.id);
              const isDragging = draggedId === entry.id;
              const isDragOver = dragOverIdx === idx && draggedId !== null && draggedId !== entry.id;
              return (
                <div
                  key={entry.id}
                  draggable
                  onDragStart={() => setDraggedId(entry.id)}
                  onDragOver={(e) => handlePrefDragOver(e, idx)}
                  onDrop={(e) => handlePrefDrop(e, idx)}
                  onDragEnd={() => { setDraggedId(null); setDragOverIdx(null); }}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-all duration-200 ${
                    isDragging ? "opacity-50" : ""
                  } ${
                    isDragOver ? "border-red-500 bg-red-50 dark:bg-red-950/20 ring-2 ring-red-500/20" : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                  } cursor-grab active:cursor-grabbing`}
                >
                  <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-bold shrink-0 ${
                    idx === 0 ? "bg-red-600 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                  }`}>
                    {idx + 1}
                  </span>
                  <div className="shrink-0 w-9 h-9 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                    <Icon className="h-4 w-4 text-red-600 dark:text-red-400" />
                  </div>
                  {entry.custom ? (
                    <input
                      type="text"
                      maxLength={200}
                      placeholder="Describe your proposed team / interest"
                      value={customTeam}
                      onChange={(e) => onCustomTeamChange(e.target.value)}
                      className="flex-1 px-2 py-1 text-sm rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    />
                  ) : (
                    <span className="flex-1 text-sm font-medium text-gray-900 dark:text-white">{entry.name}</span>
                  )}
                  <div className="shrink-0 flex items-center gap-1">
                    <button type="button" onClick={() => move(idx, idx - 1)} disabled={idx === 0} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30 transition-colors" title="Move up">
                      <ArrowUp className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => move(idx, idx + 1)} disabled={idx === ranking.length - 1} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30 transition-colors" title="Move down">
                      <ArrowDown className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => removeTeam(entry.id)} className="p-1 text-red-500 hover:text-red-600 transition-colors" title="Remove from preferences">
                      <span className="sr-only">Remove {entry.name}</span>
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Available Teams zone ── */}
      <div className="mt-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
            Available Teams {available.length > 0 && <span className="text-gray-500">({available.length})</span>}
          </span>
          {!otherEntry && (
            <button type="button" onClick={addOther} className="text-xs text-red-600 dark:text-red-400 hover:underline">
              + Add &ldquo;Other&rdquo; (propose your own)
            </button>
          )}
        </div>

        <div
          className={`rounded-lg border-2 border-dashed p-4 transition-colors duration-200 ${
            dropZoneOver ? "border-red-500 bg-red-50/50 dark:bg-red-950/20" : "border-gray-200 dark:border-gray-700"
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleAvailableDrop}
        >
          {available.length === 0 && !otherEntry ? (
            <p className="text-xs text-gray-400 dark:text-gray-500 italic text-center py-4">
              All teams have been added to your preferences.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {available.map((id) => {
                const Icon = IconFor(id);
                return (
                  <button
                    key={id}
                    type="button"
                    draggable
                    onDragStart={() => setDraggedId(id)}
                    onClick={() => addTeam(id)}
                    title="Drag to Your Preferences, or click to add"
                    className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-300 hover:border-red-300 dark:hover:border-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all duration-200 cursor-grab active:cursor-grabbing"
                  >
                    <Icon className="h-4 w-4 text-red-600 dark:text-red-400" />
                    {teamName(id)}
                    <span className="ml-1 text-gray-300 dark:text-gray-600" aria-hidden>+</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeamRanker;