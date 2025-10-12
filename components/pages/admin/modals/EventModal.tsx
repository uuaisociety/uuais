"use client";

import React from "react";
import { Button } from "@/components/ui/Button";
import { X } from "lucide-react";

export interface EventFormState {
  title: string;
  description: string;
  location: string;
  image: string;
  category: 'workshop' | 'guest_lecture' | 'hackathon' | 'other';
  registrationRequired: boolean;
  maxCapacity?: number;
  eventStartAt: string;
  registrationClosesAt: string;
  publishAt: string;
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-400 valid:border-green-500 valid:focus:ring-green-500 invalid:border-red-500 invalid:focus:ring-red-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 text-black dark:text-white">Event Start (date & time)</label>
            <input
              type="datetime-local"
              value={form.eventStartAt || ''}
              onChange={(e) => setForm(prev => ({ ...prev, eventStartAt: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-400 valid:border-green-500 valid:focus:ring-green-500 invalid:border-red-500 invalid:focus:ring-red-500"
              placeholder="YYYY-MM-DDTHH:mm"
              required
            />
          </div>

          <label className="block text-sm font-medium text-gray-700 mb-1 text-black dark:text-white">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-400 valid:border-green-500 valid:focus:ring-green-500 invalid:border-red-500 invalid:focus:ring-red-500"
            required
          />
          

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 text-black dark:text-white">Registration closes (optional)</label>
            <input
              type="datetime-local"
              value={form.registrationClosesAt || ''}
              onChange={(e) => setForm(prev => ({ ...prev, registrationClosesAt: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-400 valid:border-green-500 valid:focus:ring-green-500 invalid:border-red-500 invalid:focus:ring-red-500"
              placeholder="YYYY-MM-DDTHH:mm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 text-black dark:text-white">Publish at (optional)</label>
            <input
              type="datetime-local"
              value={form.publishAt || ''}
              onChange={(e) => setForm(prev => ({ ...prev, publishAt: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-400 valid:border-green-500 valid:focus:ring-green-500 invalid:border-red-500 invalid:focus:ring-red-500"
              placeholder="YYYY-MM-DDTHH:mm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 text-black dark:text-white">Location</label>
            <input
              type="text"
              value={form.location}
              onChange={(e) => setForm(prev => ({ ...prev, location: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-400 valid:border-green-500 valid:focus:ring-green-500 invalid:border-red-500 invalid:focus:ring-red-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 text-black dark:text-white">Image URL</label>
            <input
              type="url"
              value={form.image}
              onChange={(e) => setForm(prev => ({ ...prev, image: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-400 valid:border-green-500 valid:focus:ring-green-500 invalid:border-red-500 invalid:focus:ring-red-500"
              placeholder="Optional; a placeholder will be used if empty"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 text-black dark:text-white">Category</label>
            <select
              value={form.category}
              onChange={(e) => setForm(prev => ({ ...prev, category: e.target.value as EventFormState['category'] }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-400 valid:border-green-500 valid:focus:ring-green-500 invalid:border-red-500 invalid:focus:ring-red-500"
            >
              <option value="workshop">Workshop</option>
              <option value="guest_lecture">Guest Lecture</option>
              <option value="hackathon">Hackathon</option>
              <option value="other">Other</option>
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
                <label className="block text-sm font-medium text-gray-700 mb-1 text-black dark:text-white">Max Capacity (optional)</label>
                <input
                  type="number"
                  value={form.maxCapacity ?? ''}
                  onChange={(e) => {
                    const v = e.target.value;
                    setForm(prev => ({ ...prev, maxCapacity: v === '' ? undefined : Math.max(1, parseInt(v) || 1) }));
                  }}
                  className="w-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 min-w-[240px]"
                  min="1"
                  placeholder="Leave empty for unlimited"
                />
                <p className="text-xs text-gray-500 mt-1">Leave empty when you want registration required but no capacity limit.</p>
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
