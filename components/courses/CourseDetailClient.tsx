"use client";

import { Tag } from "@/components/ui/Tag";
import type { Course } from "@/lib/courses";
import CourseConnectionsFlow from "./CourseConnectionsFlow";

type Props = { course: Course; all: Course[]; hrefBase?: string };

export default function CourseDetailClient({ course, all, hrefBase = "/explore" }: Props) {
  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm text-gray-500 dark:text-gray-400">{course.code}</div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{course.title}</h1>
            <a href={course.link} target="_blank" rel="noopener noreferrer">View uu.se course page</a>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-semibold mb-3">Overview</h2>
        <p className="text-gray-700 dark:text-gray-300 mb-4">{course.description}</p>
        <div className="mb-4"><span className="font-medium"><b>Credits:</b></span> {course.tags.find(t => t.toLowerCase().includes("credits")) ?? "5 credits"}</div>
        <div className="flex flex-wrap gap-2">
          {course.tags.map(t => <Tag key={t} className="bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">{t}</Tag>)}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold mb-3">Connections</h2>
        <CourseConnectionsFlow focus={course} all={all} hrefBase={hrefBase} />
        <div className="mt-2 text-xs text-gray-600 dark:text-gray-300">Blue: prerequisites · Green: courses needing this · Gray: related</div>
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-semibold mb-4">Student Feedback (Mock)</h2>
        <ul className="space-y-4">
          <li className="p-4 rounded-md bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-sm">
            &quot;Great introduction, hands-on assignments helped a lot.&quot; — 4.5/5
          </li>
          <li className="p-4 rounded-md bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-sm">
            &quot;Challenging but rewarding, recommend basic Python beforehand.&quot; — 4/5
          </li>
        </ul>
      </div>
    </div>
  );
}
