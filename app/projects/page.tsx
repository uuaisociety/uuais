import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import ProjectsGrid, { type ProjectEntry } from '@/components/pages/ProjectsGrid';

export const metadata: Metadata = {
  title: 'Projects',
  description: 'Explore the innovative projects at UU AI Society',
};

const projects: ProjectEntry[] = [
  {
    href: '/programs',
    title: 'Programme Map',
    description: 'Every Uppsala TekNat programme drawn as a map: semester by semester, with prerequisites, specialisations and the study plan\u2019s own rules in one view.',
    image: '/images/campus.png',
    status: 'Beta'
  },
  {
    href: '/projects/course-navigator',
    title: 'Course Navigator',
    description: 'An AI-powered tool to help students navigate their course options and make informed decisions about their academic path.',
    image: '/images/campus.png',
    status: 'In Development',
    adminOnly: true
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

        <ProjectsGrid projects={projects} />

        <div className="glass rounded-lg p-8">
          <h2 className="text-xl font-semibold text-foreground mb-4">
            Have an idea?
          </h2>
          <p className="text-muted-foreground mb-6 leading-relaxed">
            We're always looking for new project ideas and contributors. 
            If you have a suggestion or want to get involved, we'd love to hear from you.
          </p>
          <Button asChild>
            <Link href="mailto:dev@uuais.com">
              Contact the Development Team
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
