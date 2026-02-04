import { adminDb } from '@/lib/firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

export interface RateLimitStatus {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  totalRequests: number;
}

export interface AIUsageRecord {
  userId: string;
  date: string;
  requestCount: number;
  tokenUsage: number;
  lastRequest: Timestamp;
}

const WARNING_THRESHOLD = 7;

function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

function getTomorrowDate(): Date {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return tomorrow;
}

function getDailyLimit(): number {
  return parseInt(process.env.RATE_LIMIT_REQUESTS_PER_DAY || '10', 10);
}

export async function checkRateLimit(userId: string): Promise<RateLimitStatus> {
  const dailyLimit = getDailyLimit();
  const today = getTodayString();
  const docRef = adminDb.collection('ai_usage').doc(`${userId}_${today}`);
  
  const docSnap = await docRef.get();
  
  if (!docSnap.exists) {
    return {
      allowed: true,
      remaining: dailyLimit,
      resetAt: getTomorrowDate(),
      totalRequests: 0,
    };
  }
  
  const data = docSnap.data() as AIUsageRecord;
  const remaining = Math.max(0, dailyLimit - data.requestCount);
  
  return {
    allowed: remaining > 0,
    remaining,
    resetAt: getTomorrowDate(),
    totalRequests: data.requestCount,
  };
}

export async function incrementUsage(
  userId: string,
  tokensUsed: number
): Promise<RateLimitStatus> {
  const today = getTodayString();
  const docRef = adminDb.collection('ai_usage').doc(`${userId}_${today}`);
  
  await docRef.set(
    {
      userId,
      date: today,
      requestCount: FieldValue.increment(1),
      tokenUsage: FieldValue.increment(tokensUsed),
      lastRequest: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
  
  const newStatus = await checkRateLimit(userId);
  
  if (newStatus.remaining === WARNING_THRESHOLD) {
    console.warn(`User ${userId} approaching rate limit: ${newStatus.remaining} requests remaining`);
  }
  
  return newStatus;
}

export async function getUsageStats(userId: string): Promise<{
  today: RateLimitStatus;
  last7Days: { date: string; requests: number; tokens: number }[];
}> {
  const todayStatus = await checkRateLimit(userId);
  
  const last7Days: { date: string; requests: number; tokens: number }[] = [];
  
  for (let i = 0; i < 7; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    
    const docRef = adminDb.collection('ai_usage').doc(`${userId}_${dateStr}`);
    const docSnap = await docRef.get();
    
    if (docSnap.exists) {
      const data = docSnap.data() as AIUsageRecord;
      last7Days.push({
        date: dateStr,
        requests: data.requestCount,
        tokens: data.tokenUsage,
      });
    } else {
      last7Days.push({ date: dateStr, requests: 0, tokens: 0 });
    }
  }
  
  return { today: todayStatus, last7Days };
}

export class RateLimitError extends Error {
  constructor(
    message: string,
    public resetAt: Date,
    public remaining: number = 0
  ) {
    super(message);
    this.name = 'RateLimitError';
  }
}
