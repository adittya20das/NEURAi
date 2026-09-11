import type { ToolKind } from "@/core/contracts";
export const toolForTask = (task: string): ToolKind | undefined => ({ current_information: "web_search", calculation: "calculator", file_analysis: "file_reader", coding: "code_execution" } as Record<string, ToolKind>)[task];
