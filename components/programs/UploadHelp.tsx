"use client";

import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { HelpCircle, Lock, X } from "lucide-react";

/**
 * Explains what to upload and what happens to it: handing a certificate to a website is a
 * trust decision, so "what do you keep?" belongs next to the button.
 */
export default function UploadHelp() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const onClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative inline-block">
      <Button
        variant="ghost"
        size="iconXs"
        onClick={() => setOpen((value) => !value)}
        onMouseEnter={() => setOpen(true)}
        aria-expanded={open}
        aria-label="What should I upload?"
        className="rounded-full text-muted-foreground"
      >
        <HelpCircle className="h-4 w-4" />
      </Button>

      {open ? (
        <div
          role="dialog"
          aria-label="What to upload"
          className="absolute left-1/2 z-50 mt-2 w-[min(22rem,calc(100vw-3rem))] -translate-x-1/2 rounded-lg border border-border bg-card p-4 text-left shadow-lg"
          onMouseLeave={() => setOpen(false)}
        >
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-[0.9375rem] font-semibold text-foreground">
              What to upload
            </h3>
            <Button
              variant="ghost"
              size="iconXs"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="text-muted-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>

          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            Export a certificate from{" "}
            <a
              href="https://www.student.ladok.se/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground underline underline-offset-2"
            >
              Ladok
            </a>{" "}
            (<span className="font-medium">Intyg</span> → create certificate) and upload
            the PDF. Either type works, and they answer different questions:
          </p>

          <dl className="mt-3 space-y-2.5 text-xs leading-relaxed">
            <div>
              <dt className="font-medium text-foreground">
                Results certificate <span className="text-muted-foreground">(resultatintyg)</span>
              </dt>
              <dd className="text-muted-foreground">
                Marks courses <span className="text-foreground">completed</span>. Listing
                a course there already means you passed it, so we read the code, name and
                credits — and stop.
              </dd>
            </div>
            <div>
              <dt className="font-medium text-foreground">
                Registration certificate{" "}
                <span className="text-muted-foreground">(registreringsintyg)</span>
              </dt>
              <dd className="text-muted-foreground">
                Marks what you are taking{" "}
                <span className="text-foreground">right now</span>, and names your
                programme so the right map is selected. It cannot show completion — being
                registered is not the same as having passed.
              </dd>
            </div>
          </dl>

          <div className="mt-3 flex gap-2 rounded-md bg-muted/50 p-2.5">
            <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <p className="text-xs leading-relaxed text-muted-foreground">
              <span className="font-medium text-foreground">We never store your grades
              or personal identity number.</span>{" "}
              The PDF is read on our server, the course rows are extracted, and the file
              itself is discarded — never saved. Because both certificates have a fixed
              layout, nothing is sent to an AI model. Your progress is visible only to
              you, and you can delete it at any time from your account.
            </p>
          </div>

          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            Nothing updates on its own: re-upload a fresh certificate whenever you want
            the map to catch up.
          </p>
        </div>
      ) : null}
    </div>
  );
}
