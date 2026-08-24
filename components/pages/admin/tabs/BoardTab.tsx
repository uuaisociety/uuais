"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { BoardPosition } from "@/types";
import { Edit3, Plus, Trash2, ChevronDown, ChevronUp, ArrowUp, ArrowDown } from "lucide-react";
import Link from "next/link";
import BoardPositionModal, { type BPositionFormState } from "@/components/pages/admin/modals/BoardPositionModal";
import { useCollectionData } from "@/lib/firestore/useCollectionData";
import { subscribeToPositions, addPosition, updatePosition, deletePosition, movePosition } from "@/lib/firestore/board-positions";
import { subscribeToBoardApplications, deleteBoardApplication, type BoardApplication } from "@/lib/firestore/boardApplications";
import { useNotify } from "@/components/ui/Notifications";

function formatApplicationDate(createdAt: BoardApplication["createdAt"]): string {
  if (createdAt == null) return "—";
  if (typeof createdAt === "string") {
    const d = new Date(createdAt);
    return Number.isNaN(d.getTime()) ? "—" : d.toDateString();
  }
  return createdAt.toDate().toDateString();
}

/** Only allow http/https URLs to prevent javascript: XSS in href attributes. */
function safeUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") return url;
  } catch { /* invalid URL */ }
  return undefined;
}

