"use client";

import React, { useCallback } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Download } from "lucide-react";
import { downloadCsv } from "./AnalyticsShared";
import type { BlogPost } from "@/types";

interface Props {
  blogs: BlogPost[];
  blogReads: Record<string, number>;
}

const NewsletterTab: React.FC<Props> = ({ blogs, blogReads }) => {
  const downloadNewsletterCsv = useCallback(() => {
    const rows = [
      ["Title", "Date", "Unique Reads"],
      ...blogs.map((b) => [b.title, b.date, String(blogReads[b.id] ?? 0)]),
    ];
    downloadCsv(rows, `newsletter-analytics-${new Date().toISOString().slice(0, 10)}.csv`);
  }, [blogs, blogReads]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Newsletter Reads</h3>
          <Button size="sm" variant="outline" icon={Download} onClick={downloadNewsletterCsv}>CSV</Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-600 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                <th className="py-2 pr-4">Title</th>
                <th className="py-2 pr-4">Date</th>
                <th className="py-2 pr-4">Reads (unique/day)</th>
              </tr>
            </thead>
            <tbody>
              {blogs.map((b) => (
                <tr key={b.id} className="border-b border-gray-100 dark:border-gray-700/50">
                  <td className="py-2 pr-4 font-medium text-gray-900 dark:text-white">{b.title}</td>
                  <td className="py-2 pr-4 text-gray-700 dark:text-gray-300">{b.date}</td>
                  <td className="py-2 pr-4">{blogReads[b.id] ?? 0}</td>
                </tr>
              ))}
              {blogs.length === 0 && (
                <tr><td colSpan={3} className="py-4 text-gray-500 dark:text-gray-400 text-center">No posts found</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
          Reads are deduped client-side per day per browser. Future enhancements may track click-through rates when the newsletter system is live.
        </p>
      </CardContent>
    </Card>
  );
};

export default NewsletterTab;
