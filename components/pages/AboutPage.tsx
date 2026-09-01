'use client'


import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useApp } from '@/contexts/AppContext';
import { updatePageMeta } from '@/utils/seo';
import HeroSplash from '@/components/HeroSplash';
import TeamTabsSection from '@/components/team/TeamTabsSection';
import { DiscordCta } from '@/components/common/DiscordCta';

// The parens are a visual accent; each section is named by `aria-label` instead.
const SectionHead: React.FC<{ paren: string; title: string }> = ({ paren, title }) => (
  <h2 className="display-md mb-10">
    <span className="paren">({paren})</span> {title}
  </h2>
);

// The merged sections lost their nav slots, so they stay one click away here.
const sections = [
  { id: 'mission', label: 'Mission' },
  { id: 'team', label: 'Team' },
  { id: 'contact', label: 'Contact' },
  { id: 'faq', label: 'FAQ' },
];

const contactInfo = [
  { title: 'General', email: 'contact@uuais.com', description: 'For general inquiries.' },
  { title: 'Website', email: 'it@uuais.com', description: 'For questions about the website.' },
  { title: 'Partnerships', email: 'partnerships@uuais.com', description: 'For partnerships, sponsorships, or collaborations.' },
  { title: 'Development', email: 'dev@uuais.com', description: 'For inquiries related to our projects.' },
  { title: 'Research', email: 'research@uuais.com', description: 'For research collaborations.' },
];

// FAQ answers are Firestore prose; `split` on a capture group puts them at odd indices.
const convertEmailsToLinks = (text: string): React.ReactNode =>
  text.split(/\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/g).map((part, index) =>
    index % 2 === 1 ? (
      <a
        key={index}
        href={`mailto:${part}`}
        className="underline underline-offset-4 hover:text-foreground transition-colors duration-300"
      >
        {part}
      </a>
    ) : (
      part
    ),
  );

const AboutPage: React.FC = () => {
  const { state } = useApp();
  const [activeSection, setActiveSection] = useState<string | null>(null);

  useEffect(() => {
    updatePageMeta(
      'About Us',
      'Learn about UU AI Society\'s mission, vision, and the team behind our community — and how to get in touch',
    );
  }, []);

  // Light up the jump link for whichever section is currently under the header.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) setActiveSection(visible[0].target.id);
      },
      // Only the band just below the sticky nav counts as "current".
      { rootMargin: '-112px 0px -70% 0px' },
    );
    sections.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  const faqs = state.faqs.filter(faq => faq.published).sort((a, b) => a.order - b.order);

  return (
    <div className="bg-background pb-24 transition-colors duration-300">

      {/* Hero */}
      <HeroSplash className="-mt-14">
        <div className="relative z-10 max-w-6xl mx-auto px-5 sm:px-8 pt-32 pb-20">
          <p className="mono-label text-current/65 mb-6">Uppsala · AI Society</p>
          <h1 className="display-lg mb-5">
            About us.
            <span className="block text-current/60">(And how to reach us.)</span>
          </h1>
          <p className="text-base sm:text-lg text-current/65 max-w-2xl leading-relaxed">
            We are a community of students passionate about artificial intelligence,
            dedicated to learning, innovation, and shaping the future of technology.
          </p>
        </div>
      </HeroSplash>

      {/* Section nav — sits under the fixed h-14 header for the whole page */}
      <nav aria-label="On this page" className="sticky top-14 z-30 glass-nav">
        <div className="max-w-6xl mx-auto px-5 sm:px-8">
          <div className="flex gap-0.5 overflow-x-auto py-2" style={{ scrollbarWidth: 'none' }}>
            {sections.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                aria-current={activeSection === section.id ? 'location' : undefined}
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

      <div className="max-w-6xl mx-auto px-5 sm:px-8">

        {/* Mission & vision */}
        <section id="mission" tabIndex={-1} aria-label="Our mission and vision" className="scroll-mt-28 pt-24 sm:pt-32">
          <SectionHead paren="Our" title="mission and vision" />
          <div className="grid md:grid-cols-2 gap-5">
            <Card variant="glass" className="p-8">
              <h3 className="mono-label text-muted-foreground mb-4">Mission</h3>
              <p className="text-muted-foreground leading-relaxed">
                To democratize AI education and create an inclusive environment where students
                can explore, learn, and contribute to the advancement of artificial intelligence
                outside the classroom.
                We believe in hands-on learning, collaborative innovation, and building bridges
                between academic knowledge and real-world applications.
              </p>
            </Card>

            <Card variant="glass" className="p-8">
              <h3 className="mono-label text-muted-foreground mb-4">Vision</h3>
              <p className="text-muted-foreground leading-relaxed">
                A student-led non-profit that cultivates the
                next generation of AI builders and leaders
                at Uppsala University by connecting students
                with the forefront of AI innovation.
              </p>
            </Card>
          </div>
        </section>

        {/* Team */}
        <section id="team" tabIndex={-1} aria-label="Meet our team" className="scroll-mt-28 pt-24 sm:pt-32">
          <SectionHead paren="Meet" title="our team" />
          <TeamTabsSection members={state.teamMembers} />
        </section>

        {/* Contact */}
        <section id="contact" tabIndex={-1} aria-label="Get in touch" className="scroll-mt-28 pt-24 sm:pt-32">
          <SectionHead paren="Get in" title="touch" />
          <p className="text-muted-foreground max-w-2xl leading-relaxed mb-10">
            Whether you&apos;re a student interested in AI, a company looking to collaborate,
            or just curious about what we do — pick the address closest to your question.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {contactInfo.map((info) => (
              // The whole card is the mailto target, so the hover lift matches a real action.
              <Card key={info.email} variant="glass" hover className="p-0">
                <a href={`mailto:${info.email}`} className="block h-full p-6 group">
                  <p className="mono-label text-muted-foreground mb-2">{info.title}</p>
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

        {/* cv-auto is safe here and below: no anchor sits beneath them to displace. */}
        <section id="faq" tabIndex={-1} aria-label="Frequently asked questions" className="scroll-mt-28 pt-24 sm:pt-32 cv-auto">
          <SectionHead paren="Frequently" title="asked questions" />
          {faqs.length === 0 ? (
            <div className="border-t border-border py-16 text-center">
              <p className="mono-meta text-muted-foreground">
                Questions aren&apos;t loading right now — send yours to any of the addresses above.
              </p>
            </div>
          ) : (
            <dl className="border-t border-border">
              {faqs.map((faq) => (
                <div key={faq.id} className="grid md:grid-cols-[1fr_1.6fr] gap-2 md:gap-10 py-8 border-b border-border">
                  <dt className="text-[1.0625rem] font-semibold tracking-[-0.028em] text-foreground">
                    {faq.question}
                  </dt>
                  <dd className="text-muted-foreground leading-relaxed">
                    {convertEmailsToLinks(faq.answer)}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </section>

        {/* Closing CTA — the page a prospective member reads should invite them in */}
        <section aria-label="Join UU AI Society" className="pt-24 sm:pt-32 cv-auto">
          <div className="glass rounded-lg p-8 sm:p-12 text-center">
            <h2 className="display-md mb-4">
              <span className="paren">(Join)</span> the society
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto leading-relaxed mb-8">
              Membership is free and open to every Uppsala University student.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Button asChild variant="cta" size="lg">
                <Link href="/join">
                  Become a member
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                </Link>
              </Button>
              <DiscordCta />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default AboutPage;
