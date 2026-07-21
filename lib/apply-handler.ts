import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getTokens } from 'next-firebase-auth-edge';
import { authConfig } from '@/lib/auth-config';
import { adminDb } from '@/lib/firebase-admin';
import admin from 'firebase-admin';

interface AppError extends Error {
  status?: number;
  code?: string;
  retryAfterSeconds?: number;
}

async function authorizeRequest(req: NextRequest) {
  try {
    const tokens = await getTokens(req.cookies, authConfig);
    if (!tokens) return { ok: false, reason: 'no-auth' };
    return { ok: true, uid: tokens.decodedToken.uid };
  } catch (err) {
    console.warn('getTokens failed', err);
    return { ok: false, reason: 'invalid-token' };
  }
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function safeKeyPart(s: string): string {
  return encodeURIComponent(s);
}

async function saveFileToStorage(file: File, destPath: string) {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const bucket = admin.storage().bucket();
  const gfile = bucket.file(destPath);
  await gfile.save(buffer, { metadata: { contentType: file.type || 'application/octet-stream' } });
  const expires = Date.now() + 40 * 24 * 60 * 60 * 1000;
  const [url] = await gfile.getSignedUrl({ action: 'read', expires });
  return { path: destPath, url };
}

const DEFAULT_COOLDOWN_SECONDS = 1 * 60;
const DEFAULT_MAX_SUBMISSIONS_PER_CAMPAIGN = 1;
const MAX_MOTIVATION_CHARS = 1500;
const MIN_MOTIVATION_CHARS = 25;
const MAX_CUSTOM_ANSWER_CHARS = 3500;
const MAX_NAME_CHARS = 100;
const MAX_EMAIL_CHARS = 254;
const MAX_GENDER_CHARS = 20;
const MAX_UNIVERSITY_CHARS = 100;
const MAX_PROGRAM_CHARS = 200;
const MAX_GRADUATION_YEAR_CHARS = 4;
const MAX_LINKEDIN_CHARS = 200;
const MAX_CUSTOM_TEAM_CHARS = 200;
const MAX_CUSTOM_INTEREST_CHARS = 200;
const MAX_INTERESTS_ITEMS = 50;
const MAX_TEAM_RANKING_ITEMS = 20;
const MAX_WEEKLY_HOURS = 12;

export async function handleApplicationPost(req: NextRequest, applicationType: string) {
  const authResult = await authorizeRequest(req);
  if (!authResult.ok) {
    return NextResponse.json({ error: 'Unauthorized — please sign in to apply.' }, { status: 401 });
  }

  try {
    const form = await req.formData();

    const campaignId = (form.get('campaignId') as string) || '';
    const name = (form.get('name') as string) || '';
    const email = (form.get('email') as string) || '';
    const gender = (form.get('gender') as string) || '';
    const university = (form.get('university') as string) || '';
    const program = (form.get('program') as string) || '';
    const graduationYear = (form.get('graduationYear') as string) || '';
    const linkedin = (form.get('linkedin') as string) || '';
    const customTeam = (form.get('customTeam') as string) || '';
    const weeklyHoursRaw = form.get('weeklyHours');
    const weeklyHours = weeklyHoursRaw ? Number(weeklyHoursRaw) : 0;
    const motivation = (form.get('motivation') as string) || '';
    const agree = form.get('agree') === 'true' || form.get('agree') === 'on';
    const newsletter = form.get('newsletter') === 'true' || form.get('newsletter') === 'on';

    let interests: string[] = [];
    try { interests = JSON.parse((form.get('interests') as string) || '[]'); } catch { /* empty */ }
    const customInterest = (form.get('customInterest') as string) || '';
    let teamRanking: string[] = [];
    try { teamRanking = JSON.parse((form.get('teamRanking') as string) || '[]'); } catch { /* empty */ }
    let customAnswers: Record<string, string | string[]> = {};
    try { customAnswers = JSON.parse((form.get('customAnswers') as string) || '{}'); } catch { /* empty */ }

    if (!campaignId) return NextResponse.json({ error: 'Campaign ID is required' }, { status: 400 });
    if (!name || !name.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    if (name.length > MAX_NAME_CHARS) return NextResponse.json({ error: `Name must be at most ${MAX_NAME_CHARS} characters` }, { status: 400 });
    if (!email || !email.trim()) return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return NextResponse.json({ error: 'Email is not valid' }, { status: 400 });
    if (email.length > MAX_EMAIL_CHARS) return NextResponse.json({ error: `Email must be at most ${MAX_EMAIL_CHARS} characters` }, { status: 400 });
    if (gender && gender.length > MAX_GENDER_CHARS) return NextResponse.json({ error: `Gender must be at most ${MAX_GENDER_CHARS} characters` }, { status: 400 });
    if (university && university.length > MAX_UNIVERSITY_CHARS) return NextResponse.json({ error: `University must be at most ${MAX_UNIVERSITY_CHARS} characters` }, { status: 400 });
    if (program && program.length > MAX_PROGRAM_CHARS) return NextResponse.json({ error: `Programme must be at most ${MAX_PROGRAM_CHARS} characters` }, { status: 400 });
    if (graduationYear && graduationYear.length > MAX_GRADUATION_YEAR_CHARS) return NextResponse.json({ error: `Graduation year must be at most ${MAX_GRADUATION_YEAR_CHARS} characters` }, { status: 400 });
    if (!agree) return NextResponse.json({ error: 'Agreement required' }, { status: 400 });
    if (!motivation || !motivation.trim()) return NextResponse.json({ error: 'Motivation is required' }, { status: 400 });
    if (motivation.trim().length < MIN_MOTIVATION_CHARS) return NextResponse.json({ error: `Motivation must be at least ${MIN_MOTIVATION_CHARS} characters` }, { status: 400 });
    if (motivation.length > MAX_MOTIVATION_CHARS) return NextResponse.json({ error: `Motivation must be at most ${MAX_MOTIVATION_CHARS} characters` }, { status: 400 });
    if (!linkedin || !linkedin.trim()) return NextResponse.json({ error: 'LinkedIn URL is required' }, { status: 400 });
    if (linkedin.length > MAX_LINKEDIN_CHARS) return NextResponse.json({ error: `LinkedIn URL must be at most ${MAX_LINKEDIN_CHARS} characters` }, { status: 400 });
    if (/^javascript:/i.test(linkedin.trim())) return NextResponse.json({ error: 'LinkedIn URL contains an invalid scheme' }, { status: 400 });
    if (customTeam && customTeam.length > MAX_CUSTOM_TEAM_CHARS) return NextResponse.json({ error: `Custom team must be at most ${MAX_CUSTOM_TEAM_CHARS} characters` }, { status: 400 });
    if (customInterest && customInterest.length > MAX_CUSTOM_INTEREST_CHARS) return NextResponse.json({ error: `Custom interest must be at most ${MAX_CUSTOM_INTEREST_CHARS} characters` }, { status: 400 });
    if (!Array.isArray(interests) || interests.length > MAX_INTERESTS_ITEMS) return NextResponse.json({ error: `Interests must be an array with at most ${MAX_INTERESTS_ITEMS} items` }, { status: 400 });
    if (!Array.isArray(teamRanking) || teamRanking.length > MAX_TEAM_RANKING_ITEMS) return NextResponse.json({ error: `Team ranking must be an array with at most ${MAX_TEAM_RANKING_ITEMS} items` }, { status: 400 });
    if (!Number.isFinite(weeklyHours) || weeklyHours < 0 || weeklyHours > MAX_WEEKLY_HOURS) return NextResponse.json({ error: `Weekly hours must be between 0 and ${MAX_WEEKLY_HOURS}` }, { status: 400 });

    const campaignSnap = await adminDb.collection('applicationCampaigns').doc(campaignId).get();
    if (!campaignSnap.exists) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    const campaignData = campaignSnap.data() as { status?: string; teams?: string[] };
    if (campaignData.status !== 'open') return NextResponse.json({ error: 'This campaign is not currently accepting submissions.' }, { status: 400 });

    const campaignTeams = Array.isArray(campaignData.teams) ? campaignData.teams : [];
    for (const tid of teamRanking) {
      if (!campaignTeams.includes(tid) && tid !== 'other') {
        return NextResponse.json({ error: `Team "${tid}" is not available in this campaign` }, { status: 400 });
      }
    }

    let resumeFile = form.get('resume') as File | null;
    let savedResume: { path?: string; url?: string } | null = null;
    if (resumeFile && resumeFile.size > 0) {
      if (resumeFile.type !== 'application/pdf' && resumeFile.type !== '') return NextResponse.json({ error: 'Resume must be a PDF' }, { status: 400 });
      if (resumeFile.size > 3 * 1024 * 1024) return NextResponse.json({ error: 'Resume must be <= 3MB' }, { status: 400 });
      const header = await resumeFile.slice(0, 5).text();
      if (header !== '%PDF-') return NextResponse.json({ error: 'Resume does not appear to be a valid PDF' }, { status: 400 });
      const safeName = resumeFile.name.replace(/[/\\]/g, '_').slice(0, 200);
      if (!safeName) return NextResponse.json({ error: 'Invalid resume filename' }, { status: 400 });
      resumeFile = new File([await resumeFile.arrayBuffer()], safeName, { type: resumeFile.type });
    }

    for (const [key, val] of Object.entries(customAnswers)) {
      const s = Array.isArray(val) ? val.join(', ') : val;
      if (typeof s === 'string' && s.length > MAX_CUSTOM_ANSWER_CHARS) {
        return NextResponse.json({ error: `Answer for "${key}" is too long (max ${MAX_CUSTOM_ANSWER_CHARS} characters)` }, { status: 400 });
      }
    }

    const emailNormalized = normalizeEmail(email);
    const cooldownSeconds = Number(process.env.APPLY_COOLDOWN_SECONDS || DEFAULT_COOLDOWN_SECONDS);
    const maxPerCampaign = Number(process.env.APPLY_MAX_SUBMISSIONS_PER_CAMPAIGN || DEFAULT_MAX_SUBMISSIONS_PER_CAMPAIGN);
    const nowMs = Date.now();

    const lockKey = `${safeKeyPart(emailNormalized)}__${safeKeyPart(campaignId)}`;
    const limitsRef = adminDb.collection('applicationUserLimits').doc(safeKeyPart(emailNormalized));
    const lockRef = adminDb.collection('applicationCampaignLocks').doc(lockKey);
    const appRef = adminDb.collection('teamApplications').doc();

    await adminDb.runTransaction(async (tx) => {
      const [limitsDoc, lockDoc] = await Promise.all([tx.get(limitsRef), tx.get(lockRef)]);

      if (lockDoc.exists) {
        if (maxPerCampaign <= 0) {
          // no limit — allow re-submissions
        } else {
          const pastCount = (lockDoc.data() as { count?: number } | undefined)?.count || 0;
          if (pastCount >= maxPerCampaign) {
            const err = new Error('You have already applied to this campaign.') as AppError;
            err.status = 409;
            err.code = 'DUPLICATE_CAMPAIGN';
            throw err;
          }
        }
      }

      const limitsData = limitsDoc.exists ? limitsDoc.data() : null;
      const lastAppliedAtMs = typeof (limitsData as { lastAppliedAtMs?: number } | null)?.lastAppliedAtMs === 'number'
        ? (limitsData as { lastAppliedAtMs: number }).lastAppliedAtMs
        : 0;

      const cooldownMs = Math.max(0, cooldownSeconds) * 1000;
      if (cooldownMs > 0 && lastAppliedAtMs && nowMs - lastAppliedAtMs < cooldownMs) {
        const retryAfterMs = cooldownMs - (nowMs - lastAppliedAtMs);
        const retryAfterSeconds = Math.max(1, Math.ceil(retryAfterMs / 1000));
        const err = new Error('Too many submissions. Please try again in a few moments.') as AppError;
        err.status = 429;
        err.code = 'RATE_LIMITED';
        err.retryAfterSeconds = retryAfterSeconds;
        throw err;
      }

      tx.set(
        limitsRef,
        { lastAppliedAtMs: nowMs, updatedAt: admin.firestore.FieldValue.serverTimestamp() },
        { merge: true },
      );
      const existingCount = (lockDoc.data() as { count?: number } | undefined)?.count || 0;
      tx.set(lockRef, { count: existingCount + 1, applicationId: appRef.id, campaignId, createdAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });

      tx.set(appRef, {
        applicationType,
        campaignId,
        name,
        email,
        emailNormalized,
        gender: gender || null,
        university: university || null,
        program: program || null,
        graduationYear: graduationYear || null,
        linkedin: linkedin || null,
        interests: interests || [],
        customInterest: customInterest || null,
        teamRanking: teamRanking || [],
        customTeam: customTeam || null,
        weeklyHours: Number.isFinite(weeklyHours) ? weeklyHours : 0,
        motivation,
        customAnswers: customAnswers || {},
        agree: true,
        newsletter: !!newsletter,
        resume: null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });

    if (resumeFile && resumeFile.size > 0) {
      try {
        const timestamp = Date.now();
        const resumePath = `team-applications/${timestamp}_${resumeFile.name}`;
        savedResume = await saveFileToStorage(resumeFile, resumePath);
        await appRef.set({ resume: savedResume }, { merge: true });
      } catch (uploadErr) {
        try {
          await adminDb.runTransaction(async (tx) => {
            tx.delete(lockRef);
            tx.delete(appRef);
          });
        } catch {
          // rollback failure ignored
        }
        throw uploadErr;
      }
    }

    return NextResponse.json({
      id: appRef.id,
      campaignId,
      name,
      email,
      resume: savedResume || undefined,
      applicationType,
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    const anyErr = err as { status?: number; message?: string; code?: string; retryAfterSeconds?: number };
    const status = typeof anyErr?.status === 'number' ? anyErr.status : 500;
    if (status >= 500) console.error('apply POST error', err);
    return NextResponse.json(
      { error: anyErr?.message || 'Server error', code: anyErr?.code, retryAfterSeconds: anyErr?.retryAfterSeconds },
      { status },
    );
  }
}
