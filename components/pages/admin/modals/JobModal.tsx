"use client";

import React from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { FieldGroup, InputBase, SelectBase, TextareaBase } from "@/components/ui/Form";
import { Job, JobType } from "@/types";

export type JobFormState = Omit<Job, 'id' | 'createdAt'>;

interface JobModalProps {
  open: boolean;
  editing: boolean;
  form: JobFormState;
  setForm: React.Dispatch<React.SetStateAction<JobFormState>>;
  onClose: () => void;
  onSubmit: () => void;
}

const parseTags = (value: string): string[] =>
  value.split(',').map((t) => t.trim()).filter((t) => t.length > 0);

const JobModal: React.FC<JobModalProps> = ({ open, editing, form, setForm, onClose, onSubmit }) => {
  if (!open) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Edit Job' : 'Add New Job'}
    >
      <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FieldGroup label="Type" requiredHint="Required.">
            <SelectBase
              value={form.type}
              onChange={(e) => setForm(prev => ({ ...prev, type: e.target.value as JobType }))}
            >
              <option value="startup">Startup</option>
              <option value="internship">Internship</option>
              <option value="master_thesis">Master Thesis</option>
              <option value="job">Job</option>
              <option value="other">Other</option>
            </SelectBase>
          </FieldGroup>
          <FieldGroup label="Company" requiredHint="Required.">
            <InputBase type="text" value={form.company} onChange={(e) => setForm(prev => ({ ...prev, company: e.target.value }))} required />
          </FieldGroup>
        </div>

        <FieldGroup label="Title" requiredHint="Required.">
          <InputBase type="text" value={form.title} onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))} required />
        </FieldGroup>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FieldGroup label="Location (optional)">
            <InputBase type="text" value={form.location || ''} onChange={(e) => setForm(prev => ({ ...prev, location: e.target.value }))} />
          </FieldGroup>
          <FieldGroup label="Apply URL (optional)">
            <InputBase type="url" value={form.applyUrl || ''} onChange={(e) => setForm(prev => ({ ...prev, applyUrl: e.target.value }))} placeholder="https://..." />
          </FieldGroup>
        </div>

        <FieldGroup label="Apply Email (optional)">
          <InputBase type="email" value={form.applyEmail || ''} onChange={(e) => setForm(prev => ({ ...prev, applyEmail: e.target.value }))} placeholder="jobs@example.com" />
        </FieldGroup>

        <FieldGroup label="Tags (comma separated)">
          <InputBase
            type="text"
            defaultValue={(form.tags || []).join(', ')}
            onChange={(e) => setForm((prev) => ({ ...prev, tags: parseTags(e.target.value) }))}
            placeholder="e.g. AI, Full-time, Remote"
          />
        </FieldGroup>

        <FieldGroup label="Description" requiredHint="Required.">
          <TextareaBase value={form.description} onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))} rows={6} required />
        </FieldGroup>

        <div className="flex items-center gap-2">
          <input id="job-published" type="checkbox" checked={!!form.published} onChange={(e) => setForm(prev => ({ ...prev, published: e.target.checked }))} />
          <label htmlFor="job-published" className="text-gray-700 dark:text-white">Published</label>
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="outline">{editing ? 'Update Job' : 'Add Job'}</Button>
        </div>
      </form>
    </Modal>
  );
};

export default JobModal;
