"use client";

import React from "react";
import { Button } from "@/components/ui/Button";
import { RefreshCw, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from 'lucide-react';

type TopProps = {
  filter: string;
  setFilter: (v: string) => void;
  loading?: boolean;
  onRefresh?: () => void;
};

type PaginationProps = {
  page: number;
  setPage: (p: number | ((p: number) => number)) => void;
  pageSize: number;
  setPageSize: (n: number) => void;
  totalPages: number;
};

export const TableControls: React.FC<TopProps> = ({ filter, setFilter, loading, onRefresh }) => {
  return (
    <div className="flex items-center gap-2">
      <input
        className="input"
        placeholder="Search..."
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />
      <Button onClick={() => onRefresh?.()} disabled={loading} aria-label="Refresh">
        <RefreshCw className="h-4 w-4" />
      </Button>
    </div>
  );
};

export const TablePagination: React.FC<PaginationProps> = ({ page, setPage, pageSize, setPageSize, totalPages }) => {
  return (
    <div className="mt-3 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <label className="text-sm text-gray-600 dark:text-gray-300">Rows:</label>
        <select
          className="input"
          value={String(pageSize)}
          onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
        >
          {[5, 10, 20, 50].map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2">
        <button className="p-2 border rounded" onClick={() => setPage(1)} disabled={page === 1} aria-label="First">
          <ChevronsLeft className="h-4 w-4" />
        </button>
        <button className="p-2 border rounded" onClick={() => setPage((p) => Math.max(1, (p as number) - 1))} disabled={page === 1} aria-label="Prev">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm">Page {page} / {totalPages}</span>
        <button className="p-2 border rounded" onClick={() => setPage((p) => Math.min(totalPages, (p as number) + 1))} disabled={page === totalPages} aria-label="Next">
          <ChevronRight className="h-4 w-4" />
        </button>
        <button className="p-2 border rounded" onClick={() => setPage(totalPages)} disabled={page === totalPages} aria-label="Last">
          <ChevronsRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default TableControls;
