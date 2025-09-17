'use client'

// Disable static generation for this page
export const dynamic = 'force-dynamic';

import React, { useEffect, useState } from 'react';
import {
  Calendar,
  Users,
  FileText,
  TrendingUp,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import EventsTab from '@/components/pages/admin/tabs/EventsTab';
import TeamTab from '@/components/pages/admin/tabs/TeamTab';
import BlogTab from '@/components/pages/admin/tabs/BlogTab';
import FAQTab from '@/components/pages/admin/tabs/FAQTab';
import RegistrationTab from '@/components/pages/admin/tabs/RegistrationTab';
import AnalyticsTab from '@/components/pages/admin/tabs/AnalyticsTab';
import FAQModal from '@/components/pages/admin/modals/FAQModal';
import RegistrationQuestionModal from '@/components/pages/admin/modals/RegistrationQuestionModal';
import EventQuestionsModal from '@/components/pages/admin/modals/EventQuestionsModal';
import { useApp } from '@/contexts/AppContext';
import AdminGate from '@/components/auth/AdminGate';
import { updatePageMeta } from '@/utils/seo';
// format imported where needed in tab components
import { BlogPost, Event, TeamMember, FAQ, RegistrationQuestion, EventCustomQuestion } from '@/types';
import {
  subscribeToEventCustomQuestions,
  addEventCustomQuestion,
  updateEventCustomQuestion,
  deleteEventCustomQuestion
} from '@/lib/firestore';

const AdminDashboard: React.FC = () => {
  const { state, dispatch } = useApp();
  const [activeTab, setActiveTab] = useState<'events' | 'team' | 'blog' | 'faq' | 'registration' | 'analytics'>('events');
  const placeholderImage = '@/public/placeholder.png';

  // Modal states
  const [showEventModal, setShowEventModal] = useState(false);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [showBlogModal, setShowBlogModal] = useState(false);
  const [showFaqModal, setShowFaqModal] = useState(false);
  const [showRegQModal, setShowRegQModal] = useState(false);
  const [showEventQModal, setShowEventQModal] = useState(false);
  const [activeEventForQuestions, setActiveEventForQuestions] = useState<Event | null>(null);
  const [eventQuestions, setEventQuestions] = useState<EventCustomQuestion[]>([]);
  const [editingItem, setEditingItem] = useState<Event | TeamMember | BlogPost | null>(null);
  const [editingFaq, setEditingFaq] = useState<FAQ | null>(null);
  const [editingRegQ, setEditingRegQ] = useState<RegistrationQuestion | null>(null);

  // Form states
  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
    location: '',
    image: '',
    category: 'workshop' as 'workshop' | 'seminar' | 'competition' | 'social',
    registrationRequired: false,
    maxCapacity: 0
  });

  // Event-specific question form handled inside EventQuestionsModal

  // Subscribe to event-specific questions when modal opens
  useEffect(() => {
    if (!showEventQModal || !activeEventForQuestions) return;
    const unsub = subscribeToEventCustomQuestions(activeEventForQuestions.id, (qs) => setEventQuestions(qs));
    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, [showEventQModal, activeEventForQuestions]);

  const [teamForm, setTeamForm] = useState({
    name: '',
    position: '',
    bio: '',
    image: '',
    linkedin: ''
  });

  const [blogForm, setBlogForm] = useState({
    title: '',
    excerpt: '',
    content: '',
    author: '',
    image: '',
    tags: [] as string[],
    published: false
  });

  const [tagInput, setTagInput] = useState('');

  const [faqForm, setFaqForm] = useState<Pick<FAQ, 'question' | 'answer' | 'category' | 'order' | 'published'>>({
    question: '',
    answer: '',
    category: 'General',
    order: state.faqs.length + 1,
    published: true,
  });

  const [regQForm, setRegQForm] = useState<Pick<RegistrationQuestion, 'question' | 'type' | 'options' | 'required' | 'order' | 'eventTypes'>>({
    question: '',
    type: 'text',
    options: [],
    required: true,
    order: state.registrationQuestions.length + 1,
    eventTypes: [],
  });

  useEffect(() => {
    updatePageMeta('Admin Dashboard', 'Manage UU AI Society content and events');
  }, []);

  const stats = [
    {
      title: 'Total Events',
      value: state.events.length,
      icon: Calendar,
      color: 'bg-blue-500'
    },
    {
      title: 'Team Members',
      value: state.teamMembers.length,
      icon: Users,
      color: 'bg-green-500'
    },
    {
      title: 'Blog Posts',
      value: state.blogPosts.length,
      icon: FileText,
      color: 'bg-purple-500'
    },
    {
      title: 'Published Posts',
      value: state.blogPosts.filter(post => post.published).length,
      icon: TrendingUp,
      color: 'bg-red-500'
    }
  ];

  const resetForms = () => {
    setEventForm({
      title: '',
      description: '',
      date: '',
      time: '',
      location: '',
      image: '',
      category: 'workshop',
      registrationRequired: false,
      maxCapacity: 0
    });
    setTeamForm({
      name: '',
      position: '',
      bio: '',
      image: '',
      linkedin: ''
    });
    setBlogForm({
      title: '',
      excerpt: '',
      content: '',
      author: '',
      image: '',
      tags: [],
      published: false
    });
    setTagInput('');
    setEditingItem(null);
  };

  const handleAddEvent = () => {
    const newEvent = {
      ...eventForm,
      currentRegistrations: 0,
      status: 'upcoming' as const
    };
    dispatch({ firestoreAction: 'ADD_EVENT', payload: newEvent });
    setShowEventModal(false);
    resetForms();
  };

  const handleAddTeamMember = () => {
    const newMember = {
      ...teamForm,
      image: teamForm.image || placeholderImage,
    };
    dispatch({ firestoreAction: 'ADD_TEAM_MEMBER', payload: newMember });
    setShowTeamModal(false);
    resetForms();
  };

  const handleAddBlogPost = () => {
    const newPost = {
      ...blogForm,
      image: blogForm.image || placeholderImage,
      date: new Date().toISOString().split('T')[0]
    };
    dispatch({ firestoreAction: 'ADD_BLOG_POST', payload: newPost });
    setShowBlogModal(false);
    resetForms();
  };

  const handleAddFaq = () => {
    const payload = { ...faqForm };
    dispatch({ firestoreAction: 'ADD_FAQS', payload });
    setShowFaqModal(false);
    setFaqForm({ question: '', answer: '', category: 'General', order: state.faqs.length + 1, published: true });
  };

  const handleUpdateFaq = () => {
    if (!editingFaq) return;
    dispatch({ firestoreAction: 'UPDATE_FAQS', payload: { ...editingFaq, ...faqForm } as FAQ });
    setShowFaqModal(false);
    setEditingFaq(null);
  };

  const handleDeleteFaq = (id: string) => {
    if (window.confirm('Delete this FAQ?')) {
      dispatch({ firestoreAction: 'DELETE_FAQS', payload: id });
    }
  };

  const handleAddRegQ = () => {
    const payload = { ...regQForm };
    dispatch({ firestoreAction: 'ADD_REGISTRATION_QUESTION', payload });
    setShowRegQModal(false);
    setRegQForm({ question: '', type: 'text', options: [], required: true, order: state.registrationQuestions.length + 1, eventTypes: [] });
  };

  const handleUpdateRegQ = () => {
    if (!editingRegQ) return;
    dispatch({ firestoreAction: 'UPDATE_REGISTRATION_QUESTION', payload: { ...editingRegQ, ...regQForm } as RegistrationQuestion });
    setShowRegQModal(false);
    setEditingRegQ(null);
  };

  const handleDeleteRegQ = (id: string) => {
    if (window.confirm('Delete this question?')) {
      dispatch({ firestoreAction: 'DELETE_REGISTRATION_QUESTION', payload: id });
    }
  };

  const handleEditEvent = (event: Event) => {
    setEditingItem(event);
    setEventForm({
      title: event.title,
      description: event.description,
      date: event.date,
      time: event.time,
      location: event.location,
      image: event.image,
      category: event.category,
      registrationRequired: event.registrationRequired || false,
      maxCapacity: event.maxCapacity || 0
    });
    setShowEventModal(true);
  };

  const handleEditTeamMember = (member: TeamMember) => {
    setEditingItem(member);
    setTeamForm({
      name: member.name,
      position: member.position,
      bio: member.bio,
      image: member.image,
      linkedin: member.linkedin || ''
    });
    setShowTeamModal(true);
  };

  const handleEditBlogPost = (post: BlogPost) => {
    setEditingItem(post);
    setBlogForm({
      title: post.title,
      excerpt: post.excerpt,
      content: post.content,
      author: post.author,
      image: post.image,
      tags: post.tags,
      published: post.published
    });
    setShowBlogModal(true);
  };

  const handleUpdateEvent = () => {
    if (editingItem) {
      const updatedEvent = { ...editingItem, ...eventForm } as Event;
      dispatch({ firestoreAction: 'UPDATE_EVENT', payload: updatedEvent });
      setShowEventModal(false);
      resetForms();
    }
  };

  const handleUpdateTeamMember = () => {
    if (editingItem) {
      const updatedMember = { ...editingItem, ...teamForm } as TeamMember;
      dispatch({ firestoreAction: 'UPDATE_TEAM_MEMBER', payload: updatedMember });
      setShowTeamModal(false);
      resetForms();
    }
  };

  const handleUpdateBlogPost = () => {
    if (editingItem) {
      const updatedPost = { ...editingItem, ...blogForm } as BlogPost;
      dispatch({ firestoreAction: 'UPDATE_BLOG_POST', payload: updatedPost });
      setShowBlogModal(false);
      resetForms();
    }
  };

  const handleDeleteEvent = (eventId: string) => {
    if (window.confirm('Are you sure you want to delete this event?')) {
      dispatch({ firestoreAction: 'DELETE_EVENT', payload: eventId });
    }
  };

  const handleDeleteTeamMember = (memberId: string) => {
    if (window.confirm('Are you sure you want to remove this team member?')) {
      dispatch({ firestoreAction: 'DELETE_TEAM_MEMBER', payload: memberId });
    }
  };

  const handleDeleteBlogPost = (postId: string) => {
    if (window.confirm('Are you sure you want to delete this blog post?')) {
      dispatch({ firestoreAction: 'DELETE_BLOG_POST', payload: postId });
    }
  };

  const addTag = () => {
    if (tagInput.trim() && !blogForm.tags.includes(tagInput.trim())) {
      setBlogForm(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }));
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setBlogForm(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const toggleBlogPostVisibility = (post: BlogPost) => {
    dispatch({
      type: 'UPDATE_BLOG_POST',
      payload: { ...post, published: !post.published }
    });
  };




  return (
    <AdminGate>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 pt-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8 flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Admin Dashboard</h1>
              <p className="text-gray-600 dark:text-gray-300">Manage your UU AI Society content and events</p>
            </div>
            <button
              onClick={async () => {
                try {
                  await fetch('/api/auth', {
                    method: 'DELETE',
                    credentials: 'include',
                  });
                  window.location.href = '/admin';
                } catch (err) {
                  console.error('Logout error:', err);
                  window.location.href = '/admin';
                }
              }}
              className="px-4 py-2 bg-gray-700 dark:bg-gray-600 text-white rounded-md hover:bg-gray-600 dark:hover:bg-gray-500 transition-colors text-sm"
            >
              Logout
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {stats.map((stat, index) => (
              <Card key={index} className="bg-white dark:bg-gray-800 pt-4 border-gray-200 dark:border-gray-700">
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className={`p-3 rounded-lg ${stat.color} text-white mr-4`}>
                      <stat.icon className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
                      <p className="text-gray-600 dark:text-gray-300 text-sm">{stat.title}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Navigation Tabs */}
          <div className="mb-8">
            <div className="pb-4 border-b border-gray-200 dark:border-gray-700">
              <nav className="-mb-px flex space-x-8">
                {([
                  { key: 'events', label: 'Events', icon: Calendar },
                  { key: 'team', label: 'Team', icon: Users },
                  { key: 'blog', label: 'Blog', icon: FileText },
                  { key: 'faq', label: 'FAQ', icon: FileText },
                  { key: 'registration', label: 'Registration', icon: Users },
                  { key: 'analytics', label: 'Analytics', icon: TrendingUp }
                ] as const).map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    onClick={() => setActiveTab(key)}
                    className={`flex items-center py-2 px-3 border-b-2 font-medium text-sm ${activeTab === key
                        ? 'border-red-500 text-red-600 dark:text-red-400'
                        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    {label}
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Tab Content */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            {activeTab === 'events' && (
              <EventsTab
                events={state.events}
                onAddClick={() => setShowEventModal(true)}
                onEdit={(event) => handleEditEvent(event)}
                onDelete={(id) => handleDeleteEvent(id)}
                onTogglePublish={(event) => {
                  const updatedEvent = { ...event, published: !event.published } as Event;
                  dispatch({ firestoreAction: 'UPDATE_EVENT', payload: updatedEvent });
                }}
                onManageQuestions={(event) => { setActiveEventForQuestions(event); setShowEventQModal(true); }}
              />
            )}
            {activeTab === 'team' && (
              <TeamTab
                members={state.teamMembers}
                onAddClick={() => setShowTeamModal(true)}
                onEdit={(member) => handleEditTeamMember(member)}
                onDelete={(id) => handleDeleteTeamMember(id)}
                onTogglePublish={(member) => {
                  const patched = { ...member, published: !member.published } as TeamMember;
                  dispatch({ firestoreAction: 'UPDATE_TEAM_MEMBER', payload: patched });
                }}
              />
            )}
            {activeTab === 'blog' && (
              <BlogTab
                posts={state.blogPosts}
                onAddClick={() => setShowBlogModal(true)}
                onEdit={(post) => handleEditBlogPost(post)}
                onDelete={(id) => handleDeleteBlogPost(id)}
                onTogglePublish={(post) => toggleBlogPostVisibility(post)}
              />
            )}
            {activeTab === 'analytics' && (
              <AnalyticsTab
                stats={{
                  upcomingEvents: state.events.filter(e => e.status === 'upcoming').length,
                  pastEvents: state.events.filter(e => e.status === 'past').length,
                  totalRegistrations: state.events.reduce((sum, e) => sum + (e.currentRegistrations || 0), 0),
                  publishedArticles: state.blogPosts.filter(p => p.published).length,
                  draftArticles: state.blogPosts.filter(p => !p.published).length,
                  teamMembers: state.teamMembers.length,
                }}
              />
            )}
            {activeTab === 'faq' && (
              <FAQTab
                faqs={state.faqs}
                onAddClick={() => { setEditingFaq(null); setFaqForm({ question: '', answer: '', category: 'General', order: state.faqs.length + 1, published: true }); setShowFaqModal(true); }}
                onEdit={(faq) => { setEditingFaq(faq); setFaqForm({ question: faq.question, answer: faq.answer, category: faq.category, order: faq.order, published: faq.published }); setShowFaqModal(true); }}
                onDelete={(id) => handleDeleteFaq(id)}
              />
            )}
            {activeTab === 'registration' && (
              <RegistrationTab
                questions={state.registrationQuestions}
                onAddClick={() => { setEditingRegQ(null); setRegQForm({ question: '', type: 'text', options: [], required: true, order: state.registrationQuestions.length + 1, eventTypes: [] }); setShowRegQModal(true); }}
                onEdit={(q) => { setEditingRegQ(q); setRegQForm({ question: q.question, type: q.type, options: q.options || [], required: q.required, order: q.order, eventTypes: q.eventTypes || [] }); setShowRegQModal(true); }}
                onDelete={(id) => handleDeleteRegQ(id)}
              />
            )}
          </div>

          {/* Event Modal */}
          {showEventModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    {editingItem ? 'Edit Event' : 'Add New Event'}
                  </h2>
                  <button
                    onClick={() => {
                      setShowEventModal(false);
                      resetForms();
                    }}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <form onSubmit={(e) => {
                  e.preventDefault();
                  if (editingItem) {
                    handleUpdateEvent();
                  } else {
                    handleAddEvent();
                  }
                }} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 text-black dark:text-white">Title</label>
                    <input
                      type="text"
                      value={eventForm.title}
                      onChange={(e) => setEventForm(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 text-black dark:text-white">Description</label>
                    <textarea
                      value={eventForm.description}
                      onChange={(e) => setEventForm(prev => ({ ...prev, description: e.target.value }))}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1 text-black dark:text-white">Date</label>
                      <input
                        type="date"
                        value={eventForm.date}
                        onChange={(e) => setEventForm(prev => ({ ...prev, date: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1 text-black dark:text-white">Time</label>
                      <input
                        type="time"
                        value={eventForm.time}
                        onChange={(e) => setEventForm(prev => ({ ...prev, time: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 text-black dark:text-white">Location</label>
                    <input
                      type="text"
                      value={eventForm.location}
                      onChange={(e) => setEventForm(prev => ({ ...prev, location: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 text-black dark:text-white">Image URL</label>
                    <input
                      type="url"
                      value={eventForm.image}
                      onChange={(e) => setEventForm(prev => ({ ...prev, image: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                      placeholder="Optional; a placeholder will be used if empty"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 text-black dark:text-white">Category</label>
                    <select
                      value={eventForm.category}
                      onChange={(e) => setEventForm(prev => ({ ...prev, category: e.target.value as 'workshop' | 'seminar' | 'competition' | 'social' }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      <option value="workshop">Workshop</option>
                      <option value="seminar">Seminar</option>
                      <option value="competition">Competition</option>
                      <option value="social">Social</option>
                    </select>
                  </div>

                  <div className="flex items-center space-x-4">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={eventForm.registrationRequired}
                        onChange={(e) => setEventForm(prev => ({ ...prev, registrationRequired: e.target.checked }))}
                        className="mr-2"
                      />
                      Registration Required
                    </label>

                    {eventForm.registrationRequired && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1 text-black dark:text-white">Max Capacity</label>
                        <input
                          type="number"
                          value={eventForm.maxCapacity}
                          onChange={(e) => setEventForm(prev => ({ ...prev, maxCapacity: parseInt(e.target.value) || 0 }))}
                          className="w-24 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                          min="1"
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end space-x-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowEventModal(false);
                        resetForms();
                      }}
                    >
                      Cancel
                    </Button>
                    <Button type="submit">
                      {editingItem ? 'Update Event' : 'Create Event'}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Team Modal */}
          {showTeamModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    {editingItem ? 'Edit Team Member' : 'Add New Team Member'}
                  </h2>
                  <button
                    onClick={() => {
                      setShowTeamModal(false);
                      resetForms();
                    }}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <form onSubmit={(e) => {
                  e.preventDefault();
                  if (editingItem) {
                    handleUpdateTeamMember();
                  } else {
                    handleAddTeamMember();
                  }
                }} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                    <input
                      type="text"
                      value={teamForm.name}
                      onChange={(e) => setTeamForm(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
                    <input
                      type="text"
                      value={teamForm.position}
                      onChange={(e) => setTeamForm(prev => ({ ...prev, position: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                    <textarea
                      value={teamForm.bio}
                      onChange={(e) => setTeamForm(prev => ({ ...prev, bio: e.target.value }))}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Profile Image URL</label>
                    <input
                      type="url"
                      value={teamForm.image}
                      onChange={(e) => setTeamForm(prev => ({ ...prev, image: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                      placeholder="Optional; a placeholder will be used if empty"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">LinkedIn URL (optional)</label>
                    <input
                      type="url"
                      value={teamForm.linkedin}
                      onChange={(e) => setTeamForm(prev => ({ ...prev, linkedin: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>

                  <div className="flex justify-end space-x-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowTeamModal(false);
                        resetForms();
                      }}
                    >
                      Cancel
                    </Button>
                    <Button type="submit">
                      {editingItem ? 'Update Member' : 'Add Member'}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Blog Modal */}
          {showBlogModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    {editingItem ? 'Edit Blog Post' : 'Create New Blog Post'}
                  </h2>
                  <button
                    onClick={() => {
                      setShowBlogModal(false);
                      resetForms();
                    }}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <form onSubmit={(e) => {
                  e.preventDefault();
                  if (editingItem) {
                    handleUpdateBlogPost();
                  } else {
                    handleAddBlogPost();
                  }
                }} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 text-black dark:text-white">Title</label>
                    <input
                      type="text"
                      value={blogForm.title}
                      onChange={(e) => setBlogForm(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 text-black dark:text-white">Excerpt</label>
                    <textarea
                      value={blogForm.excerpt}
                      onChange={(e) => setBlogForm(prev => ({ ...prev, excerpt: e.target.value }))}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 text-black dark:text-white">Content</label>
                    <textarea
                      value={blogForm.content}
                      onChange={(e) => setBlogForm(prev => ({ ...prev, content: e.target.value }))}
                      rows={8}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1 text-black dark:text-white">Author</label>
                      <input
                        type="text"
                        value={blogForm.author}
                        onChange={(e) => setBlogForm(prev => ({ ...prev, author: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1 text-black dark:text-white">Featured Image URL</label>
                      <input
                        type="url"
                        value={blogForm.image}
                        onChange={(e) => setBlogForm(prev => ({ ...prev, image: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                        placeholder="Optional; a placeholder will be used if empty"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 text-black dark:text-white">Tags</label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {blogForm.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-gray-100 text-gray-700 text-sm rounded flex items-center"
                        >
                          {tag}
                          <button
                            type="button"
                            onClick={() => removeTag(tag)}
                            className="ml-1 text-gray-500 hover:text-gray-700"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addTag();
                          }
                        }}
                        placeholder="Add a tag..."
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                      <Button type="button" onClick={addTag} size="sm">
                        Add Tag
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={blogForm.published}
                        onChange={(e) => setBlogForm(prev => ({ ...prev, published: e.target.checked }))}
                        className="mr-2"
                      />
                      Publish immediately
                    </label>
                  </div>

                  <div className="flex justify-end space-x-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowBlogModal(false);
                        resetForms();
                      }}
                    >
                      Cancel
                    </Button>
                    <Button type="submit">
                      {editingItem ? 'Update Post' : 'Create Post'}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}

          <FAQModal
            open={showFaqModal}
            onClose={() => { setShowFaqModal(false); setEditingFaq(null); }}
            form={faqForm}
            setForm={setFaqForm}
            editing={!!editingFaq}
            onAdd={handleAddFaq}
            onUpdate={handleUpdateFaq}
          />

          <RegistrationQuestionModal
            open={showRegQModal}
            editing={!!editingRegQ}
            form={regQForm}
            setForm={setRegQForm}
            onClose={() => { setShowRegQModal(false); setEditingRegQ(null); }}
            onAdd={handleAddRegQ}
            onUpdate={handleUpdateRegQ}
          />

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
        </div>
      </div>
    </AdminGate>
  );
};

export default AdminDashboard;