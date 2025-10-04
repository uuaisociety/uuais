"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { type UserProfile, listUsers, updateUserProfile, deleteUser } from "@/lib/firestore";
import { Button } from "@/components/ui/Button";
import { useNotify } from "@/components/ui/Notifications";

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
  "newsletter",
  "lookingForJob",
  "privacyAcceptedAt",
  "marketingOptIn",
  "analyticsOptIn",
  "partnerContactOptIn",
  "createdAt",
  "updatedAt",
];

export default function MembersTab({ onChanged }: MembersTabProps) {
  const { notify } = useNotify();
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<EditableUser[]>([]);
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState<EditableUser | null>(null);
  const [draft, setDraft] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

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
    refresh();
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
    const keys = Array.from(
      new Set([...fieldOrder, ...Object.keys({ ...selected, ...draft })])
    );
    return (
      <div
        className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
        onClick={close}
      >
        <div
          className="bg-white dark:bg-gray-900 rounded-lg w-full max-w-3xl p-6 max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Edit User: {selected.displayName || selected.name || selected.email}
            </h3>
            <Button onClick={close}>
              Close
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {keys.map((k) => (
              <div key={k} className="flex flex-col gap-1">
                <label className="text-xs text-gray-600 dark:text-gray-400">{k}</label>
                {typeof (draft as Record<string, unknown>)[k] === "boolean" ? (
                  <label className="inline-flex items-center gap-2 text-gray-800 dark:text-gray-200">
                    <input
                      type="checkbox"
                      checked={Boolean((draft as Record<string, unknown>)[k])}
                      onChange={(e) => onChangeField(k, e.target.checked)}
                    />
                    {String(k)}
                  </label>
                ) : (
                  <input
                    className="input"
                    value={String((draft as Record<string, unknown>)[k] ?? "")}
                    onChange={(e) => onChangeField(k, e.target.value)}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="mt-4 flex justify-between">
            <Button
              className="px-3 py-2 text-red-600 border border-red-600 rounded-md"
              onClick={onDelete}
              disabled={deleting || saving}
            >
              {deleting ? "Deleting..." : "Delete"}
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
                {saving ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Members</h2>
        <div className="flex items-center gap-2">
          <input
            className="input"
            placeholder="Search name, email, program, campus..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
          <Button onClick={refresh} disabled={loading}>
            {loading ? "Refreshing..." : "Refresh"}
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="text-gray-600 dark:text-gray-300">
            <tr>
              <th className="py-2 pr-4">Name</th>
              <th className="py-2 pr-4">Email</th>
              <th className="py-2 pr-4">Member</th>
              <th className="py-2 pr-4">Campus</th>
              <th className="py-2 pr-4">Updated</th>
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
              filtered.map((m) => (
                <tr
                  key={m.id}
                  className="border-t border-gray-200 dark:border-gray-700 hover:bg-gray-50/50 dark:hover:bg-gray-800/50"
                >
                  <td className="py-2 pr-4">{m.name || m.displayName || "-"}</td>
                  <td className="py-2 pr-4">{m.email || "-"}</td>
                  <td className="py-2 pr-4">{m.isMember ? "Yes" : "No"}</td>
                  <td className="py-2 pr-4">{m.campus || "-"}</td>
                  <td className="py-2 pr-4">{m.updatedAt ? new Date(m.updatedAt).toLocaleDateString() : "-"}</td>
                  <td className="py-2 pr-4">
                    <Button onClick={() => open(m)}>
                      Edit
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {renderEditor()}
    </div>
  );
}
