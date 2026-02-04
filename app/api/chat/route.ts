import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';
import { checkRateLimit, incrementUsage, RateLimitError } from '@/lib/ai/rate-limit';
import { processRAGRequest } from '@/lib/ai/rag';
import { MoonshotError } from '@/lib/ai/moonshot';

interface ChatRequest {
  query: string;
  conversationHistory?: { role: 'user' | 'assistant'; content: string }[];
}

async function verifyAuth(req: NextRequest): Promise<{ uid: string } | null> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  const idToken = authHeader.slice('Bearer '.length);
  
  try {
    const decoded = await adminAuth.verifyIdToken(idToken);
    if (decoded.uid) {
      return { uid: decoded.uid };
    }
    return null;
  } catch (err) {
    console.warn('Auth verification failed:', err);
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    // Verify authentication
    const auth = await verifyAuth(req);
    if (!auth) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Please sign in to use AI recommendations' },
        { status: 401 }
      );
    }
    
    // Check rate limit
    const rateLimitStatus = await checkRateLimit(auth.uid);
    if (!rateLimitStatus.allowed) {
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded', 
          message: `You have reached your daily limit of ${rateLimitStatus.totalRequests} requests. Limit resets at midnight.`,
          resetAt: rateLimitStatus.resetAt.toISOString(),
          remaining: 0
        },
        { status: 429 }
      );
    }
    
    // Parse request body
    let body: ChatRequest;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: 'Bad request', message: 'Invalid JSON body' },
        { status: 400 }
      );
    }
    
    const { query, conversationHistory } = body;
    
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return NextResponse.json(
        { error: 'Bad request', message: 'Query is required' },
        { status: 400 }
      );
    }
    
    // Process RAG request
    const { result, usage } = await processRAGRequest({
      query: query.trim(),
      userId: auth.uid,
      conversationHistory,
    });
    
    // Increment usage
    const newStatus = await incrementUsage(auth.uid, usage.totalTokens);
    
    // Return response
    return NextResponse.json({
      success: true,
      data: result,
      usage: {
        promptTokens: usage.promptTokens,
        completionTokens: usage.completionTokens,
        totalTokens: usage.totalTokens,
      },
      rateLimit: {
        remaining: newStatus.remaining,
        total: newStatus.totalRequests,
        resetAt: newStatus.resetAt.toISOString(),
      },
    });
    
  } catch (error) {
    console.error('Chat API error:', error);
    
    if (error instanceof RateLimitError) {
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded', 
          message: error.message,
          resetAt: error.resetAt.toISOString(),
          remaining: error.remaining
        },
        { status: 429 }
      );
    }
    
    if (error instanceof MoonshotError) {
      return NextResponse.json(
        { 
          error: 'AI service error', 
          message: error.message 
        },
        { status: 503 }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAuth(req);
    if (!auth) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Please sign in' },
        { status: 401 }
      );
    }
    
    const rateLimitStatus = await checkRateLimit(auth.uid);
    
    return NextResponse.json({
      remaining: rateLimitStatus.remaining,
      total: rateLimitStatus.totalRequests,
      resetAt: rateLimitStatus.resetAt.toISOString(),
      allowed: rateLimitStatus.allowed,
    });
  } catch (error) {
    console.error('Rate limit check error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
