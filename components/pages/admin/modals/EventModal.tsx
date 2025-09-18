"use client";

import React from "react";
import { Button } from "@/components/ui/Button";
import { X } from "lucide-react";

export interface EventFormState {
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  image: string;
  category: 'workshop' | 'seminar' | 'competition' | 'social';
  registrationRequired: boolean;
  maxCapacity: number;
}

interface EventModalProps {
  open: boolean;
  editing: boolean;
  form: EventFormState;
  setForm: React.Dispatch<React.SetStateAction<EventFormState>>;
  onClose: () => void;
  onSubmit: () => void;
}

const EventModal: React.FC<EventModalProps> = ({ open, editing, form, setForm, onClose, onSubmit }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {editing ? 'Edit Event' : 'Add New Event'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 text-black dark:text-white">Title</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 text-black dark:text-white">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 text-black dark:text-white">Date</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm(prev => ({ ...prev, date: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 text-black dark:text-white">Time</label>
              <input
                type="time"
                value={form.time}
                onChange={(e) => setForm(prev => ({ ...prev, time: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 text-black dark:text-white">Location</label>
            <input
              type="text"
              value={form.location}
              onChange={(e) => setForm(prev => ({ ...prev, location: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 text-black dark:text-white">Image URL</label>
            <input
              type="url"
              value={form.image}
              onChange={(e) => setForm(prev => ({ ...prev, image: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
              placeholder="Optional; a placeholder will be used if empty"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 text-black dark:text-white">Category</label>
            <select
              value={form.category}
              onChange={(e) => setForm(prev => ({ ...prev, category: e.target.value as EventFormState['category'] }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="workshop">Workshop</option>
              <option value="seminar">Seminar</option>
              <option value="competition">Competition</option>
              <option value="social">Social</option>
            </select>
          </div>

          <div className="flex items-center space-x-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={form.registrationRequired}
                onChange={(e) => setForm(prev => ({ ...prev, registrationRequired: e.target.checked }))}
                className="mr-2"
              />
              Registration Required
            </label>

            {form.registrationRequired && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 text-black dark:text-white">Max Capacity</label>
                <input
                  type="number"
                  value={form.maxCapacity}
                  onChange={(e) => setForm(prev => ({ ...prev, maxCapacity: parseInt(e.target.value) || 0 }))}
                  className="w-24 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  min="1"
                />
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit">{editing ? 'Update Event' : 'Create Event'}</Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EventModal;
