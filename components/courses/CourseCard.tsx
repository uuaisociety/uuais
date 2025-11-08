"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Tag } from "@/components/ui/Tag";
import type { Course } from "@/lib/courses";

type Props = { course: Course; hrefBase?: string };

export default function CourseCard({ course, hrefBase = "/course" }: Props) {
  return (
    <Card className="h-full hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
      <CardContent className="p-6 flex flex-col h-full">
        <div className="mb-3">
          {course.level && (
            <span className="inline-block text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200 mb-1">
              {course.level}
            </span>
          )}
          <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">{course.code}</div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-1">{course.title}</h3>
        </div>
        <p className="text-gray-600 dark:text-gray-300 mb-4 line-clamp-3">{course.description}</p>
        <div className="flex flex-wrap gap-2 mb-6">
          {course.tags.map((t) => (
            <Tag key={t} className="bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">{t}</Tag>
          ))}
        </div>
        <div className="mt-auto">
          <Link href={`${hrefBase}/${course.id}`}>
            <Button className="bg-[#990000] hover:bg-[#7f0000] text-white">View Details</Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
