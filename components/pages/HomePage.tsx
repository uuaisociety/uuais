// Math.random in useMemo is intentional - need random positions for floating logo animation
/* eslint-disable react-hooks/purity */
'use client'

// Disable static generation for this page
export const dynamic = 'force-dynamic';

import React, { useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Calendar, Users, Zap, Globe, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { useApp } from '@/contexts/AppContext';
import { updatePageMeta } from '@/utils/seo';
import { format } from 'date-fns';
import campus from '@/public/images/campus.png';
import HeroAnimation from '@/components/HeroAnimation';

const categoryOptions = [
  { value: 'all', label: 'All Categories' },
  { value: 'workshop', label: 'Workshop' },
  { value: 'guest_lecture', label: 'Guest Lecture' },
  { value: 'hackathon', label: 'Hackathon' },
  { value: 'other', label: 'Other' },
];

const HomePage: React.FC = () => {
  const { state } = useApp();

  useEffect(() => {
    updatePageMeta('Home', 'UU AI Society - Connecting students passionate about Artificial Intelligence');
  }, []);

  const floatingLogos = useMemo(() => 
    [...Array(8)].map(() => ({
      seed: Math.random(),
      top: Math.random(),
      delaySeed: Math.random(),
      durationSeed: Math.random(),
    })), []
  );

  const floatingLogosMap = floatingLogos.map((logo: { seed: number; top: number; delaySeed: number; durationSeed: number }, i: number) => ({ logo, i }));

  const now = new Date();
  const upcomingEvents = state.events
    .filter(event => event.published === true)
    .filter(event => !event.publishAt || new Date(event.publishAt) <= now)
    .filter(event => event.eventStartAt && new Date(event.eventStartAt) > now)
    .slice(0, 3);

  const features = [
    {
      icon: BookOpen,
      title: 'AI Knowledge',
      description: 'Workshops and guest lectures from real industry professionals with knowledge of the latest in artificial intelligence and machine learning.'
    },
    {
      icon: Users,
      title: 'Community',
      description: 'Find like-minded students and connect with the AI community at large.'
    },
    {
      icon: Zap,
      title: 'Innovation',
      description: 'Work on projects and participate in hackathons to push your knowledge of AI and discover new opportunities.'
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
    <div className="relative min-h-screen bg-white dark:bg-gray-900 transition-colors duration-300">

      <div className="relative z-10 space-y-16">
         {/* Hero Section */}
         <section className="relative bg-gradient-to-br from-red-600 via-red-700 to-red-800 dark:from-red-700 dark:via-red-800 dark:to-red-900 text-white min-h-screen flex items-center">
           <div className="absolute inset-0 bg-black/20 dark:bg-black/40"></div>
           
           {/* Full-screen canvas for nabla + floating symbols */}
           <div className="absolute inset-0 pointer-events-none">
             <HeroAnimation />
           </div>

           <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
               <div className="grid lg:grid-cols-2 gap-12 items-center min-h-screen">
               {/* Animation area (left side) */}
               <div className="hidden lg:block order-2 lg:order-1">
                 {/* This is just a spacer for the grid */}
               </div>
               
               {/* Text Content */}
               <div className="flex items-center min-h-screen order-1 lg:order-2 text-center lg:text-left">
                 <div className="w-full">
                   <p className="text-lg font-semibold text-red-200 dark:text-red-300 tracking-widest uppercase mb-4">Welcome to UU AI Society</p>
                   <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight tracking-tight">
                   Where students
                   <span className="block">shape the</span>
                   <span className="block">future of AI</span>
                 </h1>
                  <p className="text-lg md:text-xl text-red-100 dark:text-red-50 mb-8 max-w-xl leading-relaxed">
                     Uppsala&apos;s student society for artificial intelligence — meet peers, learn, and build together.
                   </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                    <Link href="/events">
                       <Button variant="cta" size="xl" className="px-8 py-4 text-lg font-semibold hover:shadow-xl bg-white text-black dark:text-black hover:bg-red-50">
                         Our Events
                       </Button>
                     </Link>
                     <Link href="/about">
                         <Button
                           size="xl"
                           variant="outline"
                           className="px-8 py-4 text-lg font-semibold "
                         >
                         Learn more <ArrowRight className="ml-2 h-5 w-5" />
                       </Button>
                     </Link>
                  </div>
                </div>
               </div>
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
        <section className="py-16 bg-white dark:bg-gray-900 transition-colors duration-300">
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
                  Don&apos;t miss out on our latest workshops, guest lectures, and networking events.
                </p>
              </div>
              <Link href="/events">
                <Button variant="default">
                  View All Events
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>

            {upcomingEvents.length > 0 ? <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {upcomingEvents.map((event) => (
                <Card key={event.id} className="h-full group hover:shadow-2xl hover:scale-105 transition-all duration-300 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                  <div className="aspect-video relative overflow-hidden rounded-t-lg">
                    <Link href={`/events/${event.id}`} className="relative block w-full h-full">

                      <Image
                        src={event.image || campus}
                        alt={event.title}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        className="object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                    </Link>
                    <div className="absolute top-4 left-4">
                      <span className="px-3 py-1 bg-red-600 dark:bg-red-500 text-white text-sm font-medium rounded-full">
                        {categoryOptions.find(option => option.value === event.category)?.label || event.category}
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
                        {(() => {
                          const d = new Date(event.eventStartAt);
                          return `${format(d, 'MMM d, yyyy')} at ${format(d, 'HH:mm')}`;
                        })()}
                      </span>
                    </div>
                    <Button variant="outline" size="sm" className="hover:scale-105 transition-all duration-300 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                      Learn More
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
            : <i className="text-gray-600 dark:text-gray-300">No events found. Please check back later.</i>
            }
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