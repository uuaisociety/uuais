import React, { useEffect, useState } from 'react';
import { 
  Calendar, 
  Users, 
  FileText, 
  TrendingUp, 
  Plus,
  Edit3,
  Trash2,
  Eye,
  EyeOff
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { useApp } from '@/contexts/AppContext';
import { updatePageMeta } from '@/utils/seo';
import { format } from 'date-fns';

export const AdminDashboard: React.FC = () => {
  const { state, dispatch } = useApp();
  const [activeTab, setActiveTab] = useState<'events' | 'team' | 'blog' | 'analytics'>('events');

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

  const handleDeleteEvent = (eventId: string) => {
    if (window.confirm('Are you sure you want to delete this event?')) {
      dispatch({ type: 'DELETE_EVENT', payload: eventId });
    }
  };

  const handleDeleteTeamMember = (memberId: string) => {
    if (window.confirm('Are you sure you want to remove this team member?')) {
      dispatch({ type: 'DELETE_TEAM_MEMBER', payload: memberId });
    }
  };

  const handleDeleteBlogPost = (postId: string) => {
    if (window.confirm('Are you sure you want to delete this blog post?')) {
      dispatch({ type: 'DELETE_BLOG_POST', payload: postId });
    }
  };

  const toggleBlogPostVisibility = (post: any) => {
    dispatch({
      type: 'UPDATE_BLOG_POST',
      payload: { ...post, published: !post.published }
    });
  };

  const renderEventsTab = () => (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Events Management</h2>
        <Button icon={Plus}>Add New Event</Button>
      </div>
      
      <div className="grid gap-4">
        {state.events.map((event) => (
          <Card key={event.id}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {event.title}
                    </h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      event.status === 'upcoming' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {event.status}
                    </span>
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                      {event.category}
                    </span>
                  </div>
                  <p className="text-gray-600 mb-2">{event.description}</p>
                  <div className="text-sm text-gray-500">
                    <span className="mr-4">📅 {format(new Date(event.date), 'MMM d, yyyy')}</span>
                    <span className="mr-4">🕒 {event.time}</span>
                    <span>📍 {event.location}</span>
                  </div>
                  {event.registrationRequired && (
                    <div className="text-sm text-gray-500 mt-1">
                      👥 {event.currentRegistrations || 0} / {event.maxCapacity} registered
                    </div>
                  )}
                </div>
                <div className="flex space-x-2 ml-4">
                  <Button size="sm" variant="outline" icon={Edit3}>Edit</Button>
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
    </div>
  );

  const renderTeamTab = () => (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Team Management</h2>
        <Button icon={Plus}>Add Team Member</Button>
      </div>
      
      <div className="grid md:grid-cols-2 gap-6">
        {state.teamMembers.map((member) => (
          <Card key={member.id}>
            <CardContent className="p-6">
              <div className="flex items-start space-x-4">
                <img
                  src={member.image}
                  alt={member.name}
                  className="w-16 h-16 rounded-full object-cover"
                />
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">{member.name}</h3>
                  <p className="text-red-600 font-medium mb-2">{member.position}</p>
                  <p className="text-gray-600 text-sm line-clamp-3">{member.bio}</p>
                  <div className="flex space-x-2 mt-4">
                    <Button size="sm" variant="outline" icon={Edit3}>Edit</Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      icon={Trash2}
                      onClick={() => handleDeleteTeamMember(member.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderBlogTab = () => (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Blog Management</h2>
        <Button icon={Plus}>New Article</Button>
      </div>
      
      <div className="grid gap-4">
        {state.blogPosts.map((post) => (
          <Card key={post.id}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{post.title}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      post.published 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {post.published ? 'Published' : 'Draft'}
                    </span>
                  </div>
                  <p className="text-gray-600 mb-2">{post.excerpt}</p>
                  <div className="text-sm text-gray-500 mb-2">
                    <span className="mr-4">👤 {post.author}</span>
                    <span>📅 {format(new Date(post.date), 'MMM d, yyyy')}</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {post.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex space-x-2 ml-4">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    icon={post.published ? EyeOff : Eye}
                    onClick={() => toggleBlogPostVisibility(post)}
                  >
                    {post.published ? 'Unpublish' : 'Publish'}
                  </Button>
                  <Button size="sm" variant="outline" icon={Edit3}>Edit</Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    icon={Trash2}
                    onClick={() => handleDeleteBlogPost(post.id)}
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
    </div>
  );

  const renderAnalyticsTab = () => (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Analytics Overview</h2>
      
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-gray-900">Event Statistics</h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-600">Upcoming Events</span>
                <span className="font-semibold">
                  {state.events.filter(e => e.status === 'upcoming').length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Past Events</span>
                <span className="font-semibold">
                  {state.events.filter(e => e.status === 'past').length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total Registrations</span>
                <span className="font-semibold">
                  {state.events.reduce((sum, event) => sum + (event.currentRegistrations || 0), 0)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-gray-900">Content Statistics</h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-600">Published Articles</span>
                <span className="font-semibold">
                  {state.blogPosts.filter(post => post.published).length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Draft Articles</span>
                <span className="font-semibold">
                  {state.blogPosts.filter(post => !post.published).length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Team Members</span>
                <span className="font-semibold">{state.teamMembers.length}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
          <p className="text-gray-600">Manage your UU AI Society content and events</p>
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
                    <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                    <p className="text-gray-600 text-sm">{stat.title}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Navigation Tabs */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {[
                { key: 'events', label: 'Events', icon: Calendar },
                { key: 'team', label: 'Team', icon: Users },
                { key: 'blog', label: 'Blog', icon: FileText },
                { key: 'analytics', label: 'Analytics', icon: TrendingUp }
              ].map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key as any)}
                  className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === key
                      ? 'border-red-500 text-red-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
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
        <div className="bg-white rounded-lg shadow-sm border p-6">
          {activeTab === 'events' && renderEventsTab()}
          {activeTab === 'team' && renderTeamTab()}
          {activeTab === 'blog' && renderBlogTab()}
          {activeTab === 'analytics' && renderAnalyticsTab()}
        </div>
      </div>
    </div>
  );
};