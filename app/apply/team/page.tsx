import type { Metadata } from "next";
import dynamic from "next/dynamic";
import HeroSplash from "@/components/HeroSplash";

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
    <div className="min-h-screen bg-background transition-colors duration-300">
      <HeroSplash className="min-h-[50vh] animate-pulse">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-16">
          <div className="h-4 w-32 bg-current/20 rounded mb-6" />
          <div className="h-12 w-full max-w-sm bg-current/10 rounded mb-6" />
          <div className="h-6 w-full max-w-lg bg-current/10 rounded mb-6" />
          <div className="h-5 w-48 bg-current/10 rounded" />
        </div>
      </HeroSplash>
      <div className="bg-background min-h-screen py-12">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-8 w-48 bg-muted rounded animate-pulse mb-6" />
          <div className="space-y-4">
            <div className="h-32 bg-card rounded-xl animate-pulse border border-border" />
            <div className="h-32 bg-card rounded-xl animate-pulse border border-border" />
            <div className="h-32 bg-card rounded-xl animate-pulse border border-border" />
          </div>
        </div>
      </div>
    </div>
  );
}
