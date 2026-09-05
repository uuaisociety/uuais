import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { checkWindow } from '@/lib/rate-limit-in-memory';
import { getProgram } from '@/lib/programs';
// The type erases at build time; the collection is named here rather than imported, because
// lib/firestore/* opens the browser SDK and a route has no business initialising one.
import type { ProgramFeedbackKind } from '@/lib/firestore/program-feedback';

const PROGRAM_FEEDBACK_COLLECTION = 'programFeedback';

const KINDS: ProgramFeedbackKind[] = [
    'wrong-prerequisite',
    'missing-course',
    'wrong-rule',
    'other',
];

const MAX_MESSAGE = 2000;
const MAX_CONTACT = 200;
/** Enough for a reader working through a map, low enough to be useless for spam. */
const LIMIT_PER_HOUR = 10;

function clean(value: unknown, max: number): string {
    return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

/** POST /api/programs/feedback — open to anyone, but written server-side so the collection
 *  stays closed to clients. */
export async function POST(req: NextRequest) {
    try {
        // The platform sets x-vercel-forwarded-for itself, so a client cannot forge it; the
        // spoofable x-forwarded-for is only a fallback for other hosts.
        const ip =
            req.headers.get('x-vercel-forwarded-for')?.trim() ||
            req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
            'unknown';
        const rate = checkWindow(`program-feedback:${ip}`, LIMIT_PER_HOUR, 60 * 60 * 1000);
        if (!rate.allowed) {
            return NextResponse.json(
                { error: 'Too many reports from this address. Try again later.' },
                { status: 429 }
            );
        }

        const body = await req.json();
        const message = clean(body.message, MAX_MESSAGE);
        if (message.length < 5) {
            return NextResponse.json({ error: 'Please describe the problem.' }, { status: 400 });
        }

        // Checked against the catalogue rather than merely trimmed: the slug becomes a link an
        // admin follows out of the report queue, and an unknown one only leads them nowhere.
        const programSlug = clean(body.programSlug, 120);
        if (!programSlug || !getProgram(programSlug)) {
            return NextResponse.json({ error: 'Unknown programme.' }, { status: 400 });
        }

        const kind = KINDS.includes(body.kind) ? (body.kind as ProgramFeedbackKind) : 'other';
        const courseCode = clean(body.courseCode, 12).toUpperCase();

        await adminDb.collection(PROGRAM_FEEDBACK_COLLECTION).add({
            programSlug,
            programName: clean(body.programName, 200),
            trackId: clean(body.trackId, 120) || null,
            courseCode: /^\d[A-Z]{2}\d{3}$/.test(courseCode) ? courseCode : null,
            kind,
            message,
            contact: clean(body.contact, MAX_CONTACT) || null,
            status: 'open',
            createdAt: new Date().toISOString(),
        });

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error('Programme feedback error:', error);
        return NextResponse.json({ error: 'Could not send the report.' }, { status: 500 });
    }
}
