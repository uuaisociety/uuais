import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, ExternalLink } from 'lucide-react';

const sources = {
  wall: 'https://www.wallstiftelsen.se/nyheter/grundare-av-uu-ai-society-utses-till-%C3%A5rets-uppsalastudent-2026',
  university: 'https://www.uu.se/en/news/2026/2026-09-09-alexander-sundquist-is-named-uppsala-student-of-the-year-2026',
};

const milestones = [
  {
    date: 'Spring 2025',
    title: 'A shared idea becomes a society',
    description: 'Alexander Sundquist and three fellow students founded UU AI Society to connect student life with practical AI.',
    source: 'Anders Wall Foundation',
    href: sources.wall,
  },
  {
    date: 'The first chapter',
    title: 'Learning by building, together',
    description: 'Workshops and hackathons brought students and companies together, including a hackathon with Lovable.',
    source: 'Uppsala University',
    href: sources.university,
  },
  {
    date: 'September 2026',
    title: 'Student initiative, recognised',
    description: 'Cofounder Alexander Sundquist was named Uppsala Student of the Year 2026 for academic and student engagement.',
    source: 'Uppsala University',
    href: sources.university,
  },
];

export default function HistorySection() {
  return (
    <section id="history" tabIndex={-1} aria-label="History of UU AI Society" className="scroll-mt-28 pt-24 sm:pt-32">
      <h2 className="display-md mb-10">
        <span className="paren">(Our)</span> history
      </h2>

      <div className="grid lg:grid-cols-[0.8fr_1.4fr] gap-10 lg:gap-16">
        <div>
          <figure>
            <div className="relative aspect-[4/3] overflow-hidden rounded-lg">
              <Image src="/images/campus.png" alt="Uppsala University" fill sizes="(min-width: 1024px) 36vw, 100vw" className="object-cover" />
            </div>
            <figcaption className="mono-meta text-muted-foreground mt-3">Uppsala University</figcaption>
          </figure>
          <p className="display-md mt-8 max-w-sm text-foreground">An idea shared. A society built.</p>
          <p className="text-muted-foreground leading-relaxed mt-4 max-w-md">
            Founded by students in spring 2025, UU AI Society brings curiosity about AI beyond the classroom.
          </p>
        </div>

        <div className="relative border-l border-border ml-1 pl-6 sm:pl-8">
          {milestones.map((milestone, index) => (
            <article key={milestone.title} className={`${index === milestones.length - 1 ? '' : 'pb-10 sm:pb-12'} relative`}>
              <span aria-hidden="true" className="absolute -left-[calc(1.5rem+5px)] sm:-left-[calc(2rem+5px)] top-1.5 h-2.5 w-2.5 rounded-full border border-muted-foreground bg-background" />
              <p className="mono-meta text-muted-foreground mb-3">{milestone.date}</p>
              <h3 className="text-lg font-semibold tracking-[-0.028em] text-foreground">{milestone.title}</h3>
              <p className="text-muted-foreground leading-relaxed mt-2 max-w-xl">{milestone.description}</p>
              <a href={milestone.href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 mt-3 text-sm text-foreground/75 hover:text-primary underline underline-offset-4 transition-colors">
                {milestone.source}<ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
              </a>
            </article>
          ))}
        </div>
      </div>

      <p className="border-t border-border mt-10 pt-6 text-foreground">
        The next chapter is yours.{' '}
        <Link href="/join" className="inline-flex items-center gap-1 font-medium underline underline-offset-4 hover:text-primary transition-colors">
          Join us<ArrowRight aria-hidden="true" className="h-4 w-4" />
        </Link>
      </p>
    </section>
  );
}
