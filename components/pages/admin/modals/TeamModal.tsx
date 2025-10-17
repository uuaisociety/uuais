"use client";

import React, { useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { X } from "lucide-react";
import FileDropzone from '@/components/ui/FileDropzone';
import { auth } from '@/lib/firebase-client';
import type { User } from 'firebase/auth';

export interface TeamFormState {
  id?: string;
  name: string;
  position: string;
  bio: string;
  image: string;
  imagePath?: string; // optional storage path for cleanup
  linkedin: string;
  github: string;
  personalEmail: string;
  companyEmail: string;
  website: string;
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
  const uploadToServer = useCallback(async (file: File) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'team-images');
      if (form.imagePath) formData.append('previousPath', form.imagePath);
      if (editing && form.id) formData.append('teamId', form.id);

      // attach id token
      let token: string | null = null;
      try {
        const { getIdToken } = await import('firebase/auth');
        const user = auth.currentUser as User | null;
        if (user) token = await getIdToken(user);
      } catch (e) {
        console.warn('could not get id token', e);
      }

      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/admin/team-image', { method: 'POST', body: formData, headers });
      if (!res.ok) {
        let body = null;
        try { body = await res.json(); } catch { }
        throw new Error(`upload failed: ${body?.error || res.statusText}`);
      }
      const data = await res.json();
      const url = data.urlPublic || data.url || '';
      const path = data.path;
      setForm(prev => ({ ...prev, image: url, imagePath: path }));
    } catch (e) {
      console.error('upload failed', e);
    } finally {
      // noop
    }
  }, [editing, form.id, form.imagePath, setForm]);

  const deleteFromServer = useCallback(async (path?: string) => {
    if (!path) return;
    try {
      let token: string | null = null;
      try {
        const { getIdToken } = await import('firebase/auth');
        const user = auth.currentUser as User | null;
        if (user) token = await getIdToken(user);
      } catch (e) {
        console.warn('could not get id token', e);
      }
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch('/api/admin/team-image', { method: 'DELETE', headers, body: JSON.stringify({ path }) });
      if (!res.ok) {
        let body = null; try { body = await res.json(); } catch { }
        throw new Error(`delete failed: ${body?.error || res.statusText}`);
      }
      // clear local form image fields on success
      setForm(prev => ({ ...prev, image: '', imagePath: undefined }));
    } catch (e) {
      console.error('delete failed', e);
    }
  }, [setForm]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {editing ? 'Edit Team Member' : 'Add New Team Member'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input type="text" value={form.name} onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
            <input type="text" value={form.position} onChange={(e) => setForm(prev => ({ ...prev, position: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
            <textarea value={form.bio} onChange={(e) => setForm(prev => ({ ...prev, bio: e.target.value }))} rows={4} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Profile Image</label>
            <FileDropzone
              initialUrl={form.image}
              initialPath={form.imagePath}
              onFileSelected={uploadToServer}
              onDelete={async () => deleteFromServer(form.imagePath)}
              onError={(err) => console.error('FileDrop error', err)}
            />
            <p className="text-xs text-gray-500">Optional; a placeholder will be used if empty</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">LinkedIn URL (optional)</label>
            <input type="url" value={form.linkedin} onChange={(e) => setForm(prev => ({ ...prev, linkedin: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">GitHub URL (optional)</label>
              <input type="url" value={form.github} onChange={(e) => setForm(prev => ({ ...prev, github: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500" placeholder="https://github.com/username" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Website (optional)</label>
              <input type="url" value={form.website} onChange={(e) => setForm(prev => ({ ...prev, website: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500" placeholder="https://example.com" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Personal Email (optional)</label>
              <input type="email" value={form.personalEmail} onChange={(e) => setForm(prev => ({ ...prev, personalEmail: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500" placeholder="name@example.com" />
            </div> */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Organization Email (optional)</label>
              <input type="email" value={form.companyEmail} onChange={(e) => setForm(prev => ({ ...prev, companyEmail: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500" placeholder="name@uu.se" />
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit">{editing ? 'Update Member' : 'Add Member'}</Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TeamModal;
