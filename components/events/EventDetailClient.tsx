"use client";
// setState in useEffect is intentional - need to check eligibility based on props before async check
/* eslint-disable react-hooks/set-state-in-effect */

import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/Button";
import { Users, ExternalLink } from "lucide-react";
import Link from "next/link";
import EventRegistrationDialog from "@/components/events/EventRegistrationDialog";
import { incrementEventUniqueClick, incrementExternalRegistrationClick } from "@/lib/firestore/analytics";
import { auth } from "@/lib/firebase-client";
import { getMyRegistrationForEvent } from "@/lib/firestore/registrations";
import QRCode from "react-qr-code";
import type { Event } from "@/types";
import { loginUrl } from "@/lib/login-redirect";

interface EventDetailClientProps {
  event: Event;
  relatedEvents: Event[];
}

export default function EventDetailClient({ event }: EventDetailClientProps) {
  const eventId = event.id;
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [hasEligibleRegistration, setHasEligibleRegistration] = useState(false);

  // Increment unique event click on mount
  useEffect(() => {
    incrementEventUniqueClick(eventId).catch(() => {});
  }, [eventId]);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => {
      setCurrentUserId(u ? u.uid : null);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!currentUserId || !eventId || !event.eventStartAt) {
      setHasEligibleRegistration(false);
      return;
    }
    (async () => {
      try {
        const reg = await getMyRegistrationForEvent(currentUserId, eventId);
        if (!reg) {
          setHasEligibleRegistration(false);
          return;
        }
        const status = reg.status;
        const eventStartMs = new Date(event.eventStartAt).getTime();
        const withinWindow = Math.abs(eventStartMs - Date.now()) <= 48 * 60 * 60 * 1000;
        const eligibleStatus = status === "registered" || status === "confirmed";
        setHasEligibleRegistration(eligibleStatus && withinWindow);
      } catch {
        setHasEligibleRegistration(false);
      }
    })();
  }, [currentUserId, eventId, event]);

  const eventStart = new Date(event.eventStartAt);
  const now = new Date();
  const isUpcoming = eventStart > now;

  return (
    <>
      {/* Registration Info */}
      {event.registrationRequired && isUpcoming && (
        <div className="border-border bg-primary/10 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between pb-2">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              <span className="text-foreground font-medium">
                Registration Required
              </span>
            </div>
            {typeof event.maxCapacity === "number" && (
              <div className="text-primary">
                Capacity: {event.maxCapacity}
              </div>
            )}
          </div>
          <EventRegistrationDialog event={event} />
        </div>
      )}

      {isUpcoming && event.externalRegistrationUrl?.trim() && (
        <div className="border border-border rounded-lg p-4 mb-6 bg-card/50">
          <p className="text-sm font-medium text-foreground mb-3">
            External registration
          </p>
          {event.externalRegistrationMembersOnly && !currentUserId ? (
            <div className="space-y-2">
              <button
                type="button"
                disabled
                aria-disabled="true"
                className={cn(
                  buttonVariants({ variant: "outline", size: "default" }),
                  "w-full sm:w-auto opacity-70 cursor-not-allowed"
                )}
              >
                Login to register
              </button>
              <p className="text-xs text-muted-foreground">
                <Link
                  href={loginUrl(`/events/${eventId}`)}
                  className="text-primary font-medium underline hover:no-underline"
                >
                  Sign in
                </Link>{" "}
                to open the registration page.
              </p>
            </div>
          ) : (
            <a
              href={event.externalRegistrationUrl.trim()}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => incrementExternalRegistrationClick(eventId).catch(() => {})}
              className={cn(
                buttonVariants({ variant: "outline", size: "default" }),
                "inline-flex no-underline text-primary hover:text-primary hover:underline"
              )}
            >
              <span className="mr-2">Register externally</span>
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
        </div>
      )}

      {currentUserId && hasEligibleRegistration && (
        <div className="mt-4 flex justify-center">
          <div className="mt-4 p-4 border border-border rounded-lg inline-block bg-card">
            <p className="text-sm text-foreground mb-3">
              Show this QR code to the event organizer. They will scan it to record your attendance.
            </p>
            <div className="p-3 rounded-md justify-center items-center text-center m-0 ml-auto mr-auto">
              <div className="bg-white inline-block p-3 rounded-md">
                <QRCode
                  value={`${process.env.NEXT_PUBLIC_SITE_URL || (typeof window !== 'undefined' ? window.location.origin : '')}/checkin?eventId=${eventId}&userId=${currentUserId}`}
                  size={240}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
