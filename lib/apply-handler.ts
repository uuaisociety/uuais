import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requireAuth, type ServerSession } from '@/lib/server-auth';
import { adminDb } from '@/lib/firebase-admin';
import admin from 'firebase-admin';
import { MAX_ROLE_RANKING } from '@/lib/constants';
import type { CampaignRole, RoleChoice } from '@/types';

interface AppError extends Error {
  status?: number;
  code?: string;
  retryAfterSeconds?: number;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function safeKeyPart(s: string): string {
  return encodeURIComponent(s);
}

const ANSWER_KEY_RE = /^[A-Za-z0-9_-]{1,64}$/;
const MAX_CUSTOM_ANSWER_KEYS = 100;

function deadlineMs(value: unknown): number | null {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const ms = Date.parse(value);
    return Number.isNaN(ms) ? null : ms;
  }
  if (value && typeof value === 'object' && typeof (value as { toMillis?: unknown }).toMillis === 'function') {
    return (value as { toMillis: () => number }).toMillis();
  }
  return null;
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
const MAX_CUSTOM_ROLE_CHARS = 200;
const MAX_CUSTOM_INTEREST_CHARS = 200;
const MAX_INTERESTS_ITEMS = 50;
const MAX_TEAM_RANKING_ITEMS = 20;
const MAX_WEEKLY_HOURS = 12;
// Raw JSON payload bounds, checked before JSON.parse to avoid CPU/memory DoS from oversized fields.
const MAX_INTERESTS_RAW_CHARS = 20000;
const MAX_TEAM_RANKING_RAW_CHARS = 5000;
const MAX_CUSTOM_ANSWERS_RAW_CHARS = 400000;
const MAX_ROLE_RANKING_RAW_CHARS = 5000;

const DEFAULT_STANDARD_FIELDS = [
  "name", "email", "gender", "university", "program", "graduationYear",
  "linkedin", "resume", "interests", "teamRanking", "weeklyHours", "motivation",
];

interface ParsedRoleChoice {
  roleId: string;
  teamId: string;
  justification: string;
}

function parseRoleRanking(raw: unknown): ParsedRoleChoice[] | null {
  if (typeof raw !== 'string') return null;
  // Reject oversized payloads before JSON.parse (CPU/memory DoS guard)
  if (raw.length > MAX_ROLE_RANKING_RAW_CHARS) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    const out: ParsedRoleChoice[] = [];
    for (const item of parsed) {
      if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
      const roleId = typeof (item as { roleId?: unknown }).roleId === 'string'
        ? (item as { roleId: string }).roleId.trim()
        : '';
      if (!roleId) return null;
      const teamId = typeof (item as { teamId?: unknown }).teamId === 'string'
        ? (item as { teamId: string }).teamId.trim()
        : '';
      const justification = typeof (item as { justification?: unknown }).justification === 'string'
        ? (item as { justification: string }).justification
        : '';
      out.push({ roleId, teamId, justification });
    }
    return out;
  } catch {
    return null;
  }
}

/** Effective deadline ms for a role — a per-role deadline overrides the campaign's. */
function roleDeadlineMs(role: CampaignRole, campaignDeadline: unknown): number | null {
  return deadlineMs(role.deadline || campaignDeadline);
}

function roleIsOpen(role: CampaignRole, campaignDeadline: unknown, nowMs: number): boolean {
  if (role.status !== 'open') return false;
  const dl = roleDeadlineMs(role, campaignDeadline);
  return dl === null || nowMs <= dl;
}

function makeError(message: string, status: number, code?: string, retryAfterSeconds?: number): AppError {
  const err = new Error(message) as AppError;
  err.status = status;
  err.code = code;
  err.retryAfterSeconds = retryAfterSeconds;
  return err;
}

interface CampaignSnapshot {
  status?: string;
  teams?: string[];
  roles?: CampaignRole[];
  enabledStandardFields?: string[];
  deadline?: unknown;
}

