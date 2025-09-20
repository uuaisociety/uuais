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

const variantClasses: Record<TagVariant, { light: string; dark: string; text: string; darkText: string }> = {
  red:    { light: "bg-red-100",    dark: "dark:bg-red-900/30",    text: "text-red-800",    darkText: "dark:text-red-400" },
  blue:   { light: "bg-blue-100",   dark: "dark:bg-blue-900/30",   text: "text-blue-800",   darkText: "dark:text-blue-400" },
  green:  { light: "bg-green-100",  dark: "dark:bg-green-900/30",  text: "text-green-800",  darkText: "dark:text-green-400" },
  yellow: { light: "bg-yellow-100", dark: "dark:bg-yellow-900/30", text: "text-yellow-800", darkText: "dark:text-yellow-400" },
  gray:   { light: "bg-gray-100",   dark: "dark:bg-gray-800",      text: "text-gray-700",   darkText: "dark:text-gray-300" },
};

const sizeClasses: Record<TagSize, string> = {
  sm: "px-2 py-0.5 text-xs",
  md: "px-3 py-1 text-sm",
  lg: "px-3.5 py-1.5 text-sm",
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
        "inline-flex items-center font-medium rounded-full",
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
