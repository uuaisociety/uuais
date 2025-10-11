"use client";

import React, { useEffect, useState } from "react";
import { X, Users, Mail } from "lucide-react";
import { subscribeToEventRegistrations } from "@/lib/firestore/registrations";
import { EventRegistration } from "@/types";

interface EventRegistrationsModalProps {
  open: boolean;
  eventId: string;
  eventTitle: string;
  onClose: () => void;
}

const EventRegistrationsModal: React.FC<EventRegistrationsModalProps> = ({ open, eventId, eventTitle, onClose }) => {
  const [registrations, setRegistrations] = useState<EventRegistration[]>([]);

  useEffect(() => {
    if (!open || !eventId) return;
    const unsub = subscribeToEventRegistrations(eventId, setRegistrations);
    return () => { if (typeof unsub === 'function') unsub(); };
  }, [open, eventId]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-gray-700 dark:text-gray-300" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Registrations — {eventTitle}</h2>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-4">
          {registrations.length === 0 ? (
            <p className="text-sm text-gray-600 dark:text-gray-300">No registrations yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-600 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                    <th className="py-2 pr-4">Name</th>
                    <th className="py-2 pr-4">Email</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4">Registered At</th>
                  </tr>
                </thead>
                <tbody>
                  {registrations.map((r) => {
                    const getStr = (key: string): string => {
                      const raw = r.registrationData?.[key];
                      return typeof raw === 'string' ? raw : '';
                    };
                    const first = getStr('firstName') || getStr('First Name') || getStr('first_name');
                    const last = getStr('lastName') || getStr('Last Name') || getStr('last_name');
                    const fallbackName = (first || last) ? `${first} ${last}`.trim() : (getStr('Name') || '');
                    const fallbackEmail = getStr('email') || getStr('Email');
                    const name = (r.userName || '').trim() || fallbackName;
                    const email = (r.userEmail || '').trim() || fallbackEmail;
                    return (
                      <tr key={r.id} className="border-b border-gray-100 dark:border-gray-700/50">
                        <td className="py-2 pr-4 text-gray-900 dark:text-white">{name || '—'}</td>
                        <td className="py-2 pr-4 text-gray-700 dark:text-gray-300 flex items-center gap-1">
                          {email && <Mail className="h-3 w-3" />} {email || '—'}
                        </td>
                        <td className="py-2 pr-4">{r.status}</td>
                        <td className="py-2 pr-4">{r.registeredAt ? new Date(r.registeredAt).toLocaleString() : '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EventRegistrationsModal;
