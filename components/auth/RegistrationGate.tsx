"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useAdmin } from "@/hooks/useAdmin";

// Client-side gate: a signed-in user who hasn't completed registration is only
// allowed on /join (and the login/privacy pages). Navigating anywhere else signs them out.
export default function RegistrationGate() {
  const pathname = usePathname();
  const { user, profile, profileLoading, logout } = useAdmin();

  useEffect(() => {
    if (!user) return; // anonymous visitors browse freely
    if (profileLoading) return; // wait for the shared profile lookup so a complete profile isn't read as incomplete

    const completed = Boolean(profile?.isMember) && Boolean(profile?.privacyAcceptedAt);
    if (completed) return;

    // Half-registered: allow only the pages needed to finish or re-authenticate.
    const allowedPaths = ["/join", "/login", "/privacy"];
    if (allowedPaths.some((p) => pathname === p || pathname?.startsWith(p + "/"))) return;

    // Navigated off /join without a complete account — sign them out.
    logout();
  }, [user, profile, profileLoading, pathname, logout]);

  return null;
}
