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
  // UI mode: idle = list view, add = showing form to add, edit = editing an existing stored question
  const [mode, setMode] = useState<'idle' | 'add' | 'edit'>('idle');
  const [editingId, setEditingId] = useState<string | null>(null);

  const sortedQuestions = useMemo(() => {
    return [...questions].sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [questions]);
  const initialOrder = useMemo(() => (
    sortedQuestions.length ? Math.max(...sortedQuestions.map(q => q.order || 0)) + 1 : 1
  ), [sortedQuestions]);
  const [form, setForm] = useState<QuestionInput>({ question: "", type: "text", options: [], required: true, order: initialOrder });
  const [optionsText, setOptionsText] = useState<string>("");
  // when editing a default question, we prefill the form but save as a new custom question (override)

  if (!open) return null;



  const startEdit = (q: EventCustomQuestion) => {
    // If editing a default question, we treat this as creating an override (add) but prefill the form
    if (q.id && q.id.startsWith('default:')) {
      // Editing a default question becomes an add-with-prefill (override) flow
      setEditingId(null);
      setForm({ question: q.question, type: q.type, options: q.options || [], required: q.required, order: q.order });
      setOptionsText((q.options || []).join(', '));
      setMode('add');
      return;
    }
    setEditingId(q.id || null);
    setForm({ question: q.question, type: q.type, options: q.options || [], required: q.required, order: q.order });
    setOptionsText((q.options || []).join(', '));
    setMode('edit');
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedOptions = (optionsText || '')
      .split(',')
      .map(o => o.trim())
      .filter(o => o.length > 0);
    const payload: Omit<EventCustomQuestion, "id" | "eventId"> = {
      question: form.question,
      type: form.type,
      options: (form.type === "text" || form.type === 'textarea') ? [] : parsedOptions,
      required: form.required,
      order: form.order,
    };
    if (mode === 'edit' && editingId) {
      await onUpdate(editingId, payload);
    } else {
      // add (this also covers add-as-override for default questions)
      await onAdd(payload);
    }
    // reset
    setMode('idle');
    setEditingId(null);
    setForm({ question: "", type: "text", options: [], required: true, order: initialOrder });
    setOptionsText("");
  };

  const stopEdit = () => {
    setMode('idle');
    setEditingId(null);
    setForm({ question: "", type: "text", options: [], required: true, order: initialOrder });
    setOptionsText("");
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Event Questions — {eventTitle}</h2>
          <div className="flex items-center gap-2">
            <button onClick={() => { stopEdit(); onClose(); }} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300">
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        <div className="space-y-3 mb-6">
          {sortedQuestions.map((q) => (
            <div key={q.id} className="border border-gray-200 dark:border-gray-700 rounded p-3 flex items-start justify-between">
              <div>
                <div className="font-medium">{q.question}{q.id?.startsWith('default:') ? ' (default)' : ''}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{q.type} • Order {q.order} • {q.required ? 'Required' : 'Optional'}</div>
                {q.options && q.options.length > 0 && (
                  <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">Options: {q.options.join(', ')}</div>
                )}
              </div>
              <div className="flex gap-2">
                {mode === 'edit' && editingId === q.id ?
                  <Button size="sm" variant="outline" icon={Edit3} onClick={() => stopEdit()}>Editing...</Button>
                  : (
                    <Button size="sm" variant="outline" icon={Edit3} onClick={() => startEdit(q)}>Edit</Button>
                  )}
                <Button size="sm" variant="destructive" icon={Trash2} onClick={async () => { if (confirm('Delete this question?')) await onDelete(q.id); }}>Delete</Button>
              </div>
            </div>
          ))}
          {sortedQuestions.length === 0 && (
            <div className="text-sm text-gray-500 dark:text-gray-400">No questions yet.</div>
          )}
        </div>

        <form onSubmit={submit} className="space-y-4 border-t border-gray-200 dark:border-gray-700 pt-4" data-event-id={eventId}>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">{mode === 'edit' ? 'Edit Question' : 'Add New Question'}</h3>
            {mode === 'add' && (
              <Button type="button" variant="outline" onClick={() => { setMode('idle'); setForm({ question: "", type: "text", options: [], required: true, order: initialOrder }); setOptionsText(""); }}>Reset</Button>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 text-black dark:text-white">Question</label>
            <input className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500" value={form.question} onChange={(e) => setForm(prev => ({ ...prev, question: e.target.value }))} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 text-black dark:text-white">Type</label>
              <select className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 text-black dark:text-white bg-white dark:bg-gray-700" value={form.type} onChange={(e) => {
                const nextType = e.target.value as EventCustomQuestion['type'];
                setForm(prev => ({ ...prev, type: nextType }));
                // Keep existing optionsText when switching among option-based types
                if (nextType === 'text' || nextType === 'textarea') {
                  setOptionsText('');
                }
              }}>
                <option className="text-black dark:text-white" value="text">Text</option>
                <option className="text-black dark:text-white" value="textarea">Longer text</option>
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
              value={optionsText}
              onChange={(e) => setOptionsText(e.target.value)}
              disabled={form.type === 'text' || form.type === 'textarea'}
            />
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.required} onChange={(e) => setForm(prev => ({ ...prev, required: e.target.checked }))} /> Required</label>
          <div className="flex justify-end gap-2">
            {mode === 'edit' ? (
              <Button type="button" variant="outline" onClick={() => stopEdit()}>Cancel Edit</Button>
            ) : (
              <Button type="button" variant="outline" onClick={() => { stopEdit(); onClose(); }}>Close</Button>
            )}
            <Button type="submit">{mode === 'edit' ? 'Update Question' : 'Add Question'}</Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EventQuestionsModal;
