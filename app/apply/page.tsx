import Link from 'next/link';
import { ArrowRight, Users, Landmark } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Tag, type TagVariant } from '@/components/ui/Tag';
import { Button } from '@/components/ui/Button';
import HeroSplash from '@/components/HeroSplash';

const APPLY_TYPES = [
  {
    slug: 'team',
    title: 'Apply for a Role',
    description: 'Rank the roles you\'d like — across Development, IT, Growth, Partnerships & Events — and tell us why you\'re a good fit.',
    icon: Users,
    status: 'open' as const,
  },
  {
    slug: 'board',
    title: 'Board Positions',
    description: 'Run for the board of UU AI Society. Nominations open during the annual election period.',
    icon: Landmark,
    status: 'closed' as const,
  },
  // {
  //   slug: 'research',
  //   title: 'Research Groups',
  //   description: 'Join a research group working on AI projects. Open to all members.',
  //   icon: BookOpen,
  //   status: 'coming soon' as const,
  // },
];

const STATUS_VARIANT: Record<string, TagVariant> = {
  open: 'green',
  closed: 'gray',
  'coming soon': 'yellow',
};

export default function ApplyLandingPage() {
  return (
    <main className="min-h-screen bg-background transition-colors">
      <HeroSplash>
        <div className="relative z-10 max-w-4xl mx-auto px-6 py-20 text-center">
          <p className="mono-label text-current/65 mb-6">UU AI Society · Join</p>
          <h1 className="display-lg mb-4">
            Apply <span className="text-current/65">(contribute)</span>
          </h1>
          <p className="text-base sm:text-lg text-current/60 max-w-2xl mx-auto leading-relaxed">
            Choose how you want to contribute to UU AI Society.
          </p>
        </div>
      </HeroSplash>

      <section className="max-w-4xl mx-auto px-6 py-16">
        <div className="grid gap-5 grid-cols-1">
          {APPLY_TYPES.map((type) => {
            const Icon = type.icon;
            const isOpen = type.status === 'open';
            return (
              <Card
                key={type.slug}
                hover
                padding="md"
                className="group glass-interactive border-border"
              >
                <div className="flex items-start gap-4">
                  <div className="shrink-0 w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <h2 className="text-xl font-semibold text-foreground">{type.title}</h2>
                      <Tag variant={STATUS_VARIANT[type.status] || 'gray'} size="sm">
                        {type.status}
                      </Tag>
                    </div>
                    <p className="text-sm text-muted-foreground">{type.description}</p>
                  </div>
                  <div className="shrink-0 pt-1">
                    {isOpen ? (
                      <Button asChild size="sm">
                        <Link href={`/apply/${type.slug}`}>
                          Apply now <ArrowRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-muted text-muted-foreground text-sm font-medium cursor-not-allowed">
                        Unavailable
                      </span>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </section>
    </main>
  );
}
