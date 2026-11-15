'use client';

// The about page's static pieces, shared by the page and its loading skeleton
// (the /about loading boundary), so the skeleton has the page's exact geometry
// and nothing jumps when the content arrives. Kept free of the page's data
// clients: the boundary ships ahead of the page.

import React from 'react';
import { Card } from '@/components/ui/Card';
import HeroSplash from '@/components/HeroSplash';
import { TeamSectionSkeleton } from '@/components/team/TeamLayout';
import { SkeletonRegion } from '@/components/ui/skeleton';

// The parens are a visual accent; each section is named by `aria-label` instead.
export const SectionHead: React.FC<{ paren: string; title: string }> = ({
  paren,
  title,
}) => (
  <h2 className="display-md mb-10">
    <span className="paren">({paren})</span> {title}
  </h2>
);

// The merged sections lost their nav slots, so they stay one click away here.
export const sections = [
  { id: 'mission', label: 'Mission' },
  { id: 'team', label: 'Team' },
  { id: 'contact', label: 'Contact' },
  { id: 'faq', label: 'FAQ' },
];

const contactInfo = [
  {
    title: 'General',
    email: 'contact@uuais.com',
    description: 'For general inquiries.',
  },
  {
    title: 'Website',
    email: 'it@uuais.com',
    description: 'For questions about the website.',
  },
  {
    title: 'Partnerships',
    email: 'partnerships@uuais.com',
    description: 'For partnerships, sponsorships, or collaborations.',
  },
  {
    title: 'Development',
    email: 'dev@uuais.com',
    description: 'For inquiries related to our projects.',
  },
  {
    title: 'Research',
    email: 'research@uuais.com',
    description: 'For research collaborations.',
  },
];

export const AboutHero = () => (
  <>
    {/* Hero */}
    <HeroSplash className="-mt-14">
      <div className="relative z-10 max-w-6xl mx-auto px-5 sm:px-8 pt-32 pb-20">
        <p className="mono-label text-current/65 mb-6">Uppsala · AI Society</p>
        <h1 className="display-lg mb-5">
          About us.
          <span className="block text-current/60">(And how to reach us.)</span>
        </h1>
        <p className="text-base sm:text-lg text-current/65 max-w-2xl leading-relaxed">
          We are a community of students passionate about artificial
          intelligence, dedicated to learning, innovation, and shaping the
          future of technology.
        </p>
      </div>
    </HeroSplash>
  </>
);

export const AboutNav: React.FC<{ activeSection: string | null }> = ({
  activeSection,
}) => (
  <>
    {/* Section nav — sits under the fixed h-14 header for the whole page */}
    <nav aria-label="On this page" className="sticky top-14 z-30 glass-nav">
      <div className="max-w-6xl mx-auto px-5 sm:px-8">
        <div
          className="flex gap-0.5 overflow-x-auto py-2"
          style={{ scrollbarWidth: 'none' }}
        >
          {sections.map((section) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              aria-current={
                activeSection === section.id ? 'location' : undefined
              }
              className={`shrink-0 px-3 py-1.5 rounded-sm mono-label transition-colors duration-300 ${
                activeSection === section.id
                  ? 'text-current bg-current/[0.12]'
                  : 'text-current/60 hover:text-current hover:bg-current/[0.07]'
              }`}
            >
              {section.label}
            </a>
          ))}
        </div>
      </div>
    </nav>
  </>
);

export const Mission = () => (
  <>
    {/* Mission & vision */}
    <section
      id="mission"
      tabIndex={-1}
      aria-label="Our mission and vision"
      className="scroll-mt-28 pt-24 sm:pt-32"
    >
      <SectionHead paren="Our" title="mission and vision" />
      <div className="grid md:grid-cols-2 gap-5">
        <Card variant="glass" className="p-8">
          <h3 className="mono-label text-muted-foreground mb-4">Mission</h3>
          <p className="text-muted-foreground leading-relaxed">
            To democratize AI education and create an inclusive environment
            where students can explore, learn, and contribute to the advancement
            of artificial intelligence outside the classroom. We believe in
            hands-on learning, collaborative innovation, and building bridges
            between academic knowledge and real-world applications.
          </p>
        </Card>

        <Card variant="glass" className="p-8">
          <h3 className="mono-label text-muted-foreground mb-4">Vision</h3>
          <p className="text-muted-foreground leading-relaxed">
            A student-led non-profit that cultivates the next generation of AI
            builders and leaders at Uppsala University by connecting students
            with the forefront of AI innovation.
          </p>
        </Card>
      </div>
    </section>
  </>
);

export const Contact = () => (
  <>
    {/* Contact */}
    <section
      id="contact"
      tabIndex={-1}
      aria-label="Get in touch"
      className="scroll-mt-28 pt-24 sm:pt-32"
    >
      <SectionHead paren="Get in" title="touch" />
      <p className="text-muted-foreground max-w-2xl leading-relaxed mb-10">
        Whether you&apos;re a student interested in AI, a company looking to
        collaborate, or just curious about what we do — pick the address closest
        to your question.
      </p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {contactInfo.map((info) => (
          // The whole card is the mailto target, so the hover lift matches a real action.
          <Card key={info.email} variant="glass" hover className="p-0">
            <a href={`mailto:${info.email}`} className="block h-full p-6 group">
              <p className="mono-label text-muted-foreground mb-2">
                {info.title}
              </p>
              <p className="text-foreground font-medium mb-2 transition-colors duration-300 group-hover:text-primary">
                {info.email}
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {info.description}
              </p>
            </a>
          </Card>
        ))}
      </div>
    </section>
  </>
);

/** The about page while it loads: the real hero, section links, mission and contact cards, with the team as placeholders. The FAQ and closing call follow below the fold. */
export const AboutSkeleton = () => (
  <SkeletonRegion
    label="Loading…"
    className="bg-background pb-24 transition-colors duration-300"
  >
    <AboutHero />
    <AboutNav activeSection={null} />
    <div className="max-w-6xl mx-auto px-5 sm:px-8">
      <Mission />
      <section className="scroll-mt-28 pt-24 sm:pt-32">
        <SectionHead paren="Meet" title="our team" />
        <TeamSectionSkeleton />
      </section>
      <Contact />
    </div>
  </SkeletonRegion>
);
