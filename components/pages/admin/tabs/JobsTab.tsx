"use client";

import React, { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import Tag from "@/components/ui/Tag";
import { Job } from "@/types";
import { Edit3, Eye, EyeOff, Plus, Trash2 } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import JobModal, { JobFormState } from "@/components/pages/admin/modals/JobModal";

const JobsTab: React.FC = () => {
  const { state, dispatch } = useApp();

  const emptyForm: JobFormState = useMemo(
    () => ({
      type: "startup",
      title: "",
      company: "",
      location: "",
      description: "",
      applyUrl: "",
      applyEmail: "",
      tags: [],
      published: true,
    }),
    []
  );

  const [open, setOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [form, setForm] = useState<JobFormState>(emptyForm);

  const handleOpenNew = () => {
    setEditingJob(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const handleEdit = (job: Job) => {
    setEditingJob(job);
    const rest: Partial<Job> = { ...job };
    delete (rest as { id?: string }).id;
    delete (rest as { createdAt?: unknown }).createdAt;
    setForm({
      ...(rest as JobFormState),
      location: rest.location || "",
      applyUrl: rest.applyUrl || "",
      applyEmail: rest.applyEmail || "",
      tags: Array.isArray(rest.tags) ? rest.tags : [],
    });
    setOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure you want to delete this job?")) {
      dispatch({ firestoreAction: "DELETE_JOB", payload: id });
    }
  };

  const handleTogglePublish = (job: Job) => {
    const updated = { ...job, published: !job.published } as Job;
    dispatch({ firestoreAction: "UPDATE_JOB", payload: updated });
  };

  const normalizeForm = (f: JobFormState): JobFormState => {
    const payload = { ...f } as JobFormState;
    if (!payload.applyUrl) delete (payload as unknown as Record<string, unknown>).applyUrl;
    if (!payload.applyEmail) delete (payload as unknown as Record<string, unknown>).applyEmail;
    if (!payload.location) delete (payload as unknown as Record<string, unknown>).location;
    if (!payload.tags || payload.tags.length === 0)
      payload.tags = [];
    return payload;
  };

  const handleSubmit = async () => {
    const payload = normalizeForm(form);
    if (editingJob && editingJob.id) {
      const updated: Job = {
        ...editingJob,
        ...payload,
        location: payload.location || undefined,
        applyUrl: payload.applyUrl || undefined,
        applyEmail: payload.applyEmail || undefined,
      } as Job;
      await dispatch({ firestoreAction: "UPDATE_JOB", payload: updated });
    } else {
      await dispatch({ firestoreAction: "ADD_JOB", payload });
    }
    setOpen(false);
  };

  const jobs = state.jobs;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Jobs Management</h2>
        <Button icon={Plus} onClick={handleOpenNew}>New Job</Button>
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
                  <Button size="sm" variant="outline" icon={job.published ? EyeOff : Eye} onClick={() => handleTogglePublish(job)}>
                    {job.published ? 'Unpublish' : 'Publish'}
                  </Button>
                  <Button size="sm" variant="outline" icon={Edit3} onClick={() => handleEdit(job)}>
                    Edit
                  </Button>
                  <Button size="sm" variant="outline" icon={Trash2} onClick={() => handleDelete(job.id)} className="text-red-600 hover:text-red-700">
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

      <JobModal
        open={open}
        editing={!!editingJob}
        form={form}
        setForm={setForm}
        onClose={() => setOpen(false)}
        onSubmit={handleSubmit}
      />
    </div>
  );
};

export default JobsTab;
