import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/Button';

export const metadata: Metadata = {
  title: 'Projects',
  description: 'Explore the innovative projects at UU AI Society',
};

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
    <div className="min-h-screen bg-background pt-24 pb-8 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <p className="mono-label text-muted-foreground mb-6">UU AI Society · Build</p>
          <h1 className="display-lg text-foreground mb-4">
            Our Projects
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Explore the innovative projects we're working on at UU AI Society. 
            From educational tools to community resources, we're building solutions 
            to help our community thrive.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-16">
          {projects.map((project) => (
            <Link
              key={project.slug}
              href={`/projects/${project.slug}`}
              className="group glass glass-interactive flex flex-col overflow-hidden rounded-md"
            >
              <div className="relative aspect-[16/10] overflow-hidden bg-gray-200 dark:bg-gray-700">
                <Image
                  src={project.image}
                  alt={project.title}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:scale-[1.04]"
                />
                <span className="absolute top-3 right-3 pill bg-black/45 text-white backdrop-blur-md">
                  {project.status}
                </span>
              </div>
              <div className="flex flex-col flex-1 p-5">
                <h2 className="text-[1.0625rem] font-semibold tracking-[-0.02em] leading-snug mb-2 group-hover:text-primary transition-colors">
                  {project.title}
                </h2>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {project.description}
                </p>
              </div>
            </Link>
          ))}
        </div>

        <div className="glass rounded-lg p-8">
          <h2 className="text-xl font-semibold text-foreground mb-4">
            Have an idea?
          </h2>
          <p className="text-muted-foreground mb-6 leading-relaxed">
            We're always looking for new project ideas and contributors. 
            If you have a suggestion or want to get involved, we'd love to hear from you.
          </p>
          <Button asChild>
            <Link href="mailto:alexander.andersson@uuais.com">
              Contact the Dev Team
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
