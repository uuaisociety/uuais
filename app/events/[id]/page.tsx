"use client";
// setState in useEffect is intentional - need to check eligibility based on props before async check
/* eslint-disable react-hooks/set-state-in-effect */

import React, { useEffect, useState } from "react";
import DOMPurify from 'dompurify';
import { notFound, useParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ArrowLeft, Calendar, Clock, MapPin, Users, Tag } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { format } from "date-fns";
import EventRegistrationDialog from "@/components/events/EventRegistrationDialog";
import { useApp } from "@/contexts/AppContext";

import campus from "@/public/images/campus.png";
import { incrementEventUniqueClick } from "@/lib/firestore/analytics";
import { auth } from "@/lib/firebase-client";
import { getMyRegistrationForEvent } from "@/lib/firestore/registrations";
import QRCode from "react-qr-code";

const categoryOptions = [
  { value: "all", label: "All Categories" },
  { value: "workshop", label: "Workshop" },
  { value: "guest_lecture", label: "Guest Lecture" },
  { value: "hackathon", label: "Hackathon" },
  { value: "other", label: "Other" },
];
const EventDetailPage: React.FC = () => {
  const params = useParams();
  const eventId = params.id as string;
  const { state } = useApp();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [hasEligibleRegistration, setHasEligibleRegistration] = useState(false);

  // Increment unique event click on mount
  useEffect(() => {
    if (eventId) {
      incrementEventUniqueClick(eventId).catch(() => {});
    }
  }, [eventId]);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => {
      setCurrentUserId(u ? u.uid : null);
    });
    return () => unsub();
  }, []);

  const event = state.events.find((e) => e.id === eventId);

  useEffect(() => {
    if (!currentUserId || !eventId || !event || !event.eventStartAt) {
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

  // Show loading state while events are being fetched the first time
  if (state.events.length === 0) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 py-12 pt-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
            <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
          </div>
        </div>
      </div>
    );
  }

  if (!event) {
    notFound();
  }

  const eventStart = new Date(event.eventStartAt);
  const now = new Date();
  const isUpcoming = eventStart > now;
  const isPastEvent = eventStart < now;
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 py-12 pt-24">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <Link href="/events">
          <Button className="mb-8" icon={ArrowLeft}>
            Back to Events
          </Button>
        </Link>

        {/* Event Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between mb-4">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
              {event.title}
            </h1>
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                isUpcoming
                  ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                  : isPastEvent
                  ? "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
                  : "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
              }`}
            >
              {isUpcoming ? "Upcoming" : isPastEvent ? "Past Event" : "Today"}
            </span>
          </div>

          <div className="grid md:grid-cols-2 gap-4 text-gray-600 dark:text-gray-300 mb-6">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              <span>
                {format(new Date(event.eventStartAt), "EEEE, MMMM dd, yyyy")}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              <span>{format(new Date(event.eventStartAt), "HH:mm")}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              <span>{event.location}</span>
            </div>
            {event.category && (
              <div className="flex items-center gap-2">
                <Tag className="w-5 h-5" />
                <span className="capitalize">{event.category}</span>
              </div>
            )}
          </div>

          {/* Registration Info */}
          {event.registrationRequired && isUpcoming && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between pb-2">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <span className="text-blue-800 dark:text-blue-200 font-medium">
                    Registration Required
                  </span>
                </div>
                {typeof event.maxCapacity === "number" && (
                  <div className="text-blue-600 dark:text-blue-400">
                    Capacity: {event.maxCapacity}
                  </div>
                )}
              </div>
              <EventRegistrationDialog event={event} />
            </div>
          )}
          {currentUserId && hasEligibleRegistration && (
            <div className="mt-4 flex justify-center">
              <div className="mt-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg inline-block bg-white dark:bg-gray-800">
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
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
        </div>

        {/* Featured Image */}
        {event.image && (
          <div className="mb-8">
            <Image
              src={event.image || campus}
              alt={event.title}
              width={800}
              height={400}
              className="w-full h-64 sm:h-80 md:h-96 object-cover rounded-lg shadow-lg"
            />
          </div>
        )}

        {/* Event Description */}
        <Card className="h-full dark:bg-gray-800 pt-4">
          <CardContent className="pt-4 pb-6 pl-6 pr-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              About This Event
            </h2>
            {/<\/?[a-z][\s\S]*>/i.test(event.description || '') ? (
              <div
                className="prose prose-lg max-w-none dark:prose-invert prose-headings:text-gray-900 dark:prose-headings:text-white prose-p:text-gray-700 dark:prose-p:text-gray-300"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(event.description || '') }}
              />
            ) : (
              <div className="prose prose-lg max-w-none dark:prose-invert prose-headings:text-gray-900 dark:prose-headings:text-white prose-p:text-gray-700 dark:prose-p:text-gray-300 whitespace-pre-wrap">
                {event.description}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Event Details */}
        <div className="grid md:grid-cols-2 gap-8 mt-8">
          <Card className="h-full dark:bg-gray-800 pt-4">
            <CardContent className="pt-4">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                Event Details
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-300">
                    Date:
                  </span>
                  <span className="text-gray-900 dark:text-white font-medium">
                    {format(new Date(event.eventStartAt), "MMM dd, yyyy")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-300">
                    Time:
                  </span>
                  <span className="text-gray-900 dark:text-white font-medium">
                    {format(new Date(event.eventStartAt), "HH:mm")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-300">
                    Location:
                  </span>
                  <span className="text-gray-900 dark:text-white font-medium">
                    {event.location}
                  </span>
                </div>
                {event.category && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-300">
                      Category:
                    </span>
                    <span className="text-gray-900 dark:text-white font-medium capitalize">
                      {categoryOptions.find(
                        (option) => option.value === event.category
                      )?.label || event.category}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {event.registrationRequired && (
            <Card className="h-full dark:bg-gray-800 pt-4">
              <CardContent className="pt-4">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                  Registration
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-300">
                      Capacity:
                    </span>
                    <span className="text-gray-900 dark:text-white font-medium">
                      {event.maxCapacity || "TBA"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Related Events */}
        <div className="mt-12 ">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            Other Upcoming Events
          </h3>
          <div className="grid md:grid-cols-2 gap-6 ">
            {state.events
              .filter(
                (e) => e.id !== eventId && new Date(e.eventStartAt) > new Date()
              )
              .slice(0, 2)
              .map((relatedEvent) => (
                <Card
                  key={relatedEvent.id}
                  className="hover:shadow-lg transition-shadow dark:bg-gray-800 pt-4"
                >
                  <CardContent className="pt-4">
                    {relatedEvent.image && (
                      <Image
                        src={relatedEvent.image || campus}
                        alt={relatedEvent.title}
                        width={300}
                        height={200}
                        className="w-full h-32 object-cover rounded-lg mb-4"
                      />
                    )}
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      {relatedEvent.title}
                    </h4>
                    <div className="text-gray-600 dark:text-gray-300 text-sm mb-4 space-y-1">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>
                          {format(
                            new Date(relatedEvent.eventStartAt),
                            "MMM dd, yyyy"
                          )}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        <span>{relatedEvent.location}</span>
                      </div>
                    </div>
                    <Link href={`/events/${relatedEvent.id}`}>
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventDetailPage;
