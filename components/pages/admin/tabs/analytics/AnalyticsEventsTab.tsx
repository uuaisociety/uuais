'use client';

import React, { useCallback, useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Download, ExternalLink, ArrowLeft } from 'lucide-react';
import { downloadCsv, shortDate } from './AnalyticsShared';
import {
  ChartCard,
  RankedBars,
  TimeAreaChart,
  VIZ,
  fillDays,
  rankWithOther,
  seriesSummary,
} from './AnalyticsCharts';
import {
  getEventDetailAnalytics,
  type EventDetailAnalytics,
} from '@/lib/firestore/registration-analytics';
import type { EventFunnel } from '@/lib/firestore/event-funnel';
import type { RegistrationAnalytics } from '@/lib/firestore/registration-analytics';
import type { Event } from '@/types';

interface Props {
  funnelData: EventFunnel[];
  events: Event[];
  regAnalytics: RegistrationAnalytics | null;
}

const statusLabel: Record<string, string> = {
  registered: 'Registered',
  waitlist: 'Waitlist',
  invited: 'Invited',
  confirmed: 'Confirmed',
  declined: 'Declined',
  cancelled: 'Cancelled',
};

const statusColor: Record<string, string> = {
  registered: 'text-primary',
  waitlist: 'text-amber-600',
  invited: 'text-purple-600',
  confirmed: 'text-green-600',
  declined: 'text-red-600',
  cancelled: 'text-muted-foreground',
};

