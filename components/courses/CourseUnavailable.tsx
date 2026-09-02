import Link from "next/link";
import { ArrowRight, ExternalLink } from "lucide-react";

/**
 * Shown when a course code we link to has no entry in our catalogue — the scraper covers
 * only part of the faculty. No title is shown: we do not have one, and guessing is worse.
 */
export default function CourseUnavailable({ code }: { code: string }) {
  const uuSearch = `https://www.uu.se/en/study/course?query=${encodeURIComponent(code)}`;

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
        <p className="font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground">
          Not in our catalogue
        </p>
        <h1 className="mt-3 font-mono text-3xl font-semibold tracking-[-0.02em] text-foreground sm:text-4xl">
          {code}
        </h1>
        <p className="mt-4 max-w-[62ch] leading-relaxed text-muted-foreground">
          We have no cached detail for this course yet — our course data covers only
          part of the faculty, so some codes on the programme maps have nothing behind
          them. The university publishes the full syllabus for every course it offers.
        </p>

        <a
          href={uuSearch}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-[filter] hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          Look up {code} at uu.se
          <ExternalLink aria-hidden className="h-4 w-4" />
        </a>

        <ul className="mt-10 divide-y divide-border border-y border-border">
          {[
            {
              href: "/explore",
              label: "Course finder",
              hint: "Search the courses we do have",
            },
            {
              href: "/programs",
              label: "Programme catalogue",
              hint: "Every degree as a course map",
            },
          ].map((route) => (
            <li key={route.href}>
              <Link
                href={route.href}
                className="group flex items-center justify-between gap-4 rounded-sm px-2 py-3.5 transition-colors hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="min-w-0">
                  <span className="block text-[0.9375rem] font-medium text-foreground">
                    {route.label}
                  </span>
                  <span className="mt-1 block font-mono text-[0.6875rem] text-muted-foreground">
                    {route.hint}
                  </span>
                </span>
                <ArrowRight
                  aria-hidden
                  className="h-4 w-4 shrink-0 text-muted-foreground/60 transition-all group-hover:translate-x-0.5 group-hover:text-foreground"
                />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
