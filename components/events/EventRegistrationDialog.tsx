"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { X } from "lucide-react";
import { Event, EventCustomQuestion } from "@/types";
import {
  registerForEvent,
  getMyRegistrations,
  cancelRegistration,
  confirmRegistration,
} from "@/lib/firestore/registrations";
import { subscribeToEventCustomQuestions } from "@/lib/firestore/questions";
import { getUserProfile, type UserProfile } from "@/lib/firestore/users";
import { auth } from "@/lib/firebase-client";
import { useNotify } from "@/components/ui/Notifications";
import ConfirmModal from "@/components/ui/ConfirmModal";

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
  const [canApply, SetCanApply] = useState(false);
  const [customQuestions, setCustomQuestions] = useState<EventCustomQuestion[]>(
    []
  );
  const [customAnswers, setCustomAnswers] = useState<
    Record<string, string | string[]>
  >({});
  const [uid, setUid] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [alreadyRegistered, setAlreadyRegistered] = useState<null | {
    status: string;
    regId: string;
    token?: string | null;
  }>(null);
  const { notify } = useNotify();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [formData, setFormData] = useState<RegistrationFormData>({
    additionalInfo: "",
  });

  // Subscribe to event-specific custom questions
  useEffect(() => {
    const unsub = subscribeToEventCustomQuestions(event.id, (qs) => {
      setCustomQuestions(qs);
    });
    return () => {
      if (typeof unsub === "function") unsub();
    };
  }, [event.id]);

  // Auth + profile + my registrations
  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (u) => {
      if (!u) {
        setUid(null);
        setProfile(null);
        setAlreadyRegistered(null);
        return;
      }
      setUid(u.uid);
      const p = await getUserProfile(u.uid);
      setProfile(p);
      try {
        const regs = await getMyRegistrations(u.uid);
        const mine = regs.find(
          (r) =>
            r.eventId === event.id &&
            r.status !== "cancelled" &&
            r.status !== "declined"
        );
        if (mine) setAlreadyRegistered({ status: mine.status, regId: mine.id, token: mine.confirmationToken ?? null });
        else setAlreadyRegistered(null);
      } catch {
        setAlreadyRegistered(null);
      }
    });
    return () => unsub();
  }, [event.id]);

  useEffect(() => {
    if (!uid || !profile?.isMember) {
      SetCanApply(false);
      return;
    }
    SetCanApply(true);
  }, [uid, profile]);

  const handleCustomAnswerChange = (
    q: EventCustomQuestion,
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const target = e.target as
      | HTMLInputElement
      | HTMLTextAreaElement
      | HTMLSelectElement;
    if (q.type === "checkbox") {
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

    try {
      if (!uid || !profile?.isMember) {
        throw new Error("You must be a signed-in member to apply.");
      }
      // Validate required custom questions
      for (const q of customQuestions) {
        if (!q.required) continue;
        const ans = customAnswers[q.id];
        const missing =
          ans === undefined ||
          ans === "" ||
          (Array.isArray(ans) && ans.length === 0);
        if (missing) {
          notify({
            type: "warning",
            title: "Missing answer",
            message: `Please answer: ${q.question}`,
          });
          setIsSubmitting(false);
          return;
        }
      }

      const registrationData = {
        additionalInfo: formData.additionalInfo,
        // Map custom answers by question text for readability
        ...customQuestions.reduce((acc, q) => {
          const value = customAnswers[q.id];
          if (value !== undefined) {
            acc[q.question] = value as string | string[];
          }
          return acc;
        }, {} as Record<string, string | string[]>),
      } as const;

      await registerForEvent(
        event.id,
        {
          registrationData,
          userId: uid,
          userEmail: profile?.email || undefined,
          userName:
            (profile?.displayName || profile?.name || "").trim() || undefined,
        },
        { waitlist: isWaitlistOnly }
      );

      // Reset form and close dialog
      setFormData({
        additionalInfo: "",
      });
      setIsOpen(false);

      // Show success message via notification
      notify({
        type: "success",
        title: isWaitlistOnly ? "Waitlist joined" : "Registration successful",
        message: isWaitlistOnly
          ? "You have been added to the waitlist. We will contact you if a spot opens."
          : "You are registered for the event.",
      });
      if(isWaitlistOnly){
        setAlreadyRegistered({ status: "waitlist", regId: "" });
      }else{
        setAlreadyRegistered({ status: "registered", regId: "" });
      }
    } catch (error) {
      console.error("Registration failed:", error);
      const msg = error instanceof Error ? error.message : String(error);
      notify({ type: "error", title: "Registration failed", message: msg });
    } finally {
      setIsSubmitting(false);
    }
  };
  const isPastEvent = new Date(event.eventStartAt) < new Date();
  if (isPastEvent) {
    return (
      <>
        <p className="text-red-500">This event has already passed.</p>
      </>
    );
  }

  const isCapacityFull =
    typeof event.maxCapacity === "number" &&
    (event.currentRegistrations || 0) >= event.maxCapacity;
  const isAfterLastRegistration =
    typeof event.registrationClosesAt === "string" && event.registrationClosesAt
      ? new Date().getTime() > new Date(event.registrationClosesAt).getTime()
      : false;
  const isWaitlistOnly = isCapacityFull || isAfterLastRegistration;

  return (
    <>
      {alreadyRegistered ? (
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded px-3 py-2">
          <div>
            {alreadyRegistered.status == "invited" &&
              "You have been invited to this event."}
            {alreadyRegistered.status === "waitlist" &&
              "You have already joined the waitlist"}
            {alreadyRegistered.status === "registered" &&
              "You have already registered for this event."}
            {alreadyRegistered.status === "confirmed" &&
              "Your spot is confirmed."}
          </div>
          <div className="flex items-center gap-2">
            {(alreadyRegistered.status === 'registered' || alreadyRegistered.status === 'waitlist' || alreadyRegistered.status === 'invited') && (
              <Button
                variant="outline"
                onClick={() => setConfirmOpen(true)}
              >
                Cancel
              </Button>
            )}
            {alreadyRegistered.status === 'invited' && (
              <Button
                className="bg-green-600 text-white"
                onClick={async () => {
                  try {
                    if (!alreadyRegistered.token) throw new Error('Missing confirmation token. Please contact us if you have problems confirming your spot.');
                    const res = await confirmRegistration(alreadyRegistered.regId, alreadyRegistered.token);
                    if (!res.ok) throw new Error(res.message);
                    setAlreadyRegistered({ ...alreadyRegistered, status: 'confirmed' });
                    notify({ type: 'success', title: 'Confirmed', message: 'Your spot has been confirmed.' });
                  } catch (e) {
                    const msg = e instanceof Error ? e.message : 'Could not confirm. Please contact us if you have problems confirming your spot.';
                    notify({ type: 'error', title: 'Confirm failed', message: msg });
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
          className={`${
            isWaitlistOnly
              ? "bg-orange-600 hover:bg-orange-700"
              : "bg-blue-600 hover:bg-blue-700"
          } text-white`}
          onClick={() => setIsOpen(true)}
        >
          {isWaitlistOnly ? "Join Waitlist" : "Register Now"}
        </Button>
      ) : (
        <div className="text-sm text-gray-700 dark:text-gray-300">
          Please sign in and become a member to register for this event.
          <Link href="/account" className="text-blue-600 dark:text-blue-400 underline ml-1">
            Login / Create account
          </Link>
        </div>
      )}

      {isOpen && !alreadyRegistered && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <Card className="border-0 shadow-none dark:bg-gray-800">
              <CardHeader className="pb-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                      {isCapacityFull ? "Join Waitlist" : "Register for Event"}
                    </h2>
                    <p className="text-gray-600 dark:text-gray-300 mt-1">
                      {event.title}
                    </p>
                  </div>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
              </CardHeader>

              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Event-specific Custom Questions */}
                  {customQuestions.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        Event Questions
                      </h3>
                      <div className="space-y-4">
                        {customQuestions.map((q) => (
                          <div key={q.id}>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              {q.question}{" "}
                              {q.required && (
                                <span className="text-red-500">*</span>
                              )}
                            </label>
                            {q.type === "text" && (
                              <input
                                type="text"
                                value={(customAnswers[q.id] as string) || ""}
                                onChange={(e) => handleCustomAnswerChange(q, e)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                              />
                            )}
                            {q.type === "textarea" && (
                              <textarea
                                value={(customAnswers[q.id] as string) || ""}
                                onChange={(e) => handleCustomAnswerChange(q, e)}
                                rows={3}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                              />
                            )}
                            {q.type === "select" && (
                              <select
                                value={(customAnswers[q.id] as string) || ""}
                                onChange={(e) => handleCustomAnswerChange(q, e)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                              >
                                <option value="">Select an option</option>
                                {(q.options || []).map((opt) => (
                                  <option key={opt} value={opt}>
                                    {opt}
                                  </option>
                                ))}
                              </select>
                            )}
                            {q.type === "radio" && (
                              <div className="space-y-2">
                                {(q.options || []).map((opt) => (
                                  <label
                                    key={opt}
                                    className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"
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
                            {q.type === "checkbox" && (
                              <div className="space-y-1">
                                {(q.options && q.options.length > 0
                                  ? q.options
                                  : ["Yes"]
                                ).map((opt) => {
                                  const arr =
                                    (customAnswers[q.id] as
                                      | string[]
                                      | undefined) || [];
                                  const checked = arr.includes(opt);
                                  return (
                                    <label
                                      key={opt}
                                      className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"
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
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* Submit Button */}
                  <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-600">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsOpen(false)}
                      disabled={isSubmitting}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      {isSubmitting
                        ? "Submitting..."
                        : isWaitlistOnly
                        ? "Join Waitlist"
                        : "Register"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
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
            notify({ type: 'success', title: 'Cancelled', message: 'Your registration has been cancelled.' });
          } catch (e) {
            const msg = e instanceof Error ? e.message : 'Could not cancel. Please contact us if you have problems unregistering for the event.';
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
