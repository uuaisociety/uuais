import Link from 'next/link';
import Image from 'next/image';

export default function CourseNavigatorPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link
          href="/projects"
          className="inline-flex items-center text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 mb-8"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Projects
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Course Navigator
            </h1>
            <div className="flex items-center gap-4 mb-6">
              <span className="bg-red-600 text-white text-sm px-3 py-1 rounded-full">
                In Development
              </span>
              <span className="text-gray-500 dark:text-gray-400">
                Last updated: February 2026
              </span>
            </div>

            <div className="relative h-64 md:h-96 bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden mb-8">
              <Image
                src="/images/campus.png"
                alt="Course Navigator Preview"
                fill
                className="object-cover"
              />
            </div>

            <div className="prose dark:prose-invert max-w-none">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                About This Project
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                Course Navigator is an AI-powered tool designed to help students at Uppsala University
                navigate their course options and make informed decisions about their academic path. 
                With the increasing number of courses and specializations available, finding the right 
                combination can be overwhelming.
              </p>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                Our goal is to create a personalized recommendation system that takes into account 
                your interests, career goals, and academic background to suggest the most suitable 
                courses and pathways.
              </p>

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

              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Coming Soon Features
              </h2>
              <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 space-y-2">
                <li>Integration with UU course catalog</li>
                <li>AI-powered study plan optimization</li>
                <li>Peer recommendations based on similar backgrounds</li>
                <li>Export study plans to calendar apps</li>
              </ul>
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 sticky top-24">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                Project Details
              </h3>
              <dl className="space-y-4">
                <div>
                  <dt className="text-sm text-gray-500 dark:text-gray-400">Status</dt>
                  <dd className="text-gray-900 dark:text-white font-medium">In Development</dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500 dark:text-gray-400">Team</dt>
                  <dd className="text-gray-900 dark:text-white font-medium">UU AI Society Dev Team</dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500 dark:text-gray-400">Tech Stack</dt>
                  <dd className="text-gray-900 dark:text-white font-medium">Next.js, TypeScript, AI/LLM</dd>
                </div>
              </dl>

              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <Link
                  href="mailto:dev@uuais.com"
                  className="block w-full text-center px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors"
                >
                  Contact the Team
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
