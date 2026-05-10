'use client'

// Disable static generation for this page
export const dynamic = 'force-dynamic';

import React, { useEffect } from 'react';
import { Target, Eye } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { useApp } from '@/contexts/AppContext';
import { updatePageMeta } from '@/utils/seo';
import TeamTabsSection from '@/components/team/TeamTabsSection';

const AboutPage: React.FC = () => {
  const { state } = useApp();

  useEffect(() => {
    updatePageMeta('About Us', 'Learn about UU AI Society\'s mission, vision, and the amazing team behind our community');
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-24 pb-8 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6">
            About UU AI Society
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed">
            We are a community of students passionate about artificial intelligence,
            dedicated to learning, innovation, and shaping the future of technology.
          </p>
        </div>

        {/* Mission & Vision */}
        <div className="grid md:grid-cols-2 gap-12 mb-16">
          <Card className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
            <CardHeader>
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-3 bg-red-600 rounded-lg">
                  <Target className="h-6 w-6 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Our Mission</h2>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                To democratize AI education and create an inclusive environment where students
                can explore, learn, and contribute to the advancement of artificial intelligence
                outside the classroom.
                We believe in hands-on learning, collaborative innovation, and building bridges
                between academic knowledge and real-world applications.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
            <CardHeader>
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-3 bg-blue-600 rounded-lg">
                  <Eye className="h-6 w-6 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Our Vision</h2>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                A student led non-profit that cultivates the
                next generation of AI builders and leaders
                at UU by connecting students with the
                forefront of AI innovation.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Team Section */}
        <TeamTabsSection members={state.teamMembers} />
      </div>
    </div>
  );
};

export default AboutPage;