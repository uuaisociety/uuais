import { generateStructured } from './openrouter';
//import { fetchCourses, type Course } from '@/lib/courses';
import { type Course } from '@/lib/courses';
import { adminDb } from '@/lib/firebase-admin';
import { findSimilarCourses } from './vector-store';

const DEFAULT_MAX_TOKENS = 1024;
const DEFAULT_MAX_HISTORY = 4;

let cachedSettings: { systemPrompt: string | null; model: string | null; maxTokensPerRequest: number | null; maxConversationHistory: number | null; apiProvider: string | null; } | null = null;
let lastFetch = 0;
const CACHE_TTL = 60*60*1000; // 1 hour

async function getAISettings() {
  const now = Date.now();
  if (cachedSettings && (now - lastFetch < CACHE_TTL)) {
    return cachedSettings;
  }
  try {
    const settingsDoc = await adminDb.collection('config').doc('ai_settings').get();
    if (settingsDoc.exists) {
      const data = settingsDoc.data();
      cachedSettings = {
        systemPrompt: data?.systemPrompt,
        model: data?.model,
        maxTokensPerRequest: data?.maxTokensPerRequest,
        maxConversationHistory: data?.maxConversationHistory,
        apiProvider: data?.apiProvider || 'openrouter',
      }; 
      lastFetch = now;
      return cachedSettings;
    }
  } catch (e) {
    console.warn('Failed to load AI settings from Firestore, using defaults:', e);
  }
  return {
    systemPrompt: DEFAULT_SYSTEM_PROMPT,
    model: 'mistralai/mistral-nemo',
    maxTokensPerRequest: DEFAULT_MAX_TOKENS,
    maxConversationHistory: DEFAULT_MAX_HISTORY,
    apiProvider: 'openrouter',
  };
}

const DEFAULT_SYSTEM_PROMPT = `You are an AI course advisor for Uppsala University students.

Your task:
1. Analyze the user's query and the provided course context
2. Recommend 1-10 courses that best match their needs
3. Consider both semantic meaning (what they want to learn) AND keyword matches (course names, codes)
4. Explain why each course is relevant

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
  recommendations: string[];
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

// function scoreCourse(course: Course, keywords: string[]): number {
//   let score = 0;
//   const searchable = [
//     course.title,
//     course.description,
//     course.code,
//     ...(course.tags || []),
//     course.Learning_outcomes || '',
//   ].join(' ').toLowerCase();

//   for (const kw of keywords) {
//     if (searchable.includes(kw)) score += 1;
//     // Bonus for title match
//     if (course.title.toLowerCase().includes(kw)) score += 2;
//   }

//   return score;
// }
// NOTE THIS USES A LOT OF READS !!! EXPENSIVE!
// async function retrieveRelevantCoursesKeyword(query: string, topK = 15): Promise<Course[]> {
//   const allCourses = await fetchCourses();
//   const keywords = extractKeywords(query);

//   if (keywords.length === 0) {
//     return allCourses.sort(() => Math.random() - 0.5).slice(0, topK);
//   }

//   const scored = allCourses.map(c => ({ course: c, score: scoreCourse(c, keywords) }));
//   scored.sort((a, b) => b.score - a.score);

//   return scored.filter(s => s.score > 0).slice(0, topK).map(s => s.course);
// }


async function retrieveRelevantCoursesVector(query: string, topK = 25): Promise<Course[]> {
  try {
    const similarCourses = await findSimilarCourses(query, topK);
    if (similarCourses.length === 0) {
      return [];
    }

    // Vector search now returns full data, no need to fetch again
    const courses: Course[] = [];
    for (const sc of similarCourses) {
      courses.push({
        id: sc.courseId,
        code: sc.courseCode,
        title: sc.title,
        description: sc.description,
        Learning_outcomes: sc.learningOutcomes,
        tags: sc.tags,
        // Minimal required fields
        link: '',
        relatedCourses: [],
      });
    }
    return courses;
  } catch (error) {
    console.warn('Vector search failed:', error);
    return [];
  }
}

async function retrieveRelevantCourses(query: string, maxCourses = 30): Promise<{ courses: Course[]; keywords: string[] }> {
  // Run vector and keyword searches in parallel

  const [vectorCourses] = await Promise.all([
    retrieveRelevantCoursesVector(query, 25),[]
    //retrieveRelevantCoursesKeyword(query, 5), // NOTE THIS USES A LOT OF READS !!! EXPENSIVE!
  ]); 

  const keywords = extractKeywords(query);

  // Merge and deduplicate, prioritizing vector results
  const seen = new Set<string>();
  const merged: Course[] = [];

  // First add vector results (higher priority for semantic relevance)
  for (const c of vectorCourses) {
    if (!seen.has(c.id)) {
      seen.add(c.id);
      merged.push(c);
    }
  }

  // Then add keyword results for courses that might have been missed by vector search
  // for (const c of keywordCourses) {
  //   if (!seen.has(c.id)) {
  //     seen.add(c.id);
  //     merged.push(c);
  //   }
  // }

  // // If we still have fewer than maxCourses, pad with other courses
  // if (merged.length < maxCourses) {
  //   const allCourses = await fetchCourses();
  //   for (const c of allCourses) {
  //     if (!seen.has(c.id)) {
  //       seen.add(c.id);
  //       merged.push(c);
  //       if (merged.length >= maxCourses) break;
  //     }
  //   }
  // }

  return { courses: merged.slice(0, maxCourses), keywords };
}

function buildContext(courses: Course[], keywords: string[]): string {
  const keywordList = keywords.join(', ');
  
  return `Query Keywords: ${keywordList || 'N/A'}

