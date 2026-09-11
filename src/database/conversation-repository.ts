import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { db } from "./client";
import { conversations, messages } from "./schema";
export const conversationRepository = { list: (userId: string) => db.select().from(conversations).where(eq(conversations.userId, userId)).orderBy(desc(conversations.updatedAt)), get: async (userId: string, id: string) => (await db.select().from(conversations).where(and(eq(conversations.id, id), eq(conversations.userId, userId))).limit(1))[0] ?? null, messages: async (userId: string, conversationId: string) => { const conversation = await conversationRepository.get(userId, conversationId); return conversation ? db.select().from(messages).where(eq(messages.conversationId, conversation.id)).orderBy(messages.createdAt) : null; } };
