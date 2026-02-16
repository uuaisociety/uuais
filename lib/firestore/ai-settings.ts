import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase-client";
import { AISettings } from "@/types";

const AI_SETTINGS_DOC_ID = "ai_settings";

const DEFAULT_AI_SETTINGS: AISettings = {
  systemPrompt: `You are an AI course advisor for UU AI Society (UUAIS). Help students find relevant AI courses at Uppsala University.

When recommending courses:
- Consider the student's level (bachelor's, master's, PhD)
- Consider location preferences (Uppsala campus vs online)
- Consider credit requirements
- Consider prerequisites and recommended prior knowledge
- Mention relevant teachers and research areas
- Be concise but informative

Always base your recommendations on the provided course context.`,
  model: "moonshot-v1-8k",
  costPer1kTokensUsd: 0,
  rateLimitRequestsPerDay: 10,
  maxTokensPerRequest: 1024,
  maxConversationHistory: 4,
  maxStoredChatsPerUser: 50,
  updatedAt: new Date().toISOString(),
  updatedBy: "system",
};

export const getAISettings = async (): Promise<AISettings> => {
  const settingsRef = doc(db, "config", AI_SETTINGS_DOC_ID);
  const settingsSnap = await getDoc(settingsRef);
  
  if (!settingsSnap.exists()) {
    return DEFAULT_AI_SETTINGS;
  }
  
  const data = settingsSnap.data();
  return {
    systemPrompt: data.systemPrompt ?? DEFAULT_AI_SETTINGS.systemPrompt,
    model: data.model ?? DEFAULT_AI_SETTINGS.model,
    costPer1kTokensUsd: typeof data.costPer1kTokensUsd === 'number' ? data.costPer1kTokensUsd : DEFAULT_AI_SETTINGS.costPer1kTokensUsd,
    rateLimitRequestsPerDay: data.rateLimitRequestsPerDay ?? DEFAULT_AI_SETTINGS.rateLimitRequestsPerDay,
    maxTokensPerRequest: data.maxTokensPerRequest ?? DEFAULT_AI_SETTINGS.maxTokensPerRequest,
    maxConversationHistory: data.maxConversationHistory ?? DEFAULT_AI_SETTINGS.maxConversationHistory,
    maxStoredChatsPerUser: data.maxStoredChatsPerUser ?? DEFAULT_AI_SETTINGS.maxStoredChatsPerUser,
    updatedAt: data.updatedAt?.toDate?.() ? data.updatedAt.toDate().toISOString() : data.updatedAt,
    updatedBy: data.updatedBy,
  } as AISettings;
};

export const updateAISettings = async (
  settings: Partial<Omit<AISettings, "updatedAt" | "updatedBy">>,
  updatedBy: string
): Promise<void> => {
  const settingsRef = doc(db, "config", AI_SETTINGS_DOC_ID);
  await setDoc(settingsRef, {
    ...settings,
    updatedAt: serverTimestamp(),
    updatedBy,
  }, { merge: true });
};
