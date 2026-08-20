"use client";

import React from "react";
import { ArrowUpRight } from "lucide-react";
import { HugeiconsIcon } from "@hugeicons/react";
import { DiscordIcon } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";

export const DISCORD_INVITE = "https://discord.gg/nne6mzcezt";

// Discord blurple, used only on the mark and on hover — the page keeps its own
// single accent, this just makes the destination recognisable.
const BLURPLE = "#5865F2";

type Props = {
  /** `pill` — compact inline action. `panel` — full-width block for a page section. */
  variant?: "pill" | "panel";
  className?: string;
};

export const DiscordCta: React.FC<Props> = ({ variant = "pill", className }) => {
  if (variant === "pill") {
    return (
      <a
        href={DISCORD_INVITE}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "group inline-flex items-center gap-2 h-10 px-4 rounded-md",
          "glass glass-interactive glass-no-lift mono-label",
          "text-foreground/70 hover:text-foreground transition-colors duration-300",
          className
        )}
      >
        <HugeiconsIcon
          icon={DiscordIcon}
          className="h-4 w-4 transition-colors duration-300"
          style={{ color: BLURPLE }}
        />
        Join our Discord
      </a>
    );
  }

  return (
    <a
      href={DISCORD_INVITE}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "group flex items-center gap-4 p-5 rounded-md glass glass-interactive",
        className
      )}
    >
      <span
        className="shrink-0 size-11 grid place-items-center rounded-md border border-border"
        style={{ color: BLURPLE }}
      >
        <HugeiconsIcon icon={DiscordIcon} className="h-5 w-5" />
      </span>
      <span className="min-w-0">
        <span className="block text-[1.0625rem] font-semibold tracking-[-0.02em] leading-snug">
          Join our Discord
        </span>
        <span className="block text-sm leading-relaxed text-muted-foreground">
          Where members talk shop, share projects, and hear about events first.
        </span>
      </span>
      <ArrowUpRight className="ml-auto shrink-0 h-4 w-4 text-foreground/60 transition-all duration-300 group-hover:text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
    </a>
  );
};

export default DiscordCta;
