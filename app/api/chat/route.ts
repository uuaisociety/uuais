import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { checkRateLimit, incrementUsage, RateLimitError } from '@/lib/ai/rate-limit';
import { processRAGRequest } from '@/lib/ai/rag';
import { OpenRouterError } from '@/lib/ai/openrouter';

interface ChatRequest {
  query: string;
  conversationHistory?: { role: 'user' | 'assistant'; content: string }[];
  uid: string;
}

export async function POST(req: NextRequest) {
  try {
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
    
    const { query, conversationHistory, uid } = body;
    
    if (!uid) {
      return NextResponse.json(
        { error: 'Bad request', message: 'User ID is required' },
        { status: 400 }
      );
    }
    
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return NextResponse.json(
        { error: 'Bad request', message: 'Query is required' },
        { status: 400 }
      );
    }
    
    // Check rate limit
    const rateLimitStatus = await checkRateLimit(uid);
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
    
    // Process RAG request
    const { result, usage } = await processRAGRequest({
      query: query.trim(),
      userId: uid,
      conversationHistory,
    });
    
    // Increment usage
    const newStatus = await incrementUsage(uid, usage.totalTokens);
    
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
    
    if (error instanceof OpenRouterError) {
      const statusCode = error.statusCode || 503;
      return NextResponse.json(
        { 
          error: 'AI service error', 
          message: error.message,
          type: statusCode === 401 ? 'api_key' : 'server'
        },
        { status: statusCode }
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
    const { searchParams } = new URL(req.url);
    const uid = searchParams.get('uid');
    
    if (!uid) {
      return NextResponse.json(
        { error: 'Bad request', message: 'User ID is required' },
        { status: 400 }
      );
    }
    
    const rateLimitStatus = await checkRateLimit(uid);
    
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
