"use client";

import React, { useEffect, useState } from "react";
import { X, Users, Send, ChevronDown } from "lucide-react";
import { subscribeToEventRegistrations, inviteRegistrant } from "@/lib/firestore/registrations";
import { EventRegistration } from "@/types";
import { Button } from "@/components/ui/Button";
import { useNotify } from "@/components/ui/Notifications";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';


interface EventRegistrationsModalProps {
  open: boolean;
  eventId: string;
  eventTitle: string;
  questions?: import('@/types').EventCustomQuestion[];
  onClose: () => void;
}

const EventRegistrationsModal: React.FC<EventRegistrationsModalProps> = ({ open, eventId, eventTitle, onClose, questions = [] }) => {
  const [registrations, setRegistrations] = useState<EventRegistration[]>([]);
  const [invitingId, setInvitingId] = useState<string | null>(null);
  const { notify } = useNotify();

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
            <div className="space-y-2">
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
                  <div key={r.id} className="border rounded-md overflow-hidden">
                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800">
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">{name || '—'}</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">{email || '—'}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" disabled={invitingId === r.id} onClick={async () => {
                          try { setInvitingId(r.id); const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || (typeof window !== 'undefined' ? window.location.origin : ''); await inviteRegistrant(r.id, { baseUrl }); notify({ type: 'success', message: 'Invitation sent' }); } catch (e) { notify({ type: 'error', message: e instanceof Error ? e.message : 'Failed to send invitation' }); } finally { setInvitingId(null); }
                        }} title="Send invitation"><Send className="h-4 w-4" /> Invite</Button>
                        <CollapsibleRow registration={r} questions={questions} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EventRegistrationsModal;

function CollapsibleRow({ registration, questions }: { registration: EventRegistration; questions: import('@/types').EventCustomQuestion[] }) {
  const [open, setOpen] = useState(false);

  const getAnswer = (q: import('@/types').EventCustomQuestion) => {
    const data = registration.registrationData || {};
    // Try several keys: id, question text, simple normalized keys
    const candidates = [q.id, q.question, q.question.trim(), q.question.trim().toLowerCase(), q.question.replace(/\s+/g, ''), q.question.replace(/\s+/g, '_')];
    for (const k of candidates) {
      if (k && Object.prototype.hasOwnProperty.call(data, k)) {
        const v = data[k as string];
        if (Array.isArray(v)) return v.join(', ');
        if (typeof v === 'boolean') return v ? 'Yes' : 'No';
        return String(v ?? '');
      }
    }
    // fallback: try common name keys
    const fallbackKeys = ['firstName','first_name','First Name','lastName','email','Email','Name'];
    for (const k of fallbackKeys) {
      if (Object.prototype.hasOwnProperty.call(data, k)) {
        const v = data[k];
        if (Array.isArray(v)) return v.join(', ');
        if (typeof v === 'boolean') return v ? 'Yes' : 'No';
        return String(v ?? '');
      }
    }
    return '';
  };

  return (
    <Collapsible open={open} onOpenChange={(o: boolean) => setOpen(o)}>
      <CollapsibleTrigger className="inline-flex items-center gap-2 px-3 py-1 bg-white dark:bg-gray-900 border rounded-md">
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
        <span className="text-xs">{open ? 'Hide details' : 'View details'}</span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="p-3 bg-white dark:bg-gray-900 border-t">
          {questions && questions.length > 0 ? (
            <div className="grid grid-cols-1 gap-2">
              {questions.map((q) => (
                <div key={q.id} className="flex flex-col">
                  <div className="text-xs text-gray-500 dark:text-gray-400">{q.question}</div>
                  <div className="text-sm text-gray-900 dark:text-white">{getAnswer(q) || '—'}</div>
                </div>
              ))}
            </div>
          ) : (
            <pre className="text-xs text-gray-700 dark:text-gray-300">{JSON.stringify(registration.registrationData || {}, null, 2)}</pre>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
