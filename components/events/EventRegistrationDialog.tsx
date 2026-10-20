'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import PDFDropzone from '@/components/ui/PDFDropzone';
import { Event, EventCustomQuestion, UploadedFileRef } from '@/types';
import {
  registerForEvent,
  getMyRegistrationForEvent,
  getMyRegistrations,
  cancelRegistration,
  confirmRegistration,
} from '@/lib/firestore/registrations';
import { subscribeToEventCustomQuestions } from '@/lib/firestore/questions';
import { uploadRegistrationFile } from '@/lib/registration-files';
import { profilePrefillValue } from '@/lib/registration-prefill';
import { getUserProfile, type UserProfile } from '@/lib/firestore/users';
import { auth } from '@/lib/firebase-client';
import { useNotify } from '@/components/ui/Notifications';
import ConfirmModal from '@/components/ui/ConfirmModal';

interface EventRegistrationDialogProps {
  event: Event;
}

interface RegistrationFormData {
  additionalInfo: string;
}

const EventRegistrationDialog: React.FC<EventRegistrationDialogProps> = ({
  event,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customQuestions, setCustomQuestions] = useState<EventCustomQuestion[]>(
    [],
  );
  const [customAnswers, setCustomAnswers] = useState<
    Record<string, string | string[]>
  >({});
  const [customFiles, setCustomFiles] = useState<Record<string, File | null>>(
    {},
  );
  const [uid, setUid] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const prefillOwnerRef = useRef<string | null>(null);
  const prefilledQuestionsRef = useRef<Set<string>>(new Set());
  const answersRef = useRef<Record<string, string | string[]>>({});
  const questionsRef = useRef<EventCustomQuestion[]>([]);
  const profileRef = useRef<UserProfile | null>(null);
  const openRef = useRef(false);
  const [alreadyRegistered, setAlreadyRegistered] = useState<null | {
    status: string;
    regId: string;
    token?: string | null;
  }>(null);
  const { notify } = useNotify();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [formData, setFormData] = useState<RegistrationFormData>({
    additionalInfo: '',
  });

  // Keep the ref in sync for callbacks that run outside the render cycle.
  useEffect(() => {
    answersRef.current = customAnswers;
  }, [customAnswers]);

  // Pre-fill empty answers from the member's profile when a question maps to a
  // known field (e.g. "Name", "Email", "Program/Major"). Never overwrites input.
  // Called from handlers/subscriptions (not an effect) so state updates stay
  // pure and safe under StrictMode's double-invoked updaters.
  const applyPrefill = useCallback(
    (qs: EventCustomQuestion[], p: UserProfile | null) => {
      if (!openRef.current || !p || qs.length === 0) return;
      if (prefillOwnerRef.current !== p.id) {
        prefillOwnerRef.current = p.id;
        prefilledQuestionsRef.current = new Set();
      }
      const current = answersRef.current;
      let next: Record<string, string | string[]> | null = null;
      for (const q of qs) {
        if (prefilledQuestionsRef.current.has(q.id)) continue;
        const answer = current[q.id];
        const isEmpty =
          answer === undefined ||
          answer === '' ||
          (Array.isArray(answer) && answer.length === 0);
        if (!isEmpty) continue;
        const value = profilePrefillValue(q, p);
        if (value === undefined) continue;
        next = next || { ...current };
        next[q.id] = value;
        prefilledQuestionsRef.current.add(q.id);
      }
      if (next) {
        answersRef.current = next;
        setCustomAnswers(next);
      }
    },
    [],
  );

  // Subscribe to event-specific custom questions
  useEffect(() => {
    const unsub = subscribeToEventCustomQuestions(event.id, (qs) => {
      questionsRef.current = qs;
      setCustomQuestions(qs);
      applyPrefill(qs, profileRef.current);
    });
    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, [event.id, applyPrefill]);

  // Auth + profile + my registrations
  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (u) => {
      if (!u) {
        profileRef.current = null;
        setUid(null);
        setProfile(null);
        setAlreadyRegistered(null);
        return;
      }
      setUid(u.uid);
      const p = await getUserProfile(u.uid);
      profileRef.current = p;
      setProfile(p);
      applyPrefill(questionsRef.current, p);
      try {
        const regs = await getMyRegistrations(u.uid);
        const mine = regs.find(
          (r) =>
            r.eventId === event.id &&
            r.status !== 'cancelled' &&
            r.status !== 'declined',
        );
        if (mine)
          setAlreadyRegistered({
            status: mine.status,
            regId: mine.id,
            token: mine.confirmationToken ?? null,
          });
        else setAlreadyRegistered(null);
      } catch {
        setAlreadyRegistered(null);
      }
    });
    return () => unsub();
  }, [event.id, applyPrefill]);

  const openDialog = () => {
    openRef.current = true;
    setIsOpen(true);
    applyPrefill(customQuestions, profile);
  };

  const closeDialog = () => {
    openRef.current = false;
    setIsOpen(false);
    setCustomAnswers({});
    setCustomFiles({});
    setFormData({ additionalInfo: '' });
    prefilledQuestionsRef.current = new Set();
  };

  const canApply = Boolean(uid && profile?.isMember);

  const isAnswered = (q: EventCustomQuestion): boolean => {
    if (q.type === 'file') return Boolean(customFiles[q.id]);
    const ans = customAnswers[q.id];
    return !(
      ans === undefined ||
      ans === '' ||
      (Array.isArray(ans) && ans.length === 0)
    );
  };

  const handleCustomAnswerChange = (
    q: EventCustomQuestion,
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const target = e.target as
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
    if (q.type === 'checkbox') {
      // For checkbox group, maintain array
      const option = target.value;
      const checked = (target as HTMLInputElement).checked;
      setCustomAnswers((prev) => {
        const current = (prev[q.id] as string[] | undefined) || [];
        const next = checked
          ? Array.from(new Set([...current, option]))
          : current.filter((o) => o !== option);
        return { ...prev, [q.id]: next };
      });
    } else {
      setCustomAnswers((prev) => ({ ...prev, [q.id]: target.value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const uploadedRefs: UploadedFileRef[] = [];

    try {
      if (!uid || !profile?.isMember) {
        throw new Error('You must be a signed-in member to apply.');
      }
      // Validate required custom questions
      for (const q of customQuestions) {
        if (!q.required) continue;
        if (!isAnswered(q)) {
          notify({
            type: 'warning',
            title: 'Missing answer',
            message: `Please answer: ${q.question}`,
          });
          setIsSubmitting(false);
          return;
        }
      }

      // Upload file answers first so the registration stores a stable reference.
      const uploadedFiles: Record<string, UploadedFileRef> = {};
      for (const q of customQuestions) {
        const file = customFiles[q.id];
        if (q.type === 'file' && file) {
          const ref = await uploadRegistrationFile(event.id, file);
          uploadedFiles[q.question] = ref;
          uploadedRefs.push(ref);
        }
      }

      const registrationData = {
        additionalInfo: formData.additionalInfo,
        // Map custom answers by question text for readability
        ...customQuestions.reduce(
          (acc, q) => {
            const value =
              q.type === 'file'
                ? uploadedFiles[q.question]
                : customAnswers[q.id];
            if (value !== undefined) {
              acc[q.question] = value;
            }
            return acc;
          },
          {} as Record<string, string | string[] | UploadedFileRef>,
        ),
      } as const;

      const regId = await registerForEvent(
        event.id,
        {
          registrationData,
          userId: uid,
          userEmail: profile?.email || undefined,
          userName:
            (profile?.displayName || profile?.name || '').trim() || undefined,
        },
        { waitlist: isWaitlistOnly },
      );

      const stored = await getMyRegistrationForEvent(uid, event.id).catch(
        () => null,
      );

      // Reset form and close dialog
      setFormData({
        additionalInfo: '',
      });
      setCustomFiles({});
      setCustomAnswers({});
      prefilledQuestionsRef.current = new Set();
      openRef.current = false;
      setIsOpen(false);

      // Show success message via notification
      notify({
        type: 'success',
        title: isWaitlistOnly ? 'Waitlist joined' : 'Registration successful',
        message: isWaitlistOnly
          ? 'You have been added to the waitlist. We will contact you if a spot opens.'
          : 'You are registered for the event.',
      });
      setAlreadyRegistered({
        status: stored?.status || (isWaitlistOnly ? 'waitlist' : 'registered'),
        regId: stored?.id || regId,
        token: stored?.confirmationToken,
      });
    } catch (error) {
      if (uploadedRefs.length > 0) {
        void Promise.all(
          uploadedRefs.map((ref) => {
            if (!ref.path) return Promise.resolve();
            return fetch(
              `/api/registrations/file?path=${encodeURIComponent(ref.path)}`,
              { method: 'DELETE' },
            ).catch(() => undefined);
          }),
        );
      }
      console.error('Registration failed:', error);
      const msg = error instanceof Error ? error.message : String(error);
      notify({ type: 'error', title: 'Registration failed', message: msg });
    } finally {
      setIsSubmitting(false);
    }
  };
  const isPastEvent = new Date(event.eventStartAt) < new Date();
  if (isPastEvent) {
    return (
      <>
        <p className="text-primary">This event has already passed.</p>
      </>
    );
  }

  const isCapacityFull =
    typeof event.maxCapacity === 'number' &&
    (event.currentRegistrations || 0) >= event.maxCapacity;
  const isAfterLastRegistration =
    typeof event.registrationClosesAt === 'string' && event.registrationClosesAt
      ? new Date().getTime() > new Date(event.registrationClosesAt).getTime()
      : false;
  const isWaitlistOnly = isCapacityFull || isAfterLastRegistration;

  return (
    <>
      {alreadyRegistered ? (
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-foreground bg-card/70 border border-border rounded px-3 py-2">
          <div>
            {alreadyRegistered.status == 'invited' &&
              'You have been invited to this event.'}
            {alreadyRegistered.status === 'waitlist' &&
              'You have already joined the waitlist'}
            {alreadyRegistered.status === 'registered' &&
              'You have already registered for this event.'}
            {alreadyRegistered.status === 'confirmed' &&
              'Your spot is confirmed.'}
          </div>
          <div className="flex items-center gap-2">
            {(alreadyRegistered.status === 'registered' ||
              alreadyRegistered.status === 'waitlist' ||
              alreadyRegistered.status === 'invited') && (
              <Button onClick={() => setConfirmOpen(true)}>Cancel</Button>
            )}
            {alreadyRegistered.status === 'invited' && (
              <Button
                className="bg-primary hover:brightness-110"
                onClick={async () => {
                  try {
                    if (!alreadyRegistered.token)
                      throw new Error(
                        'Missing confirmation token. Please contact us if you have problems confirming your spot.',
                      );
                    const res = await confirmRegistration(
                      alreadyRegistered.regId,
                      alreadyRegistered.token,
                    );
                    if (!res.ok) throw new Error(res.message);
                    setAlreadyRegistered({
                      ...alreadyRegistered,
                      status: 'confirmed',
                    });
                    notify({
                      type: 'success',
                      title: 'Confirmed',
                      message: 'Your spot has been confirmed.',
                    });
                  } catch (e) {
                    const msg =
                      e instanceof Error
                        ? e.message
                        : 'Could not confirm. Please contact us if you have problems confirming your spot.';
                    notify({
                      type: 'error',
                      title: 'Confirm failed',
                      message: msg,
                    });
                  }
                }}
              >
                Confirm spot
              </Button>
            )}
          </div>
        </div>
      ) : canApply ? (
        <Button
          className={
            isWaitlistOnly
              ? 'border border-primary text-primary hover:bg-primary/10'
              : 'bg-primary text-white hover:brightness-110'
          }
          onClick={openDialog}
        >
          {isWaitlistOnly ? 'Join Waitlist' : 'Register Now'}
        </Button>
      ) : (
        <div className="text-sm text-foreground">
          Please sign in and become a member to register for this event.
          <Link href="/account" className="text-primary underline ml-1">
            Login / Create account
          </Link>
        </div>
      )}

      {isOpen && !alreadyRegistered && (
        <Modal
          open={isOpen}
          onClose={closeDialog}
          title={isWaitlistOnly ? 'Join Waitlist' : 'Register for Event'}
          description={event.title}
          size="md"
        >
          <Card className="border-0 shadow-none bg-card">
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Event-specific Custom Questions */}
                {customQuestions.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-4">
                      Event Questions
                    </h3>
                    <div className="space-y-4">
                      {customQuestions.map((q) => (
                        <div key={q.id}>
                          {q.type !== 'radio' &&
                          q.type !== 'checkbox' &&
                          q.type !== 'file' ? (
                            <label
                              htmlFor={`cq_${q.id}`}
                              className="block text-sm font-medium text-foreground mb-1"
                            >
                              {q.question}{' '}
                              {q.required && (
                                <>
                                  <span
                                    className="text-primary"
                                    aria-hidden="true"
                                  >
                                    *
                                  </span>
                                  <span className="sr-only"> (required)</span>
                                </>
                              )}
                            </label>
                          ) : (
                            <p
                              id={`cq_${q.id}_group`}
                              className="block text-sm font-medium text-foreground mb-1"
                            >
                              {q.question}{' '}
                              {q.required && (
                                <>
                                  <span
                                    className="text-primary"
                                    aria-hidden="true"
                                  >
                                    *
                                  </span>
                                  <span className="sr-only"> (required)</span>
                                </>
                              )}
                            </p>
                          )}
                          {q.type === 'text' && (
                            <input
                              id={`cq_${q.id}`}
                              type="text"
                              value={(customAnswers[q.id] as string) || ''}
                              onChange={(e) => handleCustomAnswerChange(q, e)}
                              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-card text-foreground transition-colors duration-300"
                            />
                          )}
                          {q.type === 'textarea' && (
                            <textarea
                              id={`cq_${q.id}`}
                              value={(customAnswers[q.id] as string) || ''}
                              onChange={(e) => handleCustomAnswerChange(q, e)}
                              rows={3}
                              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-card text-foreground transition-colors duration-300"
                            />
                          )}
                          {q.type === 'select' && (
                            <select
                              id={`cq_${q.id}`}
                              value={(customAnswers[q.id] as string) || ''}
                              onChange={(e) => handleCustomAnswerChange(q, e)}
                              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-card text-foreground transition-colors duration-300"
                            >
                              <option value="">Select an option</option>
                              {(q.options || []).map((opt) => (
                                <option key={opt} value={opt}>
                                  {opt}
                                </option>
                              ))}
                            </select>
                          )}
                          {q.type === 'radio' && (
                            <div
                              className="space-y-2"
                              role="group"
                              aria-labelledby={`cq_${q.id}_group`}
                            >
                              {(q.options || []).map((opt) => (
                                <label
                                  key={opt}
                                  className="flex items-center gap-2 text-sm text-foreground"
                                >
                                  <input
                                    type="radio"
                                    name={`cq_${q.id}`}
                                    value={opt}
                                    checked={
                                      (customAnswers[q.id] as string) === opt
                                    }
                                    onChange={(e) =>
                                      handleCustomAnswerChange(q, e)
                                    }
                                  />
                                  {opt}
                                </label>
                              ))}
                            </div>
                          )}
                          {q.type === 'checkbox' && (
                            <div
                              className="space-y-1"
                              role="group"
                              aria-labelledby={`cq_${q.id}_group`}
                            >
                              {(q.options && q.options.length > 0
                                ? q.options
                                : ['Yes']
                              ).map((opt) => {
                                const arr =
                                  (customAnswers[q.id] as
                                    string[] | undefined) || [];
                                const checked = arr.includes(opt);
                                return (
                                  <label
                                    key={opt}
                                    className="flex items-center gap-2 text-sm text-foreground"
                                  >
                                    <input
                                      type="checkbox"
                                      value={opt}
                                      checked={checked}
                                      onChange={(e) =>
                                        handleCustomAnswerChange(q, e)
                                      }
                                    />
                                    {opt}
                                  </label>
                                );
                              })}
                            </div>
                          )}
                          {q.type === 'file' && (
                            <PDFDropzone
                              label={q.question}
                              file={customFiles[q.id] || null}
                              onChange={(f) =>
                                setCustomFiles((prev) => ({
                                  ...prev,
                                  [q.id]: f,
                                }))
                              }
                              onError={(msg) =>
                                notify({
                                  type: 'warning',
                                  title: 'Invalid file',
                                  message: msg,
                                })
                              }
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {/* Submit Button */}
                <p className="text-xs text-muted-foreground">
                  Your answers are shared with event organisers. Uploaded files
                  are deleted 60 days after the event and registration answers
                  after 36 months. See our{' '}
                  <Link
                    href="/privacy"
                    target="_blank"
                    rel="noreferrer"
                    className="underline"
                  >
                    Privacy Policy
                  </Link>
                  .
                </p>
                <div className="flex justify-end space-x-3 pt-4 border-t border-border">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={closeDialog}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-primary text-primary-foreground hover:brightness-110"
                  >
                    {isSubmitting
                      ? 'Submitting...'
                      : isWaitlistOnly
                        ? 'Join Waitlist'
                        : 'Register'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </Modal>
      )}

      {/* Confirm unregister modal */}
      <ConfirmModal
        open={confirmOpen}
        title="Unregister from event"
        description="Are you sure you want to unregister from this event?"
        confirmText="Yes, unregister"
        cancelText="Keep registration"
        onClose={() => setConfirmOpen(false)}
        onConfirm={async () => {
          try {
            await cancelRegistration(alreadyRegistered!.regId);
            setAlreadyRegistered(null);
            notify({
              type: 'success',
              title: 'Cancelled',
              message: 'Your registration has been cancelled.',
            });
          } catch (e) {
            const msg =
              e instanceof Error
                ? e.message
                : 'Could not cancel. Please contact us if you have problems unregistering for the event.';
            notify({ type: 'error', title: 'Cancel failed', message: msg });
          } finally {
            setConfirmOpen(false);
          }
        }}
      />
    </>
  );
};

export default EventRegistrationDialog;
