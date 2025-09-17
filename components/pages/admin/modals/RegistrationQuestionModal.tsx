"use client";

import React from "react";
import { Button } from "@/components/ui/Button";
import { X } from "lucide-react";
import { RegistrationQuestion } from "@/types";

export type RegistrationFormState = Pick<RegistrationQuestion,'question'|'type'|'options'|'required'|'order'|'eventTypes'>;

interface RegistrationQuestionModalProps {
  open: boolean;
  editing: boolean;
  form: RegistrationFormState;
  setForm: React.Dispatch<React.SetStateAction<RegistrationFormState>>;
  onClose: () => void;
  onAdd: () => void;
  onUpdate: () => void;
}

const RegistrationQuestionModal: React.FC<RegistrationQuestionModalProps> = ({ open, editing, form, setForm, onClose, onAdd, onUpdate }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">{editing ? 'Edit Registration Question' : 'Add Registration Question'}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"><X className="h-6 w-6" /></button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); editing ? onUpdate() : onAdd(); }} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 text-black dark:text-white">Question</label>
            <input className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500" value={form.question} onChange={(e) => setForm(prev => ({ ...prev, question: e.target.value }))} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 text-black dark:text-white">Type</label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 text-black dark:text-white" value={form.type} onChange={(e) => setForm(prev => ({ ...prev, type: e.target.value as RegistrationQuestion['type'] }))}>
                <option className="text-black dark:text-white" value="text">Text</option>
                <option className="text-black dark:text-white" value="textarea">Textarea</option>
                <option className="text-black dark:text-white" value="select">Select</option>
                <option className="text-black dark:text-white" value="checkbox">Checkbox</option>
                <option className="text-black dark:text-white" value="radio">Radio</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 text-black dark:text-white">Order</label>
              <input type="number" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500" value={form.order} onChange={(e) => setForm(prev => ({ ...prev, order: parseInt(e.target.value) || 0 }))} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 text-black dark:text-white">Options (comma-separated)</label>
            <input className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500" value={(form.options || []).join(', ')} onChange={(e) => setForm(prev => ({ ...prev, options: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))} disabled={form.type === 'text' || form.type === 'textarea'} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 text-black dark:text-white">Event Types (comma-separated; optional)</label>
            <input className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500" value={(form.eventTypes || []).join(', ')} onChange={(e) => setForm(prev => ({ ...prev, eventTypes: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))} />
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.required} onChange={(e) => setForm(prev => ({ ...prev, required: e.target.checked }))} /> Required</label>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit">{editing ? 'Update' : 'Add'} Question</Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RegistrationQuestionModal;