const EventsTab: React.FC<Props> = ({ funnelData, events, regAnalytics }) => {
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<EventDetailAnalytics | null>(
    null,
  );
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
      [
        'Event',
        'Clicks',
        'Registrations',
        'Attended',
        'View→Reg %',
        'Reg→Attend %',
        'Registered',
        'Waitlist',
        'Invited',
        'Confirmed',
        'Declined',
        'Cancelled',
      ],
      ...funnelData.map((f) => [
        f.title,
        String(f.clicks),
        String(f.registrations),
        String(f.attended),
        `${f.viewToRegPct}%`,
        `${f.regToAttendPct}%`,
        String(f.statusBreakdown.registered),
        String(f.statusBreakdown.waitlist),
        String(f.statusBreakdown.invited),
        String(f.statusBreakdown.confirmed),
        String(f.statusBreakdown.declined),
        String(f.statusBreakdown.cancelled),
      ]),
    ];
    downloadCsv(
      rows,
      `event-funnel-${new Date().toISOString().slice(0, 10)}.csv`,
    );
  }, [funnelData]);

  if (selectedEventId && selectedEvent) {
    return (
      <div className="space-y-6">
        <Button
          onClick={closeDetail}
          variant="outline"
          size="sm"
          className="cursor-pointer inline-flex items-center gap-1.5 text-sm bg-foreground/[0.08] hover:bg-foreground/[0.12] text-muted-foreground hover:text-foreground transition-all duration-200"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to all events
        </Button>

        <h3 className="text-xl font-bold text-foreground">
          {selectedEvent.title}
        </h3>

        {detailLoading && (
          <div className="animate-pulse space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-foreground/[0.06] rounded-lg h-20" />
              ))}
            </div>
            <div className="bg-foreground/[0.06] rounded-lg h-64" />
          </div>
        )}

        {!detailLoading && detailData && (
          <div className="space-y-6">
            {/* Status breakdown cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {Object.entries(detailData.statusCounts).map(
                ([status, count]) => (
                  <Card key={status}>
                    <CardContent className="p-4 text-center">
                      <p
                        className={`text-lg font-bold ${statusColor[status] || 'text-foreground'}`}
                      >
                        {count}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {statusLabel[status] || status}
                      </p>
                    </CardContent>
                  </Card>
                ),
              )}
            </div>

            {/* Registrations per day */}
            {detailData.registrationsPerDay.length > 0 &&
              (() => {
                const perDay = fillDays(detailData.registrationsPerDay, [
                  'count',
                ]);
                return (
                  <ChartCard
                    title="Registrations per day"
                    summary={seriesSummary(perDay, 'count', 'registrations')}
                  >
                    <TimeAreaChart
                      data={perDay}
                      xKey="date"
                      series={[
                        {
                          key: 'count',
                          name: 'Registrations',
                          color: VIZ.primary,
                        },
                      ]}
                    />
                  </ChartCard>
                );
              })()}

            {/* Registrant demographics */}
            {(Object.keys(detailData.memberDemographics.gender).length > 0 ||
              Object.keys(detailData.memberDemographics.studentStatus).length >
                0) && (
              <div className="grid md:grid-cols-2 gap-6">
                {Object.keys(detailData.memberDemographics.gender).length >
                  0 && (
                  <ChartCard title="Gender">
                    <RankedBars
                      data={rankWithOther(
                        detailData.memberDemographics.gender,
                        4,
                      )}
                      capitalize
                    />
                  </ChartCard>
                )}
                {Object.keys(detailData.memberDemographics.studentStatus)
                  .length > 0 && (
                  <ChartCard title="Student status">
                    <RankedBars
                      data={rankWithOther(
                        detailData.memberDemographics.studentStatus,
                        4,
                      )}
                      capitalize
                    />
                  </ChartCard>
                )}
              </div>
            )}

            {/* Answer distributions */}
            {detailData.questions.length > 0 && (
              <div className="grid md:grid-cols-2 gap-6">
                {detailData.questions.map((q) => (
                  <ChartCard
                    key={q.questionId}
                    title={q.questionText}
                    summary={
                      <span className="capitalize">
                        {q.type} · {detailData.total} responses
                      </span>
                    }
                  >
                    <RankedBars
                      data={Object.entries(q.answers)
                        .sort(([, a], [, b]) => b - a)
                        .map(([name, value]) => ({ name, value }))}
                    />
                  </ChartCard>
                ))}
              </div>
            )}

            {detailData.questions.length === 0 && (
              <p className="text-sm text-muted-foreground italic">
                No select/radio/checkbox questions for this event.
              </p>
            )}
          </div>
        )}

        {!detailLoading && !detailData && (
          <p className="text-sm text-muted-foreground italic">
            Failed to load event details.
          </p>
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
            <h3 className="text-lg font-semibold text-foreground">
              Event Funnel — Click → Registration → Attendance
            </h3>
            <Button
              size="sm"
              variant="outline"
              icon={Download}
              onClick={downloadFunnelCsv}
            >
              CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b border-border">
                  <th className="py-2 pr-4 whitespace-nowrap">Event</th>
                  <th className="py-2 pr-4 whitespace-nowrap">Date</th>
                  <th className="py-2 pr-4 whitespace-nowrap">Clicks</th>
                  <th className="py-2 pr-4 whitespace-nowrap">Reg.</th>
                  <th className="py-2 pr-4 whitespace-nowrap">Att.</th>
                  <th className="py-2 pr-4 whitespace-nowrap">View→Reg</th>
                  <th className="py-2 pr-4 whitespace-nowrap">Reg→Att</th>
                  <th className="py-2 pr-4 whitespace-nowrap">Feedback</th>
                </tr>
              </thead>
              <tbody>
                {funnelData.map((f) => (
                  <tr
                    key={f.eventId}
                    onClick={() => openEvent(f.eventId)}
                    className="border-b border-border cursor-pointer hover:bg-foreground/[0.04] transition-colors"
                  >
                    <td className="py-2 pr-4 font-medium text-primary hover:brightness-110 hover:underline whitespace-nowrap">
                      {f.title}
                    </td>
                    <td className="py-2 pr-4 text-foreground/80 whitespace-nowrap">
                      {shortDate(f.date)}
                    </td>
                    <td className="py-2 pr-4 whitespace-nowrap">{f.clicks}</td>
                    <td className="py-2 pr-4 whitespace-nowrap">
                      {f.registrations}
                    </td>
                    <td className="py-2 pr-4 whitespace-nowrap">
                      {f.attended}
                    </td>
                    <td className="py-2 pr-4 whitespace-nowrap">
                      <span
                        className={
                          f.viewToRegPct > 30
                            ? 'text-green-600'
                            : 'text-amber-600'
                        }
                      >
                        {f.viewToRegPct}%
                      </span>
                    </td>
                    <td className="py-2 pr-4 whitespace-nowrap">
                      <span
                        className={
                          f.regToAttendPct > 50
                            ? 'text-green-600'
                            : 'text-amber-600'
                        }
                      >
                        {f.regToAttendPct}%
                      </span>
                    </td>
                    <td className="py-2 pr-4 whitespace-nowrap">
                      {(() => {
                        const evt = events.find((e) => e.id === f.eventId);
                        return evt?.feedbackFormUrl ? (
                          <a
                            href={evt.feedbackFormUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-primary hover:brightness-110 hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Form <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        );
                      })()}
                    </td>
                  </tr>
                ))}
                {funnelData.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="py-4 text-muted-foreground text-center"
                    >
                      No events found
                    </td>
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
            <CardHeader>
              <h4 className="font-semibold text-foreground">
                Registration Status Across Events
              </h4>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-muted-foreground border-b border-border">
                      <th className="py-2 pr-4 whitespace-nowrap">Event</th>
                      <th className="py-2 pr-4 whitespace-nowrap">Reg.</th>
                      <th className="py-2 pr-4 whitespace-nowrap">Wait.</th>
                      <th className="py-2 pr-4 whitespace-nowrap">Inv.</th>
                      <th className="py-2 pr-4 whitespace-nowrap">Conf.</th>
                      <th className="py-2 pr-4 whitespace-nowrap">Dec.</th>
                      <th className="py-2 pr-4 whitespace-nowrap">Canc.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(regAnalytics.statusBreakdownPerEvent).map(
                      ([eid, s]) => {
                        const evt = events.find((e) => e.id === eid);
                        return (
                          <tr key={eid} className="border-b border-border">
                            <td className="py-2 pr-4 font-medium text-foreground whitespace-nowrap">
                              {evt?.title || eid.slice(0, 8)}
                            </td>
                            <td className="py-2 pr-4 whitespace-nowrap">
                              {s.registered}
                            </td>
                            <td className="py-2 pr-4 whitespace-nowrap">
                              {s.waitlist}
                            </td>
                            <td className="py-2 pr-4 whitespace-nowrap">
                              {s.invited}
                            </td>
                            <td className="py-2 pr-4 whitespace-nowrap">
                              {s.confirmed}
                            </td>
                            <td className="py-2 pr-4 whitespace-nowrap">
                              {s.declined}
                            </td>
                            <td className="py-2 pr-4 whitespace-nowrap">
                              {s.cancelled}
                            </td>
                          </tr>
                        );
                      },
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {(() => {
            const perDay = fillDays(regAnalytics.registrationsPerDay, [
              'count',
            ]);
            return (
              <ChartCard
                title="Registrations per day"
                summary={seriesSummary(perDay, 'count', 'registrations')}
              >
                <TimeAreaChart
                  data={perDay}
                  xKey="date"
                  series={[
                    { key: 'count', name: 'Registrations', color: VIZ.primary },
                  ]}
                />
              </ChartCard>
            );
          })()}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Clicks are deduped client-side per browser (cookie-consent gated). Click
        an event to see detailed registration answers.
      </p>
    </div>
  );
};

export default EventsTab;
