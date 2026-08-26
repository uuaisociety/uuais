"use client";

import React from "react";
import { Button } from "@/components/ui/Button";
import { X } from "lucide-react";
import {
  SHOWCASE_CATEGORIES,
  SHOWCASE_CATEGORY_LABELS,
  ShowcaseCategory,
} from "@/types";

export interface ShowcaseFormState {
  title: string;
  description: string;
  details: string;
  category: ShowcaseCategory;
  links: { github?: string; website?: string; demo?: string; video?: string };
  tags: string[];
  coverImage: string;
  coverImagePath: string;
}

interface ShowcaseModalProps {
  open: boolean;
  editing: boolean;
  form: ShowcaseFormState;
  setForm: React.Dispatch<React.SetStateAction<ShowcaseFormState>>;
  onClose: () => void;
  onSubmit: () => void;
}

const ShowcaseModal: React.FC<ShowcaseModalProps> = ({ open, editing, form, setForm, onClose, onSubmit }) => {
  const [tagInput, setTagInput] = React.useState('');
  if (!open) return null;

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !form.tags.includes(t)) {
      setForm(prev => ({ ...prev, tags: [...prev.tags, t] }));
      setTagInput('');
    }
  };
  const removeTag = (tag: string) => setForm(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }));

  const setLink = (key: keyof ShowcaseFormState['links'], value: string) =>
    setForm(prev => ({ ...prev, links: { ...prev.links, [key]: value || undefined } }));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {editing ? 'Edit Showcase Project' : 'Create New Showcase Project'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 text-black dark:text-white">Title</label>
            <input type="text" value={form.title} onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500" required />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 text-black dark:text-white">Description</label>
            <textarea value={form.description} onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))} rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500" required />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 text-black dark:text-white">
              About this project
              <span className="ml-1 text-xs font-normal text-gray-500 dark:text-gray-400">Optional — shown as paragraphs on the project page</span>
            </label>
            <textarea value={form.details} onChange={(e) => setForm(prev => ({ ...prev, details: e.target.value }))} rows={6} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 text-black dark:text-white">Category</label>
            <select
              value={form.category}
              onChange={(e) => setForm(prev => ({ ...prev, category: e.target.value as ShowcaseCategory }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 dark:bg-gray-800"
            >
              {SHOWCASE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{SHOWCASE_CATEGORY_LABELS[cat]}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 text-black dark:text-white">GitHub URL</label>
              <input type="url" value={form.links.github ?? ''} onChange={(e) => setLink('github', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500" placeholder="Optional" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 text-black dark:text-white">Website URL</label>
              <input type="url" value={form.links.website ?? ''} onChange={(e) => setLink('website', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500" placeholder="Optional" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 text-black dark:text-white">Demo URL</label>
              <input type="url" value={form.links.demo ?? ''} onChange={(e) => setLink('demo', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500" placeholder="Optional" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 text-black dark:text-white">Video URL</label>
              <input type="url" value={form.links.video ?? ''} onChange={(e) => setLink('video', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500" placeholder="Optional" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 text-black dark:text-white">Tags</label>
            <div className="flex gap-2">
              <input type="text" value={tagInput} onChange={(e) => setTagInput(e.target.value)} className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500" placeholder="Add tag" />
              <Button type="button" variant="outline" onClick={addTag}>Add</Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {form.tags.map((tag) => (
                <span key={tag} className="inline-flex items-center gap-2 px-2 py-1 rounded bg-gray-200 dark:bg-gray-700 text-sm">
                  {tag}
                  <button type="button" onClick={() => removeTag(tag)} className="text-gray-600 dark:text-gray-300">×</button>
                </span>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 text-black dark:text-white">Cover Image URL</label>
              <input type="url" value={form.coverImage} onChange={(e) => setForm(prev => ({ ...prev, coverImage: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500" placeholder="Optional" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 text-black dark:text-white">Cover Image Path</label>
              <input type="text" value={form.coverImagePath} onChange={(e) => setForm(prev => ({ ...prev, coverImagePath: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500" placeholder="Optional; e.g. member-uploads/xxx.png" />
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit">{editing ? 'Update Project' : 'Create Project'}</Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ShowcaseModal;
