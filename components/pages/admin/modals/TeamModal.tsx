"use client";

import React, { useCallback, useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { FieldGroup, InputBase, TextareaBase } from "@/components/ui/Form";
import FileDropzone from '@/components/ui/FileDropzone';
import { uploadFileToServer, deleteFileFromServer } from '@/utils/fileUploader';
import { useNotify } from '@/components/ui/Notifications';
import { TEAM_CATEGORIES, TEAM_CATEGORY_LABELS } from '@/types';

export interface TeamFormState {
  id?: string;
  name: string;
  position: string;
  bio: string;
  image: string;
  imagePath?: string;
  linkedin: string;
  github: string;
  personalEmail: string;
  companyEmail: string;
  website: string;
  teams: string[];
  badge: string;
  notes: string;
  years: number[];
}

interface TeamModalProps {
  open: boolean;
  editing: boolean;
  form: TeamFormState;
  setForm: React.Dispatch<React.SetStateAction<TeamFormState>>;
  onClose: () => void;
  onSubmit: () => void;
}

const TeamModal: React.FC<TeamModalProps> = ({ open, editing, form, setForm, onClose, onSubmit }) => {
  const { notify } = useNotify();
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [yearsInput, setYearsInput] = useState('');

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setYearsInput(form.years.join(', '));
    }
  }, [open, form.years]);

  const handleYearsChange = (text: string) => {
    setYearsInput(text);
  };

  const handleYearsBlur = () => {
    const parsed = yearsInput.split(',').map(s => parseInt(s.trim())).filter(n => !Number.isNaN(n));
    setForm(prev => ({ ...prev, years: parsed }));
  };

  const toggleTeam = (cat: string) => {
    setForm(prev => ({
      ...prev,
      teams: prev.teams.includes(cat)
        ? prev.teams.filter(t => t !== cat)
        : [...prev.teams, cat],
    }));
  };

  const uploadToServer = useCallback(async (file: File) => {
    setUploading(true);
    try {
      const res = await uploadFileToServer(file, {
        folder: 'team-images',
        previousPath: form.imagePath,
        teamId: editing && form.id ? form.id : undefined,
      });
      setForm(prev => ({ ...prev, image: res.url || '', imagePath: res.path }));
      notify({ type: 'success', message: 'Image uploaded' });
    } catch (e) {
      console.error('upload failed', e);
      notify({ type: 'error', message: 'Image upload failed' });
    } finally {
      setUploading(false);
    }
  }, [editing, form.id, form.imagePath, setForm, notify, setUploading]);

  const deleteFromServer = useCallback(async (path?: string) => {
    if (!path) return;
    setDeleting(true);
    try {
      await deleteFileFromServer(path);
      setForm(prev => ({ ...prev, image: '', imagePath: undefined }));
      notify({ type: 'success', message: 'Image deleted' });
    } catch (e) {
      console.error('delete failed', e);
      notify({ type: 'error', message: 'Image delete failed' });
    } finally {
      setDeleting(false);
    }
  }, [setForm, notify, setDeleting]);

  if (!open) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Edit Team Member' : 'Add New Team Member'}
    >
      <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} className="space-y-4">
        <FieldGroup label="Name" requiredHint="Required.">
          <InputBase type="text" value={form.name} onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))} required />
        </FieldGroup>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FieldGroup label="Position" requiredHint="Required.">
            <InputBase type="text" value={form.position} onChange={(e) => setForm(prev => ({ ...prev, position: e.target.value }))} required />
          </FieldGroup>
          <FieldGroup label="Teams">
            <div className="grid grid-cols-2 gap-1.5 p-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-700">
              {TEAM_CATEGORIES.map(cat => (
                <label key={cat} className="flex items-center gap-2 text-sm text-gray-900 dark:text-white cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-600 rounded px-1 py-0.5">
                  <input
                    type="checkbox"
                    checked={form.teams.includes(cat)}
                    onChange={() => toggleTeam(cat)}
                    className="accent-red-600"
                  />
                  {TEAM_CATEGORY_LABELS[cat]}
                </label>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Select all teams this member belongs to</p>
          </FieldGroup>
        </div>

        <FieldGroup label="Badge (optional)">
          <InputBase
            type="text"
            value={form.badge}
            onChange={(e) => setForm(prev => ({ ...prev, badge: e.target.value }))}
            placeholder="e.g. Head of, Lead, Chairman"
          />
          <p className="text-xs text-gray-500 mt-1">Shown as a small colored chip on the public card</p>
        </FieldGroup>

        <FieldGroup label="Bio (optional)">
          <TextareaBase value={form.bio} onChange={(e) => setForm(prev => ({ ...prev, bio: e.target.value }))} rows={4} />
        </FieldGroup>
        <FieldGroup label="Profile Image">
          <FileDropzone
            initialUrl={form.image}
            initialPath={form.imagePath}
            onFileSelected={uploadToServer}
            onDelete={async () => deleteFromServer(form.imagePath)}
            onError={(e) => notify({ type: 'error', message: 'Team image upload failed: ' + e })}
            uploading={uploading}
            deleting={deleting}
          />
          <p className="text-xs text-gray-500">Optional; a placeholder will be used if empty</p>
        </FieldGroup>
        <FieldGroup label="LinkedIn URL (optional)">
          <InputBase type="url" value={form.linkedin} onChange={(e) => setForm(prev => ({ ...prev, linkedin: e.target.value }))} />
        </FieldGroup>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FieldGroup label="GitHub URL (optional)">
            <InputBase type="url" value={form.github} onChange={(e) => setForm(prev => ({ ...prev, github: e.target.value }))} placeholder="https://github.com/username" />
          </FieldGroup>
          <FieldGroup label="Website (optional)">
            <InputBase type="url" value={form.website} onChange={(e) => setForm(prev => ({ ...prev, website: e.target.value }))} placeholder="https://example.com" />
          </FieldGroup>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FieldGroup label="Organization Email (optional)">
            <InputBase type="email" value={form.companyEmail} onChange={(e) => setForm(prev => ({ ...prev, companyEmail: e.target.value }))} placeholder="name@uu.se" />
          </FieldGroup>
          <FieldGroup label="Years">
            <InputBase
              type="text"
              value={yearsInput}
              onChange={(e) => handleYearsChange(e.target.value)}
              onBlur={handleYearsBlur}
              placeholder="e.g. 2025, 2026, 2027"
            />
            <p className="text-xs text-gray-500 mt-1">Comma-separated years. Leave empty for "always visible".</p>
          </FieldGroup>
        </div>

        <FieldGroup label="Internal notes (admin only)">
          <TextareaBase
            value={form.notes}
            onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
            rows={2}
            placeholder="Not visible to the public"
          />
        </FieldGroup>

        <div className="flex justify-end space-x-3 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="outline" disabled={uploading || deleting}>{editing ? 'Update Member' : 'Add Member'}</Button>
        </div>
      </form>
    </Modal>
  );
};

export default TeamModal;