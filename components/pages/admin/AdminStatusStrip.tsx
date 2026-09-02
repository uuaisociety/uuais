"use client";

import React from "react";
import type { AdminActionItem, AdminTabKey } from "./useAdminOverview";

interface Props {
  items: AdminActionItem[];
  loaded: boolean;
  onNavigate: (tab: AdminTabKey, sub?: string) => void;
}

/** The admin "what needs attention" strip — actionable signals in mono counts, not marketing metrics; quiet when everything is handled. */
const AdminStatusStrip: React.FC<Props> = ({ items, loaded, onNavigate }) => {
  return (
    <div className="flex flex-wrap items-center gap-x-7 gap-y-3 rounded-xl border border-border bg-card/70 glass-shadow px-5 py-4">
      {!loaded ? (
        <p className="mono-label text-muted-foreground/60">Loading…</p>
      ) : items.length === 0 ? (
        <p className="mono-label text-muted-foreground">Nothing needs attention.</p>
      ) : (
        items.map((item) => (
          <button
            key={`${item.tab}-${item.label}`}
            type="button"
            onClick={() => onNavigate(item.tab, item.sub)}
            className="group flex items-baseline gap-2 text-left cursor-pointer rounded-sm"
          >
            <span className="font-mono text-sm font-semibold tabular-nums text-primary">{item.count}</span>
            <span className="text-sm text-muted-foreground transition-colors duration-200 group-hover:text-foreground">
              {item.label}
            </span>
          </button>
        ))
      )}
    </div>
  );
};

export default AdminStatusStrip;
