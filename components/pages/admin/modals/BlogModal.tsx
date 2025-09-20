"use client";

import React from "react";
import { Button } from "@/components/ui/Button";
import { X } from "lucide-react";

export interface BlogFormState {
  title: string;
  excerpt: string;
  content: string;
  author: string;
  image: string;
  tags: string[];
  published: boolean;
}

interface BlogModalProps {
  open: boolean;
  editing: boolean;
  form: BlogFormState;
  setForm: React.Dispatch<React.SetStateAction<BlogFormState>>;
  onClose: () => void;
  onSubmit: () => void;
}

const BlogModal: React.FC<BlogModalProps> = ({ open, editing, form, setForm, onClose, onSubmit }) => {
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {editing ? 'Edit Blog Post' : 'Create New Blog Post'}
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
            <label className="block text-sm font-medium text-gray-700 mb-1 text-black dark:text-white">Excerpt</label>
            <textarea value={form.excerpt} onChange={(e) => setForm(prev => ({ ...prev, excerpt: e.target.value }))} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500" required />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 text-black dark:text-white">Author</label>
              <input type="text" value={form.author} onChange={(e) => setForm(prev => ({ ...prev, author: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 text-black dark:text-white">Image URL</label>
              <input type="url" value={form.image} onChange={(e) => setForm(prev => ({ ...prev, image: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500" placeholder="Optional; a placeholder will be used if empty" />
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 text-black dark:text-white">Content (HTML)</label>
            <textarea value={form.content} onChange={(e) => setForm(prev => ({ ...prev, content: e.target.value }))} rows={8} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500" required />
          </div>

          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.published} onChange={(e) => setForm(prev => ({ ...prev, published: e.target.checked }))} /> Published</label>

          <div className="flex justify-end space-x-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit">{editing ? 'Update Blog Post' : 'Create Blog Post'}</Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BlogModal;
