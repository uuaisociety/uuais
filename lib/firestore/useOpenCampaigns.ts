"use client";

import { useEffect, useState } from "react";
import type { ApplicationCampaign } from "@/types";

/**
 * Public open-campaigns subscription, loaded via dynamic import so the global
 * header never eagerly pulls the Firestore client into the critical path.
 */
export function useOpenCampaigns(): { campaigns: ApplicationCampaign[]; loaded: boolean } {
  const [campaigns, setCampaigns] = useState<ApplicationCampaign[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | null = null;
    void import("@/lib/firestore/applicationCampaigns")
      .then(({ subscribeOpenCampaigns }) => {
        if (!active) return;
        try {
          unsubscribe = subscribeOpenCampaigns((list) => {
            if (!active) return;
            setCampaigns(list);
            setLoaded(true);
          });
        } catch (e) {
          console.warn("Open-campaigns subscription error:", e);
          if (active) setLoaded(true);
        }
      })
      .catch((e) => {
        console.warn("Failed to load campaigns module:", e);
        if (active) setLoaded(true);
      });
    return () => {
      active = false;
      try {
        unsubscribe?.();
      } catch (e) {
        console.warn("Open-campaigns teardown error:", e);
      }
    };
  }, []);

  return { campaigns, loaded };
}
