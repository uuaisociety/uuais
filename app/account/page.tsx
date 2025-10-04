"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { auth, linkGoogleToCurrentUser, linkGithubToCurrentUser, linkMicrosoftToCurrentUser, signInWithGooglePopup, signInWithGithubPopup, signInWithMicrosoftPopup } from "@/lib/firebase-client";
import { getUserProfile, upsertUserProfile, updateUserProfile, getMyRegistrations, getAllEvents, type UserProfile } from "@/lib/firestore";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { FieldGroup, InputBase, SelectBase, TextareaBase } from "@/components/ui/Form";
import { useNotify } from "@/components/ui/Notifications";

export default function AccountPage() {
  const { notify } = useNotify();
  const [uid, setUid] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Partial<UserProfile>>({}); 
  const [registrations, setRegistrations] = useState<Array<{ id: string; eventId: string; status: string; registeredAt: string }>>([]);
  const [eventMeta, setEventMeta] = useState<Record<string, { title: string; startAt?: string; date?: string; time?: string }>>({});
  const [providers, setProviders] = useState<string[]>([]);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (u) => {
      if (!u) {
        setUid(null);
        setProviders([]);
        setLoading(false);
        return;
      }
      setUid(u.uid);
      const p = await getUserProfile(u.uid);
      setForm(p || {});
      setProviders((u.providerData || []).map(pd => pd.providerId));
      const regs = await getMyRegistrations(u.uid);
      setRegistrations(regs.map(r => ({ id: r.id, eventId: r.eventId, status: r.status, registeredAt: r.registeredAt })));
      // Build event meta map (title + time)
      try {
        const events = await getAllEvents();
        const map: Record<string, { title: string; startAt?: string; date?: string; time?: string }> = {};
        for (const ev of events) {
          map[ev.id] = { title: ev.title || ev.id, startAt: ev.startAt, date: ev.date, time: ev.time };
        }
        setEventMeta(map);
      } catch {}
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const isLinked = useMemo(() => {
    return {
      google: providers.includes("google.com"),
      github: providers.includes("github.com"),
      microsoft: providers.includes("microsoft.com"),
    };
  }, [providers]);

  const handleLink = async (prov: "google" | "github" | "microsoft") => {
    if (!auth.currentUser) return;
    try {
      if (prov === "google") await linkGoogleToCurrentUser(auth.currentUser);
      if (prov === "github") await linkGithubToCurrentUser(auth.currentUser);
      if (prov === "microsoft") await linkMicrosoftToCurrentUser(auth.currentUser);
      // refresh providers list
      await auth.currentUser.reload();
      setProviders((auth.currentUser.providerData || []).map(pd => pd.providerId));
      notify({ type: 'success', title: 'Linked', message: `${prov[0].toUpperCase()+prov.slice(1)} linked successfully.` });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Could not link provider.';
      notify({ type: 'error', title: 'Link failed', message: msg });
    }
  };

  const handleSignIn = async (prov: "google" | "github" | "microsoft") => {
    if (prov === "google") await signInWithGooglePopup();
    if (prov === "github") await signInWithGithubPopup();
    if (prov === "microsoft") await signInWithMicrosoftPopup();
  };

  const handleSave = async () => {
    if (!uid) return;
    try {
      const payload: Partial<UserProfile> = {
        ...form,
        isMember: form.isMember ?? true,
      };
      const existing = await getUserProfile(uid);
      if (!existing) {
        await upsertUserProfile(uid, payload);
      } else {
        await updateUserProfile(uid, payload);
      }
      // Optionally refetch to reflect saved changes in UI
      const refreshed = await getUserProfile(uid);
      setForm(refreshed || form);
      notify({ type: 'success', title: 'Saved', message: 'Account updated successfully.' });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Could not save your account.';
      notify({ type: 'error', title: 'Save failed', message: msg });
    }
  };

  if (loading) {
    return <div className="pt-24 px-4 max-w-5xl mx-auto text-gray-700 dark:text-gray-200">Loading...</div>;
  }

  if (!uid) {
    console.log(uid);
    return (
      <div className="min-h-screen pt-24 px-4">
        <div className="max-w-3xl mx-auto">
          <Card>
            <CardHeader>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Account</h1>
              <p className="text-gray-600 dark:text-gray-300">Sign in to manage your profile and view your applications.</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button onClick={() => handleSignIn("google")} variant="default">Sign in with Google</Button>
              <Button onClick={() => handleSignIn("github")} variant="outline">Sign in with GitHub</Button>
              <Button onClick={() => handleSignIn("microsoft")} variant="outline">Sign in with Microsoft</Button>
              <div className="text-sm text-gray-600 dark:text-gray-300">Or go to <Link href="/join">Join</Link> to create an account.</div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-24 pb-12">
      <div className="max-w-5xl mx-auto px-4 space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">My Account</h1>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <Card className="md:col-span-2">
            <CardHeader>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Profile</h2>
              <p className="text-gray-600 dark:text-gray-300 text-sm">Update your membership details.</p>
            </CardHeader>
            <CardContent className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Personal Information</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <FieldGroup label="Display name" requiredHint="Required. Shown publicly.">
                  <InputBase placeholder="e.g. Alex" value={form.displayName || ""} onChange={(e)=>setForm(f=>({...f, displayName: e.target.value}))} />
                </FieldGroup>
                <FieldGroup label="Full name" requiredHint="Required.">
                  <InputBase placeholder="e.g. Alex Doe" value={form.name || ""} onChange={(e)=>setForm(f=>({...f, name: e.target.value}))} />
                </FieldGroup>
              </div>

              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Contact & Social</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <FieldGroup label="Student status" requiredHint="Optional">
                  <SelectBase value={form.studentStatus ?? "student"} onChange={(e)=>setForm(f=>({...f, studentStatus: e.target.value as 'student' | 'alumni' | 'other'}))}>
                    <option value="student">Student</option>
                    <option value="alumni">Alumni</option>
                    <option value="other">Other</option>
                  </SelectBase>
                </FieldGroup>
                <FieldGroup label="Campus" requiredHint="Optional">
                  <SelectBase value={form.campus ?? "Uppsala"} onChange={(e)=>setForm(f=>({...f, campus: e.target.value as 'Uppsala' | 'Gotland' | 'other'}))}>
                    <option value="Uppsala">Uppsala</option>
                    <option value="Gotland">Gotland</option>
                    <option value="other">Other</option>
                  </SelectBase>
                </FieldGroup>
                <FieldGroup label="LinkedIn URL" requiredHint="Optional">
                  <InputBase placeholder="https://linkedin.com/in/..." value={form.linkedin || ""} onChange={(e)=>setForm(f=>({...f, linkedin: e.target.value}))} />
                </FieldGroup>
                <FieldGroup label="GitHub URL" requiredHint="Optional">
                  <InputBase placeholder="https://github.com/username" value={form.github || ""} onChange={(e)=>setForm(f=>({...f, github: e.target.value}))} />
                </FieldGroup>
                <FieldGroup label="Website" requiredHint="Optional">
                  <InputBase placeholder="https://example.com" value={form.website || ""} onChange={(e)=>setForm(f=>({...f, website: e.target.value}))} />
                </FieldGroup>
              </div>

              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Academic Information</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <FieldGroup label="University" requiredHint="Required if student.">
                  <SelectBase value={form.university ?? "Uppsala"} onChange={(e)=>setForm(f=>({...f, university: e.target.value as 'Uppsala' | 'none' | 'other'}))}>
                    <option value="Uppsala">Uppsala</option>
                    <option value="none">None</option>
                    <option value="other">Other</option>
                  </SelectBase>
                </FieldGroup>
                <FieldGroup label="Program/Major" requiredHint="Required if student.">
                  <InputBase placeholder="e.g. Computer Science" value={form.program || ""} onChange={(e)=>setForm(f=>({...f, program: e.target.value}))} />
                </FieldGroup>
                <FieldGroup label="Expected Graduation Year" requiredHint="Optional">
                  <InputBase placeholder="e.g. 2026" type="number" value={form.expectedGraduationYear ?? ''} onChange={(e)=>setForm(f=>({...f, expectedGraduationYear: e.target.value ? Number(e.target.value) : undefined}))} />
                </FieldGroup>
                <FieldGroup label="Gender" requiredHint="Optional">
                  <SelectBase value={form.gender || "other"} onChange={(e)=>setForm(f=>({...f, gender: e.target.value}))}>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="nonbinary">Non-binary</option>
                    <option value="prefer_not">Prefer not to say</option>
                    <option value="other">Other</option>
                  </SelectBase>
                </FieldGroup>
              </div>
              {/* Heard of us */}
              <div className="grid md:grid-cols-2 gap-4">
                <FieldGroup label="How did you hear of us?" requiredHint="Optional">
                  <SelectBase
                    value={form.heardOfUs || ''}
                    onChange={(e)=>{
                      const v = e.target.value;
                      if (v === 'other') {
                        setForm(f=>({ ...f, heardOfUs: '' }));
                      } else {
                        setForm(f=>({ ...f, heardOfUs: v }));
                      }
                    }}
                  >
                    <option value="">Select an option</option>
                    <option value="posters">Posters</option>
                    <option value="instagram">Instagram</option>
                    <option value="linkedin">LinkedIn</option>
                    <option value="friends">Friends</option>
                    <option value="events">Events</option>
                    <option value="lecture">During lecture</option>
                    <option value="other">Other</option>
                  </SelectBase>
                </FieldGroup>
                {(form.heardOfUs === '' || (form.heardOfUs && !['posters','instagram','linkedin','friends','events','lecture'].includes(form.heardOfUs))) && (
                  <FieldGroup label="If other, please specify" requiredHint="Optional">
                    <InputBase placeholder="Type here" value={form.heardOfUs || ''} onChange={(e)=>setForm(f=>({...f, heardOfUs: e.target.value}))} />
                  </FieldGroup>
                )}
              </div>
              <FieldGroup label="Bio" requiredHint="Optional">
                <TextareaBase placeholder="Write a short bio" value={form.bio || ""} onChange={(e)=>setForm(f=>({...f, bio: e.target.value}))} />
              </FieldGroup>
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 text-gray-800 dark:text-gray-200">
                  <input type="checkbox" checked={!!form.newsletter} onChange={(e)=>setForm(f=>({...f, newsletter: e.target.checked}))} />
                  Subscribe to newsletter
                </label>
                <label className="flex items-center gap-2 text-gray-800 dark:text-gray-200">
                  <input type="checkbox" checked={!!form.lookingForJob} onChange={(e)=>setForm(f=>({...f, lookingForJob: e.target.checked}))} />
                  Looking for job opportunities
                </label>
              </div>
              <div className="space-y-2">
                <div className="text-sm text-gray-700 dark:text-gray-300">
                  Privacy: {form.privacyAcceptedAt ? `accepted at ${new Date(form.privacyAcceptedAt).toLocaleString()}` : 'not accepted yet'}
                </div>
                <label className="flex items-center gap-2 text-gray-800 dark:text-gray-200">
                  <input type="checkbox" checked={!!form.marketingOptIn} onChange={(e)=>setForm(f=>({...f, marketingOptIn: e.target.checked}))} />
                  Allow marketing communications
                </label>
                <label className="flex items-center gap-2 text-gray-800 dark:text-gray-200">
                  <input type="checkbox" checked={!!form.analyticsOptIn} onChange={(e)=>setForm(f=>({...f, analyticsOptIn: e.target.checked}))} />
                  Allow anonymous analytics
                </label>
                <label className="flex items-center gap-2 text-gray-800 dark:text-gray-200">
                  <input type="checkbox" checked={!!form.partnerContactOptIn} onChange={(e)=>setForm(f=>({...f, partnerContactOptIn: e.target.checked}))} />
                  Allow contact from partner companies
                </label>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  View our <a href="/privacy" className="underline" target="_blank" rel="noreferrer">Privacy Policy</a>
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={handleSave}>Save</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Linked Accounts</h2>
              <p className="text-gray-600 dark:text-gray-300 text-sm">Link multiple providers to your account.</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-800 dark:text-gray-200">Google</span>
                {isLinked.google ? (
                  <span className="text-green-600">Linked</span>
                ) : (
                  <Button variant="outline" onClick={() => handleLink("google")}>Link</Button>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-800 dark:text-gray-200">GitHub</span>
                {isLinked.github ? (
                  <span className="text-green-600">Linked</span>
                ) : (
                  <Button variant="outline" onClick={() => handleLink("github")}>Link</Button>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-800 dark:text-gray-200">Microsoft</span>
                {isLinked.microsoft ? (
                  <span className="text-green-600">Linked</span>
                ) : (
                  <Button variant="outline" onClick={() => handleLink("microsoft")}>Link</Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">My Event Applications</h2>
          </CardHeader>
          <CardContent>
            {registrations.length === 0 ? (
              <div className="text-gray-600 dark:text-gray-300">No applications yet.</div>
            ) : (
              <ul className="space-y-2">
                {registrations.map(r => (
                  <li key={r.id} className="flex items-center justify-between text-gray-800 dark:text-gray-200">
                    <span>
                      Event: <Link className="underline" href={`/events/${r.eventId}`}>{eventMeta[r.eventId]?.title || r.eventId}</Link>
                      {(() => {
                        const meta = eventMeta[r.eventId];
                        if (!meta) return null;
                        let dt: Date | null = null;
                        if (meta.startAt) {
                          const d = new Date(meta.startAt);
                          if (!isNaN(d.getTime())) dt = d;
                        }
                        if (!dt && meta.date && meta.time) {
                          const d = new Date(`${meta.date}T${meta.time}`);
                          if (!isNaN(d.getTime())) dt = d;
                        }
                        return dt ? <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">• {dt.toLocaleString()}</span> : null;
                      })()}
                    </span>
                    <span className="text-sm">{r.status} • {r.registeredAt ? new Date(r.registeredAt).toLocaleString() : ''}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <style jsx global>{`
        .input { @apply w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white; }
      `}</style>
    </div>
  );
}
