import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { generateStructured } from '@/lib/ai/openrouter';
import { fetchCourses } from '@/lib/courses';

async function verifyAuth(req: NextRequest): Promise<{ uid: string } | null> {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    try {
        const decoded = await adminAuth.verifyIdToken(authHeader.slice('Bearer '.length));
        return decoded?.uid ? { uid: decoded.uid } : null;
    } catch {
        return null;
    }
}

const TRANSCRIPT_PARSE_PROMPT = `You are a transcript parser for Uppsala University.
Extract all courses from the given transcript text.

For each course found, extract:
- rawCourseName: the course name as written
- rawCourseCode: the course code if present (e.g., "1MA103")
- credits: number of credits (ECTS)
- grade: the grade if present
- domain: the academic domain/field (e.g., "Mathematics", "Computer Science", "Physics")

Return JSON in this format:
{
  "entries": [
    {
      "rawCourseName": "Linear Algebra",
      "rawCourseCode": "1MA024",
      "credits": 5,
      "grade": "A",
      "domain": "Mathematics"
    }
  ]
}

Only return valid JSON. If you cannot extract any courses, return { "entries": [] }.`;

/**
 * POST /api/transcript/upload
 * 
 * Accepts multipart/form-data with:
 * - file: PDF file (required)
 * - consent: "true" (required)
 *
 * Parses the PDF, extracts course data via AI, matches to known courses,
 * and stores under users/{uid}/transcript_data/latest
 */
export async function POST(req: NextRequest) {
    try {
        const auth = await verifyAuth(req);
        if (!auth) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const formData = await req.formData();
        const file = formData.get('file') as File | null;
        const consent = formData.get('consent') as string;

        if (consent !== 'true') {
            return NextResponse.json({ error: 'Consent is required' }, { status: 400 });
        }

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        // Validate file
        if (file.size > 5 * 1024 * 1024) {
            return NextResponse.json({ error: 'File too large (max 5MB)' }, { status: 400 });
        }

        if (file.type !== 'application/pdf') {
            return NextResponse.json({ error: 'Only PDF files are accepted' }, { status: 400 });
        }

        // Extract text from PDF
        const arrayBuffer = await file.arrayBuffer();
        const pdfText = await extractTextFromPDF(Buffer.from(arrayBuffer));

        if (!pdfText || pdfText.trim().length === 0) {
            return NextResponse.json({ error: 'Could not extract text from PDF' }, { status: 400 });
        }

        // Parse transcript via AI
        const response = await generateStructured(
            [
                { role: 'system', content: TRANSCRIPT_PARSE_PROMPT },
                { role: 'user', content: `Parse this transcript:\n\n${pdfText.slice(0, 8000)}` },
            ],
            { maxTokens: 4096 }
        );

        const parsed = response.data as { entries: TranscriptEntry[] };
        const entries = parsed?.entries || [];

        // Match to known courses
        const allCourses = await fetchCourses();
        const matchedEntries = entries.map(entry => {
            const match = matchCourse(entry, allCourses);
            return {
                ...entry,
                matchedCourseId: match?.id || null,
                matchConfidence: match?.confidence || 0,
            };
        });

        // Compute summary
        const totalCredits = matchedEntries.reduce((sum, e) => sum + (e.credits || 0), 0);
        const creditsByDomain: Record<string, number> = {};
        for (const e of matchedEntries) {
            if (e.domain) {
                creditsByDomain[e.domain] = (creditsByDomain[e.domain] || 0) + (e.credits || 0);
            }
        }

        // Store in Firestore (never store the PDF itself)
        const transcriptData = {
            parsedAt: new Date(),
            consentGivenAt: new Date(),
            sourceFileName: file.name,
            entries: matchedEntries,
            summary: {
                totalCredits,
                creditsByDomain,
                coveredTopics: [], // Could be enhanced later
            },
        };

        await adminDb
            .collection('users')
            .doc(auth.uid)
            .collection('transcript_data')
            .doc('latest')
            .set(transcriptData);

        return NextResponse.json({
            success: true,
            entries: matchedEntries,
            summary: transcriptData.summary,
            matchedCount: matchedEntries.filter(e => e.matchedCourseId).length,
            unmatchedCount: matchedEntries.filter(e => !e.matchedCourseId).length,
        });
    } catch (error) {
        console.error('Transcript upload error:', error);
        return NextResponse.json(
            { error: 'Failed to process transcript' },
            { status: 500 }
        );
    }
}

// ---- Helpers ----

interface TranscriptEntry {
    rawCourseName: string;
    rawCourseCode?: string;
    credits: number;
    grade?: string;
    domain?: string;
}

interface CourseMatch {
    id: string;
    confidence: number;
}

/**
 * Simple text extraction from PDF using regex-based text content parsing.
 * For production, add `pdf-parse` package for better extraction.
 */
async function extractTextFromPDF(buffer: Buffer): Promise<string> {
    try {
        // Try using pdf-parse if available
        // eslint-disable-next-line @typescript-eslint/no-explicit-any 
        const pdfParse = await import('pdf-parse').then((m: any) => m.default || m).catch(() => null);
        //const pdfParse = await import('pdf-parse').then(m => m.default || m).catch(() => null);
        if (pdfParse) {
            const data = await pdfParse(buffer);
            return data.text;
        }
    } catch {
        // Fall through to basic extraction
    }

    // Basic fallback: extract readable text from PDF binary
    // This is intentionally simple — pdf-parse should be installed for production use
    const str = buffer.toString('latin1');
    const textMatches = str.match(/\(([^)]+)\)/g);
    if (textMatches) {
        return textMatches
            .map(m => m.slice(1, -1))
            .filter(t => t.length > 1 && /[a-zA-Z]/.test(t))
            .join(' ');
    }
    return '';
}

/**
 * Match a transcript entry to a known course using code match and fuzzy title matching.
 */
function matchCourse(
    entry: TranscriptEntry,
    allCourses: { id: string; code: string; title: string }[]
): CourseMatch | null {
    // 1. Exact code match
    if (entry.rawCourseCode) {
        const codeUpper = entry.rawCourseCode.toUpperCase();
        const byCode = allCourses.find(c => c.code.toUpperCase() === codeUpper);
        if (byCode) return { id: byCode.id, confidence: 1.0 };
    }

    // 2. Fuzzy title match
    const titleLower = entry.rawCourseName.toLowerCase().trim();
    let bestMatch: CourseMatch | null = null;
    let bestScore = 0;

    for (const course of allCourses) {
        const courseTitleLower = course.title.toLowerCase();

        // Exact title match
        if (courseTitleLower === titleLower) {
            return { id: course.id, confidence: 0.95 };
        }

        // Contains match
        if (courseTitleLower.includes(titleLower) || titleLower.includes(courseTitleLower)) {
            const score = Math.min(titleLower.length, courseTitleLower.length) /
                Math.max(titleLower.length, courseTitleLower.length);
            if (score > bestScore && score > 0.5) {
                bestScore = score;
                bestMatch = { id: course.id, confidence: score * 0.8 };
            }
        }

        // Word overlap
        const entryWords = new Set(titleLower.split(/\s+/));
        const courseWords = new Set(courseTitleLower.split(/\s+/));
        const overlap = [...entryWords].filter(w => courseWords.has(w) && w.length > 2).length;
        const overlapScore = overlap / Math.max(entryWords.size, courseWords.size);

        if (overlapScore > bestScore && overlapScore > 0.4) {
            bestScore = overlapScore;
            bestMatch = { id: course.id, confidence: overlapScore * 0.7 };
        }
    }

    return bestMatch;
}
