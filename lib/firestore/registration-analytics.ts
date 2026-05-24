import { collection, query, where, getDocs, DocumentData, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase-client';
import { getEventCustomQuestions } from './questions';
import { getUserProfile } from './users';
import type { EventCustomQuestion } from '@/types';

export interface RegistrationAnalytics {
  registrationsPerDay: { date: string; count: number }[];
  statusBreakdownPerEvent: Record<string, {
    registered: number;
    waitlist: number;
    invited: number;
    confirmed: number;
    declined: number;
    cancelled: number;
  }>;
  aggregatedCustomAnswers: Record<string, Record<string, number>>;
}

export interface EventDetailAnswer {
  questionId: string;
  questionText: string;
  type: EventCustomQuestion['type'];
  answers: Record<string, number>;
}

export interface EventDetailAnalytics {
  statusCounts: {
    registered: number;
    waitlist: number;
    invited: number;
    confirmed: number;
    declined: number;
    cancelled: number;
  };
  total: number;
  registrationsPerDay: { date: string; count: number }[];
  memberDemographics: {
    gender: Record<string, number>;
    studentStatus: Record<string, number>;
  };
  questions: EventDetailAnswer[];
}

function toDateKey(ts: unknown): string {
  if (ts instanceof Timestamp) return ts.toDate().toISOString().slice(0, 10);
  if (typeof ts === 'string') return new Date(ts).toISOString().slice(0, 10);
  return '';
}

export async function getRegistrationAnalytics(eventIds: string[]): Promise<RegistrationAnalytics> {
  const perDay: Record<string, number> = {};
  const statusPerEvent: RegistrationAnalytics['statusBreakdownPerEvent'] = {};
  const customAnswers: Record<string, Record<string, number>> = {};

  if (!eventIds.length) {
    return { registrationsPerDay: [], statusBreakdownPerEvent: {}, aggregatedCustomAnswers: {} };
  }

  for (const eventId of eventIds) {
    const regSnap = await getDocs(query(collection(db, 'registrations'), where('eventId', '==', eventId)));

    const statuses = { registered: 0, waitlist: 0, invited: 0, confirmed: 0, declined: 0, cancelled: 0 };

    regSnap.docs.forEach((d) => {
      const data = d.data() as DocumentData;
      const status: string = data?.status || 'registered';
      if (status in statuses) statuses[status as keyof typeof statuses]++;

      const dateKey = toDateKey(data?.registeredAt);
      if (dateKey) perDay[dateKey] = (perDay[dateKey] ?? 0) + 1;

      const regData = data?.registrationData;
      if (regData && typeof regData === 'object') {
        Object.entries(regData).forEach(([question, answer]) => {
          const strAnswer = String(answer ?? '').trim();
          if (!strAnswer) return;
          const qKey = `${eventId}::${question}`;
          if (!customAnswers[qKey]) customAnswers[qKey] = {};
          customAnswers[qKey][strAnswer] = (customAnswers[qKey][strAnswer] ?? 0) + 1;
        });
      }
    });

    statusPerEvent[eventId] = statuses;
  }

  const registrationsPerDay = Object.entries(perDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }));

  return { registrationsPerDay, statusBreakdownPerEvent: statusPerEvent, aggregatedCustomAnswers: customAnswers };
}

export async function getEventDetailAnalytics(eventId: string): Promise<EventDetailAnalytics> {
  const regSnap = await getDocs(query(collection(db, 'registrations'), where('eventId', '==', eventId)));
  const questions = await getEventCustomQuestions(eventId);
  const nonFreeText = questions.filter((q) => q.type !== 'text' && q.type !== 'textarea');

  const statusCounts = { registered: 0, waitlist: 0, invited: 0, confirmed: 0, declined: 0, cancelled: 0 };
  const answerMap: Record<string, Record<string, number>> = {};
  const registrationsPerDayMap: Record<string, number> = {};
  const userIds = new Set<string>();
  const genderMap: Record<string, number> = {};
  const studentStatusMap: Record<string, number> = {};

  for (const doc of regSnap.docs) {
    const data = doc.data() as DocumentData;
    const status: string = data?.status || 'registered';
    if (status in statusCounts) statusCounts[status as keyof typeof statusCounts]++;

    const dateKey = toDateKey(data?.registeredAt);
    if (dateKey) registrationsPerDayMap[dateKey] = (registrationsPerDayMap[dateKey] ?? 0) + 1;

    if (data?.userId) userIds.add(data.userId);

    const regData = data?.registrationData as Record<string, unknown> | undefined;
    if (!regData) continue;

    for (const q of nonFreeText) {
      const answer = regData[q.question];
      if (answer === undefined || answer === null) continue;

      if (!answerMap[q.id]) answerMap[q.id] = {};

      if (q.type === 'checkbox' && Array.isArray(answer)) {
        for (const opt of answer) {
          const str = String(opt).trim();
          if (str) answerMap[q.id][str] = (answerMap[q.id][str] ?? 0) + 1;
        }
      } else {
        const str = String(answer).trim();
        if (str) answerMap[q.id][str] = (answerMap[q.id][str] ?? 0) + 1;
      }
    }
  }

  // Fetch user profiles for demographics
  const profiles = await Promise.all(
    Array.from(userIds).map((uid) => getUserProfile(uid)),
  );
  for (const p of profiles) {
    if (!p) continue;
    const g = p.gender?.trim();
    if (g) genderMap[g] = (genderMap[g] ?? 0) + 1;
    const ss = p.studentStatus?.trim();
    if (ss) studentStatusMap[ss] = (studentStatusMap[ss] ?? 0) + 1;
  }

  const registrationsPerDay = Object.entries(registrationsPerDayMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }));

  const questionsWithAnswers: EventDetailAnswer[] = nonFreeText.map((q) => ({
    questionId: q.id,
    questionText: q.question,
    type: q.type,
    answers: answerMap[q.id] || {},
  }));

  return {
    statusCounts,
    total: regSnap.size,
    registrationsPerDay,
    memberDemographics: { gender: genderMap, studentStatus: studentStatusMap },
    questions: questionsWithAnswers,
  };
}
