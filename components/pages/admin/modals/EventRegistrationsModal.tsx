'use client';

import React, { useEffect, useState } from 'react';
import { Users, Send, ChevronDown, Check, X, Trash2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import {
  subscribeToEventRegistrations,
  inviteRegistrant,
  removeRegistration,
} from '@/lib/firestore/registrations';
import {
  subscribeToEventAttendance,
  setAttendanceForUser,
  type EventAttendanceEntry,
} from '@/lib/firestore/attendance';
import { getUserProfile } from '@/lib/firestore/users';
import { EventRegistration } from '@/types';
import { Button } from '@/components/ui/Button';
import { useNotify } from '@/components/ui/Notifications';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tag } from '@/components/ui/Tag';
import ConfirmModal from '@/components/ui/ConfirmModal';
import {
  isUploadedFileRef,
  registrationFileDownloadUrl,
} from '@/lib/registration-files';

function answerToText(value: unknown): string {
  if (isUploadedFileRef(value)) return value.name || 'Attached file';
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value ?? '');
}

function answerToCsvText(value: unknown, baseUrl: string): string {
  if (isUploadedFileRef(value)) {
    const url = `${baseUrl}${registrationFileDownloadUrl(value.path)}`;
    return value.name ? `${value.name} (${url})` : url;
  }
  return answerToText(value);
}

function AnswerValue({ value }: { value: unknown }) {
  if (isUploadedFileRef(value)) {
    return (
      <a
        href={registrationFileDownloadUrl(value.path)}
        target="_blank"
        rel="noreferrer"
        className="text-primary underline hover:brightness-110"
      >
        Download {value.name || 'file'}
      </a>
    );
  }
  return <>{answerToText(value)}</>;
}

export interface EventRegistrationsModalProps {
  open: boolean;
  eventId: string;
  eventTitle: string;
  questions?: import('@/types').EventCustomQuestion[];
  onClose: () => void;
}

