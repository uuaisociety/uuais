"use client";

import React from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import Tag from "@/components/ui/Tag";
import { Job } from "@/types";
import { Edit3, Eye, EyeOff, Plus, Trash2 } from "lucide-react";

export interface JobsTabProps {
  jobs: Job[];
  onAddClick: () => void;
  onEdit: (job: Job) => void;
  onDelete: (id: string) => void;
  onTogglePublish: (job: Job) => void;
}

const JobsTab: React.FC<JobsTabProps> = ({ jobs, onAddClick, onEdit, onDelete, onTogglePublish }) => {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Jobs Management</h2>
        <Button icon={Plus} onClick={onAddClick}>New Job</Button>
      </div>

      <div className="grid gap-4">
        {jobs.map((job) => (
          <Card key={job.id}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{job.title}</h3>
                    <Tag variant="red" size="sm">{job.company}</Tag>
                    <Tag variant="yellow" size="sm">{job.type.replace('_', ' ')}</Tag>
                    {job.location && <Tag variant="green" size="sm">{job.location}</Tag>}
                    <Tag variant={job.published ? 'green' : 'yellow'} size="sm">
                      {job.published ? 'Published' : 'Draft'}
                    </Tag>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 mb-2 line-clamp-3">{job.description}</p>
                  {Array.isArray(job.tags) && job.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {job.tags.map((t, i) => (
                        <Tag key={i} variant="red" size="md">{t}</Tag>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex space-x-2 ml-4">
                  <Button size="sm" variant="outline" icon={job.published ? EyeOff : Eye} onClick={() => onTogglePublish(job)}>
                    {job.published ? 'Unpublish' : 'Publish'}
                  </Button>
                  <Button size="sm" variant="outline" icon={Edit3} onClick={() => onEdit(job)}>
                    Edit
                  </Button>
                  <Button size="sm" variant="outline" icon={Trash2} onClick={() => onDelete(job.id)} className="text-red-600 hover:text-red-700">
                    Delete
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {jobs.length === 0 && (
          <div className="text-gray-600 dark:text-gray-300">No jobs yet. Click &quot;New Job&quot; to add one.</div>
        )}
      </div>
    </div>
  );
};

export default JobsTab;
