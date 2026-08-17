"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { type UserProfile, listUsers, updateUserProfile, deleteUser } from "@/lib/firestore";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import TableControls, { TablePagination } from '@/components/ui/TableControls';
import { useNotify } from "@/components/ui/Notifications";
import { Download, Trash2} from 'lucide-react';

type EditableUser = UserProfile & Record<string, unknown>;

type MembersTabProps = {
  onChanged?: () => void;
};

const fieldOrder: string[] = [
  "displayName",
  "name",
  "email",
  "photoURL",
  "isMember",
  "studentStatus",
  "campus",
  "university",
  "program",
  "expectedGraduationYear",
  "gender",
  "linkedin",
  "github",
  "website",
  "bio",
  "heardOfUs",
  "newsletter",
  "lookingForJob",
  "privacyAcceptedAt",
  "marketingOptIn",
  "analyticsOptIn",
  "partnerContactOptIn",
  "createdAt",
  "updatedAt",
  "unsubscribedFromEmails",
];

function downloadCsv(users: EditableUser[]) {
  const headers = ['id', ...fieldOrder];
  const rows = [
    headers,
    ...users.map((u) => headers.map((h) => (u as Record<string, unknown>)[h] ?? '')),
  ];
  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `members-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

type SortableThProps = {
  column: string;
  sortKey: string | null;
  sortDir: 'asc' | 'desc';
  onToggle: (key: string) => void;
  children: React.ReactNode;
};

const SortableTh: React.FC<SortableThProps> = ({ column, sortKey, sortDir, onToggle, children }) => (
  <th
    className="py-2 pr-4"
    aria-sort={sortKey === column ? (sortDir === 'asc' ? 'ascending' : 'descending') : undefined}
  >
    <button
      type="button"
      onClick={() => onToggle(column)}
      className="inline-flex items-center gap-1 cursor-pointer"
    >
      {children}
      {sortKey === column && (
        <span aria-hidden="true" className="text-xs text-gray-400 dark:text-gray-500">
          {sortDir === 'asc' ? '▲' : '▼'}
        </span>
      )}
    </button>
  </th>
);

export default function MembersTab({ onChanged }: MembersTabProps) {
  const { notify } = useNotify();
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<EditableUser[]>([]);
  const [filter, setFilter] = useState("");
  const [sortKey, setSortKey] = useState<string | null>('updatedAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [selected, setSelected] = useState<EditableUser | null>(null);
  const [draft, setDraft] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const u = await listUsers();
      u.sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
      setUsers(u);
      notify({ type: 'success', message: 'Members refreshed.' });
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    refresh();
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [refresh]);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) =>
      [u.name, u.displayName, u.email, u.program, u.campus, u.university]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [users, filter]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    const s = [...filtered].sort((a, b) => {
      const key = sortKey as string;
      const va = (a as Record<string, unknown>)[key];
      const vb = (b as Record<string, unknown>)[key];
      // Treat undefined/null as empty string
      const sa = va === undefined || va === null ? '' : String(va);
      const sb = vb === undefined || vb === null ? '' : String(vb);
      if (sortDir === 'asc') return sa.localeCompare(sb, undefined, { numeric: true });
      return sb.localeCompare(sa, undefined, { numeric: true });
    });
    return s;
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    if (page > totalPages) setPage(totalPages);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [totalPages, page]);

  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, page, pageSize]);

  const open = (u: EditableUser) => {
    setSelected(u);
    setDraft(u);
  };

  const close = () => {
    setSelected(null);
    setDraft({});
  };

  const onChangeField = (key: string, value: unknown) => {
    setDraft((d) => ({ ...d, [key]: value }));
  };

  const onSave = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const update: Record<string, unknown> = { ...draft };
      // Ensure updatedAt set
      update.updatedAt = new Date().toISOString();
      await updateUserProfile(selected.id, update);
      await refresh();
      onChanged?.();
      close();
      notify({ type: 'success', title: 'Saved', message: 'Member updated.' });
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    if (!selected) return;
    setDeleting(true);
    try {
      await deleteUser(selected.id);
      await refresh();
      onChanged?.();
      close();
      notify({ type: 'success', title: 'Deleted', message: 'Member deleted.' });
    } finally {
      setDeleting(false);
    }
  };

  const renderEditor = () => {
    if (!selected) return null;

    // Merge keys from ordering, selected and draft
    const keys = Array.from(
      new Set([...fieldOrder, ...Object.keys({ ...(selected ?? {}), ...(draft ?? {}) })])
    );

    const booleanFields = new Set([
      'newsletter',
      'lookingForJob',
      'marketingOptIn',
      'analyticsOptIn',
      'partnerContactOptIn',
      'isMember',
      'unsubscribedFromEmails'
    ]);

    const enumOptions: Record<string, string[]> = {
      studentStatus: ['student', 'alumni', 'other'],
      campus: ['Uppsala', 'Gotland', 'other'],
      university: ['Uppsala', 'none', 'other']
    };

    const getValue = (k: string) => {
      const d = draft as Record<string, unknown>;
      const s = selected as Record<string, unknown>;
      if (Object.prototype.hasOwnProperty.call(d, k)) return d[k];
      return s[k];
    };

    return (
      <Modal
        open={!!selected}
        onClose={close}
        title={`Edit User: ${selected.displayName || selected.name || selected.email}`}
        size="lg"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {keys.map((k) => {
              const val = getValue(k);
              // Show booleans using checkbox regardless of draft presence
              if (booleanFields.has(k)) {
                return (
                  <div key={k} className="flex items-center gap-2">
                    <label className="inline-flex items-center gap-2 text-gray-800 dark:text-gray-200">
                      <input
                        type="checkbox"
                        checked={Boolean(val)}
                        onChange={(e) => onChangeField(k, e.target.checked)}
                      />
                      <span className="text-xs text-gray-600 dark:text-gray-400">{k}</span>
                    </label>
                  </div>
                );
              }

              if (enumOptions[k]) {
                return (
                  <div key={k} className="flex flex-col gap-1">
                    <label className="text-xs text-gray-600 dark:text-gray-400">{k}</label>
                    <select
                      className="input"
                      value={val === undefined ? '' : String(val)}
                      onChange={(e) => onChangeField(k, e.target.value === '' ? undefined : e.target.value)}
                    >
                      <option value=""></option>
                      {enumOptions[k].map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              }

              if (k === 'expectedGraduationYear') {
                return (
                  <div key={k} className="flex flex-col gap-1">
                    <label className="text-xs text-gray-600 dark:text-gray-400">{k}</label>
                    <input
                      className="input"
                      type="number"
                      value={String(val ?? '')}
                      onChange={(e) => onChangeField(k, e.target.value === '' ? undefined : Number(e.target.value))}
                    />
                  </div>
                );
              }

              if (k.toLowerCase().includes('at') && typeof val === 'string') {
                // show date-time-ish fields as date input when possible
                const iso = val as string;
                const dateVal = iso ? new Date(iso).toISOString().slice(0, 16) : '';
                return (
                  <div key={k} className="flex flex-col gap-1">
                    <label className="text-xs text-gray-600 dark:text-gray-400">{k}</label>
                    <input
                      className="input"
                      type="datetime-local"
                      value={dateVal}
                      onChange={(e) => onChangeField(k, e.target.value ? new Date(e.target.value).toISOString() : undefined)}
                    />
                  </div>
                );
              }

              return (
                <div key={k} className="flex flex-col gap-1">
                  <label className="text-xs text-gray-600 dark:text-gray-400">{k}</label>
                  <input
                    className="input"
                    value={String(val ?? '')}
                    onChange={(e) => onChangeField(k, e.target.value)}
                  />
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex justify-between">
            <Button
              variant="destructive"
              onClick={onDelete}
              disabled={deleting || saving}
            >
              <Trash2 className="h-4 w-4" aria-hidden /> {deleting ? 'Deleting...' : 'Delete'}
            </Button>
            <div className="flex gap-2">
              <Button className="px-3 py-2 border rounded-md" onClick={close} disabled={saving || deleting}>
                Cancel
              </Button>
              <Button
                className="px-3 py-2 bg-blue-600 text-white rounded-md"
                onClick={onSave}
                disabled={saving || deleting}
              >
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
      </Modal>
    );
  };

  const toggleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
    setPage(1);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Members</h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" icon={Download} onClick={() => downloadCsv(users)}>
            CSV
          </Button>
          <TableControls
            filter={filter}
            setFilter={setFilter}
            loading={loading} 
            onRefresh={refresh}
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="text-gray-600 dark:text-gray-300">
            <tr>
              <SortableTh column="name" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort}>Name</SortableTh>
              <SortableTh column="email" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort}>Email</SortableTh>
              <SortableTh column="isMember" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort}>Member</SortableTh>
              <SortableTh column="campus" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort}>Campus</SortableTh>
              <SortableTh column="program" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort}>Program</SortableTh>
              <SortableTh column="university" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort}>University</SortableTh>
              <SortableTh column="updatedAt" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort}>Updated</SortableTh>
              <th className="py-2 pr-4"></th>
            </tr>
          </thead>
          <tbody className="text-gray-800 dark:text-gray-200">
            {loading ? (
              <tr>
                <td className="py-3" colSpan={6}>
                  Loading...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td className="py-3" colSpan={6}>
                  No users
                </td>
              </tr>
            ) : (
              paginated.map((m) => (
                <tr
                  key={m.id}
                  className="border-t border-gray-200 dark:border-gray-700 hover:bg-gray-50/50 dark:hover:bg-gray-800/50"
                >
                  <td className="py-2 pr-4">{m.name || m.displayName || "-"}</td>
                  <td className="py-2 pr-4">{m.email || "-"}</td>
                  <td className="py-2 pr-4">{m.isMember ? "Yes" : "No"}</td>
                  <td className="py-2 pr-4">{m.campus || "-"}</td>
                  <td className="py-2 pr-4">{m.program || "-"}</td>
                  <td className="py-2 pr-4">{m.university || "-"}</td>
                  <td className="py-2 pr-4">{m.updatedAt ? new Date(m.updatedAt).toLocaleDateString() : "-"}</td>
                  <td className="py-2 pr-4">
                    <Button variant="outline" onClick={() => open(m)}>
                      Edit
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <TablePagination
        page={page}
        setPage={setPage}
        pageSize={pageSize}
        setPageSize={setPageSize}
        totalPages={totalPages}
      />

      {renderEditor()}
    </div>
  );
}
