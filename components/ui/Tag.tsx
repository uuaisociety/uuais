"use client";

import React from "react";
import clsx from "clsx";

export type TagVariant =
  | "red"
  | "blue"
  | "green"
  | "yellow"
  | "gray";

export type TagSize = "sm" | "md" | "lg";

// Tags are metadata, so they are set in mono and uppercased — the same signal
// the rest of the system uses to separate data from prose.
const variantClasses: Record<TagVariant, { light: string; dark: string; text: string; darkText: string }> = {
  red:    { light: "bg-primary/10",    dark: "dark:bg-primary/15",    text: "text-primary",    darkText: "dark:text-primary" },
  blue:   { light: "bg-chart-2/12",    dark: "dark:bg-chart-2/18",    text: "text-chart-2",    darkText: "dark:text-chart-2" },
  green:  { light: "bg-chart-4/12",    dark: "dark:bg-chart-4/18",    text: "text-chart-4",    darkText: "dark:text-chart-4" },
  yellow: { light: "bg-chart-3/15",    dark: "dark:bg-chart-3/20",    text: "text-chart-3",    darkText: "dark:text-chart-3" },
  gray:   { light: "bg-foreground/[0.06]", dark: "dark:bg-foreground/[0.08]", text: "text-foreground/65", darkText: "dark:text-foreground/65" },
};

const sizeClasses: Record<TagSize, string> = {
  sm: "px-2 py-1 text-[0.625rem]",
  md: "px-2.5 py-1 text-[0.6875rem]",
  lg: "px-3 py-1.5 text-xs",
};

export interface TagProps {
  children: React.ReactNode;
  variant?: TagVariant;
  size?: TagSize;
  className?: string;
}

export const Tag: React.FC<TagProps> = ({ children, variant = "red", size = "md", className }) => {
  const v = variantClasses[variant];
  return (
    <span
      className={clsx(
        "inline-flex items-center font-mono uppercase tracking-[0.1em] font-medium rounded-sm leading-none",
        v.light,
        v.dark,
        v.text,
        v.darkText,
        sizeClasses[size],
        className
      )}
    >
      {children}
    </span>
  );
};

export default Tag;
