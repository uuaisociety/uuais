import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { checkRateLimit, incrementUsage, RateLimitError } from '@/lib/ai/rate-limit';
import { processRAGRequest } from '@/lib/ai/rag';
import { OpenRouterError } from '@/lib/ai/openrouter';
import { getTokens } from 'next-firebase-auth-edge';
import { authConfig } from '@/lib/auth-config';

interface ChatRequest {
  query: string;
  conversationHistory?: { role: 'user' | 'assistant'; content: string }[];
}

function normalizeConversationHistory(
  conversationHistory: ChatRequest['conversationHistory']
): { role: 'user' | 'assistant'; content: string }[] {
  if (!Array.isArray(conversationHistory)) {
    return [];
  }

  return conversationHistory
    .filter((message): message is { role: 'user' | 'assistant'; content: string } => {
      return (
        Boolean(message) &&
        (message.role === 'user' || message.role === 'assistant') &&
        typeof message.content === 'string' &&
        message.content.trim().length > 0
      );
    })
    .map((message) => ({
      role: message.role,
      content: message.content.trim(),
    }));
}

export async function POST(req: NextRequest) {
  try {
    // Verify Firebase auth using next-firebase-auth-edge
    const tokens = await getTokens(req.cookies, authConfig);
    
    if (!tokens) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      );
    }

    const uid = tokens.decodedToken.uid;
    const isAdmin = Boolean(tokens.decodedToken.admin || tokens.decodedToken.superAdmin);
    if (!uid) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Invalid token: missing user ID' },
        { status: 401 }
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
    const normalizedConversationHistory = normalizeConversationHistory(conversationHistory);
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
    const { result, usage, debug } = await processRAGRequest({
      query: query.trim(),
      userId: uid,
      conversationHistory: normalizedConversationHistory,
      includeDebug: isAdmin,
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
      ...(isAdmin && debug ? { debug } : {}),
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
      const type = statusCode === 401 ? 'api_key' : 'server';
      const userMessage =
        type === 'api_key'
          ? 'AI provider authentication failed. Please contact an admin.'
          : 'The AI service is temporarily unavailable. Please try again in a moment.';
      return NextResponse.json(
        { 
          error: 'AI service error', 
          message: userMessage,
          type
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
    // Verify Firebase auth using next-firebase-auth-edge
    const tokens = await getTokens(req.cookies, authConfig);
    
    if (!tokens) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      );
    }

    const uid = tokens.decodedToken.uid;
    if (!uid) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Invalid token: missing user ID' },
        { status: 401 }
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
