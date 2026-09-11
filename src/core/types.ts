export type MessageRole = "system" | "user" | "assistant" | "tool";
export interface Message { id: string; role: MessageRole; content: string; createdAt: Date; }
export interface Conversation { id: string; userId: string; title: string; createdAt: Date; updatedAt: Date; }
