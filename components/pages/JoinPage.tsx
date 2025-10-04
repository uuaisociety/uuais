'use client'

// Disable static generation for this page
export const dynamic = 'force-dynamic';

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { GithubIcon, GoogleIcon, MicrosoftIcon } from 'hugeicons-react';
import { updatePageMeta } from '@/utils/seo';
import { auth, signInWithGooglePopup, signInWithGithubPopup, signInWithMicrosoftPopup } from '@/lib/firebase-client';
import { getUserProfile, upsertUserProfile, updateUserProfile, type UserProfile } from '@/lib/firestore';
import Link from 'next/link';
import { FieldGroup, InputBase, SelectBase, TextareaBase } from '@/components/ui/Form';
import { useNotify } from '@/components/ui/Notifications';
import { useRouter } from 'next/navigation';

const JoinPage: React.FC = () => {
  const router = useRouter();
  const [uid, setUid] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  // const [captchaOk, setCaptchaOk] = useState(false); // CAPTCHA temporarily disabled
  const [form, setForm] = useState<Partial<UserProfile>>({});
  const [saving, setSaving] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const { notify } = useNotify();

  useEffect(() => {
    updatePageMeta('Join Us', 'Create an account and become a member of UU AI Society');
  }, []);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (u) => {
      if (!u) {
        setUid(null);
        setProfile(null);
        setForm({});
        return;
      }
      setUid(u.uid);
      const p = await getUserProfile(u.uid);
      setProfile(p);
      setForm((prev) => ({
        ...prev,
        ...(p || { isMember: true }),
        // default fallbacks from auth
        displayName: p?.displayName ?? u.displayName ?? (u.email ? u.email.split('@')[0] : prev.displayName),
        email: p?.email ?? u.email ?? prev.email,
      }));
    });
    return () => unsub();
  }, []);

  const handleSave = async () => {
    if (!uid) return;
    setSaving(true);
    try {
      const data: Partial<UserProfile> = {
        ...form,
        isMember: true,
        privacyAcceptedAt: privacyAccepted ? new Date().toISOString() : undefined,
      };
      if (!profile) {
        await upsertUserProfile(uid, data);
      } else {
        await updateUserProfile(uid, data);
      }
      const refreshed = await getUserProfile(uid);
      setProfile(refreshed);
      notify({ type: 'success', title: 'Saved', message: 'Profile saved successfully.' });
      router.push('/account');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-24 pb-12 dark:[color-scheme:dark]">
      <div className="max-w-3xl mx-auto px-4 space-y-8">
        <div className="text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-3">Join UU AI Society</h1>
          <p className="text-gray-600 dark:text-gray-300">Create an account with a trusted provider. No passwords to manage.</p>
        </div>

        {/* Logged-in/member banner */}
        {uid && (
          (profile?.isMember && profile?.privacyAcceptedAt) ? (
            <div className="p-4 rounded-md border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950 text-blue-900 dark:text-blue-200">
              You are logged in {form.displayName ? `as ${form.displayName}` : ''}. You are already a member. Manage your details anytime at <Link href="/account">/account</Link>.
            </div>
          ) : (
            <div className="p-4 rounded-md border border-yellow-200 dark:border-yellow-900 bg-yellow-50 dark:bg-yellow-950 text-yellow-900 dark:text-yellow-200">
              To access this resource, please complete your profile below and accept the privacy policy.
            </div>
          )
        )}

        {/* CAPTCHA disabled for now per request */}

        <Card>
          <CardHeader>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Sign in or Create Account</h2>
            <p className="text-gray-600 dark:text-gray-300 text-sm">Use one of the providers below. You can link more providers later in your account.</p>
          </CardHeader>
          <CardContent className="space-y-3 flex flex-col md:flex-col justify-center gap-2 pt-4 items-center max-w-md mx-auto">
            {/* TODO: Add colors to icons */}
            <Button onClick={() => signInWithGooglePopup()} variant="default">
              <span className="flex items-center gap-2"><GoogleIcon className="h-4 w-4"/> Continue with Google</span>
            </Button>
            <Button onClick={() => signInWithGithubPopup()} variant="outline">
              <span className="flex items-center gap-2"><GithubIcon className="h-4 w-4"/> Continue with GitHub</span>
            </Button>
            <Button onClick={() => signInWithMicrosoftPopup()} variant="outline">
              <span className="flex items-center gap-2"><MicrosoftIcon className="h-4 w-4"/> Continue with Microsoft</span>
            </Button>
          </CardContent>
        </Card>

        {uid && (
          <Card>
            <CardHeader>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Step 3: Complete your profile</h2>
              <p className="text-gray-600 dark:text-gray-300 text-sm">These details help us serve members better. You can edit them anytime in <Link href="/account" className="underline">/account</Link>.</p>
            </CardHeader>
            <CardContent className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Personal Information</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <FieldGroup label="Display name" requiredHint="Required. Shown publicly.">
                  <InputBase placeholder="e.g. Alex" value={form.displayName || ''} onChange={(e) => setForm(f => ({ ...f, displayName: e.target.value }))} />
                </FieldGroup>
                <FieldGroup label="Full name" requiredHint="Required. Your legal name or preferred full name.">
                  <InputBase placeholder="e.g. Alex Doe" value={form.name || ''} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} />
                </FieldGroup>
              </div>

              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Contact & Social</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <FieldGroup label="Student status" requiredHint="Optional.">
                  <SelectBase value={form.studentStatus ?? 'student'} onChange={(e) => setForm(f => ({ ...f, studentStatus: e.target.value as 'student' | 'alumni' | 'other' }))}>
                    <option value="student">Student</option>
                    <option value="alumni">Alumni</option>
                    <option value="other">Other</option>
                  </SelectBase>
                </FieldGroup>
                <FieldGroup label="Campus" requiredHint="Optional">
                  <SelectBase value={form.campus ?? 'Uppsala'} onChange={(e) => setForm(f => ({ ...f, campus: e.target.value as 'Uppsala' | 'Gotland' | 'other' }))}>
                    <option value="Uppsala">Uppsala</option>
                    <option value="Gotland">Gotland</option>
                    <option value="other">Other</option>
                  </SelectBase>
                </FieldGroup>
                <FieldGroup label="LinkedIn URL" requiredHint="Optional">
                  <InputBase placeholder="https://linkedin.com/in/..." value={form.linkedin || ''} onChange={(e) => setForm(f => ({ ...f, linkedin: e.target.value }))} />
                </FieldGroup>
                <FieldGroup label="GitHub URL" requiredHint="Optional">
                  <InputBase placeholder="https://github.com/username" value={form.github || ''} onChange={(e) => setForm(f => ({ ...f, github: e.target.value }))} />
                </FieldGroup>
                <FieldGroup label="Website" requiredHint="Optional">
                  <InputBase placeholder="https://example.com" value={form.website || ''} onChange={(e) => setForm(f => ({ ...f, website: e.target.value }))} />
                </FieldGroup>
              </div>

              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Academic Information</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <FieldGroup label="University" requiredHint="Required if student.">
                  <SelectBase value={form.university ?? 'Uppsala'} onChange={(e) => setForm(f => ({ ...f, university: e.target.value as 'Uppsala' | 'none' | 'other' }))}>
                    <option value="Uppsala">Uppsala</option>
                    <option value="none">None</option>
                    <option value="other">Other</option>
                  </SelectBase>
                </FieldGroup>
                <FieldGroup label="Program / Major" requiredHint="Required if student.">
                  <InputBase placeholder="e.g. Computer Science" value={form.program || ''} onChange={(e) => setForm(f => ({ ...f, program: e.target.value }))} />
                </FieldGroup>
                <FieldGroup label="Expected Graduation Year" requiredHint="Optional">
                  <InputBase placeholder="e.g. 2026" type="number" value={form.expectedGraduationYear ?? ''} onChange={(e) => setForm(f => ({ ...f, expectedGraduationYear: e.target.value ? Number(e.target.value) : undefined }))} />
                </FieldGroup>
                <FieldGroup label="Gender" requiredHint="Optional">
                  <SelectBase value={form.gender || 'other'} onChange={(e) => setForm(f => ({ ...f, gender: e.target.value }))}>
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
                <TextareaBase placeholder="Write a short bio" value={form.bio || ''} onChange={(e) => setForm(f => ({ ...f, bio: e.target.value }))} />
              </FieldGroup>
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 text-gray-800 dark:text-gray-200">
                  <input type="checkbox" checked={!!form.newsletter} onChange={(e) => setForm(f => ({ ...f, newsletter: e.target.checked }))} />
                  Subscribe to newsletter
                </label>
                <label className="flex items-center gap-2 text-gray-800 dark:text-gray-200">
                  <input type="checkbox" checked={!!form.lookingForJob} onChange={(e) => setForm(f => ({ ...f, lookingForJob: e.target.checked }))} />
                  Looking for job opportunities
                </label>
              </div>
              <div className="flex flex-col gap-3 pt-2">
                <label className="flex items-center gap-2 text-gray-800 dark:text-gray-200">
                  <input type="checkbox" checked={privacyAccepted} onChange={(e) => setPrivacyAccepted(e.target.checked)} />
                  I accept the <a className="underline" href="/privacy" target="_blank" rel="noreferrer">Privacy Policy</a> (required)
                </label>
                <label className="flex items-center gap-2 text-gray-800 dark:text-gray-200">
                  <input type="checkbox" checked={!!form.marketingOptIn} onChange={(e) => setForm(f => ({ ...f, marketingOptIn: e.target.checked }))} />
                  Allow marketing communications
                </label>
                <label className="flex items-center gap-2 text-gray-800 dark:text-gray-200">
                  <input type="checkbox" checked={!!form.analyticsOptIn} onChange={(e) => setForm(f => ({ ...f, analyticsOptIn: e.target.checked }))} />
                  Allow anonymous analytics
                </label>
                <label className="flex items-center gap-2 text-gray-800 dark:text-gray-200">
                  <input type="checkbox" checked={!!form.partnerContactOptIn} onChange={(e) => setForm(f => ({ ...f, partnerContactOptIn: e.target.checked }))} />
                  Allow contact from partner companies
                </label>
              </div>
              <div className="flex justify-end">
                <Button disabled={saving || !privacyAccepted} onClick={handleSave}>{saving ? 'Saving...' : 'Save & Become Member'}</Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Already a member?</h2>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 dark:text-gray-300">Manage your profile and linked accounts at <Link href="/account">/account</Link>. Your event applications appear there as well.</p>
          </CardContent>
        </Card>
      </div>

      <style jsx global>{`
        .input { @apply w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white; }
      `}</style>
    </div>
  );
};

export default JoinPage;