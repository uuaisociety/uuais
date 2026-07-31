import type { Metadata } from "next";
import dynamic from "next/dynamic";

export const metadata: Metadata = {
  title: "Join Our Teams",
  description: "Apply to join UU AI Society teams",
};

const TeamApplicationPage = dynamic(
  () => import("@/components/pages/TeamApplicationPage"),
  {
    loading: () => <TeamApplicationSkeleton />,
  }
);

export default function Page() {
  return <TeamApplicationPage />;
}

function TeamApplicationSkeleton() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 transition-colors duration-300">
      <div className="bg-gradient-to-br from-red-600 via-red-700 to-red-800 dark:from-red-700 dark:via-red-800 dark:to-red-900 text-white min-h-[50vh] animate-pulse">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-16">
          <div className="h-4 w-32 bg-red-300/50 rounded mb-6" />
          <div className="h-12 w-full max-w-sm bg-red-300/30 rounded mb-6" />
          <div className="h-6 w-full max-w-lg bg-red-300/20 rounded mb-6" />
          <div className="h-5 w-48 bg-red-300/20 rounded" />
        </div>
      </div>
      <div className="bg-gray-50 dark:bg-gray-900 min-h-screen py-12">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-6" />
          <div className="space-y-4">
            <div className="h-32 bg-white dark:bg-gray-800 rounded-xl animate-pulse border border-gray-200 dark:border-gray-700" />
            <div className="h-32 bg-white dark:bg-gray-800 rounded-xl animate-pulse border border-gray-200 dark:border-gray-700" />
            <div className="h-32 bg-white dark:bg-gray-800 rounded-xl animate-pulse border border-gray-200 dark:border-gray-700" />
          </div>
        </div>
      </div>
    </div>
  );
}
