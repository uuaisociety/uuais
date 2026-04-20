"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/Button";
import { BoardPosition, Application } from "@/types";

function formatApplicationDate(createdAt: Application["createdAt"]): string {
  if (createdAt == null) return "—";
  if (typeof createdAt === "string") {
    const d = new Date(createdAt);
    return Number.isNaN(d.getTime()) ? "—" : d.toDateString();
  }
  return createdAt.toDate().toDateString();
}
import { Card, CardContent } from "@/components/ui/Card";
import { Edit3, Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import Link from "next/link";

export interface ApplicationProps {
  applicants: Application[];
  boardPositions: BoardPosition[];
  onAddClick: () => void;
  onEdit: (position: BoardPosition) => void;
  onDeletePosition: (id: string) => void;
  onDeleteApplicant: (id: string) => void;
}

const BoardTab: React.FC<ApplicationProps> = ({
  applicants,
  boardPositions,
  onAddClick,
  onEdit,
  onDeletePosition,
  onDeleteApplicant,
}) => {
  const [expandedDescriptions, setExpandedDescriptions] = useState<Set<string>>(new Set());
  const [expandedCoverLetters, setExpandedCoverLetters] = useState<Set<string>>(new Set());

  const toggleDescription = (id: string) => {
    setExpandedDescriptions((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleCoverLetter = (id: string) => {
    setExpandedCoverLetters((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Board Positions</h2>
        <Button icon={Plus} onClick={onAddClick}>Add new position</Button>
      </div>
      <div className="grid gap-4 mb-6">
        {boardPositions.length > 0 ? boardPositions.map((position) => (
          <Card key={position.id} className='bg-white dark:bg-gray-800 text-black dark:text-white'>
            <CardContent className="p-6">
              <div className="flex justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{position.title}</h3>
                  <p className="text-gray-600 dark:text-gray-400">{position.short}</p>
                  <button
                    onClick={() => toggleDescription(position.id)}
                    className="flex items-center gap-1 text-sm text-blue-500 hover:text-blue-600 mt-2 cursor-pointer transition-all duration-200 rounded-sm"
                  >
                    {expandedDescriptions.has(position.id) ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    {expandedDescriptions.has(position.id) ? 'Hide description' : 'Show description'}
                  </button>
                  {expandedDescriptions.has(position.id) && (
                    <div className="text-sm text-gray-500 dark:text-gray-400 mt-2 whitespace-pre-wrap">{position.description}</div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" icon={Edit3} onClick={() => onEdit(position)}>Edit</Button>
                  <Button size="sm" variant="destructive" icon={Trash2} onClick={() => onDeletePosition(position.id)}>
                    Delete
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )) : <div className="text-gray-600 dark:text-gray-400 mb-6">No board positions present.</div>}
      </div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Received Applications</h2>
      </div>
      <div className="grid gap-4">
        {applicants.map((applicant) => (
          <Card key={applicant.id} className='bg-white dark:bg-gray-800 text-black dark:text-white'>
            <CardContent className="p-6">
              <div className="flex justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Applying for Role: {applicant.role}</h3>
                  <p className="text-gray-600 dark:text-gray-400">{applicant.name}</p>
                  <div className="text-sm text-gray-500 dark:text-gray-400 mt-2">Applied on: {formatApplicationDate(applicant.createdAt)}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 mt-1 whitespace-pre-wrap">{applicant.email}</div>
                  {applicant.phone && <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">Phone: {applicant.phone}</div>}
                  <div className="text-sm text-gray-500 dark:text-gray-400 mt-2 whitespace-pre-wrap">{!applicant.coverFile && !applicant.coverText ? "Applicant has not provided a cover letter." : ""}</div>
                  {applicant.cv?.url ? (
                    <div className="text-sm text-blue-500 mt-2">
                      <Link href={applicant.cv.url}>View CV (PDF)</Link>
                    </div>
                  ) : null}
                  {applicant.coverOption === 'text' && applicant.coverText && (
                    <div className="mt-2">
                      <button
                        onClick={() => toggleCoverLetter(applicant.id)}
                        className="flex items-center gap-1 text-sm text-blue-500 hover:text-blue-600 cursor-pointer transition-all duration-200 rounded-sm"
                      >
                        {expandedCoverLetters.has(applicant.id) ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        {expandedCoverLetters.has(applicant.id) ? 'Hide cover letter' : 'Show cover letter'}
                      </button>
                      {expandedCoverLetters.has(applicant.id) && (
                        <div className="text-sm text-gray-500 dark:text-gray-400 mt-2 whitespace-pre-wrap border-l-2 border-gray-300 dark:border-gray-600 pl-3">{applicant.coverText}</div>
                      )}
                    </div>
                  )}
                  {applicant.coverOption === 'file' && applicant.coverFile?.url ? (
                    <div className="text-sm text-blue-500 mt-2">
                      <Link href={applicant.coverFile.url}>View Cover Letter (PDF)</Link>
                    </div>
                  ) : null}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="destructive" icon={Trash2} onClick={() => onDeleteApplicant(applicant.id)}>
                    Delete
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default BoardTab;