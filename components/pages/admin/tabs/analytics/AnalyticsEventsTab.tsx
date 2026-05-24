"use client";

import React, { useCallback, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Download, ExternalLink, ArrowLeft } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { downloadCsv, shortDate } from "./AnalyticsShared";
import { getEventDetailAnalytics, type EventDetailAnalytics } from "@/lib/firestore/registration-analytics";
import type { EventFunnel } from "@/lib/firestore/event-funnel";
import type { RegistrationAnalytics } from "@/lib/firestore/registration-analytics";
import type { Event } from "@/types";

interface Props {
  funnelData: EventFunnel[];
  events: Event[];
  regAnalytics: RegistrationAnalytics | null;
}

const statusLabel: Record<string, string> = {
  registered: "Registered",
  waitlist: "Waitlist",
  invited: "Invited",
  confirmed: "Confirmed",
  declined: "Declined",
  cancelled: "Cancelled",
};

const statusColor: Record<string, string> = {
  registered: "text-blue-600",
  waitlist: "text-amber-600",
  invited: "text-purple-600",
  confirmed: "text-green-600",
  declined: "text-red-600",
  cancelled: "text-gray-500",
};

const EventsTab: React.FC<Props> = ({ funnelData, events, regAnalytics }) => {
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<EventDetailAnalytics | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const selectedEvent = selectedEventId
    ? events.find((e) => e.id === selectedEventId)
    : null;

  const openEvent = useCallback(async (eventId: string) => {
    setSelectedEventId(eventId);
    setDetailLoading(true);
    setDetailData(null);
    try {
      const data = await getEventDetailAnalytics(eventId);
      setDetailData(data);
    } catch {
      setDetailData(null);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const closeDetail = useCallback(() => {
    setSelectedEventId(null);
    setDetailData(null);
  }, []);

  const downloadFunnelCsv = useCallback(() => {
    const rows = [
      ["Event", "Clicks", "Registrations", "Attended", "View→Reg %", "Reg→Attend %",
       "Registered", "Waitlist", "Invited", "Confirmed", "Declined", "Cancelled"],
      ...funnelData.map((f) => [
        f.title, String(f.clicks), String(f.registrations), String(f.attended),
        `${f.viewToRegPct}%`, `${f.regToAttendPct}%`,
        String(f.statusBreakdown.registered), String(f.statusBreakdown.waitlist),
        String(f.statusBreakdown.invited), String(f.statusBreakdown.confirmed),
        String(f.statusBreakdown.declined), String(f.statusBreakdown.cancelled),
      ]),
    ];
    downloadCsv(rows, `event-funnel-${new Date().toISOString().slice(0, 10)}.csv`);
  }, [funnelData]);

  if (selectedEventId && selectedEvent) {
    return (
      <div className="space-y-6">
        <Button
          onClick={closeDetail}
          variant="outline"
          size="sm"
          className="cursor-pointer inline-flex items-center gap-1.5 text-sm bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white transition-all duration-200"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to all events
        </Button>

        <h3 className="text-xl font-bold text-gray-900 dark:text-white">{selectedEvent.title}</h3>

        {detailLoading && (
          <div className="animate-pulse space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-gray-200 dark:bg-gray-700 rounded-lg h-20" />
              ))}
            </div>
            <div className="bg-gray-200 dark:bg-gray-700 rounded-lg h-64" />
          </div>
        )}

        {!detailLoading && detailData && (
          <div className="space-y-6">
            {/* Status breakdown cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {Object.entries(detailData.statusCounts).map(([status, count]) => (
                <Card key={status}>
                  <CardContent className="p-4 text-center">
                    <p className={`text-lg font-bold ${statusColor[status] || "text-gray-900 dark:text-white"}`}>
                      {count}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {statusLabel[status] || status}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Registrations per day */}
            {detailData.registrationsPerDay.length > 0 && (
              <Card>
                <CardHeader><h4 className="font-semibold text-gray-900 dark:text-white">Registrations Per Day</h4></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={detailData.registrationsPerDay} margin={{ left: 10, right: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Line type="monotone" dataKey="count" name="Registrations" stroke="#3b82f6" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Registrant demographics */}
            {(Object.keys(detailData.memberDemographics.gender).length > 0 ||
              Object.keys(detailData.memberDemographics.studentStatus).length > 0) && (
              <div className="grid md:grid-cols-2 gap-6">
                {Object.keys(detailData.memberDemographics.gender).length > 0 && (
                  <Card>
                    <CardHeader><h4 className="font-semibold text-gray-900 dark:text-white">Gender</h4></CardHeader>
                    <CardContent>
                      <div className="space-y-1.5">
                        {Object.entries(detailData.memberDemographics.gender)
                          .sort(([, a], [, b]) => b - a)
                          .map(([label, count]) => {
                            const total = Object.values(detailData.memberDemographics.gender).reduce((s, c) => s + c, 0);
                            const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                            return (
                              <div key={label} className="flex items-center gap-3 text-sm">
                                <span className="flex-1 text-gray-700 dark:text-gray-300 capitalize">{label}</span>
                                <span className="font-semibold text-gray-900 dark:text-white w-8 text-right">{count}</span>
                                <div className="w-20 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden shrink-0">
                                  <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                                </div>
                                <span className="text-xs text-gray-400 w-10 text-right">{pct}%</span>
                              </div>
                            );
                          })}
                      </div>
                    </CardContent>
                  </Card>
                )}
                {Object.keys(detailData.memberDemographics.studentStatus).length > 0 && (
                  <Card>
                    <CardHeader><h4 className="font-semibold text-gray-900 dark:text-white">Student Status</h4></CardHeader>
                    <CardContent>
                      <div className="space-y-1.5">
                        {Object.entries(detailData.memberDemographics.studentStatus)
                          .sort(([, a], [, b]) => b - a)
                          .map(([label, count]) => {
                            const total = Object.values(detailData.memberDemographics.studentStatus).reduce((s, c) => s + c, 0);
                            const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                            return (
                              <div key={label} className="flex items-center gap-3 text-sm">
                                <span className="flex-1 text-gray-700 dark:text-gray-300 capitalize">{label}</span>
                                <span className="font-semibold text-gray-900 dark:text-white w-8 text-right">{count}</span>
                                <div className="w-20 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden shrink-0">
                                  <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                                </div>
                                <span className="text-xs text-gray-400 w-10 text-right">{pct}%</span>
                              </div>
                            );
                          })}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* Answer distributions */}
            {detailData.questions.length > 0 && (
              <div className="grid md:grid-cols-2 gap-6">
                {detailData.questions.map((q) => {
                  const entries = Object.entries(q.answers).sort(([, a], [, b]) => b - a);
                  const total = entries.reduce((s, [, c]) => s + c, 0);
                  return (
                    <Card key={q.questionId}>
                      <CardHeader>
                        <h4 className="font-semibold text-gray-900 dark:text-white text-sm">
                          {q.questionText}
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{q.type} · {detailData.total} responses</p>
                      </CardHeader>
                      <CardContent>
                        {entries.length === 0 && (
                          <p className="text-sm text-gray-400 italic">No answers</p>
                        )}
                        {entries.length > 0 && (
                          <div className="space-y-1.5">
                            {entries.map(([answer, count]) => {
                              const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                              return (
                                <div key={answer} className="flex items-center gap-3 text-sm">
                                  <span className="flex-1 text-gray-700 dark:text-gray-300 truncate">{answer}</span>
                                  <span className="font-semibold text-gray-900 dark:text-white w-8 text-right">{count}</span>
                                  <div className="w-20 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden shrink-0">
                                    <div
                                      className="h-full bg-red-500 rounded-full transition-all"
                                      style={{ width: `${pct}%` }}
                                    />
                                  </div>
                                  <span className="text-xs text-gray-400 w-10 text-right">{pct}%</span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            {detailData.questions.length === 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                No select/radio/checkbox questions for this event.
              </p>
            )}
          </div>
        )}

        {!detailLoading && !detailData && (
          <p className="text-sm text-gray-500 dark:text-gray-400 italic">Failed to load event details.</p>
        )}
      </div>
    );
  }

  // ---- List view (all events) ----
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Event Funnel — Click → Registration → Attendance
            </h3>
            <Button size="sm" variant="outline" icon={Download} onClick={downloadFunnelCsv}>
              CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-600 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                  <th className="py-2 pr-4">Event</th>
                  <th className="py-2 pr-4">Date</th>
                  <th className="py-2 pr-4">Clicks</th>
                  <th className="py-2 pr-4">Reg.</th>
                  <th className="py-2 pr-4">Att.</th>
                  <th className="py-2 pr-4">View→Reg</th>
                  <th className="py-2 pr-4">Reg→Att</th>
                  <th className="py-2 pr-4">Feedback</th>
                </tr>
              </thead>
              <tbody>
                {funnelData.map((f) => (
                  <tr
                    key={f.eventId}
                    onClick={() => openEvent(f.eventId)}
                    className="border-b border-gray-100 dark:border-gray-700/50 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <td className="py-2 pr-4 font-medium text-blue-600 dark:text-blue-400 hover:underline">
                      {f.title}
                    </td>
                    <td className="py-2 pr-4 text-gray-700 dark:text-gray-300">{shortDate(f.date)}</td>
                    <td className="py-2 pr-4">{f.clicks}</td>
                    <td className="py-2 pr-4">{f.registrations}</td>
                    <td className="py-2 pr-4">{f.attended}</td>
                    <td className="py-2 pr-4">
                      <span className={f.viewToRegPct > 30 ? "text-green-600" : "text-amber-600"}>
                        {f.viewToRegPct}%
                      </span>
                    </td>
                    <td className="py-2 pr-4">
                      <span className={f.regToAttendPct > 50 ? "text-green-600" : "text-amber-600"}>
                        {f.regToAttendPct}%
                      </span>
                    </td>
                    <td className="py-2 pr-4">
                      {(() => {
                        const evt = events.find((e) => e.id === f.eventId);
                        return evt?.feedbackFormUrl ? (
                          <a href={evt.feedbackFormUrl} target="_blank" rel="noreferrer"
                            className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Form <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          <span className="text-gray-400">—</span>
                        );
                      })()}
                    </td>
                  </tr>
                ))}
                {funnelData.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-4 text-gray-500 dark:text-gray-400 text-center">No events found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {regAnalytics && (
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader><h4 className="font-semibold text-gray-900 dark:text-white">Registration Status Across Events</h4></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-600 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                      <th className="py-2 pr-4">Event</th>
                      <th className="py-2 pr-4">Reg.</th>
                      <th className="py-2 pr-4">Wait.</th>
                      <th className="py-2 pr-4">Inv.</th>
                      <th className="py-2 pr-4">Conf.</th>
                      <th className="py-2 pr-4">Dec.</th>
                      <th className="py-2 pr-4">Canc.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(regAnalytics.statusBreakdownPerEvent).map(([eid, s]) => {
                      const evt = events.find((e) => e.id === eid);
                      return (
                        <tr key={eid} className="border-b border-gray-100 dark:border-gray-700/50">
                          <td className="py-2 pr-4 font-medium text-gray-900 dark:text-white">{evt?.title || eid.slice(0, 8)}</td>
                          <td className="py-2 pr-4">{s.registered}</td>
                          <td className="py-2 pr-4">{s.waitlist}</td>
                          <td className="py-2 pr-4">{s.invited}</td>
                          <td className="py-2 pr-4">{s.confirmed}</td>
                          <td className="py-2 pr-4">{s.declined}</td>
                          <td className="py-2 pr-4">{s.cancelled}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><h4 className="font-semibold text-gray-900 dark:text-white">Registrations Per Day</h4></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={regAnalytics.registrationsPerDay} margin={{ left: 10, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" name="Registrations" stroke="#3b82f6" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      <p className="text-xs text-gray-500 dark:text-gray-400">
        Clicks are deduped client-side per browser (cookie-consent gated). Click an event to see detailed registration answers.
      </p>
    </div>
  );
};

export default EventsTab;
