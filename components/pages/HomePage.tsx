'use client'

// Disable static generation for this page
export const dynamic = 'force-dynamic';

import React, { useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Calendar, Users, Brain, Zap, Globe } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { useApp } from '@/contexts/AppContext';
import { updatePageMeta } from '@/utils/seo';
import { format } from 'date-fns';

const HomePage: React.FC = () => {
  const { state } = useApp();

  useEffect(() => {
    updatePageMeta('Home', 'UU AI Society - Connecting students passionate about Artificial Intelligence');
  }, []);

  const upcomingEvents = state.events
    .filter(event => event.status === 'upcoming')
    .slice(0, 3);

  const features = [
    {
      icon: Brain,
      title: 'AI Education',
      description: 'Comprehensive workshops and seminars from real industry professionals covering the latest in artificial intelligence and machine learning.'
    },
    {
      icon: Users,
      title: 'Community',
      description: 'Connect with like-minded students and build lasting relationships and connections in the AI community.'
    },
    {
      icon: Zap,
      title: 'Innovation',
      description: 'Work on cutting-edge projects and participate in hackathons to push the boundaries of AI.'
    },
    {
      icon: Globe,
      title: 'Industry Connections',
      description: 'Network with industry professionals and gain insights into career opportunities in AI, from startups to international giants.'
    }
  ];

  // const stats = [
  //   { number: '500+', label: 'Active Members' },
  //   { number: '50+', label: 'Events Hosted' },
  //   { number: '25+', label: 'Industry Partners' },
  //   { number: '3', label: 'Years of Excellence' }
  // ];

  return (
    <div className="relative min-h-screen bg-white dark:bg-gray-950 pt-16 transition-colors duration-300">
      {/* Floating Logo Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        {[...Array(15)].map((_, i) => (
          <div
            key={i}
            className="absolute opacity-5 dark:opacity-10 animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 10}s`,
              animationDuration: `${15 + Math.random() * 10}s`
            }}
          >
            <Image
              src="/images/logo.png"
              alt=""
              width={48}
              height={48}
              className="w-12 h-12 md:w-16 md:h-16 opacity-30"
            />
          </div>
        ))}
      </div>

      <div className="relative z-10 space-y-16">
        {/* Hero Section */}
        <section className="relative bg-gradient-to-br from-red-600 via-red-700 to-red-800 dark:from-red-700 dark:via-red-800 dark:to-red-900 text-white py-20 overflow-hidden">
          <div className="absolute inset-0 bg-black/20 dark:bg-black/40"></div>
          <div className="absolute inset-0">
            <div className="absolute top-10 left-10 w-20 h-20 bg-white/5 rounded-full animate-pulse"></div>
            <div className="absolute top-32 right-20 w-16 h-16 bg-white/5 rounded-full animate-pulse" style={{animationDelay: '1s'}}></div>
            <div className="absolute bottom-20 left-1/4 w-12 h-12 bg-white/5 rounded-full animate-pulse" style={{animationDelay: '2s'}}></div>
          </div>
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
              Welcome to 
              <span className="block">UU AI Society</span>
            </h1>
            <p className="text-xl md:text-2xl text-red-100 dark:text-red-50 mb-8 max-w-3xl mx-auto leading-relaxed">
              Join the next generation of AI innovators. Learn, create, and shape the future of artificial intelligence.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/events" className="">
              <Button className="glow-on-hover h-full px-12 py-4 text-lg font-semibold hover:shadow-xl">
                  <span className="ml-4">View Events</span>
                  <ArrowRight className="ml-2 mr-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/events">
              <Button 
                size="lg"
                variant="outline"
                className="glow-on-hover px-8 py-4 text-lg h-full border-white text-white hover:bg-white text-black hover:shadow-xl"
              >
                  Contact us
              </Button>
            </Link>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        {/* <section className="py-16 bg-gray-50 dark:bg-gray-800/50 transition-colors duration-300">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
              {stats.map((stat, index) => (
                <div key={index} className="text-center group hover:transform hover:scale-105 transition-all duration-300">
                  <div className="text-3xl md:text-4xl font-bold text-red-600 dark:text-red-400 mb-2 group-hover:text-red-700 dark:group-hover:text-red-300 transition-colors duration-300">
                    {stat.number}
                  </div>
                  <div className="text-gray-600 dark:text-gray-300 font-medium">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section> */}

        {/* Features Section */}
        <section className="py-16 bg-white dark:bg-gray-950 transition-colors duration-300">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                Why Join UU AI Society?
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
                Discover the opportunities that await you in our community of AI enthusiasts.
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {features.map((feature, index) => (
                <Card key={index} className="text-center h-full group hover:shadow-2xl hover:scale-105 transition-all duration-300 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                  <CardHeader>
                    <div className="mx-auto w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center mb-4 group-hover:bg-red-200 dark:group-hover:bg-red-800/50 transition-colors duration-300">
                      <feature.icon className="h-6 w-6 text-red-600 dark:text-red-400 group-hover:scale-110 transition-transform duration-300" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                      {feature.title}
                    </h3>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 dark:text-gray-300">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Upcoming Events */}
        <section className="py-16 bg-gray-50 dark:bg-gray-800/50 transition-colors duration-300">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-12">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                  Upcoming Events
                </h2>
                <p className="text-xl text-gray-600 dark:text-gray-300">
                  Don&apos;t miss out on our latest workshops, seminars, and networking events.
                </p>
              </div>
              <Link href="/events">
              <Button variant="outline" className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                  View All Events
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              </Link>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {upcomingEvents.map((event) => (
                <Card key={event.id} className="h-full group hover:shadow-2xl hover:scale-105 transition-all duration-300 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                  <div className="aspect-video relative overflow-hidden rounded-t-lg">
                    <Image
                      src={event.image}
                      alt={event.title}
                      fill
                      className="object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                    <div className="absolute top-4 left-4">
                      <span className="px-3 py-1 bg-red-600 dark:bg-red-500 text-white text-sm font-medium rounded-full">
                        {event.category}
                      </span>
                    </div>
                  </div>
                  <CardContent className="p-6">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                      {event.title}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300 mb-4 line-clamp-2">
                      {event.description}
                    </p>
                    <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mb-4">
                      <Calendar className="h-4 w-4 mr-2" />
                      <span>
                        {format(new Date(event.date), 'MMM d, yyyy')} at {event.time}
                      </span>
                    </div>
                    <Button variant="outline" size="sm" className="hover:scale-105 transition-all duration-300 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                      Learn More
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        {/* <section className="relative bg-gradient-to-br from-red-600 via-red-700 to-red-800 dark:from-red-700 dark:via-red-800 dark:to-red-900 text-white py-20 overflow-hidden">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="absolute inset-0 bg-black/20 dark:bg-black/40"></div>
            <Award className="h-16 w-16 mx-auto mb-6 text-yellow-300 dark:text-yellow-400 animate-bounce" />
            <h2 className="text-3xl md:text-4xl font-bold mb-4 ">
              Ready to Start Your AI Journey?
            </h2>
            <p className="text-xl text-red-100 dark:text-red-75 mb-8 max-w-2xl mx-auto">
              Join hundreds of students who are already exploring the exciting world of artificial intelligence with us.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="glow-on-hover px-8 py-4 text-lg font-semibold">
                <Link href="/join" className="flex items-center">
                  Become a Member
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </button>
              <Button 
                size="lg"
                variant="outline"
                className="px-8 py-4 text-lg h-full border-white text-white hover:bg-white text-black transform hover:scale-105 transition-all duration-300 hover:shadow-xl"
              >
                <Link href="/contact">
                  Get in Touch
                </Link>
              </Button>
            </div>
          </div>
        </section> */}
      </div>
    </div>
  );
};

export default HomePage;