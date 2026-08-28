"use client";

import React from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { FieldGroup, InputBase, SelectBase, TextareaBase } from "@/components/ui/Form";
import Tag from "@/components/ui/Tag";
import { useNotify } from "@/components/ui/Notifications";
import { parseTags } from "@/components/showcase/ShowcaseSubmissionModal";
import {
  SHOWCASE_CATEGORIES,
  SHOWCASE_CATEGORY_LABELS,
  SHOWCASE_LIMITS,
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

const linkKeys = ['github', 'website', 'demo', 'video'] as const;

const linkPlaceholder: Record<(typeof linkKeys)[number], string> = {
  github: 'https://github.com/you/project',
  website: 'https://your-project.example',
  demo: 'https://demo.your-project.example',
  video: 'https://youtube.com/watch?v=…',
};

const ShowcaseModal: React.FC<ShowcaseModalProps> = ({ open, editing, form, setForm, onClose, onSubmit }) => {
  const { notify } = useNotify();
  // Tags commit live to the parent (which owns the form), so the parse below is also what handleAdd/handleUpdate reads on submit — nothing is trimmed unseen.
  const [tagText, setTagText] = React.useState(form.tags.join(', '));
  // The modal returns null while closed but stays mounted, so its local text must resync to the freshly-set form each time it opens.
  const [lastOpen, setLastOpen] = React.useState(open);
  if (!open) return null;
  if (open !== lastOpen) {
    setLastOpen(open);
    setTagText(form.tags.join(', '));
  }
  const parsedTags = parseTags(tagText);

  const setLink = (key: keyof ShowcaseFormState['links'], value: string) =>
    setForm(prev => ({ ...prev, links: { ...prev.links, [key]: value || undefined } }));

  const handleTagText = (value: string) => {
    setTagText(value);
    setForm(prev => ({ ...prev, tags: parseTags(value).tags }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (parsedTags.tooLong.length > 0) {
      notify({
        type: 'error',
        title: 'Tag too long',
        message: `Tags are limited to ${SHOWCASE_LIMITS.tag} characters. Shorten: ${parsedTags.tooLong.join(', ')}`,
      });
      return;
    }
    if (parsedTags.overflow > 0) {
      notify({
        type: 'error',
        title: 'Too many tags',
        message: `Pick your best ${SHOWCASE_LIMITS.tagCount} — remove ${parsedTags.overflow} more.`,
      });
      return;
    }
    onSubmit();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Edit Showcase Project' : 'Create New Showcase Project'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FieldGroup label="Title" requiredHint="Required.">
            <InputBase
              type="text"
              value={form.title}
              onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
              maxLength={SHOWCASE_LIMITS.title}
              required
            />
          </FieldGroup>
          <FieldGroup label="Category" requiredHint="Required.">
            <SelectBase
              value={form.category}
              onChange={(e) => setForm(prev => ({ ...prev, category: e.target.value as ShowcaseCategory }))}
            >
              {SHOWCASE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{SHOWCASE_CATEGORY_LABELS[cat]}</option>
              ))}
            </SelectBase>
          </FieldGroup>
        </div>

        <FieldGroup label="Description" requiredHint="Required.">
          <TextareaBase
            value={form.description}
            onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
            rows={3}
            maxLength={SHOWCASE_LIMITS.description}
            required
          />
        </FieldGroup>

        <FieldGroup label="About this project" requiredHint="Optional — shown as paragraphs on the project page">
          <TextareaBase
            value={form.details}
            onChange={(e) => setForm(prev => ({ ...prev, details: e.target.value }))}
            rows={6}
            maxLength={SHOWCASE_LIMITS.details}
          />
        </FieldGroup>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {linkKeys.map((k) => (
            <FieldGroup key={k} label={k.charAt(0).toUpperCase() + k.slice(1)} requiredHint="Optional">
              <InputBase
                type="url"
                value={form.links[k] || ''}
                onChange={(e) => setLink(k, e.target.value)}
                placeholder={linkPlaceholder[k]}
                maxLength={SHOWCASE_LIMITS.link}
              />
            </FieldGroup>
          ))}
        </div>

        <FieldGroup
          label="Tags"
          requiredHint={`Comma-separated, up to ${SHOWCASE_LIMITS.tagCount} · ${SHOWCASE_LIMITS.tag} characters each`}
        >
          <InputBase
            value={tagText}
            onChange={(e) => handleTagText(e.target.value)}
            placeholder="llm, hackathon, next.js"
            maxLength={(SHOWCASE_LIMITS.tag + 2) * SHOWCASE_LIMITS.tagCount}
            aria-describedby="showcase-tags-preview"
          />
        </FieldGroup>
        {/* What will actually be saved, shown before the admin commits to it. */}
        <div id="showcase-tags-preview" aria-live="polite" className="mt-2">
          {parsedTags.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {parsedTags.tags.map((tag) => (
                <Tag key={tag} variant="gray" size="sm">{tag}</Tag>
              ))}
            </div>
          )}
          {(parsedTags.overflow > 0 || parsedTags.tooLong.length > 0) && (
            <p className="mt-2 text-xs leading-relaxed text-primary">
              {parsedTags.overflow > 0 && (
                <>
                  {parsedTags.overflow} tag{parsedTags.overflow === 1 ? '' : 's'} over the limit
                  of {SHOWCASE_LIMITS.tagCount}
                  {parsedTags.tooLong.length > 0 && '. '}
                </>
              )}
              {parsedTags.tooLong.length > 0 && (
                <>
                  {parsedTags.tooLong.length === 1 ? 'One tag is' : `${parsedTags.tooLong.length} tags are`}{' '}
                  longer than {SHOWCASE_LIMITS.tag} characters.
                </>
              )}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FieldGroup label="Cover image URL" requiredHint="Optional">
            <InputBase
              type="url"
              value={form.coverImage}
              onChange={(e) => setForm(prev => ({ ...prev, coverImage: e.target.value }))}
              placeholder="Optional"
            />
          </FieldGroup>
          <FieldGroup label="Cover image path" requiredHint="Optional">
            <InputBase
              type="text"
              value={form.coverImagePath}
              onChange={(e) => setForm(prev => ({ ...prev, coverImagePath: e.target.value }))}
              placeholder="e.g. member-uploads/xxx.png"
            />
          </FieldGroup>
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit">{editing ? 'Update Project' : 'Create Project'}</Button>
        </div>
      </form>
    </Modal>
  );
};

export default ShowcaseModal;
