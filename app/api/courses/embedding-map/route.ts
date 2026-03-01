import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { projectEmbeddings, type ProjectionAlgorithm } from '@/lib/ai/projection';
import { authorizeAdmin } from '@/app/api/admin/AuthorizeAPI';

export interface EmbeddingPoint {
    courseId: string;
    title: string;
    code: string;
    level: string;
    credits: number;
    x: number;
    y: number;
    z?: number;
}

export interface EmbeddingMapResponse {
    points: EmbeddingPoint[];
    algorithm: ProjectionAlgorithm;
    dimensions: 2 | 3;
    courseCount: number;
}

function normalizeLevel(lvl: unknown): string {
    if (typeof lvl !== 'string' || !lvl) return '';
    const v = lvl.toLowerCase();
    if (v.includes('preparatory')) return 'Preparatory';
    if (v.includes("bachelor")) return "Bachelor's";
    if (v.includes("master")) return "Master's";
    return '';
}

export async function GET(req: NextRequest) {
    const auth = await authorizeAdmin(req);
    if (!auth.ok) {
        return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    try {
        const url = new URL(req.url);
        const dims = (parseInt(url.searchParams.get('dimensions') || '2') === 3 ? 3 : 2) as 2 | 3;
        const algorithm = (url.searchParams.get('algorithm') || 'tsne') as ProjectionAlgorithm;
        const forceRefresh = url.searchParams.get('refresh') === 'true';

        // Check for cached projection
        const cacheKey = `embedding_projection_${algorithm}_${dims}d`;
        if (!forceRefresh) {
            const cached = await adminDb.collection('config').doc(cacheKey).get();
            if (cached.exists) {
                const data = cached.data();
                if (data && data.points) {
                    return NextResponse.json({
                        points: data.points,
                        algorithm: data.algorithm,
                        dimensions: data.dimensions,
                        courseCount: data.courseCount,
                        cached: true,
                    });
                }
            }
        }

        // Load all courses and their embeddings from the courses collection
        const coursesSnap = await adminDb.collection('courses').get();
        if (coursesSnap.empty) {
            return NextResponse.json({
                points: [],
                algorithm,
                dimensions: dims,
                courseCount: 0,
            });
        }

        const courseIds: string[] = [];
        const courseMeta: { title: string; code: string; level: string; credits: number }[] = [];
        const embeddings: number[][] = [];

        for (const doc of coursesSnap.docs) {
            const data = doc.data();

            // Handle vector field (could be Array or FieldValue.vector which has toArray())
            let vecArray: number[] | null = null;
            if (data.embedding) {
                if (Array.isArray(data.embedding)) {
                    vecArray = data.embedding;
                } else if (typeof data.embedding.toArray === 'function') {
                    vecArray = data.embedding.toArray();
                }
            }

            if (vecArray && Array.isArray(vecArray) && vecArray.length > 0) {
                courseIds.push(doc.id);
                courseMeta.push({
                    title: data.title || '',
                    code: data.code || '',
                    level: normalizeLevel(data.level),
                    credits: typeof data.credits === 'number' ? data.credits : (typeof data.credits === 'string' ? parseFloat(data.credits) || 0 : 0),
                });
                embeddings.push(vecArray);
            }
        }

        if (embeddings.length === 0) {
            return NextResponse.json({
                points: [],
                algorithm,
                dimensions: dims,
                courseCount: 0,
            });
        }

        // Run projection
        const projected = projectEmbeddings(embeddings, {
            dimensions: dims,
            algorithm,
            perplexity: Math.min(30, Math.floor((embeddings.length - 1) / 3)),
            iterations: Math.min(500, Math.max(100, embeddings.length)),
        });

        const points: EmbeddingPoint[] = projected.map((coords, i) => {
            return {
                courseId: courseIds[i],
                title: courseMeta[i].title,
                code: courseMeta[i].code,
                level: courseMeta[i].level,
                credits: courseMeta[i].credits,
                x: coords[0],
                y: coords[1],
                ...(dims === 3 ? { z: coords[2] } : {}),
            };
        });

        // Cache the result
        await adminDb.collection('config').doc(cacheKey).set({
            algorithm,
            dimensions: dims,
            courseCount: points.length,
            points,
            computedAt: new Date(),
        });

        return NextResponse.json({
            points,
            algorithm,
            dimensions: dims,
            courseCount: points.length,
            cached: false,
        });
    } catch (error) {
        console.error('Embedding map error:', error);
        return NextResponse.json(
            { error: 'Failed to compute embedding map' },
            { status: 500 }
        );
    }
}
