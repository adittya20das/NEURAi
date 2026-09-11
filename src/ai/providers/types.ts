import type { CoreContext, TaskCategory } from "@/core/contracts";
export interface AIProvider { readonly id: string; readonly capabilities: { tasks: readonly TaskCategory[]; models: readonly string[] }; generate(input: { message: string; context: CoreContext; task: TaskCategory }): Promise<{ text: string; model: string }>; }
