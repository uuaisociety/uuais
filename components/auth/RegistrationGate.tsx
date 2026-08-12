"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAdmin } from "@/hooks/useAdmin";

// Client-side gate: if user is signed in but has not completed registration,
// redirect them to /join except for public pages.
export default function RegistrationGate() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, profile, profileLoading } = useAdmin();

  useEffect(() => {
    // Allow public pages & auth pages without checks
    const publicPaths = [
      "/",
      "/about",
      "/contact",
      "/events",
      "/blog",
      "/privacy",
      "/login",
      "/join",
    ];
    if (publicPaths.some((p) => pathname === p || pathname?.startsWith(p + "/"))) return;

    if (!user) return; // anonymous visitors are allowed to public pages; private pages should also check auth separately
    if (profileLoading) return; // wait for the shared profile lookup so a complete profile isn't read as incomplete

    const completed = Boolean(profile?.isMember) && Boolean(profile?.privacyAcceptedAt);
    if (!completed) {
      router.push("/join");
    }
  }, [user, profile, profileLoading, pathname, router]);

  return null;
}
