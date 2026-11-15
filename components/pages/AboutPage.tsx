'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useApp } from '@/contexts/AppContext';
import { updatePageMeta } from '@/utils/seo';
import TeamTabsSection from '@/components/team/TeamTabsSection';
import { DiscordCta } from '@/components/common/DiscordCta';
import {
  AboutHero,
  AboutNav,
  Contact,
  Mission,
  SectionHead,
  sections,
} from '@/components/pages/AboutLayout';

// FAQ answers are Firestore prose; `split` on a capture group puts them at odd indices.
const convertEmailsToLinks = (text: string): React.ReactNode =>
  text
    .split(/\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/g)
    .map((part, index) =>
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
  const { state, teamDirectory } = useApp();
  const ensureTeamDirectoryLoaded = teamDirectory.ensureLoaded;
  const [activeSection, setActiveSection] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (active) void ensureTeamDirectoryLoaded();
    });
    return () => {
      active = false;
    };
  }, [ensureTeamDirectoryLoaded]);

  useEffect(() => {
    updatePageMeta(
      'About Us',
      "Learn about UU AI Society's mission, vision, and the team behind our community — and how to get in touch",
    );
  }, []);

  // The fragment is applied mid-stream and can strand the visitor, so re-apply it.
  useEffect(() => {
    const id = window.location.hash.slice(1);
    if (id)
      document.getElementById(id)?.scrollIntoView({ behavior: 'instant' });
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

  const faqs = state.faqs
    .filter((faq) => faq.published)
    .sort((a, b) => a.order - b.order);

  return (
    <div className="bg-background pb-24 transition-colors duration-300">
      <AboutHero />

      <AboutNav activeSection={activeSection} />

      <div className="max-w-6xl mx-auto px-5 sm:px-8">
        <Mission />

        {/* Team */}
        <section
          id="team"
          tabIndex={-1}
          aria-label="Meet our team"
          className="scroll-mt-28 pt-24 sm:pt-32"
        >
          <SectionHead paren="Meet" title="our team" />
          <TeamTabsSection
            members={teamDirectory.directory?.teamMembers ?? []}
            metadata={teamDirectory.directory?.metadata}
            selectedTeam={teamDirectory.directory?.team}
            selectedYear={teamDirectory.directory?.year}
            loading={teamDirectory.loading}
            error={teamDirectory.error}
            onSelectionChange={teamDirectory.loadSelection}
            onRetry={teamDirectory.retry}
          />
        </section>

        <Contact />

        {/* cv-auto is safe here and below: no anchor sits beneath them to displace. */}
        <section
          id="faq"
          tabIndex={-1}
          aria-label="Frequently asked questions"
          className="scroll-mt-28 pt-24 sm:pt-32 cv-auto"
        >
          <SectionHead paren="Frequently" title="asked questions" />
          {faqs.length === 0 ? (
            <div className="border-t border-border py-16 text-center">
              <p className="mono-meta text-muted-foreground">
                Questions aren&apos;t loading right now — send yours to any of
                the addresses above.
              </p>
            </div>
          ) : (
            <dl className="border-t border-border">
              {faqs.map((faq) => (
                <div
                  key={faq.id}
                  className="grid md:grid-cols-[1fr_1.6fr] gap-2 md:gap-10 py-8 border-b border-border"
                >
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
        <section
          aria-label="Join UU AI Society"
          className="pt-24 sm:pt-32 cv-auto"
        >
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
