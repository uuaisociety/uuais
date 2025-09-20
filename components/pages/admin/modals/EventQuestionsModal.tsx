"use client";

import React, { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { X, Edit3, Trash2 } from "lucide-react";
import { EventCustomQuestion } from "@/types";

type QuestionInput = {
  question: string;
  type: EventCustomQuestion["type"];
  options: string[];
  required: boolean;
  order: number;
};

interface EventQuestionsModalProps {
  open: boolean;
  eventTitle: string;
  eventId: string;
  questions: EventCustomQuestion[];
  onClose: () => void;
  onAdd: (data: Omit<EventCustomQuestion, "id" | "eventId">) => Promise<void> | void;
  onUpdate: (id: string, data: Omit<EventCustomQuestion, "id" | "eventId">) => Promise<void> | void;
  onDelete: (id: string) => Promise<void> | void;
}

const EventQuestionsModal: React.FC<EventQuestionsModalProps> = ({ open, eventTitle, eventId, questions, onClose, onAdd, onUpdate, onDelete }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const initialOrder = useMemo(() => (questions.length ? Math.max(...questions.map(q => q.order)) + 1 : 1), [questions]);
  const [form, setForm] = useState<QuestionInput>({ question: "", type: "text", options: [], required: true, order: initialOrder });

  if (!open) return null;

  const startAdd = () => {
    setEditingId(null);
    setForm({ question: "", type: "text", options: [], required: true, order: initialOrder });
  };

  const startEdit = (q: EventCustomQuestion) => {
    setEditingId(q.id);
    setForm({ question: q.question, type: q.type, options: q.options || [], required: q.required, order: q.order });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Omit<EventCustomQuestion, "id" | "eventId"> = {
      question: form.question,
      type: form.type,
      options: form.type === "text" || form.type === "textarea" ? [] : (form.options || []),
      required: form.required,
      order: form.order,
    };
    if (editingId) {
      await onUpdate(editingId, payload);
    } else {
      await onAdd(payload);
    }
    setEditingId(null);
    setForm({ question: "", type: "text", options: [], required: true, order: initialOrder });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Event Questions — {eventTitle}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="space-y-3 mb-6">
          {questions.map((q) => (
            <div key={q.id} className="border border-gray-200 dark:border-gray-700 rounded p-3 flex items-start justify-between">
              <div>
                <div className="font-medium">{q.question}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{q.type} • Order {q.order} • {q.required ? 'Required' : 'Optional'}</div>
                {q.options && q.options.length > 0 && (
                  <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">Options: {q.options.join(', ')}</div>
                )}
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" icon={Edit3} onClick={() => startEdit(q)}>Edit</Button>
                <Button size="sm" variant="outline" icon={Trash2} className="text-red-600" onClick={async () => { if (confirm('Delete this question?')) await onDelete(q.id); }}>Delete</Button>
              </div>
            </div>
          ))}
          {questions.length === 0 && (
            <div className="text-sm text-gray-500 dark:text-gray-400">No questions yet.</div>
          )}
        </div>

        <form onSubmit={submit} className="space-y-4 border-t border-gray-200 dark:border-gray-700 pt-4" data-event-id={eventId}>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">{editingId ? 'Edit Question' : 'Add New Question'}</h3>
            {!editingId && (
              <Button type="button" variant="outline" onClick={startAdd}>Reset</Button>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 text-black dark:text-white">Question</label>
            <input className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500" value={form.question} onChange={(e) => setForm(prev => ({ ...prev, question: e.target.value }))} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 text-black dark:text-white">Type</label>
              <select className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 text-black dark:text-white bg-white dark:bg-gray-700" value={form.type} onChange={(e) => setForm(prev => ({ ...prev, type: e.target.value as EventCustomQuestion['type'] }))}>
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
            <label className="block text-sm font-medium text-gray-700 mb-1 text-black dark:text-white">Options (comma separated)</label>
            <textarea
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 bg-white dark:bg-gray-700 text-black dark:text-white"
              rows={3}
              value={(form.options || []).join(', ')}
              onChange={(e) => setForm(prev => ({
                ...prev,
                options: e.target.value
                  .split(',')
                  .map(o => o.trim())
                  .filter(o => o.length > 0)
              }))}
              disabled={form.type === 'text' || form.type === 'textarea'}
            />
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.required} onChange={(e) => setForm(prev => ({ ...prev, required: e.target.checked }))} /> Required</label>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Close</Button>
            <Button type="submit">{editingId ? 'Update Question' : 'Add Question'}</Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EventQuestionsModal;
