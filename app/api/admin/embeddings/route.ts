import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getTokens } from 'next-firebase-auth-edge';
import { authConfig } from '@/lib/auth-config';
import { fetchCourses } from '@/lib/courses';
import { generateAndStoreCourseEmbedding, getEmbeddingCount } from '@/lib/ai/vector-store';

async function verifyAdmin(req: NextRequest) {
  const tokens = await getTokens(req.cookies, authConfig);
  if (!tokens) return { ok: false };
  const isAdmin = tokens.decodedToken.admin === true || tokens.decodedToken.superAdmin === true;
  if (!isAdmin) return { ok: false };
  return { ok: true, uid: tokens.decodedToken.uid };
}

export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAdmin(req);
    if (!auth.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const count = await getEmbeddingCount();
    const courses = await fetchCourses();

    return NextResponse.json({
      embeddingCount: count,
      totalCourses: courses.length,
      needsGeneration: count < courses.length,
    });
  } catch (error) {
    console.error('Error getting embedding status:', error);
    return NextResponse.json({ error: 'internal error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAdmin(req);
    if (!auth.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { courseId } = body;

    if (!courseId) {
      return NextResponse.json({ error: 'courseId required' }, { status: 400 });
    }

    const courses = await fetchCourses();
    const course = courses.find(c => c.id === courseId);

    if (!course) {
      return NextResponse.json({ error: 'course not found' }, { status: 404 });
    }

    await generateAndStoreCourseEmbedding(course);

    return NextResponse.json({ success: true, courseId: courseId });
  } catch (error) {
    console.error('Error generating embedding:', error);
    return NextResponse.json({ error: 'internal error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = await verifyAdmin(req);
    if (!auth.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const courses = await fetchCourses();
    let generated = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const course of courses) {
      try {
        await generateAndStoreCourseEmbedding(course);
        generated++;
      } catch (error) {
        failed++;
        errors.push(`${course.id}: ${error instanceof Error ? error.message : 'unknown error'}`);
      }
    }

    return NextResponse.json({
      success: true,
      generated: generated,
      failed: failed,
      errors: errors.slice(0, 10),
    });
  } catch (error) {
    console.error('Error generating all embeddings:', error);
    return NextResponse.json({ error: 'internal error' }, { status: 500 });
  }
}
