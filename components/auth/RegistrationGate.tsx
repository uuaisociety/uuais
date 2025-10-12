"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { auth } from "@/lib/firebase-client";
import { getUserProfile } from "@/lib/firestore";

// Client-side gate: if user is signed in but has not completed registration,
// redirect them to /join except for public pages.
export default function RegistrationGate() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (u) => {
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

      if (!u) return; // anonymous visitors are allowed to public pages; private pages should also check auth separately

      const profile = await getUserProfile(u.uid);

      const completed = Boolean(profile?.isMember) && Boolean(profile?.privacyAcceptedAt);
      if (!completed) {
        router.push("/join");
      }
    });
    return () => unsub();
  }, [pathname, router]);

  return null;
}
