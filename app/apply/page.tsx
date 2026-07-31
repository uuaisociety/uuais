import Link from 'next/link';
import { ArrowRight, Users, Landmark } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Tag, type TagVariant } from '@/components/ui/Tag';
import { Button } from '@/components/ui/Button';

const APPLY_TYPES = [
  {
    slug: 'team',
    title: 'Join a Team',
    description: 'Apply to join one of our active teams — Development, IT, Growth, Partnerships & Events, or Research.',
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
    <main className="min-h-screen bg-white dark:bg-gray-900 transition-colors">
      <section className="relative bg-gradient-to-br from-red-600 via-red-700 to-red-800 dark:from-red-700 dark:via-red-800 dark:to-red-900 text-white">
        <div className="absolute inset-0 bg-black/20 dark:bg-black/40" />
        <div className="relative max-w-4xl mx-auto px-6 py-20 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Apply</h1>
          <p className="text-lg text-red-100 max-w-2xl mx-auto">
            Choose how you want to contribute to UU AI Society.
          </p>
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-6 py-16">
        <div className="grid gap-6">
          {APPLY_TYPES.map((type) => {
            const Icon = type.icon;
            const isOpen = type.status === 'open';
            return (
              <Card
                key={type.slug}
                hover
                padding="md"
                className="group relative border-gray-200 dark:border-gray-700 hover:border-red-300 dark:hover:border-red-700"
              >
                <div className="flex items-start gap-4">
                  <div className="shrink-0 w-12 h-12 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                    <Icon className="h-6 w-6 text-red-600 dark:text-red-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <h2 className="text-xl font-bold text-gray-900 dark:text-white">{type.title}</h2>
                      <Tag variant={STATUS_VARIANT[type.status] || 'gray'} size="sm">
                        {type.status}
                      </Tag>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{type.description}</p>
                  </div>
                  <div className="shrink-0 pt-1">
                    {isOpen ? (
                      <Button asChild size="sm" className="bg-red-600 hover:bg-red-700 text-white">
                        <Link href={`/apply/${type.slug}`}>
                          Apply now <ArrowRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 text-sm font-medium cursor-not-allowed">
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
