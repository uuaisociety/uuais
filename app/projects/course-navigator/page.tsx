'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/Button';
import { ArrowRight } from 'lucide-react';
import HeroSplash from '@/components/HeroSplash';
import { updatePageMeta } from '@/utils/seo';

export default function CourseNavigatorPage() {
  useEffect(() => {
    updatePageMeta('Course Navigator', 'AI-powered course recommendations for Uppsala University students');
  }, []);
  return (
    <div className="min-h-screen bg-background pt-24 pb-8 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link
          href="/projects"
          className="inline-flex items-center text-muted-foreground hover:text-foreground mb-8 transition-colors"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Projects
        </Link>

        {/* Hero CTA Section — theme-aware slab matching the landing page */}
        <HeroSplash className="rounded-lg py-4 mb-4">
          <div className="relative z-10 px-6 sm:px-10 py-16 text-center">
            <p className="mono-label text-current/45 mb-6">UU AI Society · Project</p>
            <h1 className="display-lg mb-5">
              Course Navigator
            </h1>
            <p className="text-base sm:text-lg text-current/60 max-w-2xl mx-auto leading-relaxed mb-8">
              Discover courses at Uppsala University using AI-powered recommendations. Search with natural language and explore course connections.
            </p>
            <Link href="/explore" className="inline-block">
              <Button
                size="lg"
                className="dark:bg-white dark:text-ink dark:hover:brightness-95 shadow-lg hover:shadow-xl transition-all"
              >
                Launch Course Navigator
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </HeroSplash>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">

            <div className="relative h-64 md:h-80 bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden mb-8">
              <Image
                src="/images/campus.png"
                alt="Course Navigator Preview"
                fill
                sizes="(max-width: 1024px) 100vw, 66vw"
                className="object-cover"
              />
            </div>

            <div className="prose dark:prose-invert max-w-none">
              <h2 className="text-xl font-semibold text-foreground mb-4">
                About This Project
              </h2>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                Course Navigator is an AI-powered tool designed to help students at Uppsala University
                navigate their course options and make informed decisions about their academic path. 
                With the increasing number of courses and specializations available, finding the right 
                combination can be overwhelming.
              </p>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                Our goal is to create a recommendation system that takes into account 
                your interests, career goals, and academic background to suggest the most suitable 
                courses and pathways.
              </p>
              {/*
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 mt-8">
                How It Works
              </h2>
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-red-600 text-white rounded-full flex items-center justify-center font-bold text-lg">
                    1
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      Create Your Profile
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300">
                      Sign up and tell us about your interests, current study program, and career aspirations.
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-red-600 text-white rounded-full flex items-center justify-center font-bold text-lg">
                    2
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      Get Personalized Recommendations
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300">
                      Our AI analyzes your profile and compares it with course data to suggest the most relevant options.
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-red-600 text-white rounded-full flex items-center justify-center font-bold text-lg">
                    3
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      Explore Course Details
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300">
                      Dive deep into each recommended course with detailed information about prerequisites, 
                      workload, and career outcomes.
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-red-600 text-white rounded-full flex items-center justify-center font-bold text-lg">
                    4
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      Plan Your Path
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300">
                      Create a personalized study plan and visualize your academic journey across multiple semesters.
                    </p>
                  </div>
                </div>
              </div>
              */}
              {/*
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 mt-8">
                Screenshots
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                <div className="relative h-48 bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden">
                  <div className="absolute inset-0 flex items-center justify-center text-gray-500 dark:text-gray-400">
                    Dashboard Preview
                  </div>
                </div>
                <div className="relative h-48 bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden">
                  <div className="absolute inset-0 flex items-center justify-center text-gray-500 dark:text-gray-400">
                    Recommendations Preview
                  </div>
                </div>
              </div>
              */}
              <h2 className="text-xl font-semibold text-foreground mb-4">
                Features Coming Soon
              </h2>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 leading-relaxed">
                <li>Integration with UU course catalog</li>
                <li>Course visualization</li>
                <li>Peer recommendations based on similar backgrounds</li>
                {/* <li>Export study plans to calendar apps</li> */}
              </ul>
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="glass rounded-lg p-6 sticky top-24">
              <h3 className="text-lg font-semibold text-foreground mb-4">
                Project Details
              </h3>
              <dl className="space-y-4">
                <div>
                  <dt className="mono-label text-muted-foreground">Status</dt>
                  <dd className="text-foreground font-medium">In Development</dd>
                </div>
                <div>
                  <dt className="mono-label text-muted-foreground">Team</dt>
                  <dd className="text-foreground font-medium">UU AI Society Dev Team</dd>
                </div>
                <div>
                  <dt className="mono-label text-muted-foreground">Tech Stack</dt>
                  <dd className="text-foreground font-medium">Next.js, TypeScript, AI/LLM</dd>
                </div>
              </dl>

              <div className="mt-6 pt-6 border-t border-border">
                <Button asChild variant="secondary" className="w-full">
                  <Link href="mailto:dev@uuais.com">
                    Contact the Team
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
