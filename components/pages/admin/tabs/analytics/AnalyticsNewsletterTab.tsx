"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Download } from "lucide-react";
import { downloadCsv } from "./AnalyticsShared";
import { subscribeBlogReactions, type BlogReactions } from "@/lib/firestore/blog-reactions";
import type { BlogPost } from "@/types";

interface Props {
  blogs: BlogPost[];
  blogReads: Record<string, number>;
}

const NewsletterTab: React.FC<Props> = ({ blogs, blogReads }) => {
  const [reactions, setReactions] = useState<Record<string, BlogReactions>>({});

  useEffect(() => {
    return subscribeBlogReactions(blogs.map((b) => b.id), setReactions);
  }, [blogs]);

  const downloadNewsletterCsv = useCallback(() => {
    const rows = [
      ["Title", "Date", "Unique Reads", "Likes", "Dislikes", "Shares"],
      ...blogs.map((b) => [
        b.title,
        b.date,
        String(blogReads[b.id] ?? 0),
        String(reactions[b.id]?.likes ?? 0),
        String(reactions[b.id]?.dislikes ?? 0),
        String(reactions[b.id]?.shares ?? 0),
      ]),
    ];
    downloadCsv(rows, `blog-analytics-${new Date().toISOString().slice(0, 10)}.csv`);
  }, [blogs, blogReads, reactions]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">Blog Engagement</h3>
          <Button size="sm" variant="outline" icon={Download} onClick={downloadNewsletterCsv}>CSV</Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground border-b border-border">
                <th className="py-2 pr-4">Title</th>
                <th className="py-2 pr-4">Date</th>
                <th className="py-2 pr-4">Reads</th>
                <th className="py-2 pr-4">Likes</th>
                <th className="py-2 pr-4">Dislikes</th>
                <th className="py-2 pr-4">Shares</th>
              </tr>
            </thead>
            <tbody>
              {blogs.map((b) => (
                <tr key={b.id} className="border-b border-border">
                  <td className="py-2 pr-4 font-medium text-foreground">{b.title}</td>
                  <td className="py-2 pr-4 text-foreground/80">{b.date}</td>
                  <td className="py-2 pr-4">{blogReads[b.id] ?? 0}</td>
                  <td className="py-2 pr-4">{reactions[b.id]?.likes ?? 0}</td>
                  <td className="py-2 pr-4">{reactions[b.id]?.dislikes ?? 0}</td>
                  <td className="py-2 pr-4">{reactions[b.id]?.shares ?? 0}</td>
                </tr>
              ))}
              {blogs.length === 0 && (
                <tr><td colSpan={6} className="py-4 text-muted-foreground text-center">No posts found</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Reads are deduped per device. Likes, dislikes and shares feed the AI News Desk&apos;s generation feedback.
        </p>
      </CardContent>
    </Card>
  );
};

export default NewsletterTab;
