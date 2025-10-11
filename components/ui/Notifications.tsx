"use client";

import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

type Notice = {
  id: string;
  type?: "success" | "error" | "info" | "warning";
  title?: string;
  message: string;
  timeoutMs?: number;
};

type NotifyContextType = {
  notify: (n: Omit<Notice, "id">) => void;
};

const NotifyContext = createContext<NotifyContextType | null>(null);

export function useNotify() {
  const ctx = useContext(NotifyContext);
  if (!ctx) throw new Error("useNotify must be used within NotificationsProvider");
  return ctx;
}

export const NotificationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<Notice[]>([]);

  const notify = useCallback((n: Omit<Notice, "id">) => {
    const id = Math.random().toString(36).slice(2);
    const notice: Notice = { id, timeoutMs: 3000, type: "success", ...n };
    setItems((prev) => [...prev, notice]);
    const t = setTimeout(() => {
      setItems((prev) => prev.filter((x) => x.id !== id));
    }, notice.timeoutMs);
    return () => clearTimeout(t);
  }, []);

  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <NotifyContext.Provider value={value}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 space-y-2">
        {items.map((n) => (
          <div
            key={n.id}
            className={
              `min-w-[260px] max-w-sm px-4 py-3 rounded-md shadow-lg border ` +
              (n.type === 'success'
                ? 'bg-green-50 border-green-200 text-green-900 dark:bg-green-900/30 dark:border-green-800 dark:text-green-100'
                : n.type === 'error'
                ? 'bg-red-50 border-red-200 text-red-900 dark:bg-red-900/30 dark:border-red-800 dark:text-red-100'
                : n.type === 'warning'
                ? 'bg-yellow-50 border-yellow-200 text-yellow-900 dark:bg-yellow-900/30 dark:border-yellow-800 dark:text-yellow-100'
                : 'bg-blue-50 border-blue-200 text-blue-900 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-100')
            }
          >
            {n.title && <div className="font-semibold mb-0.5">{n.title}</div>}
            <div className="text-sm">{n.message}</div>
          </div>
        ))}
      </div>
    </NotifyContext.Provider>
  );
};