export async function handleApplicationPost(req: NextRequest, applicationType: string) {
  const authResult = await requireAuth(req);
  if (!authResult.ok) {
    return NextResponse.json({ error: 'Unauthorized — please sign in to apply.' }, { status: 401 });
  }
  const session = authResult.session;

  try {
    const form = await req.formData();

    const campaignId = (form.get('campaignId') as string) || '';
    if (!campaignId) return NextResponse.json({ error: 'Campaign ID is required' }, { status: 400 });

    const campaignSnap = await adminDb.collection('applicationCampaigns').doc(campaignId).get();
    if (!campaignSnap.exists) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    const campaignData = campaignSnap.data() as CampaignSnapshot;
    if (campaignData.status !== 'open') {
      return NextResponse.json({ error: 'This campaign is not currently accepting submissions.' }, { status: 400 });
    }

    const mode = (form.get('mode') as string) || 'create';
    if (mode === 'addRole') {
      // Await so transaction errors become proper responses instead of unhandled rejections.
      return await handleAddRole(form, campaignData, campaignId, session, applicationType);
    }

    const name = (form.get('name') as string) || '';
    const email = (form.get('email') as string) || '';
    const gender = (form.get('gender') as string) || '';
    const university = (form.get('university') as string) || '';
    const program = (form.get('program') as string) || '';
    const graduationYear = (form.get('graduationYear') as string) || '';
    const linkedin = (form.get('linkedin') as string) || '';
    const customTeam = (form.get('customTeam') as string) || '';
    const customRole = (form.get('customRole') as string) || '';
    const weeklyHoursRaw = form.get('weeklyHours');
    const weeklyHours = weeklyHoursRaw ? Number(weeklyHoursRaw) : 0;
    const motivation = (form.get('motivation') as string) || '';
    const agree = form.get('agree') === 'true' || form.get('agree') === 'on';
    const newsletter = form.get('newsletter') === 'true' || form.get('newsletter') === 'on';

    const interestsRaw = (form.get('interests') as string) || '[]';
    const teamRankingRaw = (form.get('teamRanking') as string) || '[]';
    const customAnswersRaw = (form.get('customAnswers') as string) || '{}';
    if (interestsRaw.length > MAX_INTERESTS_RAW_CHARS) return NextResponse.json({ error: 'Interests payload is too large' }, { status: 400 });
    if (teamRankingRaw.length > MAX_TEAM_RANKING_RAW_CHARS) return NextResponse.json({ error: 'Team ranking payload is too large' }, { status: 400 });
    if (customAnswersRaw.length > MAX_CUSTOM_ANSWERS_RAW_CHARS) return NextResponse.json({ error: 'Custom answers payload is too large' }, { status: 400 });

    let interests: string[] = [];
    try { interests = JSON.parse(interestsRaw); } catch { /* empty */ }
    const customInterest = (form.get('customInterest') as string) || '';
    let teamRankingLegacy: string[] = [];
    try { teamRankingLegacy = JSON.parse(teamRankingRaw); } catch { /* empty */ }
    let customAnswers: Record<string, string | string[]> = {};
    try { customAnswers = JSON.parse(customAnswersRaw); } catch { /* empty */ }

    if (!name || !name.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    if (name.length > MAX_NAME_CHARS) return NextResponse.json({ error: `Name must be at most ${MAX_NAME_CHARS} characters` }, { status: 400 });
    if (!email || !email.trim()) return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return NextResponse.json({ error: 'Email is not valid' }, { status: 400 });
    if (email.length > MAX_EMAIL_CHARS) return NextResponse.json({ error: `Email must be at most ${MAX_EMAIL_CHARS} characters` }, { status: 400 });
    if (gender && gender.length > MAX_GENDER_CHARS) return NextResponse.json({ error: `Gender must be at most ${MAX_GENDER_CHARS} characters` }, { status: 400 });
    if (university && university.length > MAX_UNIVERSITY_CHARS) return NextResponse.json({ error: `University must be at most ${MAX_UNIVERSITY_CHARS} characters` }, { status: 400 });
    if (program && program.length > MAX_PROGRAM_CHARS) return NextResponse.json({ error: `Program must be at most ${MAX_PROGRAM_CHARS} characters` }, { status: 400 });
    if (graduationYear && graduationYear.length > MAX_GRADUATION_YEAR_CHARS) return NextResponse.json({ error: `Graduation year must be at most ${MAX_GRADUATION_YEAR_CHARS} characters` }, { status: 400 });
    if (graduationYear && !/^\d{4}$/.test(graduationYear.trim())) return NextResponse.json({ error: 'Graduation year must be a 4-digit year' }, { status: 400 });
    if (!agree) return NextResponse.json({ error: 'Agreement required' }, { status: 400 });
    if (customTeam && customTeam.length > MAX_CUSTOM_TEAM_CHARS) return NextResponse.json({ error: `Custom team must be at most ${MAX_CUSTOM_TEAM_CHARS} characters` }, { status: 400 });
    if (customRole && customRole.length > MAX_CUSTOM_ROLE_CHARS) return NextResponse.json({ error: `Custom role must be at most ${MAX_CUSTOM_ROLE_CHARS} characters` }, { status: 400 });
    if (customInterest && customInterest.length > MAX_CUSTOM_INTEREST_CHARS) return NextResponse.json({ error: `Custom interest must be at most ${MAX_CUSTOM_INTEREST_CHARS} characters` }, { status: 400 });
    if (!Array.isArray(interests) || interests.length > MAX_INTERESTS_ITEMS) return NextResponse.json({ error: `Interests must be an array with at most ${MAX_INTERESTS_ITEMS} items` }, { status: 400 });
    if (!Array.isArray(teamRankingLegacy) || teamRankingLegacy.length > MAX_TEAM_RANKING_ITEMS) return NextResponse.json({ error: `Team ranking must be an array with at most ${MAX_TEAM_RANKING_ITEMS} items` }, { status: 400 });
    if (!Number.isFinite(weeklyHours) || weeklyHours < 0 || weeklyHours > MAX_WEEKLY_HOURS) return NextResponse.json({ error: `Weekly hours must be between 0 and ${MAX_WEEKLY_HOURS}` }, { status: 400 });

    const enabledFields = Array.isArray(campaignData.enabledStandardFields) && campaignData.enabledStandardFields.length > 0
      ? campaignData.enabledStandardFields
      : DEFAULT_STANDARD_FIELDS;
    const roleSelectionEnabled = enabledFields.includes('teamRanking');
    const campaignRoles = Array.isArray(campaignData.roles) ? campaignData.roles : [];

    // Campaign deadline is authoritative; per-role deadlines only tighten it.
    const dlMs = deadlineMs(campaignData.deadline);
    if (dlMs !== null && Date.now() > dlMs) {
      return NextResponse.json({ error: 'This campaign is no longer accepting applications.' }, { status: 400 });
    }

    const rolesById = new Map(campaignRoles.map((r) => [r.id, r]));
    const nowMs = Date.now();

    // Resolve role-level or (legacy) team-level preferences
    let roleChoices: ParsedRoleChoice[] = [];
    if (roleSelectionEnabled) {
      if (campaignRoles.length > 0) {
        const parsed = parseRoleRanking(form.get('roleRanking'));
        if (!parsed) return NextResponse.json({ error: 'roleRanking must be a JSON array' }, { status: 400 });
        if (parsed.length === 0) return NextResponse.json({ error: 'Select at least one role' }, { status: 400 });
        if (parsed.length > MAX_ROLE_RANKING) return NextResponse.json({ error: `You can apply for at most ${MAX_ROLE_RANKING} roles` }, { status: 400 });
        const seen = new Set<string>();
        for (const choice of parsed) {
          if (seen.has(choice.roleId)) return NextResponse.json({ error: 'Duplicate role selection' }, { status: 400 });
          seen.add(choice.roleId);
          const role = rolesById.get(choice.roleId);
          if (!role) return NextResponse.json({ error: `Role "${choice.roleId}" is not available in this campaign` }, { status: 400 });
          if (!roleIsOpen(role, campaignData.deadline, nowMs)) {
            return NextResponse.json({ error: `Role "${role.title}" is not currently accepting applications` }, { status: 400 });
          }
          if (role.teamId !== choice.teamId) return NextResponse.json({ error: 'Role/team mismatch' }, { status: 400 });
        }
        roleChoices = parsed;
      } else {
        // Legacy campaign (teams but no roles): fall back to team id ranking
        if (teamRankingLegacy.length === 0) {
          return NextResponse.json({ error: 'At least one team preference is required' }, { status: 400 });
        }
        const campaignTeams = Array.isArray(campaignData.teams) ? campaignData.teams : [];
        for (const tid of teamRankingLegacy) {
          if (!campaignTeams.includes(tid) && tid !== 'other') {
            return NextResponse.json({ error: `Team "${tid}" is not available in this campaign` }, { status: 400 });
          }
        }
      }
    }

    // Only require fields the campaign has enabled
    if (enabledFields.includes('motivation')) {
      if (!motivation || !motivation.trim()) return NextResponse.json({ error: 'Motivation is required' }, { status: 400 });
      if (motivation.trim().length < MIN_MOTIVATION_CHARS) return NextResponse.json({ error: `Motivation must be at least ${MIN_MOTIVATION_CHARS} characters` }, { status: 400 });
      if (motivation.length > MAX_MOTIVATION_CHARS) return NextResponse.json({ error: `Motivation must be at most ${MAX_MOTIVATION_CHARS} characters` }, { status: 400 });
    } else if (motivation && motivation.length > MAX_MOTIVATION_CHARS) {
      return NextResponse.json({ error: `Motivation must be at most ${MAX_MOTIVATION_CHARS} characters` }, { status: 400 });
    }
    if (enabledFields.includes('linkedin')) {
      if (!linkedin || !linkedin.trim()) return NextResponse.json({ error: 'LinkedIn URL is required' }, { status: 400 });
      if (linkedin.length > MAX_LINKEDIN_CHARS) return NextResponse.json({ error: `LinkedIn URL must be at most ${MAX_LINKEDIN_CHARS} characters` }, { status: 400 });
      const linkedinNormalized = linkedin.trim().replace(/^https?:\/\//i, '').replace(/^www\./i, '');
      if (!/^linkedin\.com\/in\/.+$/i.test(linkedinNormalized)) {
        return NextResponse.json({ error: 'LinkedIn URL must point to a linkedin.com/in/ profile' }, { status: 400 });
      }
    } else if (linkedin && linkedin.length > MAX_LINKEDIN_CHARS) {
      return NextResponse.json({ error: `LinkedIn URL must be at most ${MAX_LINKEDIN_CHARS} characters` }, { status: 400 });
    }

    let resumeFile = form.get('resume') as File | null;
    let savedResume: { path?: string; url?: string } | null = null;
    if (enabledFields.includes('resume') && resumeFile && resumeFile.size > 0) {
      if (resumeFile.type !== 'application/pdf' && resumeFile.type !== '') return NextResponse.json({ error: 'Resume must be a PDF' }, { status: 400 });
      if (resumeFile.size > 3 * 1024 * 1024) return NextResponse.json({ error: 'Resume must be <= 3MB' }, { status: 400 });
      const header = await resumeFile.slice(0, 5).text();
      if (header !== '%PDF-') return NextResponse.json({ error: 'Resume does not appear to be a valid PDF' }, { status: 400 });
      const safeName = resumeFile.name.replace(/[/\\]/g, '_').slice(0, 200);
      if (!safeName) return NextResponse.json({ error: 'Invalid resume filename' }, { status: 400 });
      resumeFile = new File([await resumeFile.arrayBuffer()], safeName, { type: resumeFile.type });
    }

    if (Object.keys(customAnswers).length > MAX_CUSTOM_ANSWER_KEYS) {
      return NextResponse.json({ error: 'Too many custom answers' }, { status: 400 });
    }
    for (const key of Object.keys(customAnswers)) {
      if (!ANSWER_KEY_RE.test(key)) {
        return NextResponse.json({ error: 'Invalid answer key' }, { status: 400 });
      }
    }
    for (const [key, val] of Object.entries(customAnswers)) {
      const s = Array.isArray(val) ? val.join(', ') : val;
      if (typeof s === 'string' && s.length > MAX_CUSTOM_ANSWER_CHARS) {
        return NextResponse.json({ error: `Answer for "${key}" is too long (max ${MAX_CUSTOM_ANSWER_CHARS} characters)` }, { status: 400 });
      }
    }

    // Enforce required custom questions defined for the campaign
    const questionsSnap = await adminDb.collection('campaignQuestions').where('campaignId', '==', campaignId).get();
    for (const doc of questionsSnap.docs) {
      const q = doc.data() as { question?: string; required?: boolean };
      if (!q.required) continue;
      const ans = customAnswers[doc.id];
      const isEmpty = Array.isArray(ans) ? ans.length === 0 : typeof ans !== 'string' || !ans.trim();
      if (isEmpty) {
        return NextResponse.json(
          { error: `"${q.question || 'This question'}" is required.` },
          { status: 400 },
        );
      }
    }

    const emailNormalized = normalizeEmail(email);
    // The verified Firebase uid is the authoritative identity for dedup and
    // rate limiting; email is only a fallback if a uid is somehow unavailable.
    const identity = session.uid || emailNormalized;
    const cooldownSeconds = Number(process.env.APPLY_COOLDOWN_SECONDS || DEFAULT_COOLDOWN_SECONDS);
    const maxPerCampaign = Number(process.env.APPLY_MAX_SUBMISSIONS_PER_CAMPAIGN || DEFAULT_MAX_SUBMISSIONS_PER_CAMPAIGN);
    const nowMsTx = Date.now();

    const lockKey = `${safeKeyPart(identity)}__${safeKeyPart(campaignId)}`;
    const limitsRef = adminDb.collection('applicationUserLimits').doc(safeKeyPart(identity));
    const lockRef = adminDb.collection('applicationCampaignLocks').doc(lockKey);
    const appRef = adminDb.collection('teamApplications').doc();

    const storedRoleRanking: RoleChoice[] = roleSelectionEnabled && campaignRoles.length > 0
      ? roleChoices.map((c) => ({ roleId: c.roleId, teamId: c.teamId, justification: c.justification.trim() }))
      : [];
    const storedLegacyRanking: string[] = roleSelectionEnabled && campaignRoles.length === 0 ? teamRankingLegacy : [];

    await adminDb.runTransaction(async (tx) => {
      const [limitsDoc, lockDoc] = await Promise.all([tx.get(limitsRef), tx.get(lockRef)]);

      if (lockDoc.exists) {
        if (maxPerCampaign <= 0) {
          // no limit — allow re-submissions
        } else {
          const pastCount = (lockDoc.data() as { count?: number } | undefined)?.count || 0;
          if (pastCount >= maxPerCampaign) {
            const err = makeError('You have already applied to this campaign.', 409, 'DUPLICATE_CAMPAIGN');
            throw err;
          }
        }
      }

      const limitsData = limitsDoc.exists ? limitsDoc.data() : null;
      const lastAppliedAtMs = typeof (limitsData as { lastAppliedAtMs?: number } | null)?.lastAppliedAtMs === 'number'
        ? (limitsData as { lastAppliedAtMs: number }).lastAppliedAtMs
        : 0;

      const cooldownMs = Math.max(0, cooldownSeconds) * 1000;
      if (cooldownMs > 0 && lastAppliedAtMs && nowMsTx - lastAppliedAtMs < cooldownMs) {
        const retryAfterMs = cooldownMs - (nowMsTx - lastAppliedAtMs);
        const retryAfterSeconds = Math.max(1, Math.ceil(retryAfterMs / 1000));
        const err = makeError('Too many submissions. Please try again in a few moments.', 429, 'RATE_LIMITED', retryAfterSeconds);
        throw err;
      }

      tx.set(
        limitsRef,
        { lastAppliedAtMs: nowMsTx, updatedAt: admin.firestore.FieldValue.serverTimestamp() },
        { merge: true },
      );
      const existingCount = (lockDoc.data() as { count?: number } | undefined)?.count || 0;
      tx.set(lockRef, { count: existingCount + 1, applicationId: appRef.id, campaignId, createdAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });

      tx.set(appRef, {
        applicationType,
        campaignId,
        uid: session.uid || null,
        name,
        email,
        emailNormalized,
        gender: enabledFields.includes('gender') ? gender || null : null,
        university: enabledFields.includes('university') ? university || null : null,
        program: enabledFields.includes('program') ? program || null : null,
        graduationYear: enabledFields.includes('graduationYear') ? graduationYear || null : null,
        linkedin: enabledFields.includes('linkedin') ? linkedin || null : null,
        interests: enabledFields.includes('interests') ? (interests || []) : [],
        customInterest: enabledFields.includes('interests') ? (customInterest || null) : null,
        roleRanking: storedRoleRanking,
        teamRanking: storedLegacyRanking,
        customTeam: roleSelectionEnabled && campaignRoles.length === 0 ? (customTeam || null) : null,
        customRole: roleSelectionEnabled ? (customRole || null) : null,
        weeklyHours: enabledFields.includes('weeklyHours') && Number.isFinite(weeklyHours) ? weeklyHours : 0,
        motivation: enabledFields.includes('motivation') ? motivation : '',
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
        // Roll back the partial application AND the cooldown/limit so the
        // applicant can retry immediately after a failed upload.
        if (savedResume?.path) {
          try {
            await admin.storage().bucket().file(savedResume.path).delete();
          } catch (storageCleanupErr) {
            console.error('apply storage cleanup failed after upload error', storageCleanupErr);
          }
        }
        try {
          await adminDb.runTransaction(async (tx) => {
            tx.delete(lockRef);
            tx.delete(limitsRef);
            tx.delete(appRef);
          });
        } catch (rollbackErr) {
          console.error('apply rollback failed after upload error', rollbackErr);
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
      roleRanking: storedRoleRanking,
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

async function handleAddRole(
  form: FormData,
  campaignData: CampaignSnapshot,
  campaignId: string,
  session: ServerSession,
  applicationType: string,
) {
  const email = (form.get('email') as string) || '';
  const emailNormalized = normalizeEmail(email);

  // Cooldown as a soft rate limit for updates (dedicated lastRoleUpdateAtMs marker so fresh apps aren't blocked).
  const cooldownSeconds = Number(process.env.APPLY_COOLDOWN_SECONDS || DEFAULT_COOLDOWN_SECONDS);
  const identity = session.uid || emailNormalized;
  const limitsRef = adminDb.collection('applicationUserLimits').doc(safeKeyPart(identity));
  const nowMs = Date.now();
  if (cooldownSeconds > 0 && identity) {
    const limitsDoc = await limitsRef.get();
    const limitsData = limitsDoc.exists ? limitsDoc.data() : null;
    const lastRoleUpdateAtMs = typeof (limitsData as { lastRoleUpdateAtMs?: number } | null)?.lastRoleUpdateAtMs === 'number'
      ? (limitsData as { lastRoleUpdateAtMs: number }).lastRoleUpdateAtMs
      : 0;
    if (lastRoleUpdateAtMs && nowMs - lastRoleUpdateAtMs < cooldownSeconds * 1000) {
      const retryAfterMs = cooldownSeconds * 1000 - (nowMs - lastRoleUpdateAtMs);
      const retryAfterSeconds = Math.max(1, Math.ceil(retryAfterMs / 1000));
      const err = makeError('Too many requests. Please try again in a few moments.', 429, 'RATE_LIMITED', retryAfterSeconds);
      throw err;
    }
  }

  // Locate the applicant's existing application for this campaign.
  let query = adminDb.collection('teamApplications') as FirebaseFirestore.Query;
  if (session.uid) {
    query = query.where('uid', '==', session.uid);
  } else {
    query = query.where('emailNormalized', '==', emailNormalized);
  }
  query = query.where('campaignId', '==', campaignId);
  const snap = await query.get();
  if (snap.empty) {
    return NextResponse.json({ error: 'No existing application found for this campaign.' }, { status: 404 });
  }
  const existingRef = snap.docs[0].ref;

  const campaignRoles = Array.isArray(campaignData.roles) ? campaignData.roles : [];
  if (campaignRoles.length === 0) {
    return NextResponse.json({ error: 'This campaign has no roles to add.' }, { status: 400 });
  }
  const rolesById = new Map(campaignRoles.map((r) => [r.id, r]));

  const parsed = parseRoleRanking(form.get('roleRanking'));
  if (!parsed || parsed.length === 0) {
    return NextResponse.json({ error: 'Select at least one role to add' }, { status: 400 });
  }
  if (parsed.length > MAX_ROLE_RANKING) {
    return NextResponse.json({ error: `You can apply for at most ${MAX_ROLE_RANKING} roles` }, { status: 400 });
  }

  const newChoices: RoleChoice[] = [];
  const seen = new Set<string>();
  for (const choice of parsed) {
    if (seen.has(choice.roleId)) return NextResponse.json({ error: 'Duplicate role selection' }, { status: 400 });
    seen.add(choice.roleId);
    const role = rolesById.get(choice.roleId);
    if (!role) return NextResponse.json({ error: `Role "${choice.roleId}" is not available in this campaign` }, { status: 400 });
    if (!roleIsOpen(role, campaignData.deadline, nowMs)) {
      return NextResponse.json({ error: `Role "${role.title}" is not currently accepting applications` }, { status: 400 });
    }
    newChoices.push({ roleId: choice.roleId, teamId: role.teamId, justification: choice.justification.trim() });
  }

  await adminDb.runTransaction(async (tx) => {
    const cur = await tx.get(existingRef);
    if (!cur.exists) {
      const err = makeError('No existing application found for this campaign.', 404);
      throw err;
    }
    const curData = cur.data() as { roleRanking?: RoleChoice[] };
    const curRoles = Array.isArray(curData.roleRanking) ? curData.roleRanking : [];
    const curRoleIds = new Set(curRoles.map((r) => r.roleId));
    const merged = [...curRoles];
    for (const choice of newChoices) {
      if (!curRoleIds.has(choice.roleId)) {
        merged.push(choice);
        curRoleIds.add(choice.roleId);
      }
    }
    if (merged.length > MAX_ROLE_RANKING) {
      const err = makeError(`You can apply for at most ${MAX_ROLE_RANKING} roles in total`, 400);
      throw err;
    }
    tx.update(existingRef, {
      roleRanking: merged,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    tx.set(limitsRef, { lastRoleUpdateAtMs: nowMs }, { merge: true });
  });

  return NextResponse.json({
    id: existingRef.id,
    campaignId,
    applicationType,
    roleRanking: newChoices,
    updatedAt: new Date().toISOString(),
  });
}
