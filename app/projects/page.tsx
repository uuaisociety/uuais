import Link from 'next/link';
import Image from 'next/image';

const projects = [
  {
    slug: 'course-navigator',
    title: 'Course Navigator',
    description: 'An AI-powered tool to help students navigate their course options and make informed decisions about their academic path.',
    image: '/images/campus.png',
    status: 'In Development'
  }
];

export default function ProjectsPage() {
  return (
    <div className="min-h-screen pt-24 pb-8 bg-gray-50 dark:bg-gray-900 ">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Our Projects
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Explore the innovative projects we're working on at UU AI Society. 
            From educational tools to community resources, we're building solutions 
            to help our community thrive.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {projects.map((project) => (
            <Link
              key={project.slug}
              href={`/projects/${project.slug}`}
              className="group bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-shadow duration-300"
            >
              <div className="relative h-48 bg-gray-200 dark:bg-gray-700">
                <Image
                  src={project.image}
                  alt={project.title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute top-4 right-4 bg-red-600 text-white text-xs px-3 py-1 rounded-full">
                  {project.status}
                </div>
              </div>
              <div className="p-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">
                  {project.title}
                </h2>
                <p className="text-gray-600 dark:text-gray-300">
                  {project.description}
                </p>
              </div>
            </Link>
          ))}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Have an idea?
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            We're always looking for new project ideas and contributors. 
            If you have a suggestion or want to get involved, we'd love to hear from you.
          </p>
          <Link
            href="mailto:dev@uuais.com"
            className="inline-flex items-center px-6 py-3 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors"
          >
            Contact the Dev Team
          </Link>
        </div>
      </div>
    </div>
  );
}
