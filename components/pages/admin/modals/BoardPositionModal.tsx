"use client";

import React from "react";
import { Button } from "@/components/ui/Button";
import { X } from "lucide-react";
import { BoardPosition } from "@/types";
import { Textarea } from "@/components/ui/Textarea";

export type BPositionFormState = Pick<BoardPosition, "title" | "short" | "description">;

interface BPositionModalProps {
  open: boolean;
  onClose: () => void;
  form: BPositionFormState;
  setForm: React.Dispatch<React.SetStateAction<BPositionFormState>>;
  editing: boolean;
  onAdd: () => void;
  onUpdate: () => void;
}

const BoardPositionModal: React.FC<BPositionModalProps> = ({ open, onClose, form, setForm, editing, onAdd, onUpdate }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">{editing ? 'Edit Board Position' : 'Add Board Position'}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300">
            <X className="h-6 w-6" />
          </button>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (editing) {
              onUpdate();
            } else {
              onAdd();
            }
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 text-black dark:text-white">Title</label>
            <input className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500" value={form.title} onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 text-black dark:text-white">Short</label>
            <input className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500" value={form.short} onChange={(e) => setForm(prev => ({ ...prev, short: e.target.value }))} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 text-black dark:text-white">Description</label>
            <Textarea rows={6} value={form.description} onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit">{editing ? 'Update' : 'Add'} Board Position</Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BoardPositionModal;