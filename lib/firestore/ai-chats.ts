import {
  collection,
  query,
  orderBy,
  getDocs,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  serverTimestamp,
  limit,
  startAfter,
  type QueryDocumentSnapshot,
  type DocumentData,
} from "firebase/firestore";
import { db } from "@/lib/firebase-client";
import { AIChat } from "@/types";

const CHATS_PER_USER_LIMIT = 50;
const DEFAULT_PAGE_SIZE = 15;

export type ChatsPage = {
  chats: AIChat[];
  nextCursor: QueryDocumentSnapshot<DocumentData> | null;
};

export const getUserChats = async (userId: string): Promise<AIChat[]> => {
  const chatsRef = collection(db, "ai_chats", userId, "chats");
  const qy = query(chatsRef, orderBy("updatedAt", "desc"), limit(CHATS_PER_USER_LIMIT));
  const snapshot = await getDocs(qy);
  return snapshot.docs.map((docSnap) => {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      userId: data.userId,
      title: data.title,
      messages: data.messages || [],
      recommendedCourseIds: data.recommendedCourseIds || [],
      createdAt: data.createdAt?.toDate?.() ? data.createdAt.toDate().toISOString() : data.createdAt,
      updatedAt: data.updatedAt?.toDate?.() ? data.updatedAt.toDate().toISOString() : data.updatedAt,
    } as AIChat;
  });
};

export const getUserChatsPage = async (
  userId: string,
  opts?: { pageSize?: number; cursor?: QueryDocumentSnapshot<DocumentData> | null }
): Promise<ChatsPage> => {
  const pageSize = Math.max(1, Math.min(opts?.pageSize ?? DEFAULT_PAGE_SIZE, CHATS_PER_USER_LIMIT));
  const chatsRef = collection(db, "ai_chats", userId, "chats");

  const qy = opts?.cursor
    ? query(chatsRef, orderBy("updatedAt", "desc"), startAfter(opts.cursor), limit(pageSize))
    : query(chatsRef, orderBy("updatedAt", "desc"), limit(pageSize));

  const snapshot = await getDocs(qy);
  const chats = snapshot.docs.map((docSnap) => {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      userId: data.userId,
      title: data.title,
      messages: data.messages || [],
      recommendedCourseIds: data.recommendedCourseIds || [],
      createdAt: data.createdAt?.toDate?.() ? data.createdAt.toDate().toISOString() : data.createdAt,
      updatedAt: data.updatedAt?.toDate?.() ? data.updatedAt.toDate().toISOString() : data.updatedAt,
    } as AIChat;
  });

  const nextCursor = snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null;
  return { chats, nextCursor };
};

export const getChatById = async (userId: string, chatId: string): Promise<AIChat | null> => {
  const chatRef = doc(db, "ai_chats", userId, "chats", chatId);
  const chatSnap = await getDoc(chatRef);
  if (!chatSnap.exists()) return null;
  const data = chatSnap.data();
  return {
    id: chatSnap.id,
    userId: data.userId,
    title: data.title,
    messages: data.messages || [],
    recommendedCourseIds: data.recommendedCourseIds || [],
    createdAt: data.createdAt?.toDate?.() ? data.createdAt.toDate().toISOString() : data.createdAt,
    updatedAt: data.updatedAt?.toDate?.() ? data.updatedAt.toDate().toISOString() : data.updatedAt,
  } as AIChat;
};

export const saveChat = async (
  userId: string,
  chat: Omit<AIChat, "id" | "createdAt" | "updatedAt"> & { id?: string }
): Promise<string> => {
  const chatId = chat.id || crypto.randomUUID();
  const chatRef = doc(db, "ai_chats", userId, "chats", chatId);
  
  const chatData = {
    userId,
    title: chat.title,
    messages: chat.messages,
    recommendedCourseIds: chat.recommendedCourseIds || [],
    updatedAt: serverTimestamp(),
    ...(chat.id ? {} : { createdAt: serverTimestamp() }),
  };

  await setDoc(chatRef, chatData, { merge: true });
  return chatId;
};

export const deleteChat = async (userId: string, chatId: string): Promise<void> => {
  const chatRef = doc(db, "ai_chats", userId, "chats", chatId);
  await deleteDoc(chatRef);
};

export const generateChatTitle = (firstMessage: string): string => {
  const clean = firstMessage.trim();
  if (clean.length <= 30) return clean;
  return clean.substring(0, 30) + "...";
};
