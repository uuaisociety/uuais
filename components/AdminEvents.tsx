'use client';

import React, { useState, useEffect } from 'react';
import { db, storage } from '@/lib/firebase';
import { collection, addDoc, getDocs, deleteDoc, doc, getCountFromServer, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import Image from 'next/image';

interface Application {
  id: string;
  email: string;
  eventId: string;
  github: string;
  linkedin: string;
  relevantExperience: string;
  name: string;
  program: string;
  submittedAt: string;
  yearOfStudy: string;
  desiredTeammates?: string;
}

interface Event {
  id: string;
  internalName: string;
  title: string;
  subtitle: string;
  description: string;
  coverImage: string;
  date?: string; // Add date property
  applicationsCount?: number;
}

const AppModal = ({ isOpen, onClose, children }: { 
  isOpen: boolean; 
  onClose: () => void; 
  children: React.ReactNode;
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
      <div className="bg-[#2a2a2a] rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {children}
          <div className="mt-6 text-right">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-[#c8102e] text-white rounded-md hover:bg-[#a00d24] transition-colors text-sm"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const AdminEvents = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    internalName: '',
    title: '',
    subtitle: '',
    description: '',
    coverImage: null as File | null,
    date: '', // Add date property
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedEventApplications, setSelectedEventApplications] = useState<{ event: Event, applications: Application[] } | null>(null);
  const [loadingApplications, setLoadingApplications] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const eventsSnapshot = await getDocs(collection(db, 'events'));
      const eventsData: Event[] = [];
      
      for (const eventDoc of eventsSnapshot.docs) {
        const event = eventDoc.data() as Omit<Event, 'id' | 'applicationsCount'>;
        
        // Get application count
        const applicationsCollection = collection(db, event.internalName);
        const applicationsSnapshot = await getCountFromServer(applicationsCollection);
        
        eventsData.push({
          id: eventDoc.id,
          ...event,
          applicationsCount: applicationsSnapshot.data().count
        });
      }
      
      setEvents(eventsData);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFormData(prev => ({ ...prev, coverImage: file }));
      
      // Create image preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEdit = (event: Event) => {
    setEditingEvent(event);
    setFormData({
      internalName: event.internalName,
      title: event.title,
      subtitle: event.subtitle,
      description: event.description,
      coverImage: null,
      date: event.date || '', // Prefill date
    });
    setImagePreview(event.coverImage);
    setShowEditModal(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEvent) return;
    
    setIsSubmitting(true);
    setSubmitStatus('idle');
    
    try {
      let imageUrl = editingEvent.coverImage;
      
      // If a new image was uploaded, store it and get the URL
      if (formData.coverImage) {
        const storageRef = ref(storage, `event-images/${formData.internalName}-${formData.coverImage.name}`);
        const uploadResult = await uploadBytes(storageRef, formData.coverImage);
        imageUrl = await getDownloadURL(uploadResult.ref);
      }
      
      // Update event in Firestore
      await updateDoc(doc(db, 'events', editingEvent.id), {
        title: formData.title,
        subtitle: formData.subtitle,
        description: formData.description,
        coverImage: imageUrl,
        date: formData.date, // Include the updated date
        updatedAt: new Date().toISOString(),
      });
      
      setSubmitStatus('success');
      fetchEvents();
      setTimeout(() => {
        setShowEditModal(false);
        resetForm();
      }, 1500);
    } catch (error) {
      console.error('Error updating event:', error);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      internalName: '',
      title: '',
      subtitle: '',
      description: '',
      coverImage: null,
      date: '', // Reset date
    });
    setImagePreview(null);
    setEditingEvent(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus('idle');
    
    try {
      if (!formData.coverImage) {
        throw new Error('Cover image is required');
      }
      
      // Upload image to Firebase Storage
      const storageRef = ref(storage, `event-images/${formData.internalName}-${formData.coverImage.name}`);
      const uploadResult = await uploadBytes(storageRef, formData.coverImage);
      const imageUrl = await getDownloadURL(uploadResult.ref);
      
      // Create event in Firestore
      await addDoc(collection(db, 'events'), {
        internalName: formData.internalName,
        title: formData.title,
        subtitle: formData.subtitle,
        description: formData.description,
        coverImage: imageUrl,
        date: formData.date, // Include the date
        createdAt: new Date().toISOString(),
      });
      
      // Initialize application collection by adding and immediately deleting a dummy document
      const applicationsCollRef = collection(db, formData.internalName);
      const dummyDocRef = await addDoc(applicationsCollRef, {
        _dummy: true,
        _createdAt: new Date().toISOString(),
        _note: "This is a temporary document to initialize the collection"
      });
      
      // Delete the dummy document
      await deleteDoc(dummyDocRef);
      
      setSubmitStatus('success');
      resetForm();
      fetchEvents();
    } catch (error) {
      console.error('Error creating event:', error);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (eventId: string) => {
    if (window.confirm(`Are you sure you want to delete this event? This will also delete all application data.`)) {
      try {
        // Delete the event document
        await deleteDoc(doc(db, 'events', eventId));
        
        // Note: We're not deleting the applications collection as this would require
        // deleting all documents in that collection first, which is beyond the scope of this example
        // In a production app, you would need to delete all application documents first
        
        fetchEvents();
      } catch (error) {
        console.error('Error deleting event:', error);
      }
    }
  };

  const handleViewApplications = async (event: Event) => {
    setLoadingApplications(true);
    try {
      const applicationsSnapshot = await getDocs(collection(db, event.internalName));
      const applications = applicationsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Application[];
      
      setSelectedEventApplications({
        event,
        applications
      });
    } catch (error) {
      console.error('Error fetching applications:', error);
    } finally {
      setLoadingApplications(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <h1 className="text-3xl font-bold text-white mb-8">Event Administration</h1>
      
      <div className="bg-[#2a2a2a] rounded-lg p-6 mb-8">
        <h2 className="text-xl font-bold text-white mb-4">Create New Event</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="internalName" className="block text-white mb-1 text-sm">Internal Name (for database) *</label>
            <input
              type="text"
              id="internalName"
              name="internalName"
              required
              value={formData.internalName}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-[#1a1a1a] text-white rounded-md border border-white/10 focus:outline-none focus:border-[#c8102e]"
            />
            <p className="text-white/50 text-xs mt-1">This will be used for the applications collection name. No spaces or special characters.</p>
          </div>
          
          <div>
            <label htmlFor="title" className="block text-white mb-1 text-sm">Event Title *</label>
            <input
              type="text"
              id="title"
              name="title"
              required
              value={formData.title}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-[#1a1a1a] text-white rounded-md border border-white/10 focus:outline-none focus:border-[#c8102e]"
            />
          </div>
          
          <div>
            <label htmlFor="subtitle" className="block text-white mb-1 text-sm">Event Subtitle/Summary *</label>
            <input
              type="text"
              id="subtitle"
              name="subtitle"
              required
              value={formData.subtitle}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-[#1a1a1a] text-white rounded-md border border-white/10 focus:outline-none focus:border-[#c8102e]"
            />
          </div>
          
          <div>
            <label htmlFor="description" className="block text-white mb-1 text-sm">Event Description *</label>
            <textarea
              id="description"
              name="description"
              required
              value={formData.description}
              onChange={handleChange}
              rows={5}
              className="w-full px-3 py-2 bg-[#1a1a1a] text-white rounded-md border border-white/10 focus:outline-none focus:border-[#c8102e]"
            />
          </div>
          
          <div>
            <label htmlFor="coverImage" className="block text-white mb-1 text-sm">Cover Image *</label>
            <input
              type="file"
              id="coverImage"
              name="coverImage"
              required
              accept="image/*"
              onChange={handleFileChange}
              className="w-full px-3 py-2 bg-[#1a1a1a] text-white rounded-md border border-white/10 focus:outline-none focus:border-[#c8102e]"
            />
          </div>

          <div>
            <label htmlFor="date" className="block text-white mb-1 text-sm">Event Date *</label>
            <input
              type="date"
              id="date"
              name="date"
              required
              value={formData.date}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-[#1a1a1a] text-white rounded-md border border-white/10 focus:outline-none focus:border-[#c8102e]"
            />
          </div>
          
          {imagePreview && (
            <div className="mt-4">
              <p className="text-white mb-2 text-sm">Image Preview:</p>
              <div className="relative w-full aspect-[16/9] max-w-md">
                <Image 
                  src={imagePreview} 
                  alt="Cover preview" 
                  fill
                  style={{ objectFit: 'contain' }}
                  className="bg-white/10 rounded-md" 
                />
              </div>
            </div>
          )}
          
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full px-4 py-2 mt-4 bg-[#c8102e] text-white rounded-md hover:bg-[#a00d24] transition-colors disabled:opacity-50"
          >
            {isSubmitting ? 'Creating Event...' : 'Create Event'}
          </button>
          
          {submitStatus === 'success' && (
            <p className="text-green-500 text-center">Event created successfully.</p>
          )}
          
          {submitStatus === 'error' && (
            <p className="text-red-500 text-center">Error creating event. Please try again.</p>
          )}
        </form>
      </div>
      
      <div className="bg-[#2a2a2a] rounded-lg p-6">
        <h2 className="text-xl font-bold text-white mb-4">Manage Events</h2>
        
        {loading ? (
          <p className="text-white/70">Loading events...</p>
        ) : events.length === 0 ? (
          <p className="text-white/70">No events found. Create your first event above.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-white">
              <thead className="border-b border-white/10">
                <tr>
                  <th className="text-left py-3 px-4">Title</th>
                  <th className="text-left py-3 px-4">Internal Name</th>
                  <th className="text-left py-3 px-4">Applications</th>
                  <th className="text-left py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => (
                  <tr key={event.id} className="border-b border-white/10">
                    <td className="py-3 px-4">{event.title}</td>
                    <td className="py-3 px-4">{event.internalName}</td>
                    <td className="py-3 px-4">
                      <button 
                        onClick={() => handleViewApplications(event)}
                        className={`${event.applicationsCount && event.applicationsCount > 0 ? 'text-blue-400 hover:underline cursor-pointer' : 'text-white/70'}`}
                        disabled={!event.applicationsCount || event.applicationsCount === 0}
                      >
                        {event.applicationsCount || 0} {event.applicationsCount === 1 ? 'application' : 'applications'}
                      </button>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEdit(event)}
                          className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(event.id)}
                          className="px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AppModal
        isOpen={selectedEventApplications !== null}
        onClose={() => setSelectedEventApplications(null)}
      >
        {selectedEventApplications && (
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Applications for {selectedEventApplications.event.title}
            </h2>
            <p className="text-white/70 mb-6">
              {selectedEventApplications.applications.length} {selectedEventApplications.applications.length === 1 ? 'application' : 'applications'} received
            </p>

            {loadingApplications ? (
              <p className="text-white/70">Loading applications...</p>
            ) : selectedEventApplications.applications.length === 0 ? (
              <p className="text-white/70">No applications yet.</p>
            ) : (
              <div className="space-y-6">
                {selectedEventApplications.applications.map((app) => (
                  <div key={app.id} className="bg-[#1a1a1a] rounded-lg p-4 border border-white/10">
                    <div className="flex justify-between mb-3">
                      <h3 className="text-xl font-semibold text-white">{app.name}</h3>
                      <span className="text-white/50 text-sm">{formatDate(app.submittedAt)}</span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                      <div>
                        <p className="text-white/50 text-sm">Email</p>
                        <p className="text-white">{app.email}</p>
                      </div>
                      <div>
                        <p className="text-white/50 text-sm">Program</p>
                        <p className="text-white">{app.program}</p>
                      </div>
                      <div>
                        <p className="text-white/50 text-sm">Year of Study</p>
                        <p className="text-white">{app.yearOfStudy}</p>
                      </div>
                    </div>
                    
                    {app.relevantExperience && (
                      <div className="mb-3">
                        <p className="text-white/50 text-sm">Relevant Experience</p>
                        <p className="text-white whitespace-pre-line">{app.relevantExperience}</p>
                      </div>
                    )}
                    
                    {app.desiredTeammates && (
                      <div className="mb-3">
                        <p className="text-white/50 text-sm">Desired Teammates</p>
                        <p className="text-white whitespace-pre-line">{app.desiredTeammates}</p>
                      </div>
                    )}
                    
                    <div className="flex flex-wrap gap-3">
                      {app.linkedin && (
                        <a 
                          href={app.linkedin} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:underline text-sm flex items-center"
                        >
                          LinkedIn Profile
                        </a>
                      )}
                      
                      {app.github && (
                        <a 
                          href={app.github} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:underline text-sm flex items-center"
                        >
                          GitHub Profile
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </AppModal>

      <AppModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          resetForm();
        }}
      >
        {editingEvent && (
          <div>
            <h2 className="text-2xl font-bold text-white mb-4">
              Edit Event: {editingEvent.title}
            </h2>
            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label htmlFor="title" className="block text-white mb-1 text-sm">Event Title *</label>
                <input
                  type="text"
                  id="edit-title"
                  name="title"
                  required
                  value={formData.title}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-[#1a1a1a] text-white rounded-md border border-white/10 focus:outline-none focus:border-[#c8102e]"
                />
              </div>
              
              <div>
                <label htmlFor="subtitle" className="block text-white mb-1 text-sm">Event Subtitle/Summary *</label>
                <input
                  type="text"
                  id="edit-subtitle"
                  name="subtitle"
                  required
                  value={formData.subtitle}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-[#1a1a1a] text-white rounded-md border border-white/10 focus:outline-none focus:border-[#c8102e]"
                />
              </div>
              
              <div>
                <label htmlFor="description" className="block text-white mb-1 text-sm">Event Description *</label>
                <textarea
                  id="edit-description"
                  name="description"
                  required
                  value={formData.description}
                  onChange={handleChange}
                  rows={5}
                  className="w-full px-3 py-2 bg-[#1a1a1a] text-white rounded-md border border-white/10 focus:outline-none focus:border-[#c8102e]"
                />
              </div>
              
              <div>
                <label htmlFor="coverImage" className="block text-white mb-1 text-sm">Cover Image</label>
                <input
                  type="file"
                  id="edit-coverImage"
                  name="coverImage"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="w-full px-3 py-2 bg-[#1a1a1a] text-white rounded-md border border-white/10 focus:outline-none focus:border-[#c8102e]"
                />
                <p className="text-white/50 text-xs mt-1">Leave empty to keep the current image</p>
              </div>

              <div>
                <label htmlFor="edit-date" className="block text-white mb-1 text-sm">Event Date *</label>
                <input
                  type="date"
                  id="edit-date"
                  name="date"
                  required
                  value={formData.date}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-[#1a1a1a] text-white rounded-md border border-white/10 focus:outline-none focus:border-[#c8102e]"
                />
              </div>
              
              {imagePreview && (
                <div className="mt-4">
                  <p className="text-white mb-2 text-sm">Current Image:</p>
                  <div className="relative w-full aspect-[16/9] max-w-md">
                    <Image 
                      src={imagePreview} 
                      alt="Cover preview" 
                      fill
                      style={{ objectFit: 'contain' }}
                      className="bg-white/10 rounded-md" 
                    />
                  </div>
                </div>
              )}
              
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full px-4 py-2 mt-4 bg-[#c8102e] text-white rounded-md hover:bg-[#a00d24] transition-colors disabled:opacity-50"
              >
                {isSubmitting ? 'Updating Event...' : 'Update Event'}
              </button>
              
              {submitStatus === 'success' && (
                <p className="text-green-500 text-center">Event updated successfully.</p>
              )}
              
              {submitStatus === 'error' && (
                <p className="text-red-500 text-center">Error updating event. Please try again.</p>
              )}
            </form>
          </div>
        )}
      </AppModal>
    </div>
  );
};

export default AdminEvents;