const BoardTab: React.FC = () => {
  const { data: boardPositions, loaded: positionsLoaded } = useCollectionData<BoardPosition>(subscribeToPositions, []);
  const { data: applicants, loaded: applicantsLoaded } = useCollectionData<BoardApplication>(subscribeToBoardApplications, []);
  const { notify } = useNotify();
  const [expandedDescriptions, setExpandedDescriptions] = useState<Set<string>>(new Set());
  const [expandedCoverLetters, setExpandedCoverLetters] = useState<Set<string>>(new Set());
  const [showBoardPositionModal, setShowBoardPositionModal] = useState(false);
  const [editingBoardPosition, setEditingBoardPosition] = useState<BoardPosition | null>(null);
  const [boardPositionForm, setBoardPositionForm] = useState<BPositionFormState>({ title: "", short: "", description: "" });

  const toggleDescription = (id: string | undefined) => {
    if (!id) return;
    setExpandedDescriptions((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleCoverLetter = (id: string | undefined) => {
    if (!id) return;
    setExpandedCoverLetters((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAddBoardPosition = () => {
    addPosition({ ...boardPositionForm })
      .then(() => notify({ type: "success", title: "Position added", message: "The board position was created." }))
      .catch((e) => {
        console.error("Failed to add board position:", e);
        notify({ type: "error", title: "Add failed", message: "Could not add the board position. Please try again." });
      });
    setShowBoardPositionModal(false);
    setBoardPositionForm({ title: "", short: "", description: "" });
  };

  const handleUpdateBoardPosition = () => {
    if (!editingBoardPosition) return;
    updatePosition(editingBoardPosition.id, { ...boardPositionForm })
      .then(() => notify({ type: "success", title: "Position updated", message: "The board position was saved." }))
      .catch((e) => {
        console.error("Failed to update board position:", e);
        notify({ type: "error", title: "Update failed", message: "Could not update the board position. Please try again." });
      });
    setShowBoardPositionModal(false);
    setEditingBoardPosition(null);
  };

  const handleDeleteBoardPosition = (id: string) => {
    if (window.confirm("Delete this Board Position?")) {
      deletePosition(id).catch((e) => {
        console.error("Failed to delete board position:", e);
        notify({ type: "error", title: "Delete failed", message: "Could not delete the board position. Please try again." });
      });
    }
  };

  const handleDeleteBoardApplication = (id: string | undefined) => {
    if (!id) return;
    if (window.confirm("Delete this application record?")) {
      deleteBoardApplication(id).catch((e) => {
        console.error("Failed to delete application:", e);
        notify({ type: "error", title: "Delete failed", message: "Could not delete the application. Please try again." });
      });
    }
  };

  const handleMoveBoardPosition = (positionId: string, direction: "up" | "down") => {
    movePosition(boardPositions, positionId, direction).catch((e) => {
      console.error("Failed to move position:", e);
      notify({ type: "error", title: "Reorder failed", message: "Could not reorder board positions. Please try again." });
    });
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold tracking-[-0.028em] text-foreground">Board Positions</h2>
        <Button variant="outline" icon={Plus} onClick={() => { setEditingBoardPosition(null); setBoardPositionForm({ title: "", short: "", description: "" }); setShowBoardPositionModal(true); }}>Add new position</Button>
      </div>
      <div className="grid gap-4 mb-6">
        {!positionsLoaded ? (
          <p className="mono-label text-muted-foreground py-6">Loading…</p>
        ) : boardPositions.length > 0 ? boardPositions.map((position, index) => (
          <Card key={position.id}>
            <CardContent className="p-6">
              <div className="flex justify-between gap-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-foreground">{position.title}</h3>
                  <p className="text-muted-foreground">{position.short}</p>
                  <button
                    onClick={() => toggleDescription(position.id)}
                    className="flex items-center gap-1 text-sm text-primary hover:brightness-110 mt-2 cursor-pointer transition-all duration-200 rounded-sm"
                  >
                    {expandedDescriptions.has(position.id) ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    {expandedDescriptions.has(position.id) ? "Hide description" : "Show description"}
                  </button>
                  {expandedDescriptions.has(position.id) && (
                    <div className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">{position.description}</div>
                  )}
                </div>
                <div className="flex gap-2 items-start">
                  <div className="flex flex-col gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      icon={ArrowUp}
                      onClick={() => handleMoveBoardPosition(position.id, "up")}
                      disabled={index === 0}
                      title="Move up"
                    >
                      <span className="sr-only">Move up</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      icon={ArrowDown}
                      onClick={() => handleMoveBoardPosition(position.id, "down")}
                      disabled={index === boardPositions.length - 1}
                      title="Move down"
                    >
                      <span className="sr-only">Move down</span>
                    </Button>
                  </div>
                  <Button size="sm" variant="outline" icon={Edit3} onClick={() => { setEditingBoardPosition(position); setBoardPositionForm({ title: position.title, short: position.short, description: position.description }); setShowBoardPositionModal(true); }}>Edit</Button>
                  <Button size="sm" variant="destructive" icon={Trash2} onClick={() => handleDeleteBoardPosition(position.id)}>
                    Delete
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )) : <div className="text-muted-foreground mb-6">No board positions present.</div>}
      </div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold tracking-[-0.028em] text-foreground">Received Applications</h2>
      </div>
      <div className="grid gap-4">
        {!applicantsLoaded ? (
          <p className="mono-label text-muted-foreground py-6">Loading…</p>
        ) : applicants.length === 0 && (
          <p className="text-sm text-muted-foreground py-8 text-center">No applications received yet.</p>
        )}
        {applicants.map((applicant) => (
          <Card key={applicant.id}>
            <CardContent className="p-6">
              <div className="flex justify-between gap-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-foreground">Applying for Role: {applicant.role}</h3>
                  <p className="text-muted-foreground">{applicant.name}</p>
                  <div className="text-sm text-muted-foreground mt-2">Applied on: {formatApplicationDate(applicant.createdAt)}</div>
                  <div className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{applicant.email}</div>
                  {applicant.phone && <div className="text-sm text-muted-foreground mt-1">Phone: {applicant.phone}</div>}
                  <div className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">{!applicant.coverFile && !applicant.coverText ? "Applicant has not provided a cover letter." : ""}</div>
                  {applicant.cv?.url ? (
                    <div className="text-sm text-primary mt-2">
                      <Link href={safeUrl(applicant.cv.url) || "#"}>View CV (PDF)</Link>
                    </div>
                  ) : null}
                  {applicant.coverOption === "text" && applicant.coverText && applicant.id && (
                    <div className="mt-2">
                      <button
                        onClick={() => toggleCoverLetter(applicant.id)}
                        className="flex items-center gap-1 text-sm text-primary hover:brightness-110 cursor-pointer transition-all duration-200 rounded-sm"
                      >
                        {expandedCoverLetters.has(applicant.id) ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        {expandedCoverLetters.has(applicant.id) ? "Hide cover letter" : "Show cover letter"}
                      </button>
                      {expandedCoverLetters.has(applicant.id) && (
                        <div className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap border-l border-border pl-3">{applicant.coverText}</div>
                      )}
                    </div>
                  )}
                  {applicant.coverOption === "file" && applicant.coverFile?.url ? (
                    <div className="text-sm text-primary mt-2">
                      <Link href={safeUrl(applicant.coverFile.url) || "#"}>View Cover Letter (PDF)</Link>
                    </div>
                  ) : null}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="destructive" icon={Trash2} onClick={() => handleDeleteBoardApplication(applicant.id)}>
                    Delete
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <BoardPositionModal
        open={showBoardPositionModal}
        onClose={() => { setShowBoardPositionModal(false); setEditingBoardPosition(null); }}
        form={boardPositionForm}
        setForm={setBoardPositionForm}
        editing={!!editingBoardPosition}
        onAdd={handleAddBoardPosition}
        onUpdate={handleUpdateBoardPosition}
      />
    </div>
  );
};

export default BoardTab;
