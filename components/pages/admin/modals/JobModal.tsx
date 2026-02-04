"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { X } from "lucide-react";
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

const JobModal: React.FC<JobModalProps> = ({ open, editing, form, setForm, onClose, onSubmit }) => {
  const [tagsText, setTagsText] = useState((form.tags || []).join(', '));
  useEffect(() => {
    setTagsText((form.tags || []).join(', '));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {editing ? 'Edit Job' : 'Add New Job'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">Type</label>
              <select
                value={form.type}
                onChange={(e) => setForm(prev => ({ ...prev, type: e.target.value as JobType }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 text-black dark:text-white bg-white dark:bg-gray-700"
              >
                <option value="startup">Startup</option>
                <option value="internship">Internship</option>
                <option value="master_thesis">Master Thesis</option>
                <option value="job">Job</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">Company</label>
              <input type="text" value={form.company} onChange={(e) => setForm(prev => ({ ...prev, company: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500" required />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">Title</label>
            <input type="text" value={form.title} onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500" required />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">Location (optional)</label>
              <input type="text" value={form.location || ''} onChange={(e) => setForm(prev => ({ ...prev, location: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">Apply URL (optional)</label>
              <input type="url" value={form.applyUrl || ''} onChange={(e) => setForm(prev => ({ ...prev, applyUrl: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500" placeholder="https://..." />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">Apply Email (optional)</label>
            <input type="email" value={form.applyEmail || ''} onChange={(e) => setForm(prev => ({ ...prev, applyEmail: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500" placeholder="jobs@example.com" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">Tags (comma separated)</label>
            <input
              type="text"
              value={tagsText}
              onChange={(e) => {
                const value = e.target.value;
                setTagsText(value);
                const tags = value
                  .split(',')
                  .map((t) => t.trim())
                  .filter((t) => t.length > 0);
                setForm((prev) => ({ ...prev, tags }));
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
              placeholder="e.g. AI, Full-time, Remote"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">Description</label>
            <textarea value={form.description} onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))} rows={6} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500" required />
          </div>

          <div className="flex items-center gap-2">
            <input type="checkbox" checked={!!form.published} onChange={(e) => setForm(prev => ({ ...prev, published: e.target.checked }))} />
            <span className="text-gray-700 dark:text-white">Published</span>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit">{editing ? 'Update Job' : 'Add Job'}</Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default JobModal;
