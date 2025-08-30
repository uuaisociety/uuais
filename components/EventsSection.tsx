'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs } from 'firebase/firestore';

interface ApplicationForm {
  name: string;
  email: string;
  yearOfStudy: string;
  program: string;
  relevantExperience: string;
  linkedin: string;
  github: string;
  desiredTeammates: string;
}

interface Event {
  id: string;
  internalName: string;
  title: string;
  subtitle: string;
  description: string;
  coverImage: string;
  date: string; // Add this property
}

const initialFormState: ApplicationForm = {
  name: '',
  email: '',
  yearOfStudy: '',
  program: '',
  relevantExperience: '',
  linkedin: '',
  github: '',
  desiredTeammates: ''
};

const EventModal = ({ isOpen, onClose, children, showApplyButton, onApply }: { 
  isOpen: boolean; 
  onClose: () => void; 
  children: React.ReactNode;
  showApplyButton?: boolean;
  onApply?: () => void;
}) => {
  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-[#2a2a2a] rounded-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-4 sm:p-6">
          {children}
          <div className="flex gap-3 mt-4">
            {showApplyButton && (
              <button
                onClick={onApply}
                className="flex-1 px-4 py-2 bg-[#c8102e] text-white rounded-md hover:bg-[#a00d24] transition-colors text-sm"
              >
                Apply Now
              </button>
            )}
            <button
              onClick={onClose}
              className={`px-4 py-2 bg-[#c8102e] text-white rounded-md hover:bg-[#a00d24] transition-colors text-sm ${showApplyButton ? 'flex-1' : 'w-full'}`}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const ApplicationForm = ({ event, onClose }: { event: Event; onClose: () => void }) => {
  const [formData, setFormData] = useState<ApplicationForm>(initialFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // Use the event's internalName as the collection name
      await addDoc(collection(db, event.internalName), {
        ...formData,
        eventId: event.id,
        submittedAt: new Date().toISOString()
      });
      setSubmitStatus('success');
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (error) {
      console.error('Error submitting application:', error);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label htmlFor="name" className="block text-white mb-1 text-sm">Name *</label>
        <input
          type="text"
          id="name"
          name="name"
          required
          value={formData.name}
          onChange={handleChange}
          className="w-full px-3 py-1.5 bg-[#1a1a1a] text-white rounded-md border border-white/10 focus:outline-none focus:border-[#c8102e] text-sm"
        />
      </div>
      <div>
        <label htmlFor="email" className="block text-white mb-1 text-sm">Email *</label>
        <input
          type="email"
          id="email"
          name="email"
          required
          value={formData.email}
          onChange={handleChange}
          className="w-full px-3 py-1.5 bg-[#1a1a1a] text-white rounded-md border border-white/10 focus:outline-none focus:border-[#c8102e] text-sm"
        />
      </div>
      <div>
        <label htmlFor="yearOfStudy" className="block text-white mb-1 text-sm">Year of Study *</label>
        <input
          type="text"
          id="yearOfStudy"
          name="yearOfStudy"
          required
          value={formData.yearOfStudy}
          onChange={handleChange}
          className="w-full px-3 py-1.5 bg-[#1a1a1a] text-white rounded-md border border-white/10 focus:outline-none focus:border-[#c8102e] text-sm"
        />
      </div>
      <div>
        <label htmlFor="program" className="block text-white mb-1 text-sm">Program *</label>
        <input
          type="text"
          id="program"
          name="program"
          required
          value={formData.program}
          onChange={handleChange}
          className="w-full px-3 py-1.5 bg-[#1a1a1a] text-white rounded-md border border-white/10 focus:outline-none focus:border-[#c8102e] text-sm"
        />
      </div>
      <div>
        <label htmlFor="relevantExperience" className="block text-white mb-1 text-sm">Relevant Experience*</label>
        <textarea
          id="relevantExperience"
          name="relevantExperience"
          required
          value={formData.relevantExperience}
          onChange={handleChange}
          rows={4}
          className="w-full px-3 py-1.5 bg-[#1a1a1a] text-white rounded-md border border-white/10 focus:outline-none focus:border-[#c8102e] text-sm"
        />
      </div>
      <div>
        <label htmlFor="desiredTeammates" className="block text-white mb-1 text-sm">Desired Teammates (if any)</label>
        <textarea
          id="desiredTeammates"
          name="desiredTeammates"
          value={formData.desiredTeammates}
          onChange={handleChange}
          rows={2}
          className="w-full px-3 py-1.5 bg-[#1a1a1a] text-white rounded-md border border-white/10 focus:outline-none focus:border-[#c8102e] text-sm"
        />
      </div>
      <div>
        <label htmlFor="linkedin" className="block text-white mb-1 text-sm">LinkedIn</label>
        <input
          type="url"
          id="linkedin"
          name="linkedin"
          value={formData.linkedin}
          onChange={handleChange}
          className="w-full px-3 py-1.5 bg-[#1a1a1a] text-white rounded-md border border-white/10 focus:outline-none focus:border-[#c8102e] text-sm"
        />
      </div>
      <div>
        <label htmlFor="github" className="block text-white mb-1 text-sm">GitHub</label>
        <input
          type="url"
          id="github"
          name="github"
          value={formData.github}
          onChange={handleChange}
          className="w-full px-3 py-1.5 bg-[#1a1a1a] text-white rounded-md border border-white/10 focus:outline-none focus:border-[#c8102e] text-sm"
        />
      </div>
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full px-4 py-2 mt-2 bg-[#c8102e] text-white rounded-md hover:bg-[#a00d24] transition-colors disabled:opacity-50 text-sm"
      >
        {isSubmitting ? 'Submitting...' : 'Submit Application'}
      </button>
      {submitStatus === 'success' && (
        <p className="text-green-500 text-center text-sm">Thank you for your application.</p>
      )}
      {submitStatus === 'error' && (
        <p className="text-red-500 text-center text-sm">Error submitting application. Please try again.</p>
      )}
    </form>
  );
};

const EventsSection = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showApplication, setShowApplication] = useState(false);
  const [currentEventForApplication, setCurrentEventForApplication] = useState<Event | null>(null);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const eventsSnapshot = await getDocs(collection(db, 'events'));
        const eventsData = eventsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Event[];

        setEvents(eventsData);
      } catch (error) {
        console.error('Error fetching events:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  const handleApplyClick = (event: Event) => {
    setCurrentEventForApplication(event);
    setShowApplication(true);
    setSelectedEvent(null);
  };

  return (
    <section id="events" className="py-16 bg-[#1a1a1a]/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-2xl font-bold text-white mb-3">Events</h2>
        </div>

        {loading ? (
          <div className="text-center text-white/70">Loading events...</div>
        ) : events.length === 0 ? (
          <div className="text-center text-white/70">No events at this time.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {events.map((event) => (
              <div
                key={event.id}
                className="bg-[#2a2a2a] rounded-lg overflow-hidden cursor-pointer transform transition-transform hover:scale-105 flex flex-col h-full"
                onClick={() => setSelectedEvent(event)}
              >
                <div className="relative aspect-[16/9] w-full">
                  {event.coverImage ? (
                    <Image
                      src={event.coverImage}
                      alt={`${event.title} Event`}
                      fill
                      style={{ objectFit: 'contain' }}
                      className="bg-white"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-white">
                      <p className="text-gray-500">No image available</p>
                    </div>
                  )}
                  <span
                    className={`absolute bottom-2 left-2 px-3 py-1 text-sm font-medium rounded ${
                      new Date(event.date) > new Date() ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                    }`}
                  >
                    {new Date(event.date) > new Date() ? 'Upcoming' : 'Past'}
                  </span>
                </div>
                <div className="flex flex-col h-full flex-1">
                  <div className="p-6 flex-1">
                    <h3 className="text-xl font-semibold text-white mb-2">{event.title}</h3>
                    <p className="text-white/80">{event.subtitle}</p>
                  </div>
                  <div className="px-6 pb-4 mt-auto">
                    <p className="text-white/50 text-sm">{new Date(event.date).toLocaleDateString('en-GB')}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <EventModal
        isOpen={selectedEvent !== null}
        onClose={() => setSelectedEvent(null)}
        showApplyButton={true}
        onApply={() => selectedEvent && handleApplyClick(selectedEvent)}
      >
        {selectedEvent && (
          <div>
            <div className="relative aspect-[16/9] w-full mb-6">
              {selectedEvent.coverImage ? (
                <Image
                  src={selectedEvent.coverImage}
                  alt={`${selectedEvent.title} Event`}
                  fill
                  style={{ objectFit: 'contain' }}
                  className="bg-white rounded-lg"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-white rounded-lg">
                  <p className="text-gray-500">No image available</p>
                </div>
              )}
            </div>
            <h2 className="text-2xl font-bold text-white mb-4">
              {selectedEvent.title}
            </h2>
            <p className="text-white/80 mb-4">
              {selectedEvent.subtitle}
            </p>
            <div className="border-t border-white/10 my-4"></div>
            <p className="text-white/80 whitespace-pre-line">
              {selectedEvent.description}
            </p>
          </div>
        )}
      </EventModal>

      <EventModal
        isOpen={showApplication}
        onClose={() => setShowApplication(false)}
      >
        {currentEventForApplication && (
          <>
            <h2 className="text-2xl font-bold text-white mb-6">Apply for {currentEventForApplication.title}</h2>
            <ApplicationForm event={currentEventForApplication} onClose={() => setShowApplication(false)} />
          </>
        )}
      </EventModal>
    </section>
  );
};

export default EventsSection;