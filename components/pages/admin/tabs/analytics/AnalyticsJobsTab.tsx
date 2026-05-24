"use client";

import React, { useCallback } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Download } from "lucide-react";
import { downloadCsv } from "./AnalyticsShared";
import type { Job } from "@/types";

interface Props {
  jobs: Job[];
  jobClicks: Record<string, number>;
}

const JobsTab: React.FC<Props> = ({ jobs, jobClicks }) => {
  const downloadJobsCsv = useCallback(() => {
    const rows = [
      ["Title", "Company", "Unique Apply Clicks"],
      ...jobs.map((j) => [j.title, j.company, String(jobClicks[j.id] ?? 0)]),
    ];
    downloadCsv(rows, `jobs-analytics-${new Date().toISOString().slice(0, 10)}.csv`);
  }, [jobs, jobClicks]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Jobs — {jobs.length} posting{jobs.length !== 1 ? "s" : ""}
          </h3>
          <Button size="sm" variant="outline" icon={Download} onClick={downloadJobsCsv}>CSV</Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-600 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                <th className="py-2 pr-4">Job</th>
                <th className="py-2 pr-4">Company</th>
                <th className="py-2 pr-4">Type</th>
                <th className="py-2 pr-4">Unique Apply Clicks</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((j) => (
                <tr key={j.id} className="border-b border-gray-100 dark:border-gray-700/50">
                  <td className="py-2 pr-4 font-medium text-gray-900 dark:text-white">{j.title}</td>
                  <td className="py-2 pr-4 text-gray-700 dark:text-gray-300">{j.company}</td>
                  <td className="py-2 pr-4 text-gray-500">{j.type.replace("_", " ")}</td>
                  <td className="py-2 pr-4">{jobClicks[j.id] ?? 0}</td>
                </tr>
              ))}
              {jobs.length === 0 && (
                <tr><td colSpan={4} className="py-4 text-gray-500 dark:text-gray-400 text-center">No job postings found</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
          Apply clicks are tracked with client-side deduplication (cookie-consent gated).
        </p>
      </CardContent>
    </Card>
  );
};

export default JobsTab;
