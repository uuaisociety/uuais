"use client";

import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Edit3, Eye, EyeOff, Plus, Trash2 } from "lucide-react";
import { EventCustomQuestion } from '@/types';
import { Event } from "@/types";
import Tag from "@/components/ui/Tag";
import EventModal, { type EventFormState } from '@/components/pages/admin/modals/EventModal';
import EventQuestionsModal from '@/components/pages/admin/modals/EventQuestionsModal';
import EventRegistrationsModal from '@/components/pages/admin/modals/EventRegistrationsModal';
import { useApp } from '@/contexts/AppContext';
import { addEvent } from '@/lib/firestore/events';
import { subscribeToEventCustomQuestions, addEventCustomQuestion, updateEventCustomQuestion, deleteEventCustomQuestion } from '@/lib/firestore/questions';

const categoryOptions = [
  { value: "all", label: "All Categorie" },
  { value: "workshop", label: "Workshop" },
  { value: "guest_lecture", label: "Guest Lecture" },
  { value: "hackathon", label: "Hackathon " },
  { value: "other", label: "Other" },
];

export interface EventsTabProps {
  events: Event[];
  onManageQuestions: (event: Event) => void;
  onViewRegistrations: (event: Event) => void;
}

const EventsTab: React.FC<EventsTabProps> = ({ events, onManageQuestions, onViewRegistrations }) => {
  const { dispatch } = useApp();
  const [showEventQModal, setShowEventQModal] = useState(false);
  const [activeEventForQuestions, setActiveEventForQuestions] = useState<Event | null>(null);
  const [eventQuestions, setEventQuestions] = useState<EventCustomQuestion[]>([]);
  const [showEventRegsModal, setShowEventRegsModal] = useState(false);
  const [activeEventForRegs, setActiveEventForRegs] = useState<Event | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Event | null>(null);
  const [eventForm, setEventForm] = useState<EventFormState>({
    title: '',
    description: '',
    location: '',
    image: '',
    category: 'workshop',
    registrationRequired: false,
    maxCapacity: undefined,
    eventStartAt: '',
    registrationClosesAt: '',
    publishAt: ''
  });

  useEffect(() => {
    // keep form defaults when opening modal to add
  }, []);

  const resetForms = () => {
    setEventForm({
      title: '',
      description: '',
      location: '',
      image: '',
      category: 'workshop',
      registrationRequired: false,
      maxCapacity: undefined,
      eventStartAt: '',
      registrationClosesAt: '',
      publishAt: ''
    });
    setEditingItem(null);
  };

  const handleAddClick = () => {
    resetForms();
    setShowEventModal(true);
  };

  const handleEdit = (event: Event) => {
    setEditingItem(event);
    setEventForm({
      title: event.title,
      description: event.description,
      location: event.location,
      image: event.image,
      category: event.category as EventFormState['category'],
      registrationRequired: event.registrationRequired || false,
      maxCapacity: event.maxCapacity,
      eventStartAt: event.eventStartAt || '',
      registrationClosesAt: event.registrationClosesAt || '',
      publishAt: event.publishAt || ''
    });
    setShowEventModal(true);
  };

  useEffect(() => {
    // subscribe to custom questions when questions or registrations modal is open for an event
    const eventId = activeEventForQuestions?.id || activeEventForRegs?.id;
    const open = showEventQModal || showEventRegsModal;
    if (!open || !eventId) return;
    const unsub = subscribeToEventCustomQuestions(eventId, (qs: EventCustomQuestion[]) => setEventQuestions(qs));
    return () => { if (typeof unsub === 'function') unsub(); };
  }, [activeEventForQuestions, activeEventForRegs, showEventQModal, showEventRegsModal]);

  const handleAddEvent = async () => {
    const payload: Omit<Event, 'id'> = {
      title: eventForm.title,
      description: eventForm.description,
      location: eventForm.location,
      image: eventForm.image,
      category: eventForm.category,
      status: 'upcoming',
      registrationRequired: eventForm.registrationRequired,
      currentRegistrations: 0,
      published: true,
      eventStartAt: eventForm.eventStartAt,
      ...(eventForm.registrationClosesAt ? { registrationClosesAt: eventForm.registrationClosesAt } : {}),
      ...(eventForm.publishAt ? { publishAt: eventForm.publishAt } : {}),
      ...(eventForm.maxCapacity !== undefined ? { maxCapacity: eventForm.maxCapacity } : {}),
    };
    const newId = await addEvent(payload);
    try {
      await addEventCustomQuestion({
        eventId: newId,
        question: 'Dietary restrictions / Allergies',
        type: 'text',
        required: false,
        order: 100,
      });
    } catch {}
    setShowEventModal(false);
    resetForms();
  };

  const handleUpdateEvent = () => {
    if (editingItem && editingItem.id) {
      const updatedEvent = { ...editingItem, ...eventForm } as Event;
      dispatch({ firestoreAction: 'UPDATE_EVENT', payload: updatedEvent });
      setShowEventModal(false);
      resetForms();
    }
  };

  const handleDeleteEvent = (eventId: string) => {
    if (window.confirm('Are you sure you want to delete this event?')) {
      dispatch({ firestoreAction: 'DELETE_EVENT', payload: eventId });
    }
  };

  const handleTogglePublish = (event: Event) => {
    const updatedEvent = { ...event, published: !event.published } as Event;
    dispatch({ firestoreAction: 'UPDATE_EVENT', payload: updatedEvent });
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Events Management
        </h2>
        <Button icon={Plus} onClick={handleAddClick}>
          Add New Event
        </Button>
      </div>

      <div className="grid gap-4">
        {events.map((event) => (
          <Card
            key={event.id}
            className="bg-white dark:bg-gray-800 text-black dark:text-white"
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {event.title}
                    </h3>
                    <Tag
                      variant={event.status === "upcoming" ? "green" : "gray"}
                      size="sm"
                    >
                      {event.status}
                    </Tag>
                    <Tag variant="blue" size="sm">
                      {categoryOptions.find(
                        (option) => option.value === event.category
                      )?.label || event.category}
                    </Tag>
                  </div>
                  <p className="text-gray-600 mb-2 dark:text-gray-400 whitespace-pre-wrap">
                    {event.description.slice(0, 100) +
                      (event.description.length > 100 ? "..." : "")}
                  </p>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    <span className="mr-4">
                      📅{" "}
                      {event.eventStartAt
                        ? format(new Date(event.eventStartAt), "MMM d, yyyy")
                        : "-"}
                    </span>
                    <span className="mr-4">
                      🕒{" "}
                      {event.eventStartAt
                        ? format(new Date(event.eventStartAt), "HH:mm")
                        : "-"}
                    </span>
                    <span>📍 {event.location}</span>
                  </div>
                  {event.registrationRequired && (
                    <div className="text-sm text-gray-500 mt-1">
                      👥 {event.currentRegistrations || 0} / {event.maxCapacity}{" "}
                      registered
                    </div>
                  )}
                </div>
                <div className="flex space-x-2 ml-4">
                  <Button
                    size="sm"
                    variant="outline"
                    icon={event.published ? EyeOff : Eye}
                    onClick={() => handleTogglePublish(event)}
                  >
                    {event.published ? "Unpublish" : "Publish"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => { setActiveEventForQuestions(event); setShowEventQModal(true); onManageQuestions(event); }}
                  >
                    Manage Questions
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => { setActiveEventForRegs(event); setShowEventRegsModal(true); onViewRegistrations(event); }}
                  >
                    Registrations
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    icon={Edit3}
                    onClick={() => handleEdit(event)}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    icon={Trash2}
                    onClick={() => handleDeleteEvent(event.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <EventModal
        open={showEventModal}
        editing={!!editingItem}
        form={eventForm}
        setForm={setEventForm}
        onClose={() => { setShowEventModal(false); resetForms(); }}
        onSubmit={() => {
          if (editingItem) handleUpdateEvent(); else handleAddEvent();
        }}
      />
      {/* Questions modal — moved from AdminDashboard: parent still may call onManageQuestions to toggle */}
      <EventQuestionsModal
        open={showEventQModal && !!activeEventForQuestions}
        eventTitle={activeEventForQuestions?.title || ''}
        eventId={activeEventForQuestions?.id || ''}
        questions={eventQuestions}
        onClose={() => { setShowEventQModal(false); setActiveEventForQuestions(null); }}
        onAdd={async (data) => {
          if (!activeEventForQuestions) return;
          await addEventCustomQuestion({ eventId: activeEventForQuestions.id, ...data });
        }}
        onUpdate={async (id, data) => {
          await updateEventCustomQuestion(id, data);
        }}
        onDelete={async (id) => {
          await deleteEventCustomQuestion(id);
        }}
      />

      <EventRegistrationsModal
        open={showEventRegsModal && !!activeEventForRegs}
        eventId={activeEventForRegs?.id || ''}
        eventTitle={activeEventForRegs?.title || ''}
        onClose={() => { setShowEventRegsModal(false); setActiveEventForRegs(null); }}
      />
    </div>
  );
};

export default EventsTab;
