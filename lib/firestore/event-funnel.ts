import { doc, getDoc, getDocs, collection, query, where, DocumentData } from 'firebase/firestore';
import { db } from '@/lib/firebase-client';
import { getEventClicksCounts } from './analytics';

export interface EventFunnel {
  eventId: string;
  title: string;
  date: string;
  clicks: number;
  registrations: number;
  attended: number;
  viewToRegPct: number;
  regToAttendPct: number;
  statusBreakdown: {
    registered: number;
    waitlist: number;
    invited: number;
    confirmed: number;
    declined: number;
    cancelled: number;
  };
}

export async function getEventFunnel(eventIds: string[], clicksMap?: Record<string, number>): Promise<EventFunnel[]> {
  if (!eventIds.length) return [];

  clicksMap ??= await getEventClicksCounts(eventIds);

  const results = await Promise.all(
    eventIds.map(async (eventId) => {
      const eventSnap = await getDoc(doc(db, 'events', eventId));
      if (!eventSnap.exists()) return null;
      const evt = eventSnap.data() as DocumentData;

      const registrations = typeof evt.currentRegistrations === 'number' ? evt.currentRegistrations : 0;
      const attendees: Array<{ attended: boolean | null }> = Array.isArray(evt.attendees) ? evt.attendees : [];
      const attended = attendees.filter((a) => a.attended === true).length;

      // Status breakdown from registrations collection
      const regSnap = await getDocs(query(collection(db, 'registrations'), where('eventId', '==', eventId)));
      const breakdown = { registered: 0, waitlist: 0, invited: 0, confirmed: 0, declined: 0, cancelled: 0 };
      regSnap.docs.forEach((d) => {
        const status = (d.data() as DocumentData)?.status || 'registered';
        if (status in breakdown) breakdown[status as keyof typeof breakdown]++;
      });

      const clicks = clicksMap[eventId] ?? 0;
      return {
        eventId,
        title: evt.title || '',
        date: evt.eventStartAt || '',
        clicks,
        registrations,
        attended,
        viewToRegPct: clicks > 0 ? Math.round((registrations / clicks) * 100) : 0,
        regToAttendPct: registrations > 0 ? Math.round((attended / registrations) * 100) : 0,
        statusBreakdown: breakdown,
      };
    }),
  );

  return results.filter((r): r is EventFunnel => r !== null);
}
