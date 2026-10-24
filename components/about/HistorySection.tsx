"use client";

import { useState } from "react";
import Image from "next/image";
import { ArrowLeft, ArrowRight, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/Button";

type Year = "2025" | "2026";

type YearStory = {
  year: Year;
  title: string;
  summary: string;
  image: { src: string; alt: string; caption: string };
  sources: { label: string; href: string }[];
};

const campusImage = {
  src: "/images/campus.png",
  alt: "Uppsala University campus",
  caption: "Uppsala University",
};

const stories: YearStory[] = [
  {
    year: "2025",
    title: "A student society takes shape",
    summary:
      "Founded in April 2025, UU AI Society brought students together through practical workshops and hackathons. Its activities included collaboration with Uppsala Municipality’s Innovations Lab and BLING startup challenges.",
    image: campusImage,
    sources: [
      {
        label: "Anders Wall Foundation",
        href: "https://www.wallstiftelsen.se/nyheter/grundare-av-uu-ai-society-utses-till-%C3%A5rets-uppsalastudent-2026",
      },
      {
        label: "BLING Startup",
        href: "https://www.blingstartup.se/hackathon-med-uu-ai-society/?lang=en",
      },
    ],
  },
  {
    year: "2026",
    title: "Building, recognition, and community",
    summary:
      "The local National AI Startup Competition round was announced for 18–19 April, with two intended places at the Stockholm final. Cofounder Alexander Sundquist was named Uppsala Student of the Year. An October DevDay Exchange programme paired OpenAI highlights with a community Codex workshop at Ångström.",
    image: campusImage,
    sources: [
      {
        label: "Uppsala University",
        href: "https://www.uu.se/en/news/2026/2026-09-09-alexander-sundquist-is-named-uppsala-student-of-the-year-2026",
      },
      {
        label: "UU AI Society",
        href: "https://www.uuais.com/events/OgJIGnOVGOiAXhvEHUIP",
      },
    ],
  },
];

const newestFirst = [...stories].reverse();

export default function HistorySection() {
  const [selectedYear, setSelectedYear] = useState<Year>("2025");
  const selectedIndex = stories.findIndex(({ year }) => year === selectedYear);
  const story = stories[selectedIndex];

  const selectYear = (year: Year) => {
    setSelectedYear(year);
  };

  const selectAdjacentYear = (offset: -1 | 1) => {
    const nextStory = stories[selectedIndex + offset];
    if (nextStory) selectYear(nextStory.year);
  };

  return (
    <section
      id="history"
      aria-label="History of UU AI Society"
      tabIndex={-1}
      className="scroll-mt-28 pt-24 sm:pt-32"
    >
      <div>
        <h2 className="display-md mb-10">
          <span className="paren">(Our)</span> history
        </h2>

        <div className="history-layout">
          <nav
            aria-label="History by year"
            className="history-navigation lg:col-start-2 lg:row-start-1"
          >
            {newestFirst.map(({ year }) => (
              <Button
                key={year}
                type="button"
                variant="timeline"
                size="none"
                aria-pressed={selectedYear === year}
                onClick={() => selectYear(year)}
                className="history-year-button"
              >
                <span
                  aria-hidden="true"
                  className={`history-year-marker ${selectedYear === year ? "history-year-marker-active" : ""}`}
                />
                {year}
              </Button>
            ))}
          </nav>

          <figure className="lg:col-start-3 lg:row-start-1">
            <div className="relative aspect-[3/2] overflow-hidden rounded-xl bg-muted">
              <Image
                src={story.image.src}
                alt={story.image.alt}
                fill
                sizes="(min-width: 1024px) 55vw, calc(100vw - 2rem)"
                className="object-cover"
              />
            </div>
            <figcaption className="mt-2 font-mono text-[0.65rem] tracking-wide text-muted-foreground">
              {story.image.caption}
            </figcaption>
          </figure>

          <div className="lg:col-start-1 lg:row-start-1">
            <div className="history-year-panels">
              {stories.map((story) => {
                const isSelected = story.year === selectedYear;
                return (
                  <article
                    key={story.year}
                    aria-label={`${story.year} history`}
                    aria-hidden={!isSelected}
                    inert={!isSelected}
                    className={`history-year-panel ${isSelected ? "history-year-panel-active" : ""}`}
                  >
                    <p className="history-year-number">
                      {story.year}
                    </p>
                    <h3 className="mt-5 text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">
                      {story.title}
                    </h3>
                    <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">
                      {story.summary}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2">
                      {story.sources.map((source) => (
                        <a
                          key={source.label}
                          href={source.href}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-muted-foreground underline decoration-border underline-offset-4 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                        >
                          {source.label}
                          <ExternalLink aria-hidden="true" className="size-3" />
                        </a>
                      ))}
                    </div>
                  </article>
                );
              })}
            </div>
            <div className="mt-8 flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                aria-label="Previous year"
                onClick={() => selectAdjacentYear(-1)}
                disabled={selectedIndex === 0}
              >
                <ArrowLeft aria-hidden="true" className="size-4" /> Previous
              </Button>
              <Button
                type="button"
                variant="outline"
                aria-label="Next year"
                onClick={() => selectAdjacentYear(1)}
                disabled={selectedIndex === stories.length - 1}
              >
                Next <ArrowRight aria-hidden="true" className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
