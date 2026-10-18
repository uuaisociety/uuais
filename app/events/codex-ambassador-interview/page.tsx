import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { SITE_URL } from '@/app/metadata';
import shuangPortrait from '@/public/images/interviews/codex-ambassador/shuang-zheng.webp';
import communityAtBanners from '@/public/images/interviews/codex-ambassador/community-event-codex-uuais.webp';
import communityInLectureRoom from '@/public/images/interviews/codex-ambassador/community-event-lecture.webp';

export const metadata: Metadata = {
  title: 'Interview with the Codex Ambassador',
  description:
    'Shuang Zheng, Codex Ambassador for Stockholm, shares advice on learning with agents and getting better results from Codex.',
  alternates: {
    canonical: `${SITE_URL}/events/codex-ambassador-interview`,
  },
};

const answerLinkClass =
  'text-foreground underline decoration-foreground/35 underline-offset-4 transition-colors hover:text-primary hover:decoration-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm';

export default function CodexAmbassadorInterviewPage() {
  return (
    <div className="min-h-screen bg-background px-5 pb-24 pt-24 sm:px-8 sm:pt-28">
      <article className="mx-auto max-w-5xl">
        <Link
          href="/events"
          className="mono-meta inline-flex min-h-10 items-center text-muted-foreground underline underline-offset-4 decoration-foreground/25 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
        >
          <ArrowLeft className="mr-2 size-4" aria-hidden="true" />
          Back to Events
        </Link>

        <header className="mb-12 mt-10 grid items-center gap-8 border-b border-border pb-8 sm:mb-14 sm:gap-10 sm:pb-10 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.78fr)]">
          <div>
            <p className="mono-label mb-4 text-muted-foreground">
              UU AI Society · Community conversation
            </p>
            <h1 className="display-lg max-w-2xl text-foreground">
              Interview with the Codex Ambassador
            </h1>
            <p className="mono-meta mt-5 text-muted-foreground">
              Shuang Zheng · Codex Ambassador, Stockholm
            </p>
          </div>
          <Image
            src={shuangPortrait}
            alt="Shuang Zheng wearing a Codex Build Crew shirt"
            width={1200}
            height={800}
            className="aspect-[3/2] w-full max-w-md rounded-lg object-cover lg:justify-self-end"
            sizes="(max-width: 1023px) 100vw, 40vw"
            fetchPriority="high"
          />
        </header>

        <div className="mx-auto max-w-[65ch]">
          <section className="border-b border-border py-8 first:pt-0 sm:py-10">
            <h2 className="display-md mb-5 text-foreground">
              How did you become a Codex Ambassador, and what does the role
              involve day to day?
            </h2>
            <div className="space-y-4 text-[0.9375rem] leading-[1.75] text-foreground/80">
              <p>
                Having been an early adopter of ChatGPT and Codex since they
                were released, I have been developing AI solutions, driving AI
                initiatives, and advising a few AI startups. One of the founders
                recommended me for OpenAI&apos;s Codex Ambassador Program. I
                then applied and was accepted as the Codex Ambassador for
                Stockholm.
              </p>
              <p>
                As a Codex Ambassador, I bring people together through workshops
                and meetups, create content about the latest OpenAI features,
                share my solutions and experiences, and empower people to get
                hands-on with Codex and build something of their own!
              </p>
            </div>
          </section>

          <section className="border-b border-border py-8 sm:py-10">
            <h2 className="display-md mb-5 text-foreground">
              Which DevDay announcement do you think matters most for students
              and early-career developers?
            </h2>
            <div className="space-y-4 text-[0.9375rem] leading-[1.75] text-foreground/80">
              <p>
                I would pick the{' '}
                <a
                  className={answerLinkClass}
                  href="https://learn.chatgpt.com/docs/whats-new/devday-2026#reusable-cloud-environments"
                >
                  reusable cloud environment updates announced for Codex at
                  DevDay
                </a>
                . They make it much easier to prepare a development setup and
                continue tasks remotely across devices. For students and
                early-career developers, that is an opportunity to experiment
                with ideas and learn through building in isolated sandboxes on
                the cloud.
              </p>
              <p>
                For those interested in building their own agents, I would also
                recommend exploring the{' '}
                <a
                  className={answerLinkClass}
                  href="https://developers.openai.com/api/docs/guides/decisions"
                >
                  Decisions API
                </a>
                . It is a useful starting point for understanding when fast,
                focused decisions are appropriate and when deeper reasoning is
                needed. It is also a practical way to explore the System 1
                versus System 2 analogy.
              </p>
              <p>
                Also, try{' '}
                <a
                  className={answerLinkClass}
                  href="https://learn.chatgpt.com/docs/sites?surface=app#bring-user-data-to-your-site-with-plugins"
                >
                  ChatGPT Sites with plugins
                </a>{' '}
                for building and publishing web apps, and{' '}
                <a
                  className={answerLinkClass}
                  href="https://learn.chatgpt.com/docs/computer-use"
                >
                  Computer Use
                </a>{' '}
                for working with supported desktop apps. They can make your
                devices feel like super machines. :)
              </p>
            </div>
          </section>

          <section className="border-b border-border py-8 sm:py-10">
            <h2 className="display-md mb-5 text-foreground">
              Which skills should students focus on, now that agents can write
              so much of the code?
            </h2>
            <div className="space-y-4 text-[0.9375rem] leading-[1.75] text-foreground/80">
              <p>
                Critical thinking and knowing how to evaluate and judge the
                result. You still need to understand whether the solution
                addresses the right problem, whether it works, and what its
                limitations are.
              </p>
              <p>
                I would encourage the top-down approach to learning: compared to
                the traditional path of mastering every fundamental concept
                before starting tangible projects, begin with a practical
                problem or working example, then explore the underlying concepts
                as you go. Stay curious, use AI to explain unfamiliar parts,
                challenge your assumptions, and test and deepen your
                understanding, not just finish the assignment or task!
              </p>
              <p>
                Building reusable Skills for the agents is also an important
                skill, so give it a try if you have not explored that yet!
              </p>
            </div>
          </section>

          <section className="border-b border-border py-8 sm:py-10">
            <h2 className="display-md mb-5 text-foreground">
              What are your top three tips for getting better results from
              Codex?
            </h2>
            <ol className="list-decimal space-y-5 pl-5 text-[0.9375rem] leading-[1.75] text-foreground/80 marker:font-medium marker:text-primary">
              <li>
                <strong className="font-semibold text-foreground">
                  Give useful, “lagom” context: not too much, not too little.
                </strong>{' '}
                Provide only the most relevant information in each run, such as
                related text, example images, and specific code sections where
                possible, without dumping everything into the context. Use clear
                agent instructions and relevant agent skills at different levels
                where applicable. Practising progressive disclosure is also key.
              </li>
              <li>
                <strong className="font-semibold text-foreground">
                  Use goal-driven development when appropriate.
                </strong>{' '}
                Explain your goal, constraints, and what a good result looks
                like, with a clear Definition of Done. For longer tasks in
                particular, use Goals (
                <code className="font-mono text-[0.9em]">/goal</code>) rather
                than repeatedly prompting and waiting for the next result. You
                can also talk through the idea and approach using{' '}
                <a
                  className={answerLinkClass}
                  href="https://chatgpt.com/features/voice"
                >
                  ChatGPT Voice
                </a>{' '}
                or Plan mode (
                <code className="font-mono text-[0.9em]">/plan</code>), and
                define how progress and completion should be verified before
                starting. The{' '}
                <a
                  className={answerLinkClass}
                  href="https://developers.openai.com/cookbook/examples/codex/using_goals_in_codex"
                >
                  Codex Goals guide
                </a>{' '}
                is a useful reference.
              </li>
              <li>
                <strong className="font-semibold text-foreground">
                  Verify with automation and human review when needed.
                </strong>{' '}
                “Done” does not always mean it works! Use automated tests,
                locally or in the cloud, to check existing and new functionality
                and catch regressions. Let Codex run checks and test important
                flows automatically, and configure{' '}
                <a
                  className={answerLinkClass}
                  href="https://learn.chatgpt.com/docs/automations"
                >
                  scheduled checks
                </a>{' '}
                or{' '}
                <a
                  className={answerLinkClass}
                  href="https://learn.chatgpt.com/docs/enterprise/teams"
                >
                  event triggers
                </a>{' '}
                when useful. Review the changes and stay in the loop for
                decisions that need human judgment.
              </li>
            </ol>
          </section>

          <section className="py-8 sm:py-10">
            <h2 className="display-md mb-5 text-foreground">
              Where can people keep learning or connect with the Codex community
              after the event?
            </h2>
            <p className="text-[0.9375rem] leading-[1.75] text-foreground/80">
              Follow{' '}
              <a
                className={answerLinkClass}
                href="https://www.linkedin.com/company/codex-community-sweden/"
              >
                Codex Community Sweden
              </a>{' '}
              for upcoming events, explore the{' '}
              <a
                className={answerLinkClass}
                href="https://developers.openai.com/learn/codex"
              >
                Codex learning resources
              </a>
              , and feel free to{' '}
              <a
                className={answerLinkClass}
                href="https://www.linkedin.com/in/shuangzheng/"
              >
                connect with me
              </a>{' '}
              to exchange ideas and discuss what you are building! You can also
              explore upcoming Codex meetups, workshops, and hackathons around
              the world on the{' '}
              <a
                className={answerLinkClass}
                href="https://luma.com/codex-community"
              >
                Codex Community event calendar
              </a>
              . Keep building and sharing with others through awesome
              communities like{' '}
              <a
                className={answerLinkClass}
                href="https://www.linkedin.com/company/uu-ai-society/"
              >
                UU AI Society
              </a>{' '}
              too.
            </p>
          </section>
        </div>

        <figure className="mx-auto mt-12 max-w-4xl sm:mt-16">
          <div className="grid gap-5 sm:grid-cols-2">
            <Image
              src={communityAtBanners}
              alt="Shuang Zheng and Bradley Deku standing beside Codex and UU AI Society banners"
              width={900}
              height={1200}
              className="aspect-[3/4] w-full rounded-lg object-cover"
              sizes="(max-width: 639px) 100vw, 50vw"
            />
            <Image
              src={communityInLectureRoom}
              alt="Shuang Zheng and Bradley Deku standing together in a lecture room with flowers"
              width={900}
              height={1200}
              className="aspect-[3/4] w-full rounded-lg object-cover"
              sizes="(max-width: 639px) 100vw, 50vw"
            />
          </div>
          <figcaption className="mono-meta mt-3 text-muted-foreground">
            Shuang Zheng and Bradley Deku pictured at the Codex x UUAIS event.
          </figcaption>
        </figure>

        <footer className="mt-8 border-t border-border pt-6">
          <Link
            href="/events"
            className="mono-meta inline-flex min-h-10 items-center text-muted-foreground underline underline-offset-4 decoration-foreground/25 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
          >
            <ArrowLeft className="mr-2 size-4" aria-hidden="true" />
            Back to Events
          </Link>
        </footer>
      </article>
    </div>
  );
}
