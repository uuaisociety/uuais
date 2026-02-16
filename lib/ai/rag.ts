import { generateStructured } from './moonshot';
import { fetchCourses, type Course } from '@/lib/courses';
import { adminDb } from '@/lib/firebase-admin';

const DEFAULT_MAX_TOKENS = 1024;
const DEFAULT_MAX_HISTORY = 4;

async function getAISettings() {
  try {
    const settingsDoc = await adminDb.collection('config').doc('ai_settings').get();
    if (settingsDoc.exists) {
      const data = settingsDoc.data();
      return {
        systemPrompt: data?.systemPrompt,
        model: data?.model,
        maxTokensPerRequest: data?.maxTokensPerRequest,
        maxConversationHistory: data?.maxConversationHistory,
      };
    }
  } catch (e) {
    console.warn('Failed to load AI settings from Firestore, using defaults:', e);
  }
  return {
    systemPrompt: null,
    model: null,
    maxTokensPerRequest: null,
    maxConversationHistory: null,
  };
}

const DEFAULT_SYSTEM_PROMPT = `You are an AI course advisor for Uppsala University students.

Your task:
1. Analyze the user's query and the provided course context
2. Recommend 1-10 courses that best match their needs
3. Explain why each course is relevant

Rules:
- ONLY recommend from the provided course list
- Use the exact "ID" field (e.g., "teaching-spanish-culture...") in your recommendations array, NOT the course code
- Be specific about why a course matches (level, credits, content, prerequisites)
- If no courses match well, say so clearly
- Keep explanations concise but informative
- Return your response as valid JSON

Response format:
{
  "message": "A helpful response explaining your recommendations",
  "recommendations": ["course-id-1", "course-id-2", ...]
}`;

export type ChatRecommendation = {
  courseId: string;
  reason: string;
};

export type RAGResult = {
  message: string;
  recommendations: string[]; // course IDs
};

// Simple keyword extraction and scoring for initial retrieval
function extractKeywords(query: string): string[] {
  const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'course', 'courses']);
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.has(w))
    .map(w => w.replace(/[^a-z0-9]/g, ''));
}

function scoreCourse(course: Course, keywords: string[]): number {
  let score = 0;
  const searchable = [
    course.title,
    course.description,
    course.code,
    ...(course.tags || []),
    course.Learning_outcomes || '',
  ].join(' ').toLowerCase();

  for (const kw of keywords) {
    if (searchable.includes(kw)) score += 1;
    // Bonus for title match
    if (course.title.toLowerCase().includes(kw)) score += 2;
  }

  return score;
}

async function retrieveRelevantCourses(query: string, topK = 15): Promise<Course[]> {
  const allCourses = await fetchCourses();
  const keywords = extractKeywords(query);

  if (keywords.length === 0) {
    // Return random selection if no keywords
    return allCourses.sort(() => Math.random() - 0.5).slice(0, topK);
  }

  const scored = allCourses.map(c => ({ course: c, score: scoreCourse(c, keywords) }));
  scored.sort((a, b) => b.score - a.score);

  return scored.filter(s => s.score > 0).slice(0, topK).map(s => s.course);
}

function buildContext(courses: Course[]): string {
  return courses.map((c, i) => {
    const parts = [
      `${i + 1}. ID: ${c.id}`,
      `Title: ${c.title} (${c.code || 'N/A'})`,
      c.tags?.length ? `Tags: ${c.tags.join(', ')}` : '',
      c.description ? `Description: ${c.description.slice(0, 300)}${c.description.length > 300 ? '...' : ''}` : '',
      c.Learning_outcomes ? `Learning Outcomes: ${c.Learning_outcomes.slice(0, 200)}${c.Learning_outcomes.length > 200 ? '...' : ''}` : '',
    ].filter(Boolean);
    return parts.join('\n');
  }).join('\n\n');
}

export async function processRAGRequest({
  query,
  conversationHistory = [],
}: {
  query: string;
  userId?: string;
  conversationHistory?: { role: 'user' | 'assistant'; content: string }[];
}): Promise<{ result: RAGResult; usage: { promptTokens: number; completionTokens: number; totalTokens: number } }> {
  // Load AI settings from Firestore
  const settings = await getAISettings();
  const systemPrompt = settings.systemPrompt || DEFAULT_SYSTEM_PROMPT;
  const model = settings.model || 'moonshot-v1-8k';
  const maxTokens = settings.maxTokensPerRequest || DEFAULT_MAX_TOKENS;
  const maxHistory = settings.maxConversationHistory || DEFAULT_MAX_HISTORY;

  // Retrieve relevant courses
  const relevantCourses = await retrieveRelevantCourses(query);

  if (relevantCourses.length === 0) {
    return {
      result: {
        message: "I couldn't find any courses matching your query. Try different keywords or browse all courses.",
        recommendations: [],
      },
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    };
  }

  // Build context from retrieved courses
  const context = buildContext(relevantCourses);

  // Build messages
  const messages = [
    { role: 'system' as const, content: systemPrompt },
    ...conversationHistory.slice(-maxHistory),
    {
      role: 'user' as const,
      content: `Available courses:\n${context}\n\nUser query: ${query}\n\nRespond with JSON containing "message" (string) and "recommendations" (array of course IDs from the list above).`,
    },
  ];

  // Call Moonshot AI
  const response = await generateStructured(
    messages,
    { maxTokens, model }
  );

  const resultData = response.data as { message: string; recommendations: string[] };

  return {
    result: {
      message: resultData.message,
      recommendations: resultData.recommendations || [],
    },
    usage: response.usage,
  };
}
