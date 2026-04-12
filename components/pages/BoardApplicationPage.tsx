"use client"

import React, { useEffect, useState } from "react";
import { auth } from '@/lib/firebase-client';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';

export default function BoardApplicationPage() {
  // Example board roles — replace with dynamic data later
  const roles = [
    { id: 'chair', title: 'Chairman of the Board 2026', short: '', description: 'Responsible for overall leadership, meeting facilitation, mentorship, and representing the association to internal and external stakeholders.' },
    { id: 'vice-chair', title: 'Vice Chairman of the Board 2026', short: '', description: 'Second-highest management role, for technical coordination, decision-making and mentorship.' },
    { id: 'b4', title: 'Head of Internal IT 2026', short: '', description: 'Management of IT services of UU AI Society, such as the website and technological assets.' },
    { id: 'b1', title: 'Head of Development 2026', short: '', description: 'Managing development, and a team of driven minds to develop ideas for tech-based projects built at UU AI Society.'},
    { id: 'b2', title: 'Head of Partnerships & Events 2026', short: '', description: 'Planning and Coordinating Events and Communication with Partner Organizations.' },
    { id: 'b3', title: 'Head of Growth 2026', short: '', description: 'Organizes workshops, seminars, and community events; manages marketing through social media and other outlets, along with communication with participants and visitors.' },
  ];

  type FormState = {
    name: string;
    email: string;
    phone: string;
    cvFile: File | null;
    coverOption: 'text' | 'file';
    coverText: string;
    coverFile: File | null;
    agree: boolean;
    errors: Record<string,string>;
    isSubmitting: boolean;
    submitted: boolean;
  };

  const emptyForm = (overrides?: Partial<FormState>): FormState => ({
    name: '',
    email: '',
    phone: '',
    cvFile: null,
    coverOption: 'text',
    coverText: '',
    coverFile: null,
    agree: false,
    errors: {},
    isSubmitting: false,
    submitted: false,
    ...overrides,
  });

  const [forms, setForms] = useState<Record<string,FormState>>(() => {
    const map: Record<string,FormState> = {};
    roles.forEach(r => { map[r.id] = emptyForm(); });
    return map;
  });

  const [openRole, setOpenRole] = useState<string | null>(null);

  useEffect(() => {
    const u = auth.currentUser;
    if (!u) return;
    setForms(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(k => {
        next[k] = { ...next[k], name: u.displayName || next[k].name, email: u.email || next[k].email, phone: (u as any).phoneNumber || next[k].phone };
      });
      return next;
    });
  }, []);
 

  const validateFor = (roleId: string) => {
    const f = forms[roleId];
    const e: Record<string,string> = {};
    if (!f.name.trim()) e.name = 'Name is required';
    if (!f.email.trim() || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email)) e.email = 'Valid email required';
    if (f.cvFile) {
        if (f.cvFile.type !== 'application/pdf') e.cv = 'CV must be a PDF';
        if (f.cvFile.size > 3 * 1024 * 1024) e.cv = 'CV must be at most 3MB';
    }
    if (!f.cvFile) e.cv = 'CV (max. 3MB, PDF) required';
    if (f.coverOption === 'file') {
      if (!f.coverFile) e.cover = 'Cover file required';
      if (f.coverFile) {
        if (f.coverFile.type !== 'application/pdf') e.cover = 'Cover letter must be a PDF';
        if (f.coverFile.size > 3 * 1024 * 1024) e.cover = 'Cover letter must be at most 3MB';
      }
    } else {
      if (!f.coverText || !f.coverText.trim()) e.cover = 'Cover letter text is required';
    }
    if (!f.agree) e.agree = 'You must agree to the terms';
    if (e.cover) e.form = e.cover;
    setForms(prev => ({ ...prev, [roleId]: { ...prev[roleId], errors: e } }));
    return Object.keys(e).length === 0;
  };
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (ev: React.FormEvent, roleId?: string) => {
    ev.preventDefault();
    if (!roleId) return;
    if (!validateFor(roleId)) return;
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const f = forms[roleId];
      const form = new FormData();
      form.append('name', f.name);
      form.append('email', f.email);
      form.append('phone', f.phone);
      form.append('agree', String(f.agree));
      form.append('coverOption', f.coverOption);
      if (f.cvFile) form.append('cv', f.cvFile, f.cvFile.name);
      if (f.coverOption === 'file' && f.coverFile) form.append('coverFile', f.coverFile, f.coverFile.name);
      if (f.coverOption === 'text') form.append('coverText', f.coverText);
      form.append('role', roleId);
      const res = await fetch('/api/board-apply', { method: 'POST', body: form });
      const json = await res.json();
      if (!res.ok) {
        setForms(prev => ({ ...prev, [roleId]: { ...prev[roleId], errors: { ...(prev[roleId].errors || {}), form: json?.error || 'Submission failed' } } }));
        setIsSubmitting(false);
        return;
      }

      setForms(prev => ({ ...prev, [roleId]: { ...prev[roleId], submitted: true } }));
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Submit error', err);
      if (roleId) {
        setForms(prev => ({ ...prev, [roleId]: { ...prev[roleId], errors: { ...(prev[roleId].errors || {}), form: 'Submission failed' } } }));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // per-role helpers
  const setField = (roleId: string, field: keyof FormState, value: any) => {
    setForms(prev => ({ ...prev, [roleId]: { ...prev[roleId], [field]: value } }));
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-24 pb-12">
      <div className="max-w-3xl mx-auto px-4 space-y-2">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Open Positions</h2>
        <div className="text-gray-700 dark:text-gray-300 space-y-2 mt-2">
            <p>
              Apply now!
            </p>
          </div>
        <div className="space-y-4">
          {roles.map((r) => {
            const f = forms[r.id];
            return (
            <div key={r.id} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{r.title}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">{r.short}</p>
                </div>
                <div>
                  <button
                    onClick={() => setOpenRole(openRole === r.id ? null : r.id)}
                    className="text-sm text-red-600 hover:underline"
                  >
                    {openRole === r.id ? 'Collapse' : 'Apply'}
                  </button>
                </div>
              </div>

              {openRole === r.id && (
                <div className="mt-4 border-t pt-4">
                  <div className="prose prose-sm dark:prose-invert text-gray-700 dark:text-gray-300 mb-4">{r.description}</div>

                  {f?.submitted ? (
                    <div className="rounded-md bg-green-50 border border-green-200 p-4">
                      <div className="text-green-800">Your application for this role has been submitted. Thank you!</div>
                    </div>
                  ) : (
                    <form onSubmit={(e) => onSubmit(e, r.id)} className="space-y-4">
                      <div className="grid grid-cols-1 gap-4">
                        <Input label="Name" value={f?.name || ''} onChange={e => setField(r.id, 'name', e.target.value)} error={f?.errors?.name} fullWidth />
                        <Input label="Email" type="email" value={f?.email || ''} onChange={e => setField(r.id, 'email', e.target.value)} error={f?.errors?.email} fullWidth />
                        <Input label="Phone" value={f?.phone || ''} onChange={e => setField(r.id, 'phone', e.target.value)} fullWidth />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">CV (PDF, max 3MB)</label>
                        <div className="flex items-center gap-3">
                          <label htmlFor={`cv-input-${r.id}`} className="m-0">
                            <input id={`cv-input-${r.id}`} accept="application/pdf" type="file" className="hidden" onChange={(e) => setField(r.id, 'cvFile', e.target.files?.[0] || null)} />
                            <Button asChild>
                              <span>Upload CV</span>
                            </Button>
                          </label>
                          <div className="text-sm text-gray-600 dark:text-gray-300">{f?.cvFile ? f.cvFile.name : 'No file chosen'}{f?.errors?.cv && <p className="mt-1 text-sm text-red-600">{f.errors.cv}</p>}</div>
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center gap-4 mb-2">
                          <label className="text-sm font-medium">Cover letter</label>
                          <div className="text-sm text-gray-500">(upload PDF or write concise text)</div>
                        </div>
                        <div className="flex items-center gap-4 mb-2">
                          <label className="inline-flex items-center gap-2">
                            <input type="radio" checked={f?.coverOption === 'text'} onChange={() => { setField(r.id, 'coverOption', 'text'); setField(r.id, 'coverFile', null); }} /> Write text
                          </label>
                          <label className="inline-flex items-center gap-2">
                            <input type="radio" checked={f?.coverOption === 'file'} onChange={() => { setField(r.id, 'coverOption', 'file'); setField(r.id, 'coverText', ''); }} /> Upload PDF
                          </label>
                        </div>
                        {f?.coverOption === 'text' ? (
                          <Textarea label="Concise cover letter" value={f?.coverText || ''} onChange={(e) => setField(r.id, 'coverText', e.target.value)} />
                        ) : (
                          <div className="flex items-center gap-3">
                            <label htmlFor={`cover-input-${r.id}`} className="m-0">
                              <input id={`cover-input-${r.id}`} accept="application/pdf" type="file" className="hidden" onChange={(e) => setField(r.id, 'coverFile', e.target.files?.[0] || null)} />
                              <Button asChild>
                                <span>Upload cover (PDF)</span>
                              </Button>
                            </label>
                            <div className="text-sm text-gray-600 dark:text-gray-300">{f?.coverFile ? f.coverFile.name : 'No file chosen'}</div>
                            {//f?.errors?.cover && <p className="mt-1 text-sm text-red-600">{f.errors.cover}</p>
                            }
                          </div>
                        )}
                      </div>

                      <div className="flex items-start gap-3">
                        <input id={`agree-${r.id}`} type="checkbox" checked={f?.agree || false} onChange={(e) => setField(r.id, 'agree', e.target.checked)} />
                        <label htmlFor={`agree-${r.id}`} className="text-sm">I agree to terms (<a href="/privacy" className="underline">privacy policy</a>)</label>
                      </div>
                      {f?.errors?.agree && <p className="mt-1 text-sm text-red-600">{f.errors.agree}</p>}

                      {f?.errors?.form && <p className="text-sm text-red-600">{f.errors.form}</p>}
                      <div className="pt-2">
                        <Button type="submit" variant="cta" disabled={f?.isSubmitting || isSubmitting}>{(f?.isSubmitting || isSubmitting) ? 'Submitting…' : 'Submit application'}</Button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </div>
          )})}
        </div>
      </div>
    </div>
  );
}