const EventRegistrationsModal: React.FC<EventRegistrationsModalProps> = ({
  open,
  eventId,
  eventTitle,
  onClose,
  questions = [],
}) => {
  const [registrations, setRegistrations] = useState<EventRegistration[]>([]);
  const [loaded, setLoaded] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [invitingId, setInvitingId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [bulkInviting, setBulkInviting] = useState(false);
  const [bulkRemoving, setBulkRemoving] = useState(false);
  const [removeTargets, setRemoveTargets] = useState<EventRegistration[]>([]);
  const [sortKey, setSortKey] = useState<'name' | 'status' | 'time'>('time');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const { notify } = useNotify();
  const [attendanceByUser, setAttendanceByUser] = useState<
    Record<string, EventAttendanceEntry>
  >({});
  const [userProfiles, setUserProfiles] = useState<
    Record<string, { program?: string; expectedGraduationYear?: number }>
  >({});

  useEffect(() => {
    if (!open || !eventId) return;
    const unsub = subscribeToEventRegistrations(eventId, (regs) => {
      setRegistrations(regs);
      setLoaded(true);
    });
    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, [open, eventId]);

  useEffect(() => {
    if (!open || !eventId) return;
    const unsub = subscribeToEventAttendance(eventId, (entries) => {
      const map: Record<string, EventAttendanceEntry> = {};
      for (const a of entries) {
        if (!a || !a.userId) continue;
        map[a.userId] = a;
      }
      setAttendanceByUser(map);
    });
    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, [open, eventId]);

  useEffect(() => {
    const uniqueIds = [
      ...new Set(registrations.map((r) => r.userId).filter(Boolean)),
    ];
    if (uniqueIds.length === 0) return;
    let cancelled = false;
    (async () => {
      const map: Record<
        string,
        { program?: string; expectedGraduationYear?: number }
      > = {};
      await Promise.allSettled(
        uniqueIds.map(async (uid) => {
          try {
            const profile = await getUserProfile(uid);
            if (profile)
              map[uid] = {
                program: profile.program,
                expectedGraduationYear: profile.expectedGraduationYear,
              };
          } catch {
            // skip failed profile fetch
          }
        }),
      );
      if (!cancelled) setUserProfiles(map);
    })();
    return () => {
      cancelled = true;
    };
  }, [registrations]);

  const totalRegistered = registrations.filter(
    (r) => r.status !== 'cancelled' && r.status !== 'declined',
  ).length;
  const attendedCount =
    registrations.filter((r) => {
      const a = attendanceByUser[r.userId];
      return !!a && a.attended === true;
    }).length || 0;

  const attendancePct =
    totalRegistered > 0
      ? Math.round((attendedCount / totalRegistered) * 100)
      : 0;

  const selectedRegistrations = registrations.filter((r) => !!selected[r.id]);

  // Derive a display name using userName or common name fields from registrationData
  const displayNameFor = (r: EventRegistration): string => {
    const getStr = (key: string): string => {
      const raw =
        r.registrationData?.[
          key as keyof NonNullable<EventRegistration['registrationData']>
        ];
      return typeof raw === 'string' ? raw : '';
    };
    const first =
      getStr('firstName') || getStr('First Name') || getStr('first_name');
    const last =
      getStr('lastName') || getStr('Last Name') || getStr('last_name');
    const fallbackName =
      first || last ? `${first} ${last}`.trim() : getStr('Name') || '';
    return (r.userName || '').trim() || fallbackName || '';
  };

  // Derive an email using userEmail or common email fields from registrationData
  const emailFor = (r: EventRegistration): string => {
    const getStr = (key: string): string => {
      const raw =
        r.registrationData?.[
          key as keyof NonNullable<EventRegistration['registrationData']>
        ];
      return typeof raw === 'string' ? raw : '';
    };
    const fallbackEmail = getStr('email') || getStr('Email');
    return (r.userEmail || '').trim() || fallbackEmail || '';
  };

  // Order used for sorting by status (higher is "greater")
  const statusOrder: Record<string, number> = {
    confirmed: 5,
    invited: 4,
    registered: 3,
    waitlist: 2,
    declined: 1,
    cancelled: 0,
  };

  // Comparator used by Array.sort to sort registrations
  const compareRegs = (
    a: EventRegistration,
    b: EventRegistration,
    key: 'name' | 'status' | 'time',
    dir: 'asc' | 'desc',
  ) => {
    let res = 0;
    if (key === 'time') {
      const ta = a.registeredAt ? new Date(a.registeredAt).getTime() : 0;
      const tb = b.registeredAt ? new Date(b.registeredAt).getTime() : 0;
      res = ta - tb;
    } else if (key === 'name') {
      const na = displayNameFor(a).toLowerCase();
      const nb = displayNameFor(b).toLowerCase();
      res = na.localeCompare(nb);
    } else if (key === 'status') {
      const oa = statusOrder[a.status || 'registered'] ?? -1;
      const ob = statusOrder[b.status || 'registered'] ?? -1;
      res = oa - ob;
    }
    // Stabilize sort with id when equal to make direction changes visible
    if (res === 0) {
      res = (a.id || '').localeCompare(b.id || '');
    }
    return dir === 'asc' ? res : -res;
  };

  // Toggle sorting key/direction for the table
  const toggleSort = (key: 'name' | 'status' | 'time') => {
    // If clicking same key, flip direction; otherwise set key and default to asc
    setSortDir((prevDir) =>
      sortKey === key ? (prevDir === 'asc' ? 'desc' : 'asc') : 'asc',
    );
    setSortKey(key);
  };

  // Generate and download a CSV export for the current registrations
  const exportCsv = (
    regs: EventRegistration[],
    qs: import('@/types').EventCustomQuestion[] | undefined,
  ) => {
    const exportable = regs.filter(
      (r) => r.status !== 'cancelled' && r.status !== 'declined',
    );
    const omitted = regs.length - exportable.length;
    const baseUrl = (
      process.env.NEXT_PUBLIC_SITE_URL ||
      (typeof window !== 'undefined' ? window.location.origin : '')
    ).replace(/\/$/, '');
    const hasQs = !!(qs && qs.length > 0);
    let headers: string[] = ['Name', 'Email', 'Status', 'Signed Up'];
    if (hasQs) {
      headers = headers.concat(qs!.map((q) => q.question));
    } else {
      const fieldSet = new Set<string>();
      exportable.forEach((r) => {
        Object.keys(r.registrationData || {}).forEach((k) => fieldSet.add(k));
      });
      headers = headers.concat(Array.from(fieldSet));
    }

    // Neutralize spreadsheet formula injection in user-controlled cells.
    const csvSafe = (s: string) => (/^[=+\-@\t\r]/.test(s) ? `'${s}` : s);
    const escape = (val: unknown) => {
      const s = csvSafe(
        Array.isArray(val)
          ? val.join(', ')
          : typeof val === 'boolean'
            ? val
              ? 'Yes'
              : 'No'
            : String(val ?? ''),
      );
      if (s.includes('"') || s.includes(',') || s.includes('\n'))
        return '"' + s.replace(/"/g, '""') + '"';
      return s;
    };

    const rows = exportable
      .slice()
      .sort((a, b) => compareRegs(a, b, sortKey, sortDir))
      .map((r) => {
        const base = [
          displayNameFor(r),
          emailFor(r),
          r.status || 'registered',
          r.registeredAt || '',
        ];
        if (hasQs) {
          const ansStr: string[] = qs!.map((q) => {
            const data = r.registrationData || {};
            const candidates = [
              q.id,
              q.question,
              q.question.trim(),
              q.question.trim().toLowerCase(),
              q.question.replace(/\s+/g, ''),
              q.question.replace(/\s+/g, '_'),
            ];
            for (const k of candidates) {
              if (
                k &&
                Object.prototype.hasOwnProperty.call(data, k as string)
              ) {
                const v = (data as Record<string, unknown>)[k as string];
                return answerToCsvText(v, baseUrl);
              }
            }
            return '';
          });
          return base.concat(ansStr).map(escape).join(',');
        } else {
          const valuesStr: string[] = headers.slice(4).map((k) => {
            const v = (r.registrationData || {})[
              k as keyof NonNullable<EventRegistration['registrationData']>
            ];
            return answerToCsvText(v, baseUrl);
          });
          return base.concat(valuesStr).map(escape).join(',');
        }
      });

    const csv = [headers.map(escape).join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `registrations-${eventTitle.replace(/\s+/g, '-').toLowerCase()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    if (omitted > 0)
      notify({
        type: 'info',
        message: `Exported ${exportable.length} registrations; ${omitted} cancelled/declined excluded`,
      });
    void fetch('/api/admin/audit-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId, count: exportable.length }),
    }).catch(() => undefined);
  };

  if (!open) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Registrations — ${eventTitle}`}
      size="xl"
      className="p-0"
      header={
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-foreground/80" aria-hidden />
            <h2 className="text-lg font-semibold text-foreground">
              Registrations — {eventTitle}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="size-9 grid place-items-center rounded-sm text-muted-foreground hover:text-foreground hover:bg-foreground/[0.05] transition-colors cursor-pointer"
          >
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>
      }
    >
      <div className="p-4">
        {!loaded ? (
          <p className="text-sm text-foreground/80">Loading registrations…</p>
        ) : registrations.length === 0 ? (
          <p className="text-sm text-foreground/80">No registrations yet.</p>
        ) : (
          <>
            {/* Top controls: count + bulk actions */}
            <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
              <div className="text-sm text-foreground/80">
                Total registrations:{' '}
                <span className="font-medium text-foreground">
                  {registrations.length}
                </span>
              </div>
              <div className="text-xs text-foreground/80 flex flex-col sm:flex-row sm:items-center gap-1">
                <span>
                  Present:{' '}
                  <span className="font-semibold">{attendedCount || 0}</span>
                </span>
                <span className="sm:ml-3">
                  Attendance:{' '}
                  <span className="font-semibold">{attendancePct}%</span>
                </span>
              </div>
              <div className="flex items-center gap-2 ml-auto">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const map: Record<string, boolean> = {};
                    for (const r of registrations) map[r.id] = true;
                    setExpanded(map);
                  }}
                >
                  Open all
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setExpanded({})}
                >
                  Close all
                </Button>
                {/* Show selected count next to bulk actions */}
                {(() => {
                  const selectedCount = selectedRegistrations.length;
                  return (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={true} //bulkInviting || registrations.every(r => !(selected[r.id] && (r.status === 'registered' || r.status === 'waitlist')))}
                      onClick={async () => {
                        setBulkInviting(true);
                        try {
                          const baseUrl =
                            process.env.NEXT_PUBLIC_SITE_URL ||
                            (typeof window !== 'undefined'
                              ? window.location.origin
                              : '');
                          const targets = registrations.filter(
                            (r) =>
                              selected[r.id] &&
                              (r.status === 'registered' ||
                                r.status === 'waitlist'),
                          );
                          for (const r of targets) {
                            try {
                              await inviteRegistrant(r.id, { baseUrl });
                            } catch (e) {
                              console.warn('Invite failed for', r.id, e);
                            }
                          }
                          notify({
                            type: 'success',
                            message: `Invites sent to ${targets.length} selected`,
                          });
                        } finally {
                          setBulkInviting(false);
                        }
                      }}
                    >
                      {bulkInviting
                        ? 'Inviting…'
                        : `Invite selected (${selectedCount})`}
                    </Button>
                  );
                })()}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => exportCsv(registrations, questions)}
                >
                  Export CSV
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={bulkRemoving || selectedRegistrations.length === 0}
                  onClick={() => setRemoveTargets(selectedRegistrations)}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  {bulkRemoving
                    ? 'Removing…'
                    : `Remove selected (${selectedRegistrations.length})`}
                </Button>
              </div>
            </div>
            <div className="overflow-x-auto -mx-1 px-1">
              <Table className="min-w-full text-left">
                <TableHeader>
                  <TableRow>
                    <TableHead className="py-2 pr-2">
                      <input
                        type="checkbox"
                        aria-label="Select all"
                        checked={
                          registrations.length > 0 &&
                          registrations.every((r) => !!selected[r.id])
                        }
                        onChange={(e) => {
                          const checked = e.target.checked;
                          const next: Record<string, boolean> = {};
                          for (const r of registrations) next[r.id] = checked;
                          setSelected(next);
                        }}
                      />
                    </TableHead>
                    {/* Sortable column headers with indicators */}
                    <TableHead
                      className="py-2 pr-4"
                      aria-sort={
                        sortKey === 'name'
                          ? sortDir === 'asc'
                            ? 'ascending'
                            : 'descending'
                          : 'none'
                      }
                    >
                      <button
                        type="button"
                        onClick={() => toggleSort('name')}
                        className="flex items-center gap-1 select-none rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        Name{' '}
                        {sortKey === 'name' && (
                          <span className="ml-1" aria-hidden="true">
                            {sortDir === 'asc' ? '▲' : '▼'}
                          </span>
                        )}
                      </button>
                    </TableHead>
                    <TableHead className="py-2 pr-4">Email</TableHead>
                    <TableHead
                      className="py-2 pr-4"
                      aria-sort={
                        sortKey === 'status'
                          ? sortDir === 'asc'
                            ? 'ascending'
                            : 'descending'
                          : 'none'
                      }
                    >
                      <button
                        type="button"
                        onClick={() => toggleSort('status')}
                        className="flex items-center gap-1 select-none rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        Status{' '}
                        {sortKey === 'status' && (
                          <span className="ml-1" aria-hidden="true">
                            {sortDir === 'asc' ? '▲' : '▼'}
                          </span>
                        )}
                      </button>
                    </TableHead>
                    <TableHead
                      className="py-2 pr-4"
                      aria-sort={
                        sortKey === 'time'
                          ? sortDir === 'asc'
                            ? 'ascending'
                            : 'descending'
                          : 'none'
                      }
                    >
                      <button
                        type="button"
                        onClick={() => toggleSort('time')}
                        className="flex items-center gap-1 select-none rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        Signed Up{' '}
                        {sortKey === 'time' && (
                          <span className="ml-1" aria-hidden="true">
                            {sortDir === 'asc' ? '▲' : '▼'}
                          </span>
                        )}
                      </button>
                    </TableHead>
                    <TableHead className="py-2 pr-2 text-right">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {registrations
                    .slice()
                    .sort((a, b) => compareRegs(a, b, sortKey, sortDir))
                    .map((r) => {
                      const getStr = (key: string): string => {
                        const raw = r.registrationData?.[key];
                        return typeof raw === 'string' ? raw : '';
                      };
                      const first =
                        getStr('firstName') ||
                        getStr('First Name') ||
                        getStr('first_name');
                      const last =
                        getStr('lastName') ||
                        getStr('Last Name') ||
                        getStr('last_name');
                      const fallbackName =
                        first || last
                          ? `${first} ${last}`.trim()
                          : getStr('Name') || '';
                      const fallbackEmail = getStr('email') || getStr('Email');
                      const name = (r.userName || '').trim() || fallbackName;
                      const email = (r.userEmail || '').trim() || fallbackEmail;
                      const signedUp = r.registeredAt
                        ? new Date(r.registeredAt).toLocaleString()
                        : '—';
                      const status = r.status || 'registered';
                      const attendanceEntry = attendanceByUser[r.userId];
                      const isPresent = attendanceEntry?.attended === true;

                      const statusTag = () => {
                        switch (status) {
                          case 'registered':
                            return (
                              <Tag variant="green" size="sm">
                                registered
                              </Tag>
                            );
                          case 'waitlist':
                            return (
                              <Tag variant="yellow" size="sm">
                                waitlist
                              </Tag>
                            );
                          case 'invited':
                            return (
                              <Tag variant="blue" size="sm">
                                invited
                              </Tag>
                            );
                          case 'confirmed':
                            return (
                              <Tag variant="green" size="sm">
                                confirmed
                              </Tag>
                            );
                          case 'declined':
                          case 'cancelled':
                            return (
                              <Tag variant="gray" size="sm">
                                {status}
                              </Tag>
                            );
                          default:
                            return (
                              <Tag variant="gray" size="sm">
                                {status}
                              </Tag>
                            );
                        }
                      };

                      const toggle = () =>
                        setExpanded((s) => ({ ...s, [r.id]: !s[r.id] }));

                      const getAnswerValue = (
                        q: import('@/types').EventCustomQuestion,
                      ): unknown => {
                        const data = r.registrationData || {};
                        const candidates = [
                          q.id,
                          q.question,
                          q.question.trim(),
                          q.question.trim().toLowerCase(),
                          q.question.replace(/\s+/g, ''),
                          q.question.replace(/\s+/g, '_'),
                        ];
                        for (const k of candidates) {
                          if (
                            k &&
                            Object.prototype.hasOwnProperty.call(
                              data,
                              k as string,
                            )
                          ) {
                            return (data as Record<string, unknown>)[
                              k as string
                            ];
                          }
                        }
                        return '';
                      };

                      return (
                        <React.Fragment key={r.id}>
                          <TableRow
                            className={`border-t border-border hover:bg-foreground/[0.04]
                            ${isPresent ? 'bg-green-200/80 dark:bg-green-900/20 hover:bg-green-200/90 dark:hover:bg-green-900/40' : ''}`}
                          >
                            <TableCell className="py-2 pr-2">
                              <input
                                type="checkbox"
                                aria-label={`Select ${name || email || r.id}`}
                                checked={!!selected[r.id]}
                                onChange={(e) =>
                                  setSelected((s) => ({
                                    ...s,
                                    [r.id]: e.target.checked,
                                  }))
                                }
                              />
                            </TableCell>
                            <TableCell className="py-2 pr-4">
                              {name || '—'}
                            </TableCell>
                            <TableCell className="py-2 pr-4">
                              {email || '—'}
                            </TableCell>
                            <TableCell className="py-2 pr-4">
                              {statusTag()}
                            </TableCell>
                            <TableCell className="py-2 pr-4">
                              {signedUp}
                            </TableCell>
                            <TableCell className="py-2 pr-2">
                              <div className="flex flex-wrap items-center gap-2 justify-end">
                                <Button
                                  size="sm"
                                  variant={isPresent ? 'outline' : 'outline'}
                                  onClick={async () => {
                                    if (!eventId || !r.userId) return;
                                    const next = !isPresent;
                                    try {
                                      await setAttendanceForUser(
                                        eventId,
                                        r.userId,
                                        next,
                                      );
                                      setAttendanceByUser((prev) => ({
                                        ...prev,
                                        [r.userId]: {
                                          userId: r.userId,
                                          attended: next,
                                          timestamp: next ? Date.now() : null,
                                        },
                                      }));
                                      notify({
                                        type: next ? 'success' : 'warning',
                                        message: next
                                          ? `${name || email || r.id} marked as present`
                                          : `${name || email || r.id} marked as absent`,
                                      });
                                    } catch (e) {
                                      notify({
                                        type: 'error',
                                        message:
                                          e instanceof Error
                                            ? e.message
                                            : 'Failed to update attendance',
                                      });
                                    }
                                  }}
                                >
                                  {isPresent ? (
                                    <>
                                      <Check className="h-4 w-4 mr-1" />
                                      Mark absent
                                    </>
                                  ) : (
                                    <>
                                      <X className="h-4 w-4 mr-1" />
                                      Mark present
                                    </>
                                  )}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={true} //invitingId === r.id || status === 'invited' || status === 'confirmed'
                                  onClick={async () => {
                                    try {
                                      setInvitingId(r.id);
                                      const baseUrl =
                                        process.env.NEXT_PUBLIC_SITE_URL ||
                                        (typeof window !== 'undefined'
                                          ? window.location.origin
                                          : '');
                                      await inviteRegistrant(r.id, { baseUrl });
                                      notify({
                                        type: 'success',
                                        message: 'Invitation sent',
                                      });
                                    } catch (e) {
                                      notify({
                                        type: 'error',
                                        message:
                                          e instanceof Error
                                            ? e.message
                                            : 'Failed to send invitation',
                                      });
                                    } finally {
                                      setInvitingId(null);
                                    }
                                  }}
                                  title="Send invitation"
                                >
                                  <Send className="h-4 w-4" /> Invite
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={toggle}
                                >
                                  <ChevronDown
                                    className={`h-4 w-4 mr-1 transition-transform ${expanded[r.id] ? 'rotate-180' : ''}`}
                                  />
                                  {expanded[r.id]
                                    ? 'Hide details'
                                    : 'View details'}
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                          {expanded[r.id] && (
                            <TableRow className="bg-foreground/[0.03]">
                              <TableCell colSpan={6} className="p-3">
                                {(() => {
                                  const profile = r.userId
                                    ? userProfiles[r.userId]
                                    : undefined;
                                  if (
                                    profile?.program ||
                                    profile?.expectedGraduationYear
                                  ) {
                                    return (
                                      <div className="mb-3 pb-3 border-b border-border text-sm text-foreground/80">
                                        <span className="font-medium">
                                          Program:
                                        </span>{' '}
                                        {profile.program || (
                                          <span className="text-muted-foreground italic">
                                            Not provided
                                          </span>
                                        )}
                                        <span className="mx-2">|</span>
                                        <span className="font-medium">
                                          Graduation Year:
                                        </span>{' '}
                                        {profile.expectedGraduationYear || (
                                          <span className="text-muted-foreground italic">
                                            Not provided
                                          </span>
                                        )}
                                      </div>
                                    );
                                  }
                                  return null;
                                })()}
                                {questions && questions.length > 0 ? (
                                  <Table className="w-full">
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead className="w-1/3">
                                          Question
                                        </TableHead>
                                        <TableHead>Answer</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {questions.map((q) => {
                                        const answer = getAnswerValue(q);
                                        return (
                                          <TableRow key={q.id}>
                                            <TableCell className="align-top text-foreground/80">
                                              {q.question}
                                            </TableCell>
                                            <TableCell className="align-top text-foreground whitespace-pre-wrap wrap-break-word">
                                              {answerToText(answer) ? (
                                                <AnswerValue value={answer} />
                                              ) : (
                                                '—'
                                              )}
                                            </TableCell>
                                          </TableRow>
                                        );
                                      })}
                                    </TableBody>
                                  </Table>
                                ) : (
                                  <Table className="w-full">
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead className="w-1/3">
                                          Question
                                        </TableHead>
                                        <TableHead>Answer</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {Object.entries(
                                        r.registrationData || {},
                                      ).map(([k, v]) => (
                                        <TableRow key={k}>
                                          <TableCell className="align-top text-foreground/80">
                                            {k}
                                          </TableCell>
                                          <TableCell className="align-top text-foreground whitespace-pre-wrap wrap-break-word">
                                            <AnswerValue value={v} />
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                )}
                                {Object.values(r.registrationData || {}).some(
                                  isUploadedFileRef,
                                ) && (
                                  <p className="mt-2 text-xs text-muted-foreground">
                                    Uploaded files are automatically deleted 60
                                    days after the event.
                                  </p>
                                )}
                              </TableCell>
                            </TableRow>
                          )}
                        </React.Fragment>
                      );
                    })}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </div>
      <ConfirmModal
        open={removeTargets.length > 0}
        title={
          removeTargets.length === 1
            ? 'Remove registration'
            : `Remove ${removeTargets.length} registrations`
        }
        description={
          removeTargets.length === 1
            ? `Remove registration for ${
                removeTargets[0]?.userName ||
                removeTargets[0]?.userEmail ||
                removeTargets[0]?.id ||
                'this member'
              }? Their answers and uploaded files will be deleted. This cannot be undone.`
            : `Remove the ${removeTargets.length} selected registrations? Their answers and uploaded files will be deleted. This cannot be undone.`
        }
        confirmText={
          removeTargets.length === 1
            ? 'Remove registration'
            : `Remove ${removeTargets.length} registrations`
        }
        cancelText="Keep registrations"
        onClose={() => setRemoveTargets([])}
        onConfirm={async () => {
          const targets = removeTargets;
          if (targets.length === 0) return;
          setBulkRemoving(true);
          let removed = 0;
          for (const target of targets) {
            try {
              await removeRegistration(target.id);
              removed++;
            } catch (e) {
              console.warn('Remove failed for', target.id, e);
            }
          }
          setBulkRemoving(false);
          setRemoveTargets([]);
          setSelected({});
          if (removed > 0) {
            notify({
              type: 'success',
              message:
                removed === 1
                  ? `${targets[0].userName || targets[0].userEmail || targets[0].id} removed from this event`
                  : `${removed} registrations removed from this event`,
            });
          }
          if (removed < targets.length) {
            notify({
              type: 'error',
              message: `${targets.length - removed} registration(s) could not be removed`,
            });
          }
        }}
      />
    </Modal>
  );
};

export default EventRegistrationsModal;
