'use client'

// Disable static generation for this page
export const dynamic = 'force-dynamic';

import React, { useEffect, useState } from 'react';
import {
  Calendar,
  Users,
  FileText,
  TrendingUp,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import EventsTab from '@/components/pages/admin/tabs/EventsTab';
import TeamTab from '@/components/pages/admin/tabs/TeamTab';
import BlogTab from '@/components/pages/admin/tabs/BlogTab';
import FAQTab from '@/components/pages/admin/tabs/FAQTab';
import AnalyticsTab from '@/components/pages/admin/tabs/AnalyticsTab';
import FAQModal from '@/components/pages/admin/modals/FAQModal';
import BlogModal from '@/components/pages/admin/modals/BlogModal';
import { useApp } from '@/contexts/AppContext';
import { updatePageMeta } from '@/utils/seo';
//import { useAdmin } from '@/hooks/useAdmin';
// format imported where needed in tab components
import { BlogPost, Event, TeamMember, FAQ } from '@/types';
import MembersTab from '@/components/pages/admin/tabs/membersTab';

const AdminDashboard: React.FC = () => {
  const { state, dispatch } = useApp();
  //const { user, logout } = useAdmin();
  const [activeTab, setActiveTab] = useState<'events' | 'team' | 'blog' | 'faq' | 'analytics' | 'members'>('events');
  const placeholderImage = '@/public/placeholder.png';

  // Modal states
  const [showBlogModal, setShowBlogModal] = useState(false);
  const [showFaqModal, setShowFaqModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Event | TeamMember | BlogPost | null>(null);
  const [editingFaq, setEditingFaq] = useState<FAQ | null>(null);

  // Event form and event CRUD moved into EventsTab/EventModal

  // TeamTab manages team form/modal state now.

  const [blogForm, setBlogForm] = useState({
    title: '',
    excerpt: '',
    content: '',
    author: '',
    image: '',
    tags: [] as string[],
    published: false
  });


  const [faqForm, setFaqForm] = useState<Pick<FAQ, 'question' | 'answer' | 'category' | 'order' | 'published'>>({
    question: '',
    answer: '',
    category: 'General',
    order: state.faqs.length + 1,
    published: true,
  });

  // Registration Questions UI removed as unused

  useEffect(() => {
    updatePageMeta('Admin Dashboard', 'Manage UU AI Society content and events');
  }, []);

  // No-op; members tab loads internally

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
      title: 'Newsletter Posts',
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
    setBlogForm({
      title: '',
      excerpt: '',
      content: '',
      author: '',
      image: '',
      tags: [],
      published: false
    });
    setEditingItem(null);
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

  // Registration Questions handlers removed as unused


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

  // Events are managed within the EventsTab component (add/edit/delete/publish live there now).

  const handleUpdateBlogPost = () => {
    if (editingItem) {
      const updatedPost = { ...editingItem, ...blogForm } as BlogPost;
      dispatch({ firestoreAction: 'UPDATE_BLOG_POST', payload: updatedPost });
      setShowBlogModal(false);
      resetForms();
    }
  };


  const handleDeleteBlogPost = (postId: string) => {
    if (window.confirm('Are you sure you want to delete this blog post?')) {
      dispatch({ firestoreAction: 'DELETE_BLOG_POST', payload: postId });
    }
  };

  // Tag input management moved into BlogModal component

  const toggleBlogPostVisibility = (post: BlogPost) => {
    dispatch({
      type: 'UPDATE_BLOG_POST',
      payload: { ...post, published: !post.published }
    });
  };




  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 pt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex justify-between items-start gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Admin Dashboard</h1>
            <p className="text-gray-600 dark:text-gray-300">Manage your UU AI Society content and events</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <Card key={index}>
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
                { key: 'blog', label: 'Newsletter', icon: FileText },
                { key: 'faq', label: 'FAQ', icon: FileText },
                { key: 'analytics', label: 'Analytics', icon: TrendingUp },
                { key: 'members', label: 'Members', icon: Users },
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
              onManageQuestions={() => {}}
              onViewRegistrations={() => {}}
            />
          )}
          {activeTab === 'team' && (
            <TeamTab
              members={state.teamMembers}
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
              events={state.events.map(e => ({
                id: e.id,
                title: e.title,
                date: e.eventStartAt,
                currentRegistrations: e.currentRegistrations || 0,
              }))}
              blogs={state.blogPosts.map(b => ({ id: b.id, title: b.title, date: b.date }))}
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
          {activeTab === 'members' && (
            <MembersTab onChanged={() => { /* could trigger toast */ }} />
          )}

          {/* Blog Modal */}
          <BlogModal
            open={showBlogModal}
            editing={!!editingItem}
            form={blogForm}
            setForm={setBlogForm}
            onClose={() => { setShowBlogModal(false); resetForms(); }}
            onSubmit={() => {
              if (editingItem) {
                handleUpdateBlogPost();
              } else {
                handleAddBlogPost();
              }
            }}
          />

          <FAQModal
            open={showFaqModal}
            onClose={() => { setShowFaqModal(false); setEditingFaq(null); }}
            form={faqForm}
            setForm={setFaqForm}
            editing={!!editingFaq}
            onAdd={handleAddFaq}
            onUpdate={handleUpdateFaq}
          />

          {/* Registration questions are currently unused; modal intentionally not rendered. */}

        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;