Available Courses (${courses.length}):

${courses.map((c, i) => {
    const parts = [
      `${i + 1}. ID: ${c.id}`,
      `Title: ${c.title} (${c.code || 'N/A'})`,
      c.tags?.length ? `Tags: ${c.tags.join(', ')}` : '',
      c.description ? `Description: ${c.description.slice(0, 400)}${c.description.length > 400 ? '...' : ''}` : '',
      c.Learning_outcomes ? `Learning Outcomes: ${c.Learning_outcomes.slice(0, 250)}${c.Learning_outcomes.length > 250 ? '...' : ''}` : '',
    ].filter(Boolean);
    return parts.join('\n');
  }).join('\n\n')}`;
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
  const model = settings.model || 'mistralai/mistral-nemo';
  const maxTokens = settings.maxTokensPerRequest || DEFAULT_MAX_TOKENS;
  const maxHistory = settings.maxConversationHistory || DEFAULT_MAX_HISTORY;

  // Retrieve relevant courses using hybrid search (vector + keyword)
  const { courses: relevantCourses, keywords } = await retrieveRelevantCourses(query);
  //console.log("Courses sent to LLM: ", relevantCourses);
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
  const context = buildContext(relevantCourses, keywords);

  // Build messages
  const messages = [
    { role: 'system' as const, content: systemPrompt },
    ...conversationHistory.slice(-maxHistory),
    {
      role: 'user' as const,
      content: `${context}

User query: ${query}

Respond with JSON containing "message" (string) and "recommendations" (array of courseId from the list above).`,
    },
  ];

  // Call AI
  const response = await generateStructured(
    messages,
    { maxTokens, model }
  );

  const resultData = response.data as { message: string; recommendations: string[] };

  // Convert ordinal IDs (1, 2, 3...) to actual course IDs ('1BL800', etc.)
  const normalizedRecommendations = (resultData.recommendations || []).map(rec => {
    const recStr = String(rec).trim();
    
    // 1. Check if the recommendation is already a valid ID in our list
    const directMatch = relevantCourses.find(c => c.id === recStr);
    if (directMatch) return directMatch.id;

    // 2. If it's a number, treat it as a 1-based index (Ordinal)
    const index = parseInt(recStr, 10);
    if (!isNaN(index)) {
      // LLMs use 1-based indexing (1 = index 0)
      const courseByIndex = relevantCourses[index - 1];
      if (courseByIndex) return courseByIndex.id;
    }

    // 3. Fallback: If it's not a number and doesn't match, return as is (or null to filter)
    return recStr;
  }).filter(id => {
    // Final safety check: Ensure the ID actually exists in the retrieved set
    return relevantCourses.some(c => c.id === id);
  });

  return {
    result: {
      message: resultData.message,
      recommendations: normalizedRecommendations || [],
    },
    usage: response.usage,
  };
}
