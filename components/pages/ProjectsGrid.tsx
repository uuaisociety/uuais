"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { useAdmin } from "@/hooks/useAdmin";

export type ProjectEntry = {
  title: string;
  description: string;
  image: string;
  status: string;
  href: string;
  /** Hidden from everyone but the board while the tool is not ready to launch. */
  adminOnly?: boolean;
};

/** The project cards, minus anything still held back from the public. */
export default function ProjectsGrid({ projects }: { projects: ProjectEntry[] }) {
  const { isAdmin } = useAdmin();
  const visible = projects.filter((project) => !project.adminOnly || isAdmin);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-16">
      {visible.map((project) => (
        <Link
          key={project.href}
          href={project.href}
          className="group glass glass-interactive flex flex-col overflow-hidden rounded-md"
        >
          <div className="relative aspect-[16/10] overflow-hidden bg-gray-200 dark:bg-gray-700">
            <Image
              src={project.image}
              alt={project.title}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:scale-[1.04]"
            />
            <span className="absolute top-3 right-3 pill bg-black/45 text-white backdrop-blur-md">
              {project.status}
            </span>
            {project.adminOnly ? (
              <span className="absolute top-3 left-3 pill bg-black/45 text-white backdrop-blur-md">
                Admins only
              </span>
            ) : null}
          </div>
          <div className="flex flex-col flex-1 p-5">
            <h2 className="text-[1.0625rem] font-semibold tracking-[-0.02em] leading-snug mb-2 group-hover:text-primary transition-colors">
              {project.title}
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {project.description}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}
