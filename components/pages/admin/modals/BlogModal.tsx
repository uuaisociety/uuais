"use client";

import React from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { FieldGroup, InputBase, TextareaBase } from "@/components/ui/Form";

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
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Edit Blog Post' : 'Create New Blog Post'}
      size="lg"
    >
      <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} className="space-y-4">
        <FieldGroup label="Title" requiredHint="Required.">
          <InputBase type="text" value={form.title} onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))} required />
        </FieldGroup>

        <FieldGroup label="Excerpt" requiredHint="Required.">
          <TextareaBase value={form.excerpt} onChange={(e) => setForm(prev => ({ ...prev, excerpt: e.target.value }))} rows={2} required />
        </FieldGroup>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FieldGroup label="Author" requiredHint="Required.">
            <InputBase type="text" value={form.author} onChange={(e) => setForm(prev => ({ ...prev, author: e.target.value }))} required />
          </FieldGroup>
          <FieldGroup label="Image URL">
            <InputBase type="text" value={form.image} onChange={(e) => setForm(prev => ({ ...prev, image: e.target.value }))} placeholder="Optional; a placeholder will be used if empty" />
          </FieldGroup>
        </div>

        <FieldGroup label="Tags">
          <div className="flex gap-2">
            <InputBase type="text" value={tagInput} onChange={(e) => setTagInput(e.target.value)} placeholder="Add tag" />
            <Button type="button" variant="outline" onClick={addTag}>Add</Button>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {form.tags.map((tag) => (
              <span key={tag} className="inline-flex items-center gap-2 px-2 py-1 rounded bg-gray-200 dark:bg-gray-700 text-sm">
                {tag}
                <button type="button" onClick={() => removeTag(tag)} aria-label={`Remove tag ${tag}`} className="text-gray-600 dark:text-gray-300">×</button>
              </span>
            ))}
          </div>
        </FieldGroup>

        <FieldGroup label="Content (HTML)" requiredHint="Required.">
          <TextareaBase value={form.content} onChange={(e) => setForm(prev => ({ ...prev, content: e.target.value }))} rows={8} required />
        </FieldGroup>

        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.published} onChange={(e) => setForm(prev => ({ ...prev, published: e.target.checked }))} /> Published</label>

        <div className="flex justify-end space-x-3 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="outline">{editing ? 'Update Blog Post' : 'Create Blog Post'}</Button>
        </div>
      </form>
    </Modal>
  );
};

export default BlogModal;
