"use client";

import React from "react";
import { Button } from "@/components/ui/Button";
import { X } from "lucide-react";
import { FAQ } from "@/types";

export type FAQFormState = Pick<FAQ, 'question'|'answer'|'category'|'order'|'published'>;

interface FAQModalProps {
  open: boolean;
  onClose: () => void;
  form: FAQFormState;
  setForm: React.Dispatch<React.SetStateAction<FAQFormState>>;
  editing: boolean;
  onAdd: () => void;
  onUpdate: () => void;
}

const FAQModal: React.FC<FAQModalProps> = ({ open, onClose, form, setForm, editing, onAdd, onUpdate }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">{editing ? 'Edit FAQ' : 'Add FAQ'}</h2>
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
            <label className="block text-sm font-medium text-gray-700 mb-1 text-black dark:text-white">Question</label>
            <input className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500" value={form.question} onChange={(e) => setForm(prev => ({ ...prev, question: e.target.value }))} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 text-black dark:text-white">Answer</label>
            <textarea className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500" rows={4} value={form.answer} onChange={(e) => setForm(prev => ({ ...prev, answer: e.target.value }))} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 text-black dark:text-white">Category</label>
              <input className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500" value={form.category} onChange={(e) => setForm(prev => ({ ...prev, category: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 text-black dark:text-white">Order</label>
              <input type="number" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500" value={form.order} onChange={(e) => setForm(prev => ({ ...prev, order: parseInt(e.target.value) || 0 }))} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.published} onChange={(e) => setForm(prev => ({ ...prev, published: e.target.checked }))} /> Published</label>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit">{editing ? 'Update' : 'Add'} FAQ</Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FAQModal;
