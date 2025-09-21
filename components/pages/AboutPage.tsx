'use client'

// Disable static generation for this page
export const dynamic = 'force-dynamic';

import React, { useEffect } from 'react';
import { Mail, Target, Eye, Globe } from 'lucide-react';
import { Linkedin01Icon, GithubIcon }  from 'hugeicons-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { useApp } from '@/contexts/AppContext';
import { updatePageMeta } from '@/utils/seo';
import Image from 'next/image';
import Link from 'next/link';

const AboutPage: React.FC = () => {
  const { state } = useApp();

  useEffect(() => {
    updatePageMeta('About Us', 'Learn about UU AI Society\'s mission, vision, and the amazing team behind our community');
  }, []);

  // const achievements = [
  //   {
  //     icon: Award,
  //     title: 'Best Student Organization 2023',
  //     description: 'Recognized for outstanding contribution to AI education'
  //   },
  //   {
  //     icon: Users,
  //     title: '500+ Members Strong',
  //     description: 'Building the largest AI community on campus'
  //   },
  //   {
  //     icon: Target,
  //     title: '50+ Successful Events',
  //     description: 'Workshops, seminars, and hackathons that matter'
  //   }
  // ];

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
                To be the leading student organization in Uppsala that shapes the next generation of AI 
                leaders, innovators, and ethical practitioners. We envision a future where our 
                members become catalysts for positive change in the global AI industry, contributing 
                to solutions that benefit humanity.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Achievements */}
        {/* <div className="mb-16">
          <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-12">
            Our Achievements
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {achievements.map((achievement, index) => (
              <Card key={index} className="text-center hover:shadow-2xl hover:scale-105 transition-all duration-300 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                <CardHeader>
                  <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
                    <achievement.icon className="h-8 w-8 text-red-600 dark:text-red-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                    {achievement.title}
                  </h3>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 dark:text-gray-300">
                    {achievement.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div> */}

        {/* Team Section */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-12">
            Meet Our Team
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {state.teamMembers.filter(member => member.published !== false).map((member) => (
              <Card key={member.id} className="text-center hover:shadow-2xl hover:scale-105 transition-all duration-300 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                <CardHeader>
                  <div className="mx-auto mb-4">
                    <Image
                      src={member.image}
                      alt={member.name}
                      width={100}
                      height={100}
                      className="w-24 h-24 rounded-full object-cover mx-auto border-4 border-red-100 dark:border-red-800"
                    />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">
                    {member.name}
                  </h3>
                  <p className="text-red-600 dark:text-red-400 font-medium mb-3">
                    {member.position}
                  </p>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 dark:text-gray-300 text-sm mb-4 leading-relaxed">
                    {member.bio}
                  </p>
                  <div className="flex justify-center space-x-3">
                    {/* Personal email */}
                    {/* {member.personalEmail && (
                      <a
                        href={`mailto:${member.personalEmail}`}
                        className="p-2 text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                        aria-label={`Email ${member.name}`}
                      >
                        <Mail className="h-4 w-4" />
                      </a>
                    )} */}
                    {/* Organization email */}
                    {member.companyEmail && (
                      <a
                        href={`mailto:${member.companyEmail}`}
                        className="p-2 text-gray-400 dark:text-gray-600 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                        aria-label={`Email (organization) ${member.name}`}
                      >
                        <Mail className="h-4 w-4" />
                      </a>
                    )}
                    {/* Backward compatibility: generic email field */}
                    {!member.personalEmail && !member.companyEmail && member.email && (
                      <a
                        href={`mailto:${member.email}`}
                        className="p-2 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                        aria-label={`Email ${member.name}`}
                      >
                        <Mail className="h-4 w-4" />
                      </a>
                    )}
                    {/* LinkedIn */}
                    {member.linkedin && (
                      <a
                        href={member.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                        aria-label={`LinkedIn profile of ${member.name}`}
                      >
                        <Linkedin01Icon className="h-4 w-4" />
                      </a>
                    )}
                    {/* GitHub */}
                    {member.github && (
                      <a
                        href={member.github}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                        aria-label={`GitHub profile of ${member.name}`}
                      >
                        <GithubIcon className="h-4 w-4" />
                      </a>
                    )}
                    {/* Website */}
                    {member.website && (
                      <a
                        href={member.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                        aria-label={`Website of ${member.name}`}
                      >
                        <Globe className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Call to Action */}
        <section className="relative bg-gradient-to-r from-red-600 to-red-700 dark:from-red-700 dark:to-red-800 rounded-2xl p-12 text-center text-white transition-colors duration-300">
          <div className="absolute inset-0 bg-black/20"></div>

          <h2 className="text-4xl md:text-6xl font-bold mb-6 text-white  leading-tight">
            Ready to Join Our Mission?
          </h2>
          <p className="text-xl text-white mb-8 max-w-2xl mx-auto">
            Be part of a community that&apos;s shaping the future of AI. Connect, learn, and grow with us.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {/* <Button 
              size="lg"
              variant="secondary"
              className="bg-white text-red-600 hover:bg-gray-100 transform hover:scale-105 transition-all duration-300"
            >
              Become a Member
            </Button> */}
            <Link href="/contact">
            <Button 
              size="lg"
              variant="outline"
              className="border-white text-white hover:bg-white hover:text-red-600 transform hover:scale-105 transition-all duration-300"
            >
              Contact Us
            </Button>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
};

export default AboutPage;