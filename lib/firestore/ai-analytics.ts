import { collection, getDocs, DocumentData, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase-client';
import { listUsers } from './users';

export interface AIAnalytics {
  totalChats: number;
  totalMessages: number;
  uniqueUsers: number;
  chatsPerDay: { date: string; count: number }[];
  messagesPerDay: { date: string; count: number }[];
  topRecommendedCourses: { courseId: string; count: number }[];
  avgMessagesPerChat: number;
}

function toDateKey(val: unknown): string {
  if (val instanceof Timestamp) return val.toDate().toISOString().slice(0, 10);
  if (typeof val === 'string') return new Date(val).toISOString().slice(0, 10);
  return '';
}

export async function getAIAnalytics(): Promise<AIAnalytics> {
  const users = await listUsers();
  const userIds = users.map((u) => u.id);

  let totalChats = 0;
  let totalMessages = 0;
  let uniqueUsers = 0;
  const chatsPerDayMap: Record<string, number> = {};
  const messagesPerDayMap: Record<string, number> = {};
  const recCounts: Record<string, number> = {};

  const results = await Promise.all(userIds.map(async (userId) => {
    const chatsRef = collection(db, 'ai_chats', userId, 'chats');
    const snapshot = await getDocs(chatsRef);
    if (snapshot.empty) return null;

    let userChats = 0;
    let userMessages = 0;
    const userChatsPerDay: Record<string, number> = {};
    const userMessagesPerDay: Record<string, number> = {};
    const userRecCounts: Record<string, number> = {};

    snapshot.docs.forEach((d) => {
      const data = d.data() as DocumentData;
      userChats++;

      const messages: unknown[] = Array.isArray(data?.messages) ? data.messages : [];
      userMessages += messages.length;

      const created = toDateKey(data?.createdAt);
      if (created) userChatsPerDay[created] = (userChatsPerDay[created] ?? 0) + 1;

      const firstMsg = messages[0] as Record<string, unknown> | undefined;
      const msgDate = firstMsg?.timestamp ? toDateKey(firstMsg.timestamp) : '';
      if (msgDate) userMessagesPerDay[msgDate] = (userMessagesPerDay[msgDate] ?? 0) + messages.length;

      const recIds: string[] = Array.isArray(data?.recommendedCourseIds) ? data.recommendedCourseIds : [];
      recIds.forEach((cid) => {
        userRecCounts[cid] = (userRecCounts[cid] ?? 0) + 1;
      });
    });

    return { userChats, userMessages, userChatsPerDay, userMessagesPerDay, userRecCounts };
  }));

  for (const r of results) {
    if (!r) continue;
    uniqueUsers++;
    totalChats += r.userChats;
    totalMessages += r.userMessages;
    for (const [k, v] of Object.entries(r.userChatsPerDay)) chatsPerDayMap[k] = (chatsPerDayMap[k] ?? 0) + v;
    for (const [k, v] of Object.entries(r.userMessagesPerDay)) messagesPerDayMap[k] = (messagesPerDayMap[k] ?? 0) + v;
    for (const [k, v] of Object.entries(r.userRecCounts)) recCounts[k] = (recCounts[k] ?? 0) + v;
  }

  const chatsPerDay = Object.entries(chatsPerDayMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }));

  const messagesPerDay = Object.entries(messagesPerDayMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }));

  const topRecommendedCourses = Object.entries(recCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 15)
    .map(([courseId, count]) => ({ courseId, count }));

  return {
    totalChats,
    totalMessages,
    uniqueUsers,
    chatsPerDay,
    messagesPerDay,
    topRecommendedCourses,
    avgMessagesPerChat: totalChats > 0 ? Math.round(totalMessages / totalChats) : 0,
  };
}
