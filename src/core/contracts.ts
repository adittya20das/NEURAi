import type { Message } from "./types";
export type TaskCategory = "general" | "reasoning" | "coding" | "mathematics" | "current_information" | "file_analysis" | "calculation" | "unknown";
export type CoreStatus = "completed" | "provider_unavailable" | "tool_unavailable" | "invalid_request";
export type ToolKind = "web_search" | "calculator" | "file_reader" | "code_execution";
export interface CoreRequest { userId?: string; conversationId?: string; message: string; conversation?: Message[]; requestedCapabilities?: ToolKind[]; }
export interface CoreContext { messages: Message[]; memories: { content: string; category: string }[]; }
export interface CoreResult { status: CoreStatus; text?: string; task: TaskCategory; provider?: string; model?: string; tools: { kind: ToolKind; status: "unavailable" | "not_required" }[]; citations: { title: string; url: string }[]; error?: { code: string; message: string }; }
