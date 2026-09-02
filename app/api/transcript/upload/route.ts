import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/server-auth';
import { generateStructured } from '@/lib/ai/openrouter';
import { fetchCourses } from '@/lib/courses';
import {
    detectCertificateType,
    parseLadokCertificate,
    redactPersonalData,
    splitRegistrations,
} from '@/lib/programs/ladok';

const TRANSCRIPT_PARSE_PROMPT = `You are a transcript parser for Uppsala University.
Extract all courses from the given transcript text.

For each course found, extract:
- rawCourseName: the course name as written
- rawCourseCode: the course code if present (e.g., "1MA103")
- credits: number of credits (ECTS)
- domain: the academic domain/field (e.g., "Mathematics", "Computer Science", "Physics")

Only list courses that are completed. Do NOT extract grades or personal identity numbers.

Return JSON in this format:
{
  "entries": [
    {
      "rawCourseName": "Linear Algebra",
      "rawCourseCode": "1MA024",
      "credits": 5,
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
        const auth = await requireAuth(req);
        if (!auth.ok) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const uid = auth.session.uid;

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

        // A Ladok certificate has a fixed layout, so it is parsed directly rather than
        // sent to a model: exact, and the document never leaves the server. Grades and
        // the personal identity number are never extracted - a course listed under
        // "Completed courses" is by definition passed, so the grade adds nothing.
        const certificateType = detectCertificateType(pdfText);
        let entries: TranscriptEntry[] = [];
        let programCode: string | null = null;
        let registrations: { code: string; title: string; credits: number; current: boolean }[] = [];

        if (certificateType !== 'UNKNOWN') {
            const certificate = parseLadokCertificate(pdfText);
            programCode = certificate.programCode;
            entries = certificate.completed.map(course => ({
                rawCourseName: course.title,
                rawCourseCode: course.code,
                credits: course.credits,
            }));
            const { current } = splitRegistrations(certificate.registered);
            const currentCodes = new Set(current.map(r => r.code));
            registrations = certificate.registered.map(r => ({
                code: r.code,
                title: r.title,
                credits: r.credits,
                current: currentCodes.has(r.code),
            }));
        } else {
            // An unrecognised document still goes through the model, with the personal
            // identity number stripped before it is sent anywhere.
            const response = await generateStructured(
                [
                    { role: 'system', content: TRANSCRIPT_PARSE_PROMPT },
                    {
                        role: 'user',
                        content: `Parse this transcript:\n\n${redactPersonalData(pdfText).slice(0, 8000)}`,
                    },
                ],
                { maxTokens: 4096 }
            );
            // The prompt may still return a grade; drop it rather than store it.
            const parsed = response.data as { entries: (TranscriptEntry & { grade?: string })[] };
            entries = (parsed?.entries || []).map((entry) => ({
                rawCourseName: entry.rawCourseName,
                rawCourseCode: entry.rawCourseCode,
                credits: entry.credits,
                domain: entry.domain,
            }));
        }

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
        // Note: Client should use Firebase client SDK to write to Firestore
        // This endpoint only processes the transcript data
        const transcriptData = {
            parsedAt: new Date(),
            consentGivenAt: new Date(),
            sourceFileName: file.name,
            certificateType,
            programCode,
            registrations,
            entries: matchedEntries,
            summary: {
                totalCredits,
                creditsByDomain,
                coveredTopics: [], // Could be enhanced later
            },
        };

        // Return processed data for client to store
        return NextResponse.json({
            success: true,
            uid,
            transcriptData,
            certificateType,
            programCode,
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
